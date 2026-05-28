const sodium = require('libsodium-wrappers');

function canonicalJSONStringify(obj) {
  const allKeys = [];
  JSON.stringify(obj, function(key, value) { allKeys.push(key); return value; });
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}

async function verifySignedCommand(publicKeyHex, commandObj, signatureHex) {
  await sodium.ready;
  const publicKey = Buffer.from(publicKeyHex, 'hex');
  const sig = Buffer.from(signatureHex, 'hex');
  const payload = { Command: commandObj.Command, Payload: commandObj.Payload, Nonce: commandObj.Nonce };
  const msg = Buffer.from(canonicalJSONStringify(payload));
  const ok = sodium.crypto_sign_detached_verify(msg, sig, publicKey);
  return ok;
}

function generateULID() {
  const now = Date.now();
  const time = now.toString(36).padStart(10, '0');
  let rand = '';
  for (let i = 0; i < 16; i++) { rand += Math.floor(Math.random() * 36).toString(36); }
  return (time + rand).substring(0, 26).toUpperCase();
}

module.exports = { canonicalJSONStringify, verifySignedCommand, generateULID };
