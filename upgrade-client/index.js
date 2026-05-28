const HotPocket = require('hotpocket-js-client');
const fs = require('fs');
const ContractService = require('./contract-service');

// Usage: node index.js <contractUrl> <zipFilePath> <version> <description>

async function signBufferWithHPClient(kp, buffer) {
  // Use sodium from client internals implicitly by using kp; HotPocket doesn't expose a sign helper, so in a real setup use tweetnacl/libsodium
  // For this template we assume signature generated elsewhere; keeping empty string would be rejected by contract.
  // This client is a template to be adjusted with your signing flow.
  return '';
}

async function main() {
  const contractUrl = process.argv[2];
  const filepath = process.argv[3];
  const version = process.argv[4];
  const description = process.argv[5] || '';
  if (!contractUrl || !filepath || !version) { console.log('Usage: node index.js <contractUrl> <zipFilePath> <version> <description>'); process.exit(1); }
  const zipBuffer = fs.readFileSync(filepath);
  const service = new ContractService([contractUrl]);
  if (!await service.init()) process.exit(1);
  const sigHex = await signBufferWithHPClient(service.userKeyPair, zipBuffer);
  const payload = { Command: 'upgradeContract', Payload: { zipBase64: zipBuffer.toString('base64'), signatureHex: sigHex, version: parseFloat(version), description }, Nonce: 'upgrade-nonce' };
  // Note: Contract verifies artifact signature using maintainer pubkey. This client should be modified to produce a valid Ed25519 signature.
  await service.submitInputToContract(payload);
  console.log('Upgrade submitted');
}

main().catch(console.error);
