const { ok, err } = require('../Utils/Response.Helper');
const { ResponseCodes } = require('../constants');

class UserController {
  constructor(userService) { this.userService = userService; }
  async register(ctx) {
    const displayName = ctx.message.Payload && ctx.message.Payload.displayName ? String(ctx.message.Payload.displayName) : null;
    return this.userService.registerUser(ctx.userPubKey, displayName);
  }
}

module.exports = UserController;
