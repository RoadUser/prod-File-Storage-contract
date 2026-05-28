const fs = require('fs');
const path = require('path');
const { Tables } = require('../constants');
const settings = require('../settings.json').settings;
const { SqliteDatabase } = require('../Services/Common.Services/dbHandler');

class DBInitializer {
  static async init() {
    if (!fs.existsSync(settings.dbPath)) {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(settings.dbPath);
      await new Promise((resolve, reject) => db.run('PRAGMA foreign_keys = ON', [], (e) => e ? reject(e) : resolve()));
      await run(db, `CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (Id INTEGER, Version FLOAT NOT NULL, Description TEXT, CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP, LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(\"Id\" AUTOINCREMENT))`);
      await run(db, `CREATE TABLE IF NOT EXISTS ${Tables.USERS} (publicKey TEXT PRIMARY KEY, createdAt TEXT, displayName TEXT, quotaBytes INTEGER, usedBytes INTEGER DEFAULT 0)`);
      await run(db, `CREATE TABLE IF NOT EXISTS ${Tables.FILES} (id TEXT PRIMARY KEY, ownerPublicKey TEXT, storageRef TEXT, contentHash TEXT, sizeBytes INTEGER, mimeType TEXT, filename TEXT, uploadedAt TEXT, tags TEXT, description TEXT, permissions TEXT, version INTEGER, deleted INTEGER DEFAULT 0)`);
      await run(db, `CREATE TABLE IF NOT EXISTS ${Tables.FILE_TAGS} (fileId TEXT, tag TEXT, PRIMARY KEY(fileId, tag))`);
      await run(db, `CREATE TABLE IF NOT EXISTS ${Tables.FILE_SHARES} (fileId TEXT, targetPublicKey TEXT, canRead INTEGER, canWrite INTEGER, canShare INTEGER, canDelete INTEGER, PRIMARY KEY(fileId, targetPublicKey))`);
      await run(db, `CREATE TABLE IF NOT EXISTS ${Tables.EVENTS} (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, fileId TEXT, actorPublicKey TEXT, timestamp TEXT, data TEXT)`);
      await run(db, `CREATE INDEX IF NOT EXISTS idx_files_owner ON ${Tables.FILES}(ownerPublicKey)`);
      await run(db, `CREATE INDEX IF NOT EXISTS idx_filetags_tag ON ${Tables.FILE_TAGS}(tag)`);
      await run(db, `CREATE INDEX IF NOT EXISTS idx_shares_target ON ${Tables.FILE_SHARES}(targetPublicKey)`);
      db.close();
    }
    // Script migrations runner (optional placeholder)
    if (fs.existsSync(settings.dbScriptsFolderPath)) {
      // Iterate sprint folders and .sql files if present
      // Placeholder for future SQL migrations, following patterns in docs
    }
  }
}

function run(db, sql) { return new Promise((resolve, reject) => db.run(sql, [], (e) => e ? reject(e) : resolve())); }

module.exports = DBInitializer;
