import { AnalysisCacheService } from './AnalysisCacheService';
import { CacheManager } from './CacheManager';
import { BranchAnalysisResult, ToolResult } from '../types';

async function testCache() {
  console.log('🧪 Testing Two-Branch Cache Implementation...\n');
  
  // Test 1: Basic cache service
  console.log('1️⃣ Testing AnalysisCacheService...');
  const cacheService = new AnalysisCacheService({
    keyPrefix: 'test:',
    ttl: 60
  });
  
  // Test basic set/get
  await cacheService.set('test-key', { data: 'test' });
  const basicResult = await cacheService.get('test-key');
  console.log('   Basic set/get:', basicResult ? '✅' : '❌');
  
  // Test branch analysis caching
  const mockBranchResult: BranchAnalysisResult = {
    branch: 'main',
    commitHash: 'abc123',
    files: 10,
    tools: 3,
    issues: [],
    metrics: {
      totalIssues: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      byCategory: { security: 0, quality: 0, performance: 0, dependency: 0, architecture: 0 } as any,
      byTool: {},
      severityDistribution: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      categoryDistribution: { security: 0, quality: 0, performance: 0, dependency: 0, architecture: 0 } as any,
      issuesPerFile: 0,
      criticalityScore: 0,
      duration: 0,
      analyzedFiles: 0
    },
    timestamp: new Date()
  };
  
  await cacheService.cacheBranchAnalysis('test/repo', 'main', mockBranchResult);
  const cachedBranch = await cacheService.getCachedBranchAnalysis('test/repo', 'main');
  console.log('   Branch caching:', cachedBranch ? '✅' : '❌');
  
  // Test tool result caching
  const mockToolResult: ToolResult = {
    tool: 'eslint',
    status: 'success',
    findings: [],
    metadata: {
      executionTime: 1000,
      filesAnalyzed: 10
    }
  };
  
  await cacheService.cacheToolResult('test/repo', 'main', 'eslint', mockToolResult);
  const cachedTool = await cacheService.getCachedToolResult('test/repo', 'main', 'eslint');
  console.log('   Tool caching:', cachedTool ? '✅' : '❌');
  
  // Test 2: Cache Manager
  console.log('\n2️⃣ Testing CacheManager...');
  const manager = new CacheManager({
    keyPrefix: 'test-manager:',
    enableAutoCleanup: false
  });
  
  // Test getOrCompute pattern
  let computeCalled = false;
  const result = await manager.getOrComputeBranchAnalysis(
    'test/repo2',
    'develop',
    async () => {
      computeCalled = true;
      return mockBranchResult;
    }
  );
  console.log('   GetOrCompute (first call - should compute):', computeCalled ? '✅' : '❌');
  
  // Second call should hit cache
  computeCalled = false;
  const cached = await manager.getOrComputeBranchAnalysis(
    'test/repo2',
    'develop',
    async () => {
      computeCalled = true;
      return mockBranchResult;
    }
  );
  console.log('   GetOrCompute (second call - should hit cache):', !computeCalled ? '✅' : '❌');
  
  // Test batch operations
  const toolResults = new Map<string, ToolResult>([
    ['eslint', mockToolResult],
    ['prettier', { ...mockToolResult, tool: 'prettier' }],
    ['semgrep', { ...mockToolResult, tool: 'semgrep' }]
  ]);
  
  await manager.cacheBatchToolResults('test/repo3', 'main', toolResults);
  const batchGet = await manager.getBatchToolResults(
    'test/repo3',
    'main',
    ['eslint', 'prettier', 'semgrep']
  );
  console.log('   Batch operations:', batchGet.size === 3 ? '✅' : '❌');
  
  // Test statistics
  const stats = manager.getStatistics();
  console.log('\n📊 Cache Statistics:');
  console.log('   Hit rate:', `${stats.hitRate.toFixed(2)}%`);
  console.log('   Branch hits/misses:', `${stats.branchHits}/${stats.branchMisses}`);
  console.log('   Tool hits/misses:', `${stats.toolHits}/${stats.toolMisses}`);
  console.log('   Redis connected:', cacheService.isRedisConnected() ? 'Yes' : 'No (using memory cache)');
  
  // Cleanup
  await manager.shutdown();
  await cacheService.disconnect();
  
  console.log('\n✅ All cache tests completed!');
}

testCache().catch(console.error);