const HotPocket = require('hotpocket-js-client');
const bson = require('bson');

class ContractService {
  constructor(servers) { this.servers = servers; this.promiseMap = new Map(); this.client = null; this.userKeyPair = null; }
  async init() {
    if (!this.userKeyPair) this.userKeyPair = await HotPocket.generateKeys();
    if (!this.client) this.client = await HotPocket.createClient(this.servers, this.userKeyPair, { protocol: HotPocket.protocols.bson });
    this.client.on(HotPocket.events.contractOutput, (r) => { r.outputs.forEach((o) => { const out = bson.deserialize(o); const p = out.promiseId; const map = this.promiseMap.get(p); if (!map) return; if (out.error) map.rejecter(out.error); else map.resolver(out.success || out.data || out); this.promiseMap.delete(p); }); });
    if (!await this.client.connect()) { console.log('Connection failed'); return false; }
    console.log('HotPocket Connected'); return true;
  }
  submitInputToContract(obj) { const promiseId = Math.random().toString(16).slice(2); const payload = bson.serialize({ promiseId, ...obj }); this.client.submitContractInput(payload); return new Promise((resolve, reject) => { this.promiseMap.set(promiseId, { resolver: resolve, rejecter: reject }); }); }
}

module.exports = ContractService;
