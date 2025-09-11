# CodeQual Test Integration Package

This package contains comprehensive E2E tests for the CodeQual system, focusing on testing different PR contexts and validating system behavior.

## Quick Start

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run all E2E tests
npm run test:all

# Run specific test suites
npm run test:pr-scenarios      # Test PR content analysis scenarios
npm run test:deduplication     # Test deduplication functionality
npm run test:pr-analyzer       # Test PR analyzer
```

## Test Scenarios Overview

### PR Content Scenarios (`test:pr-scenarios`)

Tests the system with 8 different PR types:

1. **Security Critical** - Authentication and security changes
2. **Performance Optimization** - Caching, query optimization
3. **Architecture Refactoring** - DI, patterns, structure
4. **Dependency Updates** - Package updates and vulnerabilities
5. **Mixed with Duplicates** - Tests deduplication
6. **Frontend Only** - UI/React changes
7. **Test Only** - Unit test additions
8. **Infrastructure** - Docker, CI/CD changes

### Key Features Tested

- ✅ **Intelligent Agent Selection**: Skips irrelevant agents based on PR content
- ✅ **Deduplication**: Removes duplicate findings within and across agents
- ✅ **Cross-Agent Patterns**: Detects patterns across multiple agents
- ✅ **Performance Optimization**: Validates execution time targets
- ✅ **Educational Content**: Ensures relevant learning resources are generated

## Running Individual Tests

### Test Specific PR Scenario
```bash
# Run the E2E test runner with all scenarios
npm run test:pr-scenarios

# For debugging specific scenarios, modify e2e-test-runner.ts
```

### Test Deduplication
```bash
npm run test:deduplication
```

### Test PR Analyzer
```bash
npm run test:pr-analyzer
```

### Test Orchestrator Flow
```bash
# Test with different repository scenarios
npm run test:scenario:flask    # Small Python app
npm run test:scenario:react    # Medium JS app
npm run test:scenario:vscode   # Large TS app
```

## Expected Results

### Agent Selection
- **Docs-only PRs**: Skip security, performance, dependencies agents
- **UI-only PRs**: Skip backend-focused agents
- **Test-only PRs**: Only run code quality agent
- **Security PRs**: Prioritize security agent

### Deduplication Metrics
- **Within-agent**: ~30-50% reduction for similar findings
- **Cross-agent**: ~20-30% reduction for related issues
- **Similarity threshold**: 0.7 (configurable)

### Performance Targets
- **Small PRs**: < 2 minutes
- **Medium PRs**: < 3 minutes
- **Large PRs**: < 5 minutes
- **Test execution**: < 5 seconds per scenario

## Test Output

Tests provide detailed output including:
- Findings summary (total, by category, by severity)
- Agent execution details (which ran, which were skipped)
- Deduplication statistics
- Performance metrics
- Pass/fail status with specific issues

## Debugging

Enable debug logging:
```bash
DEBUG=codequal:* npm run test:pr-scenarios
```

Run tests with verbose output:
```bash
npm run test:orchestrator:debug
```

## Adding New Test Scenarios

1. Add scenario to `src/e2e/pr-comprehensive-scenarios.ts`
2. Update expected behavior in `e2e-test-runner.ts`
3. Document in `TEST-SCENARIOS.md`
4. Run tests to validate

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
- name: Run E2E Tests
  run: |
    cd packages/test-integration
    npm ci
    npm run build
    npm run test:all
```

## Troubleshooting

### Common Issues

1. **Build Errors**: Ensure all packages are built
   ```bash
   npm run build:packages # from root
   ```

2. **Import Errors**: Check relative paths in test files

3. **Timeout Issues**: Increase test timeout in jest.config or specific tests

4. **Memory Issues**: Run tests individually or increase Node heap
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run test:all
   ```

## Test Data

Test scenarios use realistic PR data including:
- Actual code patches
- Multiple file changes
- Various file types (.ts, .js, .json, .md, etc.)
- Different change sizes (small to large)

## Contributing

When adding tests:
1. Follow existing patterns
2. Include clear test descriptions
3. Add appropriate assertions
4. Document expected behavior
5. Ensure tests are deterministic