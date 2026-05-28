const HotPocket = require('hotpocket-js-client');
(async () => { const kp = await HotPocket.generateKeys(); console.log('PUBLIC:', Buffer.from(kp.publicKey).toString('hex')); console.log('PRIVATE:', Buffer.from(kp.privateKey).toString('hex')); })();
