# V9 Test Files

All V9-related test files have been organized in this directory for better structure and maintainability.

## Available Test Files

### Core V9 Tests
- **test-v9-kubernetes-real.js** - Main Kubernetes integration test for Apache Kafka PR #17620
- **test-v9-full-parallel.js** - Parallel execution test with all 5 tools
- **test-v9-readonly-fix.js** - EmptyDir volume solution test for parallel execution
- **test-v9-express-quick.js** - Quick test using Express.js repository
- **v9-real-metrics-report.js** - Real metrics generation and reporting

## Running Tests

All tests can be run from this directory:

```bash
# Run from the tests directory
cd packages/agents/src/two-branch/tests

# Run specific test
node test-v9-kubernetes-real.js

# With environment variables
USE_LOCAL_TOOLS=true USE_KUBERNETES=true node test-v9-full-parallel.js
```

## Import Path Updates

All test files have been updated to use relative imports from their new location:
- Old: `require('./packages/agents/dist/...`
- New: `require('../../../dist/...`

## Status
✅ All files moved and import paths updated
✅ Tests verified to work from new location
✅ Root directory cleaned of V9 test files