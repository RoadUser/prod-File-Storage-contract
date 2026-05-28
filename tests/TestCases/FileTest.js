const HotPocket = require('hotpocket-js-client');
const sodium = require('libsodium-wrappers');
const { assertSuccess } = require('../test-utils');

async function canonicalJSONStringify(obj) { const keys = []; JSON.stringify(obj, function(k,v){ keys.push(k); return v; }); keys.sort(); return JSON.stringify(obj, keys); }

async function signPayload(keys, payload) { await sodium.ready; const msg = Buffer.from(payload); const sig = Buffer.from(sodium.crypto_sign_detached(msg, keys.privateKey)); return sig.toString('hex'); }

async function runFileLifecycle() {
  const userA = await HotPocket.generateKeys();
  const clientA = await HotPocket.createClient(['wss://localhost:8081'], userA);
  if (!await clientA.connect()) throw new Error('Connect failed');
  const reg = { Command: 'registerUser', Payload: { displayName: 'Alice' }, Nonce: 'n1' };
  reg.SignatureHex = await signPayload(userA, await canonicalJSONStringify(reg));
  await clientA.submitContractInput(Buffer.from(JSON.stringify(reg)));
  const upload = { Command: 'uploadFileMetadata', Payload: { filename: 'a.txt', sizeBytes: 1, mimeType: 'text/plain', contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', storageRef: 'ipfs://CID_A' }, Nonce: 'n2' };
  upload.SignatureHex = await signPayload(userA, await canonicalJSONStringify(upload));
  await clientA.submitContractInput(Buffer.from(JSON.stringify(upload)));
  clientA.close();
}

module.exports = { runFileLifecycle };
