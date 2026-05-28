const HotPocket = require('hotpocket-js-client');
const sodium = require('libsodium-wrappers');

async function canonicalJSONStringify(obj) { const keys = []; JSON.stringify(obj, function(k,v){ keys.push(k); return v; }); keys.sort(); return JSON.stringify(obj, keys); }

async function signPayload(keys, payload) { await sodium.ready; const msg = Buffer.from(payload); const sig = Buffer.from(sodium.crypto_sign_detached(msg, keys.privateKey)); return sig.toString('hex'); }

async function main() {
  const userKeyPair = await HotPocket.generateKeys();
  const client = await HotPocket.createClient(['wss://localhost:8081'], userKeyPair);
  if (!await client.connect()) { console.log('Connection failed'); return; }
  console.log('Connected');
  const pkhex = Buffer.from(userKeyPair.publicKey).toString('hex');
  const seedCommands = [];
  const nonce1 = 'nonce-register-1';
  const payload1 = { Command: 'registerUser', Payload: { displayName: 'Seeder' }, Nonce: nonce1 };
  const sig1 = await signPayload(userKeyPair, await canonicalJSONStringify(payload1));
  seedCommands.push({ ...payload1, SignatureHex: sig1 });
  const filePayload = { filename: 'sample.txt', sizeBytes: 10, mimeType: 'text/plain', contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', storageRef: 'ipfs://CID_EXAMPLE', tags: ['demo'], description: 'seed file' };
  const nonce2 = 'nonce-upload-1';
  const payload2 = { Command: 'uploadFileMetadata', Payload: filePayload, Nonce: nonce2 };
  const sig2 = await signPayload(userKeyPair, await canonicalJSONStringify(payload2));
  seedCommands.push({ ...payload2, SignatureHex: sig2 });
  for (const cmd of seedCommands) { await client.submitContractInput(Buffer.from(JSON.stringify(cmd))); }
  console.log('Seeding done.');
  client.close();
}

main().catch(console.error);
