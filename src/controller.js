const FileController = require('./Controllers/File.Controller');
const UserController = require('./Controllers/User.Controller');
const UpgradeController = require('./Controllers/Upgrade.Controller');
const { SqliteDatabase } = require('./Services/Common.Services/dbHandler');
const FileService = require('./Services/File.Service');
const UserService = require('./Services/User.Service');
const EventLogService = require('./Services/EventLog.Service');
const { verifySignedCommand } = require('./Utils/Crypto.Helper');
const { ResponseCodes } = require('./constants');
const settings = require('./settings.json').settings;

class Controller {
  constructor() {
    this.db = new SqliteDatabase(settings.dbPath);
    this.eventLog = new EventLogService(this.db);
    this.fileService = new FileService(this.db, settings, this.eventLog);
    this.userService = new UserService(this.db, settings);
    this.fileCtrl = new FileController(this.fileService, this.eventLog);
    this.userCtrl = new UserController(this.userService);
    this.upgradeCtrl = new UpgradeController(this.db, settings);
  }
  async handleRequest(user, message, isReadOnly) {
    const ctx = { userPubKey: user.pubKey, message };
    // Signature verification for all commands except possible health/read-only.
    const sigHex = message.SignatureHex;
    const ok = await verifySignedCommand(user.pubKey, message, sigHex);
    if (!ok) {
      return await this.sendOutput(user, { success: false, error: { code: ResponseCodes.UNAUTHORIZED, message: 'Invalid signature' } });
    }
    let res = null;
    switch (message.Command) {
      case 'registerUser': res = await this.userCtrl.register(ctx); break;
      case 'uploadFileMetadata': res = await this.fileCtrl.upload(ctx); break;
      case 'updateMetadata': res = await this.fileCtrl.update(ctx); break;
      case 'shareFile': res = await this.fileCtrl.share(ctx); break;
      case 'revokeAccess': res = await this.fileCtrl.revoke(ctx); break;
      case 'deleteFile': res = await this.fileCtrl.del(ctx); break;
      case 'listMyFiles': res = await this.fileCtrl.listMine(ctx); break;
      case 'listSharedWithMe': res = await this.fileCtrl.listShared(ctx); break;
      case 'getFile': res = await this.fileCtrl.get(ctx); break;
      case 'search': res = await this.fileCtrl.search(ctx); break;
      case 'getUsageStats': res = await this.fileCtrl.usage(ctx); break;
      case 'upgradeContract': res = await this.upgradeCtrl.handle(ctx); break;
      case 'getAuditLog': res = await this.eventLog.getAuditLog(message.Payload || {}); res = { success: true, data: res }; break;
      default: res = { success: false, error: { code: ResponseCodes.BAD_REQUEST, message: 'Unknown command' } };
    }
    await this.sendOutput(user, res);
  }
  async sendOutput(user, response) { await user.send(response); }
}

module.exports = Controller;
