function assertEqual(a, b, msg) { if (a !== b) throw new Error('Assertion failed: ' + (msg || '') + ` (${a} !== ${b})`); }
function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + (msg || '')); }
function assertSuccess(resp) { if (!(resp && resp.success === true)) throw new Error('Expected success'); }
function assertError(resp, code) { if (!(resp && resp.success === false)) throw new Error('Expected error'); if (code !== undefined && resp.error && resp.error.code !== code) throw new Error('Unexpected error code'); }
module.exports = { assertEqual, assert, assertSuccess, assertError };
