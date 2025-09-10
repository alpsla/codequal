# V9 Real Integration Tests

This directory contains comprehensive integration tests for the V9 analyzer system that use **real GitHub repositories and pull requests** instead of mocks. These tests validate the complete analysis pipeline against actual codebases to ensure the V9 blocking logic, scoring, and tool execution work correctly in real-world scenarios.

## Overview

The V9 Real Integration Tests provide:

- **Real GitHub API Integration**: Tests fetch actual PR data, modified files, and repository contents
- **Actual Tool Execution**: Runs SpotBugs, Clippy, cargo-audit, and other analysis tools on real code
- **Real Blocking Logic Validation**: Tests the V9 blocking logic against actual existing and new issues
- **Multi-Language Support**: Tests Java, Rust, and mixed-language repositories
- **Performance Testing**: Validates performance with large, real-world codebases
- **Error Handling**: Tests resilience against network failures, tool failures, and edge cases

## Test Structure

```
tests/
├── __tests__/
│   ├── v9-real-integration-config.ts     # Test configuration and curated test cases
│   ├── v9-java-real-integration.test.ts  # Java-specific real integration tests  
│   ├── v9-rust-real-integration.test.ts  # Rust-specific real integration tests
│   └── v9-mixed-language-real-integration.test.ts  # Multi-language tests
├── v9-real-integration-runner.ts         # Command-line test runner
└── README.md                             # This documentation
```

## Quick Start

### Prerequisites

1. **Environment Variables**:
   ```bash
   export GITHUB_TOKEN="your_github_token"         # Required for GitHub API access
   export SUPABASE_URL="your_supabase_url"         # Required for model configs
   export SUPABASE_SERVICE_ROLE_KEY="your_key"     # Required for model configs
   ```

2. **Required Tools**:
   - **Java**: `spotbugs`, `pmd`, `checkstyle`, `dependency-check`, `semgrep`
   - **Rust**: `cargo`, `clippy`, `cargo-audit`

### Running Tests

```bash
# Run all real integration tests
npm run test:v9-real

# Run only Java tests  
npm run test:v9-real -- --language java

# Run only Rust tests
npm run test:v9-real -- --language rust

# Run with mock data (for development/CI)
npm run test:v9-real -- --mock

# Test a specific PR
npm run test:v9-real -- --pr-url https://github.com/owner/repo/pull/123

# Generate detailed report
npm run test:v9-real -- --verbose --report-file report.md

# Run tests with specific tags
npm run test:v9-real -- --tags security,performance

# Run with increased concurrency
npm run test:v9-real -- --max-concurrent 4
```

### Using Jest Directly

```bash
# Run specific test files
npx jest v9-java-real-integration.test.ts --verbose

# Run with environment variables
GITHUB_TOKEN=xxx USE_MOCK_DATA=true npx jest v9-real-integration

# Run with custom timeout
npx jest --testTimeout=600000 v9-rust-real-integration.test.ts
```

## Test Configuration

### Curated Test Cases

The tests use carefully curated real repositories and PRs in `v9-real-integration-config.ts`:

#### Java Test Cases
- **Spring PetClinic**: Clean Java code with minimal issues (should pass)
- **Apache Commons Lang**: Well-maintained library (should pass) 
- **Elasticsearch**: Large codebase with potential security issues (may fail)
- **OWASP WebGoat**: Intentionally vulnerable application (should fail)

#### Rust Test Cases
- **Rustlings**: Educational Rust code with good practices (should pass)
- **Actix Web**: Production web framework (should pass)
- **Tokio**: Async runtime with potential performance issues (should pass with issues)

#### Mixed Language Cases
- **VS Code**: TypeScript/JavaScript with multiple languages

#### Test Case Structure
```typescript
{
  repository: 'https://github.com/owner/repo',
  owner: 'owner',
  repo: 'repo', 
  prNumber: 123,
  language: 'java' | 'rust' | 'mixed',
  description: 'Human readable description',
  expectedOutcome: {
    shouldPass: boolean,
    minIssues: number,
    maxIssues: number,
    expectedCategories: string[],
    hasBlockingIssues: boolean,
    expectedMinScore: number,
    expectedMaxScore: number
  },
  knownIssues?: Array<{
    type: string,
    file?: string, 
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>,
  testTags: string[]
}
```

### Environment Configuration

```typescript
const TEST_ENVIRONMENT = {
  requireGithubToken: true,
  requireTools: {
    java: ['spotbugs', 'pmd', 'checkstyle', 'dependency-check', 'semgrep'],
    rust: ['cargo', 'clippy', 'cargo-audit']
  },
  timeoutMs: 300000,        // 5 minutes per test
  maxConcurrentTests: 2,    // Avoid rate limiting
  cacheDir: '/tmp/v9-real-integration-cache',
  workspaceDir: '/tmp/v9-real-integration-workspaces', 
  retryAttempts: 2
};
```

## Test Categories

### 1. Clean Repositories (Should Pass)
Tests repositories with good code quality that should be approved:
- Minimal blocking issues
- Good scores (70-100)
- Well-maintained codebases

**Example Test**:
```typescript
it('should analyze spring-petclinic#123 and APPROVE', async () => {
  const result = await runRealAnalysis(springPetClinicCase);
  
  expect(result.decision).toBe('approved');
  expect(result.qualityScore).toBeGreaterThanOrEqual(80);
  expect(result.blockingIssues.length).toBe(0);
});
```

### 2. Problematic Repositories (Should Block)  
Tests repositories with security issues that should be rejected:
- Multiple blocking issues
- Low scores (0-60)
- Intentionally vulnerable code

**Example Test**:
```typescript
it('should analyze WebGoat#999 and REJECT', async () => {
  const result = await runRealAnalysis(webGoatCase);
  
  expect(result.decision).toBe('rejected');
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  expect(result.qualityScore).toBeLessThan(50);
});
```

### 3. Tool Execution Validation
Tests that analysis tools run correctly and parse output:
- SpotBugs finds security issues
- Clippy finds Rust-specific problems  
- cargo-audit detects vulnerabilities
- All tools produce parseable output

**Example Test**:
```typescript
it('should execute SpotBugs and parse output correctly', async () => {
  const spotBugsTool = config.tools.find(t => t.name === 'spotbugs');
  const issues = await spotBugsTool.parser(realSpotBugsOutput, workspacePath);
  
  expect(issues.length).toBeGreaterThan(0);
  expect(issues[0]).toHaveProperty('severity');
  expect(issues[0]).toHaveProperty('file');
});
```

### 4. Blocking Logic with Real Issues
Tests the V9 blocking logic against actual code issues:
- New critical/high issues block
- Existing critical/high in modified files block
- Existing issues in unmodified files don't block
- Proper categorization of blocking vs backlog

**Example Test**:
```typescript
it('should correctly identify blocking issues in modified files', async () => {
  const result = await runRealAnalysis(problematicCase);
  
  result.blockingIssues.forEach(issue => {
    const isValidBlocking = 
      (issue.status === 'new' && ['critical', 'high'].includes(issue.severity)) ||
      (issue.status === 'existing' && ['critical', 'high'].includes(issue.severity) && issue.inModifiedFile);
      
    expect(isValidBlocking).toBe(true);
  });
});
```

### 5. Performance and Scalability  
Tests performance with large real-world repositories:
- Large Java repositories (Elasticsearch)
- Complex Rust projects (Tokio)
- Repository caching efficiency
- Tool execution timeouts

**Example Test**:
```typescript
it('should handle large Java repositories efficiently', async () => {
  const startTime = Date.now();
  const result = await runRealAnalysis(elasticsearchCase);
  const analysisTime = Date.now() - startTime;
  
  expect(analysisTime).toBeLessThan(600000); // 10 minutes max
  expect(result.metadata.totalFiles).toBeGreaterThan(1000);
});
```

### 6. Multi-Language Projects
Tests analysis of projects with multiple programming languages:
- Language detection
- Cross-language issue correlation
- Combined scoring and decisions
- Performance with polyglot codebases

**Example Test**:
```typescript
it('should analyze mixed language project and combine results', async () => {
  const detection = await detectProjectLanguages(workspace.path, workspace.changedFiles);
  
  expect(detection.languages.length).toBeGreaterThan(1);
  expect(detection.hasJava).toBe(true);
  expect(detection.hasRust).toBe(true);
  
  const combinedResult = combineAnalysisResults(javaResult, rustResult);
  expect(combinedResult.decision).toMatch(/approved|rejected/);
});
```

### 7. Error Handling and Resilience
Tests robustness against real-world failures:
- Missing tools
- Network timeouts
- Invalid repositories
- Tool crashes

**Example Test**:
```typescript
it('should handle network failures gracefully', async () => {
  // Test with retry logic
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await runRealAnalysis(testCase);
      expect(result).toBeDefined();
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
});
```

## Mock Data Support

For development and CI environments where real GitHub access isn't available:

```bash
# Use mock data
npm run test:v9-real -- --mock

# Or set environment variable
USE_MOCK_DATA=true npm run test:v9-real
```

Mock data provides:
- Realistic issue patterns
- Expected response structures  
- Faster execution for development
- No external dependencies

## Output and Reporting

### Console Output
```
🚀 Starting V9 Real Integration Test Runner
🔍 Checking environment...
✅ Environment check complete
📋 Found 12 test cases to run

🧪 Running 12 integration tests...

🔍 Testing spring-projects-spring-petclinic-123: Spring PetClinic - Clean Java code
✅ spring-projects-spring-petclinic-123: PASSED (45s)
   Score: 87/100, Decision: approved
   Issues: 2 new, 3 existing

🔍 Testing OWASP-WebGoat-999: OWASP WebGoat - Intentionally vulnerable 
❌ OWASP-WebGoat-999: REJECTED (32s)
   Score: 23/100, Decision: rejected
   Issues: 23 new, 45 existing, 15 blocking

📊 V9 Real Integration Test Summary:
Tests completed: 12
Passed: 8 ✅
Failed: 3 ❌  
Skipped: 1 ⏭️
Success Rate: 67%
Duration: 8m 23s
```

### Detailed Reports
```markdown
# V9 Real Integration Test Report

## Summary
- **Total Tests:** 12
- **Passed:** 8 ✅
- **Failed:** 3 ❌
- **Skipped:** 1 ⏭️
- **Success Rate:** 67%
- **Duration:** 503s

## Results by Language
### Java
- Passed: 4/6 (67%)
- Avg Score: 74/100
- Avg Duration: 52s

### Rust  
- Passed: 3/3 (100%)
- Avg Score: 83/100
- Avg Duration: 31s

### Mixed
- Passed: 1/3 (33%) 
- Avg Score: 65/100
- Avg Duration: 78s

## Failures
### OWASP-WebGoat-999
**Error:** Expected 'rejected', got 'approved' - blocking logic failure
```

## Integration with CI/CD

### GitHub Actions
```yaml
name: V9 Real Integration Tests
on: [push, pull_request]

jobs:
  real-integration:
    runs-on: ubuntu-latest
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      USE_MOCK_DATA: "true"  # Use mock data in CI
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run V9 Real Integration Tests
        run: npm run test:v9-real -- --mock --report-file ci-report.md
      
      - name: Upload test report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: v9-integration-report
          path: ci-report.md
```

### Local Development
```bash
# Set up environment
export GITHUB_TOKEN="your_token_here"

# Install analysis tools
brew install spotbugs pmd
cargo install clippy cargo-audit

# Run tests locally with real data
npm run test:v9-real -- --language java --verbose

# Or use mock data for faster iteration
npm run test:v9-real -- --mock --language java
```

## Troubleshooting

### Common Issues

#### 1. GitHub Rate Limiting
```
Error: GitHub API error: rate limit exceeded
```
**Solution**: Use GitHub token, reduce concurrent tests, or use mock data
```bash
npm run test:v9-real -- --max-concurrent 1 --mock
```

#### 2. Missing Analysis Tools
```
Error: Command 'spotbugs' not found
```
**Solution**: Install required tools or skip tool validation
```bash
# Install tools
brew install spotbugs pmd checkstyle
cargo install clippy cargo-audit

# Or use mock data
npm run test:v9-real -- --mock
```

#### 3. Repository Access Issues
```
Error: Repository not found or access denied
```
**Solution**: Check repository URLs and GitHub token permissions
```bash
# Test GitHub access
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/repo
```

#### 4. Test Timeouts
```
Error: Test timeout after 300000ms
```
**Solution**: Increase timeout for large repositories
```bash
npm run test:v9-real -- --timeout 600000  # 10 minutes
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=v9:* npm run test:v9-real -- --verbose
```

Keep test artifacts:
```bash
npm run test:v9-real -- --skip-cleanup
ls /tmp/v9-real-integration-*
```

## Contributing

### Adding New Test Cases

1. **Add to Configuration**:
```typescript
// In v9-real-integration-config.ts
export const NEW_TEST_CASES: RealTestCase[] = [
  {
    repository: 'https://github.com/owner/repo',
    owner: 'owner', 
    repo: 'repo',
    prNumber: 123,
    language: 'java',
    description: 'Description of what this tests',
    expectedOutcome: {
      shouldPass: true,
      minIssues: 0,
      maxIssues: 10,
      expectedCategories: ['Quality', 'Security'],
      hasBlockingIssues: false,
      expectedMinScore: 70,
      expectedMaxScore: 100
    },
    testTags: ['java', 'library', 'security']
  }
];
```

2. **Add Test Implementation**:
```typescript
// In appropriate test file
describe('New Test Category', () => {
  NEW_TEST_CASES.forEach(testCase => {
    it(`should analyze ${testCase.description}`, async () => {
      const result = await runRealAnalysis(testCase);
      // Add assertions
    });
  });
});
```

3. **Test Locally**:
```bash
npm run test:v9-real -- --tags new-category --mock
```

### Guidelines

- **Use Real PRs**: Reference actual PRs that demonstrate specific issues
- **Document Expected Outcomes**: Be specific about expected scores, issues, and decisions
- **Add Appropriate Tags**: Help categorize tests for selective running
- **Test Both Mock and Real**: Ensure tests work with both mock and real data
- **Performance Considerations**: Large repos should have higher timeouts
- **Error Cases**: Include repositories that should fail analysis

## Architecture

### Test Flow
```
1. Environment Check → 2. Repository Setup → 3. Analysis Execution → 4. Result Validation → 5. Report Generation
```

### Component Interaction
```
Runner → Config → Analyzers → RepoManager → GitHub API
   ↓        ↓         ↓           ↓
Report ← Results ← Issues ← Workspace
```

### Caching Strategy
- **Repository Cache**: `/tmp/v9-real-integration-cache/`
- **Workspace Cache**: `/tmp/v9-real-integration-workspaces/`
- **Result Cache**: In-memory during test run
- **Tool Output Cache**: Temporary files cleaned up after analysis

This comprehensive testing approach ensures that the V9 analyzer performs correctly against real-world codebases and provides confidence in production deployments.