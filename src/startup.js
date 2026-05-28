const HotPocket = require('hotpocket-nodejs-contract');
const Controller = require('./controller');
const DBInitializer = require('./Data.Deploy/initDB');
const { SqliteDatabase } = require('./Services/Common.Services/dbHandler');
const { Tables } = require('./constants');
const settings = require('./settings.json').settings;

const contractMain = async (ctx) => {
  console.log('Filestore contract is running.');
  try { await DBInitializer.init(); } catch (e) { console.error('DB init failed', e); }
  const db = new SqliteDatabase(settings.dbPath);
  try { db.open(); const row = await db.getLastRecord(Tables.CONTRACTVERSION); console.log('Current contract version:', row && row.Version ? row.Version : 1.0); } catch (e) { console.error('Version fetch error', e); } finally { db.close(); }
  const controller = new Controller();
  for (const user of ctx.users.list()) {
    for (const input of user.inputs) {
      const buf = await ctx.users.read(input);
      let message = null;
      try { message = JSON.parse(buf); } catch (e) { console.error('Invalid JSON input'); continue; }
      await controller.handleRequest(user, message, ctx.readonly);
    }
  }
};

const hpc = new HotPocket.Contract();
hpc.init(contractMain, HotPocket.clientProtocols.JSON, true);
