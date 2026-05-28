const fs = require('fs');
const { Tables, ResponseCodes } = require('../../constants');

class UpgradeService {
  constructor(db, settings) { this.db = db; this.settings = settings; }
  async upgradeContract(zipBuffer, incomingVersion, description) {
    this.db.open();
    try {
      let row = await this.db.getLastRecord(Tables.CONTRACTVERSION);
      const current = row && row.Version ? row.Version : 1.0;
      const incoming = parseFloat(incomingVersion);
      if (!(incoming > current)) return { success: false, error: { code: ResponseCodes.FORBIDDEN, message: 'Incoming version must be greater than current' } };
      fs.writeFileSync(this.settings.newContractZipFileName, zipBuffer);
      const postScript = `#!/bin/bash\
\
! command -v unzip &>/dev/null && apt-get update && apt-get install --no-install-recommends -y unzip\
\
zip_file=\"${this.settings.newContractZipFileName}\"\
unzip -o -d ./ \"$zip_file\" >>/dev/null\
rm \"$zip_file\" >>/dev/null\
`;
      fs.writeFileSync(this.settings.postExecutionScriptName, postScript);
      fs.chmodSync(this.settings.postExecutionScriptName, 0o777);
      await this.db.insertValue(Tables.CONTRACTVERSION, { Version: incoming, Description: description, CreatedOn: new Date().toISOString(), LastUpdatedOn: new Date().toISOString() });
      return { success: true, data: { version: incoming } };
    } catch (e) { return { success: false, error: { code: ResponseCodes.INTERNAL, message: 'Upgrade failed' } }; } finally { this.db.close(); }
  }
}

module.exports = UpgradeService;
