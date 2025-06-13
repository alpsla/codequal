# DeepWiki Tool Integration Test Plan

## Overview
This test plan ensures the DeepWiki tool integration works correctly before updating the orchestrator.

## Test Phases

### Phase 1: Local Testing (Before Deployment)
Test the tool runner locally to ensure all components work correctly.

### Phase 2: Docker Testing
Test the Docker image build and tool execution in container.

### Phase 3: Kubernetes Testing
Test deployment to Kubernetes and integration with DeepWiki.

### Phase 4: Integration Testing
Test the complete flow from orchestrator to tool results in Vector DB.

## Phase 1: Local Testing

### 1.1 Tool Runner Unit Tests
```bash
cd packages/core
npm test src/services/deepwiki-tools/__tests__/tool-runner.test.ts
```

### 1.2 Tool Execution Tests
Test each tool individually with sample repositories:

```typescript
// test-tool-execution.ts
import { ToolRunnerService } from '../tool-runner.service';
import { Logger } from '../../../utils/logger';
import * as path from 'path';

const testRepositories = {
  javascript: '/path/to/sample-js-repo',
  typescript: '/path/to/sample-ts-repo',
  monorepo: '/path/to/sample-monorepo'
};

async function testToolExecution() {
  const logger: Logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  } as any;
  
  const toolRunner = new ToolRunnerService(logger);
  
  for (const [type, repoPath] of Object.entries(testRepositories)) {
    console.log(`\n=== Testing ${type} repository ===`);
    
    const results = await toolRunner.runTools({
      repositoryPath: repoPath,
      enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
    });
    
    console.log('Results:', JSON.stringify(results, null, 2));
    
    // Validate results
    for (const [toolId, result] of Object.entries(results)) {
      if (!result.success) {
        console.error(`❌ ${toolId} failed:`, result.error);
      } else {
        console.log(`✅ ${toolId} succeeded`);
      }
    }
  }
}
```

### 1.3 Vector Storage Tests
```typescript
// test-vector-storage.ts
import { ToolResultStorageService } from '../tool-result-storage.service';
import { VectorStorageService } from '@codequal/database/services/ingestion/vector-storage.service';

async function testVectorStorage() {
  const vectorStorage = new VectorStorageService();
  const mockEmbeddingService = {
    generateEmbedding: async (text: string) => {
      // Mock embedding - in production this would be real
      return new Array(1536).fill(0).map(() => Math.random());
    }
  };
  
  const toolStorage = new ToolResultStorageService(
    vectorStorage,
    mockEmbeddingService
  );
  
  // Test storing results
  const mockResults = {
    'npm-audit': {
      toolId: 'npm-audit',
      success: true,
      output: { vulnerabilities: {} },
      executionTime: 1234,
      metadata: {
        totalVulnerabilities: 0,
        vulnerabilities: {
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
          info: 0
        }
      }
    }
  };
  
  await toolStorage.storeToolResults(
    'test-repo-id',
    mockResults,
    { scheduledRun: false }
  );
  
  console.log('✅ Tool results stored successfully');
  
  // Test retrieval
  const chunks = await vectorStorage.getChunksBySource(
    'tool',
    'test-repo-id',
    'test-repo-id'
  );
  
  console.log(`Retrieved ${chunks.length} chunks`);
}
```

## Phase 2: Docker Testing

### 2.1 Build Docker Image
```bash
cd packages/core/src/services/deepwiki-tools/docker

# Build test image
docker build -t deepwiki-tools-test:latest .

# Test tool execution in container
docker run -it --rm \
  -v /path/to/test-repo:/workspace/test-repo \
  deepwiki-tools-test:latest \
  node /tools/tool-executor.js /workspace/test-repo
```

### 2.2 Docker Compose Test Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  deepwiki-tools:
    image: deepwiki-tools-test:latest
    environment:
      - TOOLS_ENABLED=true
      - TOOLS_TIMEOUT=60000
    volumes:
      - ./test-repos:/workspace
    command: >
      sh -c "
        echo '=== Testing JavaScript repo ===' &&
        node /tools/tool-executor.js /workspace/javascript-repo &&
        echo '=== Testing TypeScript repo ===' &&
        node /tools/tool-executor.js /workspace/typescript-repo
      "
```

## Phase 3: Kubernetes Testing

### 3.1 Deploy to Test Namespace
```bash
# Create test namespace
kubectl create namespace codequal-test

# Apply test deployment
kubectl apply -f kubernetes-deployment.yaml -n codequal-test

# Check pod status
kubectl get pods -n codequal-test

# View logs
kubectl logs -f deployment/deepwiki -n codequal-test
```

### 3.2 Test Tool Execution in Pod
```bash
# Execute tools in pod
kubectl exec -it deployment/deepwiki -n codequal-test -- \
  node /tools/tool-executor.js /workspace/test-repo

# Test with specific tools
kubectl exec -it deployment/deepwiki -n codequal-test -- \
  node /tools/tool-executor.js /workspace/test-repo npm-audit,license-checker
```

### 3.3 Performance Testing
```typescript
// performance-test.ts
async function performanceTest() {
  const iterations = 5;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    
    await toolRunner.runTools({
      repositoryPath: testRepo,
      enabledTools: allTools
    });
    
    const duration = Date.now() - start;
    times.push(duration);
    console.log(`Iteration ${i + 1}: ${duration}ms`);
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  console.log(`Average execution time: ${avg}ms`);
}
```

## Phase 4: Integration Testing

### 4.1 End-to-End Test
```typescript
// e2e-test.ts
import { EnhancedDeepWikiManager } from '../../../apps/api/src/services/enhanced-deepwiki-manager';

async function endToEndTest() {
  const manager = new EnhancedDeepWikiManager(
    authenticatedUser,
    vectorStorage,
    embeddingService,
    logger
  );
  
  // Test complete flow
  const testRepo = 'https://github.com/example/test-repo';
  
  // 1. Check if exists (should be false)
  const exists = await manager.checkRepositoryExists(testRepo);
  console.log('Repository exists:', exists);
  
  // 2. Trigger analysis with tools
  const jobId = await manager.triggerRepositoryAnalysisWithTools(testRepo, {
    runTools: true,
    enabledTools: ['npm-audit', 'license-checker']
  });
  console.log('Job created:', jobId);
  
  // 3. Wait for completion
  const results = await manager.waitForAnalysisCompletion(testRepo);
  console.log('Analysis complete:', results);
  
  // 4. Verify tool results
  if (results.toolResults) {
    for (const [toolId, result] of Object.entries(results.toolResults)) {
      console.log(`${toolId}:`, result.success ? '✅' : '❌');
    }
  }
  
  // 5. Check Vector DB
  const exists2 = await manager.checkRepositoryExists(testRepo);
  console.log('Repository now exists:', exists2);
}
```

### 4.2 Vector DB Verification
```sql
-- Check tool results in database
SELECT 
  id,
  repository_id,
  metadata->>'tool_name' as tool_name,
  metadata->>'agent_role' as agent_role,
  metadata->>'is_latest' as is_latest,
  created_at
FROM analysis_chunks
WHERE metadata->>'content_type' = 'tool_result'
  AND repository_id = 'test-repo-id'
ORDER BY created_at DESC;

-- Verify old results were deleted
SELECT COUNT(*) as old_results
FROM analysis_chunks
WHERE metadata->>'content_type' = 'tool_result'
  AND repository_id = 'test-repo-id'
  AND metadata->>'is_latest' != 'true';
```

## Test Success Criteria

### ✅ Phase 1 Success:
- [ ] All unit tests pass
- [ ] Each tool executes successfully on sample repos
- [ ] Results are properly formatted
- [ ] Vector storage works correctly

### ✅ Phase 2 Success:
- [ ] Docker image builds without errors
- [ ] Tools execute in container
- [ ] All dependencies are included
- [ ] Output is properly formatted

### ✅ Phase 3 Success:
- [ ] Kubernetes deployment successful
- [ ] Pod stays healthy
- [ ] Tools execute in pod
- [ ] Resource limits are respected

### ✅ Phase 4 Success:
- [ ] Complete flow works end-to-end
- [ ] Tool results stored in Vector DB
- [ ] Previous results are replaced
- [ ] Agent retrieval works correctly

## Common Issues and Solutions

### Issue: npm audit requires package-lock.json
**Solution**: Test handles missing lock file gracefully

### Issue: TypeScript projects not analyzed
**Solution**: Verify TypeScript installed in Docker image

### Issue: Timeout errors
**Solution**: Increase TOOLS_TIMEOUT environment variable

### Issue: Memory limits exceeded
**Solution**: Adjust Kubernetes resource limits

## Next Steps After Testing

1. **If all tests pass**: Proceed with orchestrator update
2. **If issues found**: Fix and re-test affected phases
3. **Document findings**: Update deployment guide with learnings
4. **Monitor production**: Set up alerts and monitoring
