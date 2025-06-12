# MCP Hybrid - Focused Testing Guide

## Current Status (June 10, 2025)

### Test Fixes Applied
- ✅ Fixed TypeScript compilation errors in all test files
- ✅ Corrected PRContext interface properties (`targetBranch` not `headBranch`)
- ✅ Added missing required fields (`description`, `author`)
- ✅ Removed non-existent properties (`url` from PR, `timestamp` from commits)

### Test Suites Status

| Adapter | Tests | Status | Priority | Notes |
|---------|-------|--------|----------|-------|
| ESLint MCP | 20 | ✅ Should Pass | 1 | Already working before fixes |
| Chart.js MCP | 15 | 🔧 Fixed, Needs Test | 2 | Simple, no MCP server required |
| Context MCP | 14 | 🔧 Fixed, Needs Test | 3 | Uses MCP server with 2s init |
| MCP-Scan | 13 | 🔧 Fixed, Needs Test | 4 | Security scanning |
| Docs Service | 11 | 🔧 Fixed, Needs Test | 5 | Documentation analysis |

## Recommended Testing Approach

### Step 1: Verify ESLint Tests Still Pass
```bash
./test-one-adapter.sh eslint
```
Expected: All 20 tests pass

### Step 2: Test Chart.js Adapter
```bash
./test-one-adapter.sh chartjs
```
- No MCP server required
- Pure visualization generation
- Should be straightforward

### Step 3: Test Context MCP
```bash
./test-one-adapter.sh context
```
- Uses MCP server (2-second initialization)
- Mocks child_process spawn
- 10-second timeouts on async tests

### Step 4: Test MCP-Scan
```bash
./test-one-adapter.sh mcp-scan
```
- Security-focused adapter
- Creates temp directories
- Includes tool verification

### Step 5: Test Docs Service
```bash
./test-one-adapter.sh docs
```
- Documentation quality analysis
- Most complex adapter
- Multiple analysis types

## Troubleshooting

### If tests fail with timeout errors:
- Check if MCP server initialization is taking longer than 2 seconds
- Increase timeout in test files (currently 10 seconds)

### If tests fail with module not found:
```bash
# Clear Jest cache
npx jest --clearCache

# Rebuild the project
npm run build
```

### If TypeScript errors persist:
```bash
# Check for cached build files
rm -rf dist/
npm run build
```

## Next Steps After Tests Pass

1. **Create tests for Direct adapters**:
   - Prettier Direct
   - Dependency Cruiser Direct
   - Grafana Direct

2. **Update CI/CD**:
   - Ensure all tests run in CI
   - Add test coverage reporting

3. **Documentation**:
   - Update adapter documentation with test examples
   - Create integration test guide

## Quick Commands

```bash
# Test single adapter
./test-one-adapter.sh <adapter-name>

# Run all tests (after individual verification)
npm test

# Test with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```
