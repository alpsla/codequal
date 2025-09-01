# Comprehensive Testing Strategy

## 🎯 Testing Philosophy
**Test Early, Test Often, Test Everything**
- Each tool must work in isolation
- Tools must work together in parallel
- Full flow must handle real-world PRs
- Performance must meet SLA requirements

## 🧪 Testing Levels

### Level 1: Unit Tests (Per Tool)
Test each tool individually with mock data

```typescript
// Example: test-npm-audit.spec.ts
describe('npm-audit tool', () => {
  it('should detect known vulnerabilities', async () => {
    const mockPackageJson = {
      dependencies: {
        'lodash': '4.17.11' // Known vulnerability
      }
    };
    
    const result = await npmAuditTool.execute(mockPackageJson);
    expect(result.vulnerabilities).toHaveLength(1);
    expect(result.vulnerabilities[0].severity).toBe('high');
  });
  
  it('should handle missing package.json gracefully', async () => {
    const result = await npmAuditTool.execute(null);
    expect(result.vulnerabilities).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });
  
  it('should timeout after 30 seconds', async () => {
    const slowRepo = 'large-repo-path';
    await expect(
      npmAuditTool.execute(slowRepo, { timeout: 30000 })
    ).rejects.toThrow('Timeout');
  });
});
```

### Level 2: Integration Tests (Per Agent)
Test multi-tool agents with real repos

```typescript
// Example: test-security-agent.spec.ts
describe('MultiToolSecurityAgent', () => {
  const agent = new MultiToolSecurityAgent();
  
  it('should run applicable tools in parallel', async () => {
    const startTime = Date.now();
    const result = await agent.analyze({
      targetPath: 'test-repos/javascript-project',
      language: 'javascript'
    });
    
    const duration = Date.now() - startTime;
    
    // Should run multiple tools
    expect(result.tools.length).toBeGreaterThan(3);
    
    // Should be faster than sequential (rough check)
    expect(duration).toBeLessThan(10000); // 10 seconds max
    
    // Should have findings from different tools
    expect(result.issues.some(i => i.tool === 'semgrep')).toBe(true);
    expect(result.issues.some(i => i.tool === 'npm-audit')).toBe(true);
  });
  
  it('should deduplicate similar findings', async () => {
    const result = await agent.analyze({
      targetPath: 'test-repos/vulnerable-project',
      language: 'javascript'
    });
    
    // Check no exact duplicates
    const uniqueIssues = new Set(
      result.issues.map(i => `${i.file}:${i.line}:${i.message}`)
    );
    expect(uniqueIssues.size).toBe(result.issues.length);
  });
});
```

### Level 3: End-to-End Tests (Full Flow)
Test complete PR analysis with all agents

```typescript
// Example: test-full-flow.spec.ts
describe('Full PR Analysis Flow', () => {
  const orchestrator = new MCPBasedOrchestrator();
  
  it('should analyze a real PR with all tools', async () => {
    const result = await orchestrator.analyzePullRequest(
      'https://github.com/facebook/react',
      28000, // Real PR number
      { includeAllTools: true }
    );
    
    // Verify all agent results present
    expect(result.security).toBeDefined();
    expect(result.performance).toBeDefined();
    expect(result.codeQuality).toBeDefined();
    expect(result.dependencies).toBeDefined();
    expect(result.architecture).toBeDefined();
    
    // Verify comparison worked
    expect(result.comparison.newIssues).toBeDefined();
    expect(result.comparison.fixedIssues).toBeDefined();
    expect(result.comparison.existingIssues).toBeDefined();
    
    // Verify report generation
    expect(result.reports.markdown).toContain('## Security Issues');
    expect(result.reports.html).toContain('<html>');
  });
  
  it('should complete analysis within SLA', async () => {
    const startTime = Date.now();
    
    await orchestrator.analyzePullRequest(
      'https://github.com/vercel/next.js',
      50000,
      { includeAllTools: true }
    );
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(60000); // 60 second SLA
  });
});
```

## 🏗️ Test Infrastructure

### Test Repository Structure
```
test-repos/
├── javascript-project/
│   ├── package.json
│   ├── src/
│   └── vulnerable-deps/
├── python-project/
│   ├── requirements.txt
│   ├── app/
│   └── known-issues/
├── java-project/
│   ├── pom.xml
│   ├── src/main/java/
│   └── security-flaws/
├── go-project/
│   ├── go.mod
│   ├── cmd/
│   └── problematic-code/
└── polyglot-project/
    ├── frontend/ (JS)
    ├── backend/ (Python)
    └── services/ (Go)
```

### Mock Data Sets
```typescript
// test-fixtures/mock-issues.ts
export const MOCK_SECURITY_ISSUES = [
  {
    type: 'sql-injection',
    severity: 'critical',
    file: 'src/api/users.js',
    line: 45,
    tool: 'semgrep'
  },
  {
    type: 'xss',
    severity: 'high',
    file: 'src/views/render.js',
    line: 23,
    tool: 'semgrep'
  }
];

export const MOCK_DEPENDENCY_ISSUES = [
  {
    package: 'lodash',
    version: '4.17.11',
    vulnerability: 'Prototype Pollution',
    severity: 'high',
    tool: 'npm-audit'
  }
];
```

## 📊 Testing Metrics

### Coverage Requirements
- **Unit Tests:** 90% code coverage minimum
- **Integration Tests:** All critical paths covered
- **E2E Tests:** Top 10 user scenarios covered

### Performance Benchmarks
| Operation | Target | Maximum |
|-----------|--------|---------|
| Single tool execution | 2s | 5s |
| Multi-tool agent (5 tools) | 5s | 10s |
| Full PR analysis | 30s | 60s |
| Report generation | 2s | 5s |
| Cache retrieval | 100ms | 500ms |

### Accuracy Targets
- **True Positive Rate:** >90%
- **False Positive Rate:** <10%
- **Issue Deduplication:** >95% accuracy
- **Language Detection:** >98% accuracy

## 🔄 Continuous Testing

### Pre-commit Hooks
```bash
#!/bin/bash
# .husky/pre-commit

# Run unit tests for changed files
npm run test:unit:changed

# Run linting
npm run lint

# Type checking
npm run typecheck
```

### CI Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:unit
      
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:e2e
      
  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:performance
```

## 🐛 Test Debugging

### Debug Mode
```typescript
// Enable detailed logging during tests
process.env.DEBUG = 'codequal:*';
process.env.LOG_LEVEL = 'debug';

// Increase timeouts for debugging
jest.setTimeout(300000); // 5 minutes

// Keep test repos after failure
process.env.KEEP_TEST_REPOS = 'true';
```

### Common Issues and Solutions

#### Issue: Tool not found
```typescript
// Solution: Mock the tool if not installed
if (!isToolInstalled('semgrep')) {
  jest.mock('../tools/semgrep', () => ({
    execute: jest.fn().mockResolvedValue(MOCK_SEMGREP_RESULTS)
  }));
}
```

#### Issue: Flaky parallel tests
```typescript
// Solution: Add retry logic
jest.retryTimes(3, { logErrorsBeforeRetry: true });
```

#### Issue: Slow tests
```typescript
// Solution: Use test parallelization
// jest.config.js
module.exports = {
  maxWorkers: '50%',
  testTimeout: 30000
};
```

## 📈 Test Reporting

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Performance Reports
```typescript
// performance-reporter.ts
export class PerformanceReporter {
  private metrics: Map<string, number[]> = new Map();
  
  record(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }
  
  report() {
    for (const [op, durations] of this.metrics) {
      const avg = durations.reduce((a, b) => a + b) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      console.log(`${op}: avg=${avg}ms, min=${min}ms, max=${max}ms`);
    }
  }
}
```

## 🎯 Testing Checklist

### Before Each Release
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] No security vulnerabilities in dependencies
- [ ] Code coverage >90%
- [ ] Manual smoke test completed
- [ ] Load test with 100 concurrent requests
- [ ] Memory leak test (24 hour run)
- [ ] Cross-platform testing (Linux, Mac, Windows)

### For Each New Tool
- [ ] Unit test for tool execution
- [ ] Unit test for error handling
- [ ] Unit test for timeout
- [ ] Integration test with agent
- [ ] Performance benchmark
- [ ] Add to test matrix
- [ ] Update documentation
- [ ] Add to CI pipeline

## 🚀 Quick Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run tests for specific component
npm run test -- packages/agents/src/two-branch

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- test-npm-audit.spec.ts

# Debug specific test
node --inspect-brk node_modules/.bin/jest test-full-flow.spec.ts
```

---

**Remember:** A feature without tests is a bug waiting to happen!