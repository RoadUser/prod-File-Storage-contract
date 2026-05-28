const { Tables } = require('../constants');

class EventLogService {
  constructor(db) { this.db = db; }
  async appendEvent(type, fileId, actorPublicKey, dataObj) {
    const ts = new Date().toISOString();
    const dataStr = JSON.stringify(dataObj || {});
    return this.db.insertValue(Tables.EVENTS, { type, fileId, actorPublicKey, timestamp: ts, data: dataStr });
  }
  async getAuditLog(filter) {
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const offset = filter.cursor && filter.cursor >= 0 ? filter.cursor : 0;
    let where = '1'; const params = [];
    if (filter.fileId) { where = where + ' AND fileId = ?'; params.push(filter.fileId); }
    const rows = await this.db.runSelectQuery(`SELECT * FROM ${Tables.EVENTS} WHERE ${where} ORDER BY rowid ASC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return rows.map(r => ({ id: r.id, type: r.type, fileId: r.fileId, actorPublicKey: r.actorPublicKey, timestamp: r.timestamp, data: JSON.parse(r.data || '{}') }));
  }
}

module.exports = EventLogService;
