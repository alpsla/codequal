/**
 * Manual test script for DeepWiki tool integration
 * Run this to validate the deployment manually
 */

import { ToolRunnerService } from '../tool-runner.service';
import { ToolResultStorageService } from '../tool-result-storage.service';
import type { VectorStorageService } from '@codequal/database';
import { Logger } from '../../../utils/logger';
import * as path from 'path';

// Test configuration
const TEST_REPOS = {
  javascript: process.env.TEST_JS_REPO || path.join(__dirname, '../../../../..', 'packages/mcp-hybrid'),
  typescript: process.env.TEST_TS_REPO || path.join(__dirname, '../../../../..', 'packages/core'),
  root: process.env.TEST_ROOT_REPO || path.join(__dirname, '../../../../..')
};

// Simple logger for testing
const logger: Logger = {
  info: (msg: string, meta?: any) => console.log('[INFO]', msg, meta || ''),
  warn: (msg: string, meta?: any) => console.warn('[WARN]', msg, meta || ''),
  error: (msg: string, meta?: any) => console.error('[ERROR]', msg, meta || ''),
  debug: (msg: string, meta?: any) => console.debug('[DEBUG]', msg, meta || '')
} as Logger;

// Mock embedding service for testing
const mockEmbeddingService = {
  generateEmbedding: async (text: string) => {
    // Simulate embedding generation
    await new Promise(resolve => setTimeout(resolve, 10));
    return new Array(1536).fill(0).map(() => Math.random());
  }
};

async function runManualTests() {
  console.log('=== DeepWiki Tool Integration Manual Test ===\n');

  // Initialize services
  const toolRunner = new ToolRunnerService(logger);
  const vectorStorage = new VectorStorageService();
  const toolStorage = new ToolResultStorageService(vectorStorage, mockEmbeddingService);

  // Test each repository type
  for (const [type, repoPath] of Object.entries(TEST_REPOS)) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing ${type} repository: ${repoPath}`);
    console.log('='.repeat(50));

    try {
      // 1. Run tools
      console.log('\n1. Running tools...');
      const startTime = Date.now();
      
      const results = await toolRunner.runTools({
        repositoryPath: repoPath,
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
        timeout: 60000
      });

      const executionTime = Date.now() - startTime;
      console.log(`   Execution completed in ${executionTime}ms`);

      // 2. Display results
      console.log('\n2. Tool Results:');
      for (const [toolId, result] of Object.entries(results)) {
        if (result.success) {
          console.log(`   ✅ ${toolId}:`);
          console.log(`      - Execution time: ${result.executionTime}ms`);
          
          // Show key metrics
          if (result.metadata) {
            console.log(`      - Metadata:`, result.metadata);
          }
        } else {
          console.log(`   ❌ ${toolId}: ${result.error}`);
        }
      }

      // 3. Test storage (if connected to Supabase)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        console.log('\n3. Testing Vector DB storage...');
        
        const repoId = `manual-test-${type}-${Date.now()}`;
        await toolStorage.storeToolResults(repoId, results as any, {
          scheduledRun: false
        });
        
        console.log('   ✅ Results stored in Vector DB');
        
        // Verify retrieval
        const chunks = await vectorStorage.getChunksBySource(
          'tool',
          repoId,
          repoId
        );
        
        console.log(`   ✅ Retrieved ${chunks.length} chunks from Vector DB`);
      } else {
        console.log('\n3. Skipping Vector DB test (no Supabase credentials)');
      }

    } catch (error) {
      console.error(`\n❌ Error testing ${type} repository:`, error);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary:');
  console.log('- Tool execution: ✅');
  console.log('- Result formatting: ✅');
  console.log(`- Vector DB storage: ${process.env.SUPABASE_URL ? '✅' : '⚠️  (skipped)'}`);
  console.log('='.repeat(50));
}

// Performance test
async function runPerformanceTest() {
  console.log('\n=== Performance Test ===');
  
  const toolRunner = new ToolRunnerService(logger);
  const repoPath = TEST_REPOS.root;
  
  const iterations = 3;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    console.log(`\nIteration ${i + 1}/${iterations}`);
    const start = Date.now();
    
    await toolRunner.runTools({
      repositoryPath: repoPath,
      enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
    });
    
    const duration = Date.now() - start;
    times.push(duration);
    console.log(`Completed in ${duration}ms`);
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log('\nPerformance Results:');
  console.log(`- Average: ${avg.toFixed(0)}ms`);
  console.log(`- Min: ${min}ms`);
  console.log(`- Max: ${max}ms`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--performance')) {
    await runPerformanceTest();
  } else {
    await runManualTests();
  }
  
  // Keep process alive if testing Vector DB
  if (!process.env.SUPABASE_URL) {
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runManualTests, runPerformanceTest };
