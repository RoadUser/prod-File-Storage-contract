const sodium = require('libsodium-wrappers');
const UpgradeService = require('../Services/Common.Services/Upgrade.Service');
const { ResponseCodes } = require('../constants');

function isMaintainer(userPubKeyHex) {
  const expected = (process.env.MAINTAINER_PUBKEY || '').toLowerCase();
  if (!expected) return false;
  return (userPubKeyHex || '').toLowerCase() === expected;
}

async function verifyArtifactSignature(zipBuffer, signatureHex, maintainerPubKeyHex) {
  await sodium.ready;
  const sig = Buffer.from(signatureHex, 'hex');
  const pub = Buffer.from(maintainerPubKeyHex, 'hex');
  return sodium.crypto_sign_detached_verify(zipBuffer, sig, pub);
}

class UpgradeController {
  constructor(db, settings) { this.service = new UpgradeService(db, settings); }
  async handle(ctx) {
    const msg = ctx.message;
    try {
      if (!isMaintainer(ctx.userPubKey)) return { success: false, error: { code: ResponseCodes.UNAUTHORIZED, message: 'Unauthorized' } };
      const zipBase64 = msg.Payload && msg.Payload.zipBase64;
      const signatureHex = msg.Payload && msg.Payload.signatureHex;
      const version = msg.Payload && msg.Payload.version;
      const description = msg.Payload && msg.Payload.description || '';
      if (!zipBase64 || !signatureHex || !version) return { success: false, error: { code: ResponseCodes.BAD_REQUEST, message: 'Missing fields' } };
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const ok = await verifyArtifactSignature(zipBuffer, signatureHex, ctx.userPubKey);
      if (!ok) return { success: false, error: { code: ResponseCodes.UNAUTHORIZED, message: 'Invalid artifact signature' } };
      return await this.service.upgradeContract(zipBuffer, version, description);
    } catch (e) {
      return { success: false, error: { code: ResponseCodes.INTERNAL, message: 'Upgrade failed' } };
    }
  }
}

module.exports = UpgradeController;
