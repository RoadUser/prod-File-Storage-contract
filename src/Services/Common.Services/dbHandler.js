const sqlite3 = require('sqlite3').verbose();

const DataTypes = { TEXT: 'TEXT', INTEGER: 'INTEGER', NULL: 'NULL' };
//fdgrdff
class SqliteDatabase {
  constructor(dbFile) { this.dbFile = dbFile; this.openConnections = 0; this.db = null; }
  open() { if (this.openConnections <= 0) { this.db = new sqlite3.Database(this.dbFile); this.openConnections = 1; } else this.openConnections++; }
  close() { if (this.openConnections <= 1) { if (this.db) this.db.close(); this.db = null; this.openConnections = 0; } else this.openConnections--; }
  runQuery(query, params = null) { return new Promise((resolve, reject) => { this.db.run(query, params ? params : [], function(err) { if (err) { reject(err); return; } resolve({ lastId: this.lastID, changes: this.changes }); }); }); }
  runSelectQuery(query, params = []) { return new Promise((resolve, reject) => { this.db.all(query, params, (err, rows) => { if (err) { reject(err); } else resolve(rows); }); }); }
  getLastRecord(tableName) { const query = `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT 1`; return new Promise((resolve, reject) => { this.db.get(query, (err, row) => { if (err) reject(err); else resolve(row); }); }); }
  insertValue(tableName, value) { return this.insertValues(tableName, [value]); }
  insertValues(tableName, values) { if (!values.length) return Promise.resolve({ lastId: 0, changes: 0 }); const columnNames = Object.keys(values[0]); let rowValueStr = ''; const rowValues = []; for (const val of values) { rowValueStr += '('; for (const cn of columnNames) { rowValueStr += '?,'; rowValues.push(val[cn] !== undefined ? val[cn] : null); } rowValueStr = rowValueStr.slice(0, -1) + '),'; } rowValueStr = rowValueStr.slice(0, -1); const query = `INSERT INTO ${tableName}(${columnNames.join(',')}) VALUES ${rowValueStr}`; return this.runQuery(query, rowValues); }
  updateValue(tableName, value, filter = null) { const cols = Object.keys(value); let valueStr = ''; const values = []; for (const c of cols) { valueStr += `${c} = ? ,`; values.push(value[c] !== undefined ? value[c] : null); } valueStr = valueStr.slice(0, -1); let filterStr = '1'; if (filter) { const fcols = Object.keys(filter); filterStr = fcols.map(c => `${c} = ?`).join(' AND '); for (const c of fcols) values.push(filter[c]); } const q = `UPDATE ${tableName} SET ${valueStr} WHERE ${filterStr};`; return this.runQuery(q, values); }
  deleteValues(tableName, filter = null) { let filterStr = '1'; const values = []; if (filter) { const fcols = Object.keys(filter); filterStr = fcols.map(c => `${c} = ?`).join(' AND '); for (const c of fcols) values.push(filter[c]); } const q = `DELETE FROM ${tableName} WHERE ${filterStr};`; return this.runQuery(q, values); }
  findById(table, id) { const q = `SELECT * FROM ${table} WHERE id = ? OR Id = ?`; return new Promise((resolve, reject) => { this.db.get(q, [id, id], (err, row) => { if (err) reject(err); else resolve(row); }); }); }
}

module.exports = { SqliteDatabase, DataTypes };
