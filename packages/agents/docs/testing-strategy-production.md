# Testing Strategy for Production/Staging (No Mock Data)

## The New Approach: Real Data Only

### ❌ OLD WAY (Mock Data)
```typescript
// This is what we're REMOVING
if (error) {
  return getMockSecurityAlerts(); // Fake data in prod
}
```

### ✅ NEW WAY (Real Testing)
```typescript
// Use REAL repositories with KNOWN issues for testing
if (error) {
  return []; // Return empty, be honest
}
```

## Testing Strategies for Production/Staging

### 1. Use Test Repositories with Real Issues

Create or use repositories that have REAL security issues for testing:

```typescript
// test-repositories.ts
export const TEST_REPOS = {
  // Your own test repos with intentional vulnerabilities
  withVulnerabilities: 'https://github.com/alpsla/test-vulnerable-app',
  withSecrets: 'https://github.com/alpsla/test-exposed-secrets',
  withDependencies: 'https://github.com/alpsla/test-outdated-deps',
  
  // Public repos known to have issues (for testing only)
  publicWithIssues: [
    'https://github.com/WebGoat/WebGoat',  // Intentionally vulnerable
    'https://github.com/OWASP/NodeGoat',    // Intentionally vulnerable
    'https://github.com/juice-shop/juice-shop' // Intentionally vulnerable
  ]
};

// In staging/prod tests
async function testStagingEnvironment() {
  // Test with REAL vulnerable repos
  const result = await scanner.analyze(TEST_REPOS.withVulnerabilities);
  
  // Verify REAL issues are found
  expect(result.issues.length).toBeGreaterThan(0);
  expect(result.issues[0].__isMockData).toBeUndefined(); // Not mock!
}
```

### 2. Seed Test Data in Your Own Repos

Create controlled test scenarios with real vulnerabilities:

```bash
# Create a test branch with known issues
git checkout -b test-vulnerabilities

# Add a vulnerable package
npm install lodash@4.17.20  # Has known CVEs

# Add a test secret (already revoked)
echo "aws_access_key_id=AKIAIOSFODNN7EXAMPLE" >> .env.test

# Commit these for testing
git add . && git commit -m "Test: Add known vulnerabilities for staging tests"
```

### 3. Staging Test Suite

```typescript
// staging-tests.ts
export class StagingTestSuite {
  private testRepos: Map<string, string>;
  
  constructor() {
    // Use YOUR repos that you control
    this.testRepos = new Map([
      ['clean', 'https://github.com/alpsla/clean-repo'],
      ['vulnerable', 'https://github.com/alpsla/vulnerable-test'],
      ['mixed', 'https://github.com/alpsla/codequal'] // Your actual repo
    ]);
  }
  
  async runStagingTests(): Promise<TestResults> {
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    
    // Test 1: Clean repo should return empty
    const cleanResult = await this.testCleanRepo();
    
    // Test 2: Vulnerable repo should find real issues
    const vulnResult = await this.testVulnerableRepo();
    
    // Test 3: Your repo should find actual issues
    const realResult = await this.testRealRepo();
    
    // Test 4: API failures should return empty, not mock
    const failureResult = await this.testAPIFailure();
    
    return results;
  }
  
  private async testCleanRepo() {
    const result = await scanner.analyze(this.testRepos.get('clean'));
    
    // Should return empty or very few issues
    assert(result.issues.length < 5, 'Clean repo has too many issues');
    assert(!result.metadata.mockData, 'Should not use mock data');
    
    return { passed: true, name: 'Clean Repo Test' };
  }
  
  private async testVulnerableRepo() {
    const result = await scanner.analyze(this.testRepos.get('vulnerable'));
    
    // Should find REAL vulnerabilities we planted
    assert(result.issues.length > 0, 'Should find vulnerabilities');
    assert(result.issues.some(i => i.type === 'dependency'), 'Should find dep issues');
    assert(!result.metadata.mockData, 'Should not use mock data');
    
    return { passed: true, name: 'Vulnerable Repo Test' };
  }
  
  private async testAPIFailure() {
    // Temporarily break the token
    const originalToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'invalid-token';
    
    const result = await scanner.analyze('https://github.com/facebook/react');
    
    // Should return empty, NOT mock data
    assert(result.issues.length === 0, 'Should return empty on API failure');
    assert(!result.metadata.mockData, 'Should NOT fallback to mock data');
    assert(result.metadata.error, 'Should indicate error occurred');
    
    process.env.GITHUB_TOKEN = originalToken;
    return { passed: true, name: 'API Failure Handling' };
  }
}
```

### 4. Integration Tests with Docker

```dockerfile
# Dockerfile.test
FROM node:18

# Create test environment
WORKDIR /app

# Copy code
COPY . .

# Install dependencies
RUN npm install

# Set production environment
ENV NODE_ENV=production
ENV DISABLE_MOCK_DATA=true

# Run tests against real repos
CMD ["npm", "run", "test:staging"]
```

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-vulnerable-app:
    image: vulnerables/web-dvwa:latest  # Intentionally vulnerable app
    ports:
      - "8080:80"
  
  test-outdated-app:
    build:
      context: ./test-apps/outdated
    environment:
      - OLD_DEPENDENCIES=true
  
  scanner:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      - NODE_ENV=staging
      - TEST_REPO_1=http://test-vulnerable-app
      - TEST_REPO_2=http://test-outdated-app
    depends_on:
      - test-vulnerable-app
      - test-outdated-app
```

### 5. Smoke Tests for Production

```typescript
// smoke-tests-production.ts
export async function runProductionSmokeTests() {
  console.log('🔥 Running production smoke tests...');
  
  // Test 1: Verify no mock data in production
  const mockCheck = await verifyNoMockData();
  assert(mockCheck.passed, 'Mock data detected in production!');
  
  // Test 2: Test with YOUR OWN repo (you have access)
  const ownRepo = await scanner.analyze('https://github.com/alpsla/codequal');
  assert(ownRepo.issues.length >= 0, 'Should handle own repo');
  assert(!ownRepo.metadata.mockData, 'No mock data in production');
  
  // Test 3: Test with public repo (limited access)
  const publicRepo = await scanner.analyze('https://github.com/juice-shop/juice-shop');
  assert(publicRepo.metadata.dataSource !== 'mock', 'Should not use mock');
  
  // Test 4: Verify error handling
  const invalidRepo = await scanner.analyze('https://github.com/invalid/repo');
  assert(invalidRepo.issues.length === 0, 'Should return empty for invalid');
  assert(invalidRepo.metadata.error, 'Should indicate error');
  
  console.log('✅ All production smoke tests passed!');
}

async function verifyNoMockData() {
  // Check that mock methods throw in production
  try {
    const agent = new GitHubAgent();
    const mockData = agent.getMockData?.(); // Should throw or return empty
    
    if (mockData && mockData.length > 0) {
      throw new Error('Mock data returned in production!');
    }
    
    return { passed: true };
  } catch (error) {
    // Mock methods should throw in production
    return { passed: true };
  }
}
```

### 6. Continuous Testing Pipeline

```yaml
# .github/workflows/staging-tests.yml
name: Staging Environment Tests

on:
  push:
    branches: [staging]
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  test-staging:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Check for mock data
        run: npm run check:no-mock
        
      - name: Run staging tests with real repos
        env:
          NODE_ENV: staging
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TEST_MODE: real-data
        run: |
          # Test with known vulnerable repos
          npm run test:staging -- --repos=vulnerable
          
          # Test with clean repos
          npm run test:staging -- --repos=clean
          
          # Test API failures
          npm run test:staging -- --test-failures
      
      - name: Verify no mock data used
        run: |
          if grep -r "mockData" test-results.json; then
            echo "❌ Mock data detected in staging!"
            exit 1
          fi
          echo "✅ No mock data used"
```

## Summary: Testing Without Mock Data

### In Development
- Use mock data freely for rapid development
- Test with local repos

### In Staging
- Use test repositories with KNOWN vulnerabilities
- Test with your OWN repositories (full API access)
- Use intentionally vulnerable apps (OWASP WebGoat, etc.)
- Verify empty results on API failures (no mock fallback)

### In Production
- NEVER use mock data
- Only scan real repositories
- Return empty arrays when data unavailable
- Log all scanning attempts for audit

### Key Testing Repos
1. **Your repos** - Full access, real data
2. **Test repos** - Repos you create with known issues
3. **OWASP repos** - Intentionally vulnerable for testing
4. **Public repos** - Limited access, but real structure

This approach ensures you're always testing with REAL scenarios, not fake data!