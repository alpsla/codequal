# V8 Real DeepWiki Testing Guide

## Overview

This guide covers how to test the V8 Report Generator with real DeepWiki integration, bypassing mocking to test against actual DeepWiki API endpoints and generate production-quality reports.

## Prerequisites

### 1. Environment Setup

**Required Environment Variables:**
```bash
# Critical - Required for all tests
OPENROUTER_API_KEY=your-openrouter-api-key
DEEPWIKI_API_URL=http://localhost:8001
DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# V8 Testing Specific
USE_V8_REPORT_GENERATOR=true
USE_DEEPWIKI_MOCK=false

# Optional - For enhanced testing
REDIS_URL=redis://localhost:6379
ENABLE_MODEL_AVAILABILITY_CHECK=true
LOG_LEVEL=debug
```

**Environment File Locations:**
The system will automatically search for `.env` files in:
1. `./packages/agents/.env`
2. `../../.env` (workspace root)
3. `/Users/alpinro/Code Prjects/codequal/.env`

### 2. DeepWiki Service Setup

**Local Development:**
```bash
# Start DeepWiki service via Kubernetes port forwarding
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# Verify service is running
curl -s http://localhost:8001/health | jq
```

**Service Verification:**
```bash
# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# View logs for troubleshooting
kubectl logs -n codequal-dev -l app=deepwiki -f
```

## Primary Test File

### `test-v8-final.ts` - Main V8 Testing Script

**Location:** `/packages/agents/test-v8-final.ts`

**Purpose:** 
- Test V8 Report Generator with various language/repository scenarios
- Generate production-quality reports using real DeepWiki analysis
- Validate report structure and content quality

**Usage:**
```bash
# From the agents package directory
cd /packages/agents

# Run with TypeScript directly
npx ts-node test-v8-final.ts

# Or compile and run
npm run build && node dist/test-v8-final.js
```

## Test Scenarios

### 1. Multi-Language Testing

The test file includes comprehensive scenarios:

```typescript
const TEST_SCENARIOS = [
  {
    id: 'python-large',
    language: 'python',
    size: 'large',
    repository: 'https://github.com/django/django',
    prNumber: 17500,
    branch: 'feature/auth-improvements'
  },
  {
    id: 'go-medium',
    language: 'go', 
    size: 'medium',
    repository: 'https://github.com/gin-gonic/gin',
    prNumber: 3700,
    branch: 'feature/middleware'
  },
  {
    id: 'rust-small',
    language: 'rust',
    size: 'small',
    repository: 'https://github.com/serde-rs/serde',
    prNumber: 2600,
    branch: 'feature/derive'
  },
  {
    id: 'java-enterprise',
    language: 'java',
    size: 'large',
    repository: 'https://github.com/spring-projects/spring-boot',
    prNumber: 38000,
    branch: 'feature/reactive'
  }
];
```

### 2. Issue Generation Patterns

Each language scenario includes realistic issues:

**Python Issues:**
- SQL Injection vulnerabilities
- N+1 Query problems
- Missing type hints
- Performance bottlenecks

**Go Issues:**
- Goroutine leaks
- Race conditions
- Error handling patterns
- Memory allocation

**Rust Issues:**
- Lifetime management
- Unsafe block usage
- Ownership patterns
- Performance optimizations

**Java Issues:**
- Spring Security configurations
- Memory leaks
- Thread safety
- Dependency injection

## Real DeepWiki Integration Tests

### 1. Full Integration Test

**File:** `src/standard/deepwiki/__tests__/integration/orchestrator-real-deepwiki-test.ts`

**Features:**
- Real GitHub PR analysis
- Complete orchestrator flow
- No mocking - actual DeepWiki API calls
- Report generation and validation

**Usage:**
```bash
# Run specific integration test
npm test -- --testPathPattern=orchestrator-real-deepwiki-test

# Run with real DeepWiki (ensure environment is set)
USE_DEEPWIKI_MOCK=false npm test -- orchestrator-real-deepwiki-test
```

### 2. Direct Comparison Test

**File:** `src/standard/deepwiki/__tests__/integration/test-comparison-direct.ts`

**Features:**
- Direct V8 report generator testing
- Bypasses orchestrator for faster iteration
- Configurable test scenarios

## Common Pitfalls to Avoid

### 1. Environment Variable Issues

**Problem:** Missing or incorrect environment variables
```bash
# Check if variables are loaded
npm run test:env-check

# Manual verification
echo $DEEPWIKI_API_URL
echo $USE_DEEPWIKI_MOCK
```

**Solution:** Use the centralized env loader:
```typescript
import { loadEnvironment } from '../src/standard/utils/env-loader';

// At the start of your test file
loadEnvironment();
```

### 2. DeepWiki Service Connectivity

**Problem:** DeepWiki service not accessible
```bash
# Test connectivity
curl -s http://localhost:8001/health

# Common fix: restart port forwarding
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

**Solution:** Always verify service health before running tests:
```typescript
async function verifyDeepWikiHealth() {
  try {
    const response = await fetch('http://localhost:8001/health');
    if (!response.ok) {
      throw new Error('DeepWiki service not healthy');
    }
    console.log('✅ DeepWiki service is healthy');
  } catch (error) {
    console.error('❌ DeepWiki service check failed:', error);
    process.exit(1);
  }
}
```

### 3. Mock vs Real Testing Confusion

**Problem:** Accidentally running mocked tests when expecting real results

**Solution:** Explicit environment checking:
```typescript
if (process.env.USE_DEEPWIKI_MOCK === 'true') {
  console.warn('⚠️ Running in MOCK mode - not using real DeepWiki');
  console.warn('Set USE_DEEPWIKI_MOCK=false for real testing');
}
```

### 4. Rate Limiting and Timeouts

**Problem:** Tests failing due to API rate limits

**Solution:** Configure appropriate timeouts:
```typescript
// In your test file
jest.setTimeout(300000); // 5 minutes for real API calls

// Add delays between test scenarios
await new Promise(resolve => setTimeout(resolve, 2000));
```

## Report Verification

### 1. Structure Validation

**Key Sections to Verify:**
```typescript
const expectedSections = [
  'Executive Summary',
  'PR Decision',  
  'Issues Analysis',
  'Architecture Impact',
  'Dependencies Analysis',
  'Breaking Changes',
  'Action Items',
  'Educational Resources',
  'Skills Tracking',
  'AI IDE Integration',
  'Report Metadata'
];
```

### 2. Content Quality Checks

**Issue Analysis:**
- Issues should have proper location information (file, line)
- Severity ratings should be appropriate
- Code snippets should be relevant
- Educational content should be provided

**Educational Content:**
- Relevant course recommendations
- Links should be valid
- Content should match the detected issues

### 3. AI IDE Integration Section

**Required Elements:**
```typescript
const aideIntegrationChecks = [
  'Pre-existing issues summary',
  'New issues with fix priorities', 
  'Code location mapping',
  'Integration instructions',
  'Development workflow guidance'
];
```

## Performance Testing

### 1. Response Time Benchmarks

**Small Repository:** < 30 seconds
**Medium Repository:** < 60 seconds  
**Large Repository:** < 120 seconds
**Enterprise Repository:** < 300 seconds

### 2. Memory Usage Monitoring

```typescript
// Add to test file for memory tracking
const initialMemory = process.memoryUsage();
// ... run test ...
const finalMemory = process.memoryUsage();
console.log('Memory used:', finalMemory.heapUsed - initialMemory.heapUsed);
```

## Debugging Real DeepWiki Issues

### 1. Enable Debug Logging

```bash
LOG_LEVEL=debug npm run test:v8-real
```

### 2. Capture Raw Responses

```typescript
// Add to your test file
import * as fs from 'fs/promises';

// Capture DeepWiki response
const response = await deepWikiService.analyze(repoUrl);
await fs.writeFile(
  `debug-response-${Date.now()}.json`, 
  JSON.stringify(response, null, 2)
);
```

### 3. Common Error Patterns

**Authentication Errors:**
```
Error: 401 Unauthorized
Fix: Check DEEPWIKI_API_KEY and OPENROUTER_API_KEY
```

**Network Timeouts:**
```
Error: ETIMEDOUT
Fix: Increase timeout, check DeepWiki service status
```

**Parsing Errors:**
```
Error: Unexpected JSON structure
Fix: Check DeepWiki API version compatibility
```

## Continuous Integration

### 1. CI Environment Setup

```yaml
# In your CI pipeline
env:
  USE_DEEPWIKI_MOCK: false
  DEEPWIKI_API_URL: ${{ secrets.DEEPWIKI_API_URL }}
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### 2. Test Selection for CI

```bash
# Run only critical V8 tests in CI
npm test -- --testPathPattern=v8.*real --maxWorkers=1
```

## Advanced Testing Scenarios

### 1. Multi-PR Testing

Test the V8 generator against multiple PRs from the same repository:

```typescript
const multiPRScenario = [
  { repo: 'react', prs: [31616, 31500, 31400] },
  { repo: 'django', prs: [17500, 17400, 17300] }
];
```

### 2. Language-Specific Testing

Create focused tests for specific programming languages:

```bash
# Test only Python repositories
npm run test:v8-python

# Test only enterprise Java projects
npm run test:v8-java-enterprise
```

### 3. Comparison Testing

Compare V8 results with V7 results:

```typescript
// Generate both V7 and V8 reports
const v7Report = await generatorV7.generateReport(comparison);
const v8Report = await generatorV8.generateReport(comparison);

// Compare metrics
compareReports(v7Report, v8Report);
```

## Report Output Management

### 1. Generated Files

Reports are saved to:
- `/packages/agents/reports/v8/`
- Filename format: `v8-report-{scenario}-{timestamp}.md`

### 2. HTML Reports

For visual inspection:
```typescript
const htmlReport = generator.generateReport(comparison, { 
  format: 'html',
  includeAIIDESection: true 
});
```

### 3. Report Archiving

Keep reports for regression testing:
```bash
# Archive successful test reports
mkdir -p test-archives/$(date +%Y-%m-%d)
cp reports/v8/*.md test-archives/$(date +%Y-%m-%d)/
```

This comprehensive testing approach ensures that V8 Report Generator works reliably with real DeepWiki data across different programming languages and repository sizes.