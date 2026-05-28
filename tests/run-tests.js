const { runFileLifecycle } = require('./TestCases/FileTest');
(async () => {
  console.log('Running tests...');
  await runFileLifecycle();
  console.log('All tests completed.');
})();
