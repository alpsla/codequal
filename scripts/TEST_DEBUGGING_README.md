# CodeQual Test Debugging Tools

## Overview

These scripts help you quickly identify and debug failed tests across the CodeQual project. Instead of scrolling through verbose test output, these tools extract and analyze only the failed tests, providing actionable insights and fix suggestions.

## Scripts

### 1. `debug-failed-tests.sh` - Basic Test Debugger

A straightforward script that runs tests and shows only failures with clear formatting.

**Usage:**
```bash
# Test all packages
./scripts/debug-failed-tests.sh

# Test specific package
./scripts/debug-failed-tests.sh agents
./scripts/debug-failed-tests.sh core
./scripts/debug-failed-tests.sh testing
```

**Features:**
- ✅ Runs tests for all packages or specific package
- ✅ Extracts and displays only failed tests
- ✅ Shows failure count by package
- ✅ Provides basic fix suggestions
- ✅ Saves results to `.test-results/` directory

### 2. `debug-failed-tests-enhanced.sh` - Advanced Test Debugger

An enhanced version with additional features for deeper analysis.

**Usage:**
```bash
# Basic usage (same as regular version)
./scripts/debug-failed-tests-enhanced.sh

# Show full error messages
./scripts/debug-failed-tests-enhanced.sh --verbose

# Output as JSON (for CI/CD integration)
./scripts/debug-failed-tests-enhanced.sh --json

# Watch mode (re-runs on file changes)
./scripts/debug-failed-tests-enhanced.sh --watch

# Filter tests by pattern
./scripts/debug-failed-tests-enhanced.sh --filter "Educational Agent"

# Combine options
./scripts/debug-failed-tests-enhanced.sh agents --verbose --filter "integration"
```

**Features:**
- ✅ All features from basic version
- ✅ **Error Pattern Analysis**: Identifies common error types
- ✅ **Smart Fix Suggestions**: Provides specific commands to fix issues
- ✅ **Progress Bar**: Shows test execution progress
- ✅ **JSON Output**: For integration with other tools
- ✅ **Watch Mode**: Automatically re-runs tests on changes
- ✅ **Test Filtering**: Run only tests matching a pattern

## Output Examples

### Basic Output
```
🧪 CodeQual Failed Tests Debugger
=================================

📦 Testing package: agents
  ❌ Tests failed in agents

📦 Testing package: core
  ✅ All tests passed in core

📊 FAILED TESTS SUMMARY
========================

❌ Total failed tests: 3

📦 Failed tests by package:
  • agents: 3 failed tests

🔍 DETAILED FAILURE ANALYSIS
==============================

📦 Package: agents

  📁 Suite: educational-agent.test.ts
  ❌ Test: should extract learning opportunities
  💥 Error: Cannot find module '@codequal/core/utils'...

💡 SUGGESTED FIXES
==================

🔧 Missing module errors detected:
  • Run: npm install
  • Check if all dependencies are listed in package.json
  • Verify import paths are correct
```

### Enhanced Output with Error Patterns
```
🔍 ERROR PATTERN ANALYSIS
========================

📌 Missing dependencies or incorrect imports
   Found in 5 test(s)
   → Run: npm install
   → Check tsconfig paths configuration

📌 Test timeout issues
   Found in 2 test(s)
   → Add to test: jest.setTimeout(30000)
   → Check for missing await statements

🛠️  QUICK FIX COMMANDS
====================

📝 Run specific failed test files:
   npm test -- educational-agent.test.ts
   npm test -- reporter-agent.test.ts

🎯 Debug specific tests:
   npm test -- --testNamePattern="should extract learning opportunities"
   npm test -- --testNamePattern="should generate search prompts"
```

## Integration with Development Workflow

### 1. Pre-commit Testing
Add to your pre-commit workflow to catch failures early:
```bash
# In .git/hooks/pre-commit
./scripts/debug-failed-tests.sh --json || {
    echo "Tests failed! Run ./scripts/debug-failed-tests.sh for details"
    exit 1
}
```

### 2. CI/CD Integration
Use JSON output for CI/CD pipelines:
```bash
# Get failed tests as JSON
FAILURES=$(./scripts/debug-failed-tests-enhanced.sh --json)

# Process with jq or other tools
echo "$FAILURES" | jq '.[] | select(.package == "agents")'
```

### 3. Watch Mode Development
Use watch mode during development:
```bash
# Terminal 1: Run your dev server
npm run dev

# Terminal 2: Watch tests
./scripts/debug-failed-tests-enhanced.sh agents --watch --filter "YourFeature"
```

## Common Use Cases

### 1. After Pull/Merge
```bash
# Quick check if any tests are broken
./scripts/debug-failed-tests.sh
```

### 2. Before Commit
```bash
# Ensure your changes don't break tests
./scripts/debug-failed-tests.sh --verbose
```

### 3. Debugging Specific Feature
```bash
# Focus on specific test suite
./scripts/debug-failed-tests-enhanced.sh agents --filter "Educational" --verbose
```

### 4. CI/CD Failure Investigation
```bash
# Reproduce CI failures locally
./scripts/debug-failed-tests-enhanced.sh --verbose > test-failure-report.txt
```

## Troubleshooting

### Script Not Found
```bash
# Make scripts executable
chmod +x scripts/debug-failed-tests*.sh
```

### No Output
- Ensure you're in the project root directory
- Check if packages have test scripts in package.json
- Verify Jest is installed: `npm install`

### JSON Parsing Errors
- Install jq for better JSON support: `brew install jq` (macOS) or `apt-get install jq` (Linux)
- The script will fall back to text parsing if jq is not available

## Tips

1. **Start Simple**: Use the basic script first, then add options as needed
2. **Filter Early**: Use `--filter` to focus on specific tests and save time
3. **Verbose for Debugging**: Use `--verbose` when you need full error context
4. **Watch for TDD**: Use `--watch` mode for test-driven development
5. **Save Reports**: Redirect output to files for later analysis:
   ```bash
   ./scripts/debug-failed-tests.sh > test-report-$(date +%Y%m%d).txt
   ```

## Contributing

To improve these scripts:
1. Test your changes across different packages
2. Ensure backward compatibility
3. Update this README with new features
4. Follow the existing color scheme and output format

## Related Scripts

- `validate-ci-local.sh` - Full CI/CD validation including linting
- `build-packages.sh` - Build all packages in correct order
- `setup-git-hooks.sh` - Set up pre-commit and pre-push hooks
