# DeepWiki Tool Testing Guide

## Current Status
We've encountered TypeScript compilation issues due to the database package exports. Here are the available testing options:

## Option 1: Simple JavaScript Test (WORKS NOW)
This test runs basic checks on each tool without TypeScript dependencies.

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/core/src/services/deepwiki-tools/tests
chmod +x run-standalone.sh
./run-standalone.sh
```

Or directly:
```bash
node simple-tool-test.js
```

This will show:
- NPM audit vulnerabilities count
- License checker dependency counts
- Madge circular dependencies (if installed)
- NPM outdated packages

## Option 2: Fix Database Package Build (RECOMMENDED)
To properly test with the full framework:

1. First, install ts-node:
```bash
cd /Users/alpinro/Code\ Prjects/codequal
npm install
```

2. Build the database package:
```bash
npm run build --workspace=@codequal/database
```

3. Then build the core package:
```bash
npm run build --workspace=@codequal/core
```

4. Run the full phased testing:
```bash
cd packages/core/src/services/deepwiki-tools/tests
./run-phased-tests.sh
```

## Option 3: Standalone TypeScript Test
This runs the tools without database dependencies:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/core
npx ts-node src/services/deepwiki-tools/tests/standalone-test.ts
```

## What Each Test Shows

### Simple JavaScript Test
- Basic tool functionality
- Key metrics (vulnerabilities, outdated packages, etc.)
- Quick validation that tools work

### Standalone TypeScript Test
- Full tool execution through ToolRunnerService
- Detailed results saved to JSON files
- Performance metrics
- Formatted output with key findings

### Full Phased Testing (after fixing builds)
- Phase 1: Local tool testing with review
- Phase 2: Docker container testing
- Phase 3: Vector DB integration
- Interactive result review
- Comparison between test runs

## Expected Results

For CodeQual packages, you should see:
- Some npm vulnerabilities (typical for any project)
- MIT/ISC/Apache licenses (safe)
- Few or no circular dependencies
- Some outdated packages (normal)

## Troubleshooting

If you get "MODULE_NOT_FOUND" errors:
1. The database package needs to be built first
2. The exports in database/src/index.ts need to be compiled

If tools fail:
- npm-audit needs package-lock.json
- madge needs to be installed globally: `npm install -g madge`
- Some tools may fail in monorepo root (normal)

## Next Steps

1. Start with the simple JavaScript test to verify tools work
2. Fix the database package build issue
3. Run the full phased testing framework
4. Review detailed results and validate accuracy
