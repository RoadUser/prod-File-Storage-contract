function ok(data) { return { success: true, data }; }
function err(code, message) { return { success: false, error: { code, message } }; }
module.exports = { ok, err };
