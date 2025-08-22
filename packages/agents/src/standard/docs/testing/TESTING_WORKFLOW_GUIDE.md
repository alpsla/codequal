# CodeQual Testing Workflow Guide

## Overview

This guide provides a standardized workflow for running tests in the CodeQual project. Following this workflow ensures consistent, reliable test execution and eliminates environment-related issues.

## Testing Philosophy

**"Set up once, test many times"**

Our testing infrastructure is designed to:
- Automatically detect and configure the environment
- Provide clear feedback about missing dependencies
- Use intelligent fallbacks (mocks) when services are unavailable
- Generate detailed reports for debugging

## Testing Workflow

### Step 1: Initial Environment Setup (Run Once Per Session)

Before starting any testing session, run the environment setup:

```bash
# From project root
./scripts/test-environment-setup.sh
```

### Step 1.5: CRITICAL - Register DeepWiki API (MUST RUN EVERY SESSION!)

**⚠️ IMPORTANT: This step is REQUIRED for DeepWiki to work correctly!**

```bash
cd packages/agents
npx ts-node setup-deepwiki-for-session.ts
```

This registers the DirectDeepWikiApi which is lost between sessions. Without this, you'll get 0 issues!

This script will:
- ✅ Verify all prerequisites (kubectl, Node.js, npm)
- ✅ Check Kubernetes connection
- ✅ Setup DeepWiki port forwarding
- ✅ Configure GitHub authentication in DeepWiki pod
- ✅ Check/start Redis (optional)
- ✅ Create `.env.test` with proper configuration
- ✅ Build the project if needed
- ✅ Generate helper scripts (`run-tests.sh`, `check-health.sh`)

**Note:** Keep the terminal open after running this script as it maintains port forwarding.

### Step 2: Verify Environment Health

After setup, verify everything is working:

```bash
./check-health.sh
```

Expected output:
```
🏥 CodeQual Health Check
========================
DeepWiki API: ✅ Running
Redis: ✅ Running
Kubernetes: ✅ Connected
DeepWiki Pod: ✅ Running
GitHub Auth: ✅ Valid
```

### Step 3: Run Your Tests

Now you can run any test suite:

#### Option A: Quick Test (Fastest)
```bash
./quick-test.sh
```
- Runs basic validation
- Auto-detects available services
- Falls back to mocks if needed
- Good for quick validation

#### Option B: Comprehensive Test Suite
```bash
cd packages/agents
npx ts-node test-suite/comprehensive-test.ts
```
- Runs all component tests
- Generates detailed JSON report
- Best for thorough validation

#### Option C: Unified Regression Suite
```bash
cd packages/agents
npm test src/standard/tests/regression/unified-regression-suite.test.ts
```
- Runs regression tests
- Protects against known bugs
- Should pass before any merge

#### Option D: Specific Test Categories
```bash
./run-tests.sh deepwiki    # DeepWiki integration tests
./run-tests.sh api         # API endpoint tests
./run-tests.sh unit        # Unit tests only
./run-tests.sh integration # Integration tests
./run-tests.sh regression  # Regression tests
./run-tests.sh all         # Everything
```

## Recommended Testing Order

For comprehensive testing before commits or PRs:

1. **Environment Setup** (if not already done)
   ```bash
   ./scripts/test-environment-setup.sh
   ```

2. **Quick Validation**
   ```bash
   ./quick-test.sh
   ```

3. **Comprehensive Tests**
   ```bash
   cd packages/agents
   npx ts-node test-suite/comprehensive-test.ts
   ```

4. **Regression Tests** (critical before merge)
   ```bash
   npm test src/standard/tests/regression/unified-regression-suite.test.ts
   ```

## Environment Modes

### Real DeepWiki Mode (Default)
- Uses actual DeepWiki API
- Requires port forwarding
- More accurate but slower
- Best for final validation

```bash
export USE_DEEPWIKI_MOCK=false
```

### Mock Mode (Fast Testing)
- Uses mock data
- No external dependencies
- Very fast execution
- Good for development

```bash
export USE_DEEPWIKI_MOCK=true
```

## CI/CD Testing

For continuous integration pipelines:

```bash
# Use mocks for speed and reliability
export USE_DEEPWIKI_MOCK=true
export SKIP_HEALTH_CHECK=true
export NODE_ENV=test

# Run tests
npm test
```

## Troubleshooting

### Common Issues and Solutions

| Problem | Solution |
|---------|----------|
| DeepWiki not accessible | Run: `kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001` |
| GitHub auth failing | Update token: `kubectl set env -n codequal-dev deployment/deepwiki GITHUB_TOKEN=<new-token>` |
| Build errors | Clean build: `rm -rf dist && npm run build` |
| Port already in use | Kill process: `pkill -f "port-forward.*8001"` |
| Redis not available | Start Redis: `redis-server` (or tests will use memory cache) |
| Tests timing out | Increase timeout or use mock mode |

### Debug Mode

For detailed debugging output:

```bash
# Enable debug logging
export DEBUG=*
export LOG_LEVEL=debug

# Run tests with verbose output
npm test -- --verbose
```

## Test Reports

### Test Results Location

All test runs generate reports in:
- `test-results.json` - Detailed test results
- `regression-report.md` - Regression test summary
- Console output - Real-time feedback

### Understanding Test Results

```json
{
  "timestamp": "2025-08-21T12:00:00Z",
  "duration": 4088,
  "passed": 8,
  "failed": 2,
  "results": [
    {
      "name": "DeepWiki Connection",
      "status": "passed",
      "duration": 134
    }
  ]
}
```

## Best Practices

### Before Starting Development
1. Run environment setup once
2. Keep health check handy
3. Use quick-test for rapid feedback

### Before Committing Code
1. Run comprehensive test suite
2. Fix any failures
3. Run regression tests
4. Verify no new regressions

### Before Creating PR
1. Run all tests with real DeepWiki
2. Ensure regression suite passes
3. Document any new test requirements

### During Development
- Use mock mode for speed
- Run specific test categories
- Check health when tests fail unexpectedly

## Advanced Configuration

### Custom Environment Variables

Create `.env.test.local` for personal overrides:

```bash
# Personal test configuration
DEEPWIKI_API_URL=http://localhost:8001
USE_DEEPWIKI_MOCK=true
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
```

### Parallel Test Execution

For faster test runs:

```bash
# Run tests in parallel
npm test -- --maxWorkers=4
```

### Test Coverage

Generate coverage reports:

```bash
# Run with coverage
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Test Categories Explained

### Unit Tests
- Test individual functions/classes
- No external dependencies
- Very fast execution
- Location: `**/__tests__/*.spec.ts`

### Integration Tests
- Test component interactions
- May use mocked services
- Medium speed
- Location: `**/tests/integration/*.test.ts`

### Regression Tests
- Protect against known bugs
- Must pass before merge
- Use mock data for consistency
- Location: `**/tests/regression/*.test.ts`

### API Tests
- Test HTTP endpoints
- Require API server running
- Slower execution
- Location: `**/tests/api/*.test.ts`

### DeepWiki Tests
- Test DeepWiki integration
- Can use real or mock API
- Variable speed
- Location: `**/tests/deepwiki/*.test.ts`

## Maintenance

### Updating Test Data

Mock data is located in:
```
packages/agents/src/standard/services/deepwiki-api-wrapper.ts
```

### Adding New Tests

1. Choose appropriate category
2. Follow naming convention
3. Update test runner if needed
4. Document special requirements

## Report Generation

### CRITICAL: HTML Report Format Parameter

When generating HTML reports using V8 Report Generator, you MUST specify the format parameter:

```typescript
// ❌ WRONG - This generates markdown by default
const report = generator.generateReport(comparisonResult);

// ✅ CORRECT - This generates HTML with proper V8 template
const report = generator.generateReport(comparisonResult, {
  format: 'html',  // REQUIRED for HTML output
  includeAIIDESection: true,
  includeEducation: true,
  verbosity: 'detailed'
});
```

**Important Notes:**
- Without `format: 'html'`, the report defaults to markdown format
- The V8 HTML template includes styled components, Mermaid diagrams, and proper formatting
- Always use `ReportGeneratorV8Final` (V7 is deprecated)

### Refreshing Environment

If environment becomes stale:

```bash
# Clean everything
pkill -f "port-forward"
rm -rf dist node_modules
npm install
npm run build

# Re-run setup
./scripts/test-environment-setup.sh
```

## Quick Reference

```bash
# One-time setup
./scripts/test-environment-setup.sh

# Daily workflow
./check-health.sh                    # Verify environment
./quick-test.sh                       # Quick validation
./run-tests.sh all                    # Run everything

# Specific needs
USE_DEEPWIKI_MOCK=true npm test      # Fast testing with mocks
npm test -- --watch                  # Watch mode for development
npm test -- --coverage               # Generate coverage report
```

## Conclusion

Following this workflow ensures:
- ✅ Consistent test environment
- ✅ Reliable test results  
- ✅ Fast feedback during development
- ✅ Comprehensive validation before deployment
- ✅ Clear troubleshooting path when issues arise

Remember: **Always run regression tests before merging!**


Recommended Workflow:

  First Time Each Day (or New Session):

  # 1. Setup environment (keeps port forwarding active)
  ./scripts/test-environment-setup.sh

  # 2. Quick health check
  ./check-health.sh

  # 3. Now run your regression suite
  npm test src/standard/tests/regression/unified-regression-suite.test.ts

  Subsequent Runs (Same Session):

  # Just run the tests directly - no need to setup again
  npm test src/standard/tests/regression/unified-regression-suite.test.ts

  If Tests Fail Unexpectedly:

  # Check health first
  ./check-health.sh

  # If something is down, re-run setup
  ./scripts/test-environment-setup.sh

  -----

*Last Updated: August 21, 2025*
*Version: 1.0.0*