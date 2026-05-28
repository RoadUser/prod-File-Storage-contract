const { Tables, ResponseCodes } = require('../constants');
const { err, ok } = require('../Utils/Response.Helper');

class UserService {
  constructor(db, settings) { this.db = db; this.settings = settings; }
  async registerUser(pubKeyHex, displayName) {
    this.db.open();
    try {
      const existing = await this.db.runSelectQuery(`SELECT * FROM ${Tables.USERS} WHERE publicKey = ?`, [pubKeyHex]);
      if (existing.length) return ok({ publicKey: pubKeyHex, createdAt: existing[0].createdAt, displayName: existing[0].displayName, usedBytes: existing[0].usedBytes, quotaBytes: existing[0].quotaBytes });
      const createdAt = new Date().toISOString();
      const quota = this.settings.defaultUserQuotaBytes;
      await this.db.insertValue(Tables.USERS, { publicKey: pubKeyHex, createdAt, displayName: displayName || null, quotaBytes: quota, usedBytes: 0 });
      return ok({ publicKey: pubKeyHex, createdAt, displayName: displayName || null, usedBytes: 0, quotaBytes: quota });
    } catch (e) {
      return err(ResponseCodes.INTERNAL, 'Failed to register user');
    } finally { this.db.close(); }
  }
  async getUser(pubKeyHex) {
    this.db.open();
    try { const rows = await this.db.runSelectQuery(`SELECT * FROM ${Tables.USERS} WHERE publicKey = ?`, [pubKeyHex]); if (!rows.length) return null; return rows[0]; } finally { this.db.close(); }
  }
}

module.exports = UserService;
