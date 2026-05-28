const { Tables, ResponseCodes, EventTypes } = require('../constants');
const { err, ok } = require('../Utils/Response.Helper');
const { generateULID } = require('../Utils/Crypto.Helper');

function parseBool(n) { return n ? 1 : 0; }

class FileService {
  constructor(db, settings, eventLog) { this.db = db; this.settings = settings; this.eventLog = eventLog; }
  _validateStorageRef(uri) {
    if (!uri || typeof uri !== 'string' || !uri.includes('://')) return false;
    const scheme = uri.split('://')[0];
    return this.settings.allowedSchemes.indexOf(scheme) !== -1;
  }
  _validateMime(m) { return this.settings.allowedMimes.indexOf(m) !== -1; }
  _validateContentHash(h) { return typeof h === 'string' && /^[a-fA-F0-9]{64}$/.test(h); }
  _validateTags(tags) { return !tags || (Array.isArray(tags) && tags.length <= this.settings.maxTags && tags.every(t => typeof t === 'string' && t.length <= 64)); }
  async _ensureUser(pubKeyHex) {
    const rows = await this.db.runSelectQuery(`SELECT * FROM ${Tables.USERS} WHERE publicKey = ?`, [pubKeyHex]);
    return rows.length ? rows[0] : null;
  }
  async _getFile(fileId) { const r = await this.db.runSelectQuery(`SELECT * FROM ${Tables.FILES} WHERE id = ?`, [fileId]); return r.length ? r[0] : null; }
  _permissionsToJsonRow(perm) { return JSON.stringify(perm || {}); }
  async _hasPermission(file, actor, permName) {
    if (file.ownerPublicKey === actor) return true;
    const rs = await this.db.runSelectQuery(`SELECT * FROM ${Tables.FILE_SHARES} WHERE fileId = ? AND targetPublicKey = ?`, [file.id, actor]);
    if (!rs.length) return false;
    if (permName === 'read') return !!rs[0].canRead;
    if (permName === 'write') return !!rs[0].canWrite;
    if (permName === 'share') return !!rs[0].canShare;
    if (permName === 'delete') return !!rs[0].canDelete;
    return false;
  }
  async uploadFileMetadata(actor, payload) {
    const { filename, sizeBytes, mimeType, contentHash, storageRef, tags, description } = payload;
    if (!filename || filename.length > this.settings.maxFilenameLen) return err(ResponseCodes.BAD_REQUEST, 'Invalid filename');
    if (!(Number.isInteger(sizeBytes) && sizeBytes >= 0)) return err(ResponseCodes.BAD_REQUEST, 'Invalid sizeBytes');
    if (!this._validateMime(mimeType)) return err(ResponseCodes.BAD_REQUEST, 'MIME not allowed');
    if (!this._validateContentHash(contentHash)) return err(ResponseCodes.BAD_REQUEST, 'Invalid contentHash');
    if (!this._validateStorageRef(storageRef)) return err(ResponseCodes.BAD_REQUEST, 'Invalid storageRef');
    if (description && description.length > this.settings.maxDescriptionLen) return err(ResponseCodes.BAD_REQUEST, 'Description too long');
    if (!this._validateTags(tags)) return err(ResponseCodes.BAD_REQUEST, 'Invalid tags');
    this.db.open();
    try {
      const user = await this._ensureUser(actor);
      if (!user) return err(ResponseCodes.UNAUTHORIZED, 'User not registered');
      if (user.usedBytes + sizeBytes > (user.quotaBytes || this.settings.defaultUserQuotaBytes)) return err(ResponseCodes.FORBIDDEN, 'Quota exceeded');
      if (this.settings.uniqueFilenamePerOwner) {
        const rows = await this.db.runSelectQuery(`SELECT id FROM ${Tables.FILES} WHERE ownerPublicKey = ? AND filename = ? AND deleted = 0`, [actor, filename]);
        if (rows.length) return err(ResponseCodes.CONFLICT, 'Filename already exists');
      }
      const id = generateULID();
      const uploadedAt = new Date().toISOString();
      const version = 1;
      const permsJson = JSON.stringify({});
      await this.db.insertValue(Tables.FILES, { id, ownerPublicKey: actor, storageRef, contentHash, sizeBytes, mimeType, filename, uploadedAt, tags: JSON.stringify(tags || []), description: description || null, permissions: permsJson, version, deleted: 0 });
      if (tags && tags.length) {
        const tagRows = tags.map(t => ({ fileId: id, tag: t }));
        await this.db.insertValues(Tables.FILE_TAGS, tagRows);
      }
      await this.db.updateValue(Tables.USERS, { usedBytes: (user.usedBytes || 0) + sizeBytes }, { publicKey: actor });
      await this.eventLog.appendEvent(EventTypes.FILE_UPLOADED, id, actor, { filename });
      return ok({ id, version });
    } catch (e) {
      return err(ResponseCodes.INTERNAL, 'Failed to upload metadata');
    } finally { this.db.close(); }
  }
  async updateMetadata(actor, payload) {
    const { fileId, update, expectedVersion } = payload;
    if (!fileId || !expectedVersion) return err(ResponseCodes.BAD_REQUEST, 'Missing fields');
    this.db.open();
    try {
      const file = await this._getFile(fileId);
      if (!file || file.deleted) return err(ResponseCodes.NOT_FOUND, 'File not found');
      const can = await this._hasPermission(file, actor, 'write');
      if (!can) return err(ResponseCodes.FORBIDDEN, 'No write permission');
      if (file.version !== expectedVersion) return err(ResponseCodes.CONFLICT, 'Version conflict');
      const upd = {}; const tags = update.tags; const desc = update.description; const fname = update.filename;
      if (fname !== undefined) { if (!fname || fname.length > this.settings.maxFilenameLen) return err(ResponseCodes.BAD_REQUEST, 'Invalid filename'); if (this.settings.uniqueFilenamePerOwner && fname !== file.filename) { const rows = await this.db.runSelectQuery(`SELECT id FROM ${Tables.FILES} WHERE ownerPublicKey = ? AND filename = ? AND deleted = 0`, [file.ownerPublicKey, fname]); if (rows.length) return err(ResponseCodes.CONFLICT, 'Filename already exists'); } upd.filename = fname; }
      if (desc !== undefined) { if (desc && desc.length > this.settings.maxDescriptionLen) return err(ResponseCodes.BAD_REQUEST, 'Description too long'); upd.description = desc || null; }
      if (tags !== undefined) { if (!this._validateTags(tags)) return err(ResponseCodes.BAD_REQUEST, 'Invalid tags'); upd.tags = JSON.stringify(tags); await this.db.deleteValues(Tables.FILE_TAGS, { fileId: file.id }); if (tags && tags.length) { const tagRows = tags.map(t => ({ fileId: file.id, tag: t })); await this.db.insertValues(Tables.FILE_TAGS, tagRows); } }
      upd.version = file.version + 1;
      await this.db.updateValue(Tables.FILES, upd, { id: file.id });
      await this.eventLog.appendEvent(EventTypes.METADATA_UPDATED, file.id, actor, { update: Object.keys(update) });
      return ok({ version: upd.version });
    } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to update metadata'); } finally { this.db.close(); }
  }
  async shareFile(actor, payload) {
    const { fileId, targetPublicKey, permissions } = payload;
    this.db.open();
    try {
      const file = await this._getFile(fileId);
      if (!file || file.deleted) return err(ResponseCodes.NOT_FOUND, 'File not found');
      const canShare = await this._hasPermission(file, actor, 'share');
      if (!canShare) return err(ResponseCodes.FORBIDDEN, 'No share permission');
      const { read, write, share, delete: del } = permissions || {};
      if (del && actor !== file.ownerPublicKey) return err(ResponseCodes.FORBIDDEN, 'Only owner can grant delete');
      const exists = await this.db.runSelectQuery(`SELECT * FROM ${Tables.FILE_SHARES} WHERE fileId = ? AND targetPublicKey = ?`, [file.id, targetPublicKey]);
      const row = { fileId: file.id, targetPublicKey, canRead: parseBool(!!read), canWrite: parseBool(!!write), canShare: parseBool(!!share), canDelete: parseBool(!!del) };
      if (exists.length) await this.db.updateValue(Tables.FILE_SHARES, row, { fileId: file.id, targetPublicKey }); else await this.db.insertValue(Tables.FILE_SHARES, row);
      await this.eventLog.appendEvent(EventTypes.PERMISSION_CHANGED, file.id, actor, { targetPublicKey, permissions: row });
      return ok({});
    } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to share'); } finally { this.db.close(); }
  }
  async revokeAccess(actor, payload) {
    const { fileId, targetPublicKey } = payload;
    this.db.open();
    try { const file = await this._getFile(fileId); if (!file || file.deleted) return err(ResponseCodes.NOT_FOUND, 'File not found'); const canShare = await this._hasPermission(file, actor, 'share'); if (!canShare) return err(ResponseCodes.FORBIDDEN, 'No share permission'); await this.db.deleteValues(Tables.FILE_SHARES, { fileId: file.id, targetPublicKey }); await this.eventLog.appendEvent(EventTypes.ACCESS_REVOKED, file.id, actor, { targetPublicKey }); return ok({}); } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to revoke'); } finally { this.db.close(); }
  }
  async deleteFile(actor, payload) {
    const { fileId } = payload;
    this.db.open();
    try { const file = await this._getFile(fileId); if (!file || file.deleted) return err(ResponseCodes.NOT_FOUND, 'File not found'); const allowed = await this._hasPermission(file, actor, 'delete'); if (!allowed) return err(ResponseCodes.FORBIDDEN, 'No delete permission'); await this.db.updateValue(Tables.FILES, { deleted: 1 }, { id: file.id }); await this.eventLog.appendEvent(EventTypes.FILE_DELETED, file.id, actor, {}); return ok({}); } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to delete'); } finally { this.db.close(); }
  }
  async getFile(actor, payload) {
    const { fileId } = payload; this.db.open();
    try { const file = await this._getFile(fileId); if (!file || file.deleted) return err(ResponseCodes.NOT_FOUND, 'File not found'); const canRead = await this._hasPermission(file, actor, 'read'); if (!canRead && file.ownerPublicKey !== actor) return err(ResponseCodes.FORBIDDEN, 'No read'); const shares = await this.db.runSelectQuery(`SELECT targetPublicKey, canRead, canWrite, canShare, canDelete FROM ${Tables.FILE_SHARES} WHERE fileId = ?`, [file.id]); return ok({ id: file.id, ownerPublicKey: file.ownerPublicKey, storageRef: file.storageRef, contentHash: file.contentHash, sizeBytes: file.sizeBytes, mimeType: file.mimeType, filename: file.filename, uploadedAt: file.uploadedAt, tags: JSON.parse(file.tags || '[]'), description: file.description, permissions: shares, version: file.version, deleted: !!file.deleted }); } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to get file'); } finally { this.db.close(); }
  }
  async listMyFiles(actor, payload) {
    const limit = payload.limit && payload.limit > 0 ? payload.limit : 20; const offset = payload.cursor && payload.cursor >= 0 ? payload.cursor : 0;
    this.db.open();
    try { const rows = await this.db.runSelectQuery(`SELECT id, filename, uploadedAt, version, deleted FROM ${Tables.FILES} WHERE ownerPublicKey = ? ORDER BY uploadedAt DESC LIMIT ? OFFSET ?`, [actor, limit, offset]); return ok({ files: rows, nextCursor: offset + rows.length }); } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to list'); } finally { this.db.close(); }
  }
  async listSharedWithMe(actor, payload) {
    const limit = payload.limit && payload.limit > 0 ? payload.limit : 20; const offset = payload.cursor && payload.cursor >= 0 ? payload.cursor : 0; this.db.open();
    try { const rows = await this.db.runSelectQuery(`SELECT f.id, f.filename, f.ownerPublicKey, s.canRead, s.canWrite, s.canShare, s.canDelete FROM ${Tables.FILE_SHARES} s JOIN ${Tables.FILES} f ON f.id = s.fileId WHERE s.targetPublicKey = ? AND f.deleted = 0 ORDER BY f.uploadedAt DESC LIMIT ? OFFSET ?`, [actor, limit, offset]); return ok({ files: rows, nextCursor: offset + rows.length }); } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to list shared'); } finally { this.db.close(); }
  }
  async search(actor, payload) {
    const { query, tag, ownerPublicKey } = payload; const limit = payload.limit && payload.limit > 0 ? payload.limit : 20; const offset = payload.cursor && payload.cursor >= 0 ? payload.cursor : 0; this.db.open();
    try {
      let where = 'f.deleted = 0'; const params = [];
      if (query) { where += ' AND f.filename LIKE ?'; params.push('%' + query + '%'); }
      if (ownerPublicKey) { where += ' AND f.ownerPublicKey = ?'; params.push(ownerPublicKey); }
      let base = `SELECT DISTINCT f.id, f.filename, f.ownerPublicKey, f.uploadedAt FROM ${Tables.FILES} f`;
      if (tag) { base += ` JOIN ${Tables.FILE_TAGS} t ON t.fileId = f.id AND t.tag = ?`; params.push(tag); }
      const sql = `${base} WHERE ${where} ORDER BY f.uploadedAt DESC LIMIT ? OFFSET ?`;
      const rows = await this.db.runSelectQuery(sql, [...params, limit, offset]);
      return ok({ results: rows, nextCursor: offset + rows.length });
    } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed to search'); } finally { this.db.close(); }
  }
  async getUsageStats(actor) {
    this.db.open();
    try { const u = await this.db.runSelectQuery(`SELECT usedBytes, quotaBytes FROM ${Tables.USERS} WHERE publicKey = ?`, [actor]); if (!u.length) return err(ResponseCodes.UNAUTHORIZED, 'User not found'); return ok({ usedBytes: u[0].usedBytes || 0, quotaBytes: u[0].quotaBytes || this.settings.defaultUserQuotaBytes }); } catch (e) { return err(ResponseCodes.INTERNAL, 'Failed stats'); } finally { this.db.close(); }
  }
}

module.exports = FileService;
