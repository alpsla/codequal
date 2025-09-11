# CodeQual E2E Test Scenarios Documentation

## Overview

This document describes the comprehensive test scenarios for testing CodeQual's functionality using different PR contexts. These tests validate the entire system's behavior including:

- Intelligent agent selection based on PR content
- Tool execution relevance
- Deduplication within and across agents
- Educational content generation
- Performance optimization
- Cross-agent pattern detection

## Test Structure

All test files are located in `/packages/test-integration/src/e2e/`:

```
test-integration/
├── src/
│   └── e2e/
│       ├── pr-comprehensive-scenarios.ts  # All PR test scenarios
│       ├── e2e-test-runner.ts            # Main test runner
│       ├── pr-basic-scenarios.ts         # Basic PR scenarios
│       ├── deduplication-test.js         # Deduplication testing
│       ├── pr-analyzer-test.js           # PR analyzer testing
│       ├── test-scenarios.ts             # Repository test scenarios
│       └── orchestrator-flow.test.ts     # Orchestrator flow tests
```

## PR Test Scenarios

### 1. Security Critical PR (`SECURITY_CRITICAL_PR`)

**Purpose**: Test security-focused analysis with authentication changes

**Changes**:
- Migration from bcrypt to argon2 for password hashing
- JWT validation improvements
- Rate limiting implementation
- Environment variable configuration

**Expected Behavior**:
- Security agent should be prioritized
- Should detect authentication vulnerabilities
- Should identify configuration security issues
- Code quality agent should also run

**Key Findings Expected**:
- Password hashing algorithm changes
- JWT security improvements
- Rate limiting implementation
- Environment variable security

### 2. Performance Optimization PR (`PERFORMANCE_OPTIMIZATION_PR`)

**Purpose**: Test performance analysis capabilities

**Changes**:
- Worker thread implementation
- LRU cache addition
- Database query optimization
- N+1 query problem fixes

**Expected Behavior**:
- Performance agent should be prioritized
- Architecture agent should analyze structural changes
- Should skip dependency agent (no dep changes)

**Key Findings Expected**:
- Cache implementation benefits
- Query optimization improvements
- Worker thread performance gains
- N+1 query detection and fixes

### 3. Architecture Refactoring PR (`ARCHITECTURE_REFACTOR_PR`)

**Purpose**: Test architectural analysis and pattern detection

**Changes**:
- Dependency injection implementation
- Repository pattern introduction
- Service layer refactoring
- Inversify container setup

**Expected Behavior**:
- Architecture agent should be prioritized
- Code quality agent should analyze patterns
- Security agent might be skipped

**Key Findings Expected**:
- Dependency injection benefits
- Repository pattern implementation
- Service layer improvements
- Circular dependency detection

### 4. Dependency Update PR (`DEPENDENCY_UPDATE_PR`)

**Purpose**: Test dependency vulnerability scanning

**Changes**:
- Major version updates for core dependencies
- Security patches
- Package-lock.json updates

**Expected Behavior**:
- Security agent should analyze vulnerabilities
- Dependencies agent should be active
- Architecture and performance agents should be skipped

**Key Findings Expected**:
- Vulnerable dependency detection
- Breaking change identification
- Security improvement recommendations

### 5. Mixed Changes with Duplicates (`MIXED_WITH_DUPLICATES_PR`)

**Purpose**: Test deduplication capabilities across agents

**Changes**:
- Multiple SQL injection vulnerabilities
- Similar security issues in different files
- Weak cryptographic algorithms

**Expected Behavior**:
- Multiple agents should find similar issues
- Deduplication should merge similar findings
- Cross-agent patterns should be detected

**Key Findings Expected**:
- SQL injection vulnerabilities (deduplicated)
- Weak crypto algorithm usage (deduplicated)
- Pattern: "Multiple security vulnerabilities"

### 6. Frontend Only PR (`FRONTEND_ONLY_PR`)

**Purpose**: Test agent skipping for UI-only changes

**Changes**:
- React component updates
- CSS styling changes
- Frontend hooks implementation

**Expected Behavior**:
- Should skip security, dependencies, and architecture agents
- Code quality and performance agents should run
- Focus on frontend-specific issues

**Key Findings Expected**:
- React hook dependencies
- Component performance issues
- CSS optimization opportunities

### 7. Test Only PR (`TEST_ONLY_PR`)

**Purpose**: Test minimal agent execution for test changes

**Changes**:
- Unit test additions
- Test refactoring
- Mock implementations

**Expected Behavior**:
- Should skip most agents (security, performance, dependencies, architecture)
- Only code quality agent should run
- Focus on test quality

**Key Findings Expected**:
- Test coverage improvements
- Test structure quality
- Mock usage patterns

### 8. Infrastructure PR (`INFRASTRUCTURE_PR`)

**Purpose**: Test DevOps and infrastructure analysis

**Changes**:
- Dockerfile optimization
- CI/CD pipeline updates
- Docker Compose configuration

**Expected Behavior**:
- Security agent for container security
- Architecture agent for infrastructure design
- Should skip performance agent

**Key Findings Expected**:
- Container security issues
- Health check configuration
- CI/CD best practices
- Infrastructure patterns

## Running the Tests

### Quick Test Run
```bash
cd packages/test-integration
npm run test:e2e
```

### Run Specific Scenario
```bash
node src/e2e/e2e-test-runner.ts --scenario="Security Critical PR"
```

### Run Deduplication Tests
```bash
node src/e2e/deduplication-test.js
```

### Run PR Analyzer Tests
```bash
node src/e2e/pr-analyzer-test.js
```

## Expected Test Results

### Agent Selection Validation
- Docs-only PRs should skip security, performance, dependencies agents
- UI-only PRs should skip backend-focused agents
- Security PRs should prioritize security agent
- Mixed PRs should run all relevant agents

### Deduplication Validation
- Similar findings within same agent should be merged
- Cross-agent duplicate findings should be consolidated
- Similarity threshold of 0.7 should catch related issues
- Merged findings should retain highest confidence score

### Performance Targets
- Small PRs: < 2 minutes execution time
- Medium PRs: < 3 minutes execution time
- Large PRs: < 5 minutes execution time
- Test execution: < 5 seconds per scenario

### Educational Content
- Each scenario should generate relevant educational resources
- Skill levels should match PR complexity
- Topics should align with detected issues

## Integration with CI/CD

These tests can be integrated into the CI/CD pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: cd packages/test-integration && npm run test:e2e
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all packages are built before running tests
   ```bash
   npm run build:packages
   ```

2. **Timeout Errors**: Increase timeout for large scenarios
   ```typescript
   timeout: 600000 // 10 minutes for large repos
   ```

3. **Deduplication Failures**: Check similarity threshold settings
   ```typescript
   similarityThreshold = 0.7 // Adjust if needed
   ```

## Future Enhancements

1. **Performance Benchmarking**: Track execution times across releases
2. **Cost Analysis**: Monitor token usage and API costs
3. **Real PR Testing**: Test against actual GitHub/GitLab PRs
4. **Multi-language Support**: Add scenarios for Python, Java, Go, Rust
5. **Advanced Patterns**: Test more complex cross-agent patterns
6. **Regression Testing**: Ensure fixes don't break existing functionality

## Contributing

When adding new test scenarios:

1. Add the scenario to `pr-comprehensive-scenarios.ts`
2. Update the test runner with expected behavior
3. Document the scenario in this file
4. Ensure the scenario tests a unique aspect of the system
5. Add appropriate assertions and validations