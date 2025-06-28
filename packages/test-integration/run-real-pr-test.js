#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Import and run the test
const { RealPRAnalysisTest } = require('./dist/packages/test-integration/src/tests/e2e-real-pr-analysis.js');

const test = new RealPRAnalysisTest();
test.runTests()
  .then((success) => {
    if (success) {
      console.log('\n✅ All E2E tests passed!');
      console.log('\nThe system successfully analyzed real PRs using OpenRouter models.');
    } else {
      console.log('\n❌ Some E2E tests failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });