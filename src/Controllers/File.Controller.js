class FileController {
  constructor(fileService, eventLog) { this.fileService = fileService; this.eventLog = eventLog; }
  async upload(ctx) { return this.fileService.uploadFileMetadata(ctx.userPubKey, ctx.message.Payload); }
  async update(ctx) { return this.fileService.updateMetadata(ctx.userPubKey, ctx.message.Payload); }
  async share(ctx) { return this.fileService.shareFile(ctx.userPubKey, ctx.message.Payload); }
  async revoke(ctx) { return this.fileService.revokeAccess(ctx.userPubKey, ctx.message.Payload); }
  async del(ctx) { return this.fileService.deleteFile(ctx.userPubKey, ctx.message.Payload); }
  async listMine(ctx) { return this.fileService.listMyFiles(ctx.userPubKey, ctx.message.Payload || {}); }
  async listShared(ctx) { return this.fileService.listSharedWithMe(ctx.userPubKey, ctx.message.Payload || {}); }
  async get(ctx) { return this.fileService.getFile(ctx.userPubKey, ctx.message.Payload); }
  async search(ctx) { return this.fileService.search(ctx.userPubKey, ctx.message.Payload || {}); }
  async usage(ctx) { return this.fileService.getUsageStats(ctx.userPubKey); }
}

module.exports = FileController;
