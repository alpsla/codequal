#!/usr/bin/env tsx

/**
 * Direct test of data flow without authentication
 * This helps us monitor how data flows through the system
 */

import { ResultOrchestrator } from './src/services/result-orchestrator';
import { DeepWikiManager } from './src/services/deepwiki-manager';

// Mock authenticated user
const mockUser = {
  id: 'test-user-123',
  email: 'test@codequal.dev',
  organizationId: 'test-org',
  permissions: ['analyze'],
  role: 'user',
  status: 'active',
  session: {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
};

async function testDataFlow() {
  console.log('=== Testing Data Flow with Real PR Data ===\n');
  
  // Test PR details
  const testRequest = {
    repositoryUrl: 'https://github.com/facebook/react',
    prNumber: 28298,
    analysisMode: 'comprehensive' as const,
    authenticatedUser: mockUser
  };
  
  console.log('Test Configuration:');
  console.log(`- Repository: ${testRequest.repositoryUrl}`);
  console.log(`- PR Number: ${testRequest.prNumber}`);
  console.log(`- Analysis Mode: ${testRequest.analysisMode}`);
  console.log('\n');
  
  try {
    // Create orchestrator
    const orchestrator = new ResultOrchestrator(mockUser);
    
    console.log('📋 Step 1: Extracting PR Context...');
    // This would normally fetch from GitHub
    const prContext = {
      prNumber: 28298,
      prDetails: {
        title: 'Update React to v19 RC',
        body: 'This PR updates React to version 19 release candidate',
        head: { ref: 'feature/react-19-rc' },
        base: { ref: 'main' },
        user: { login: 'react-bot' }
      },
      baseBranch: 'main',
      files: [
        { path: 'packages/react/package.json', status: 'modified' },
        { path: 'packages/react-dom/package.json', status: 'modified' },
        { path: 'packages/react/src/React.js', status: 'modified' }
      ]
    };
    console.log(`✓ PR Branch: ${prContext.prDetails.head.ref}`);
    console.log(`✓ Base Branch: ${prContext.baseBranch}`);
    console.log(`✓ Files: ${prContext.files.length}`);
    
    console.log('\n🔧 Step 2: DeepWiki Manager Operations...');
    const deepwikiManager = new DeepWikiManager(mockUser);
    
    // Test triggering analysis with branch
    const jobId = await deepwikiManager.triggerRepositoryAnalysis(
      testRequest.repositoryUrl,
      {
        branch: prContext.prDetails.head.ref,
        baseBranch: prContext.baseBranch,
        includeDiff: true,
        prNumber: prContext.prNumber
      }
    );
    console.log(`✓ Analysis triggered with job ID: ${jobId}`);
    console.log(`✓ Branch parameter passed: ${prContext.prDetails.head.ref}`);
    
    // Test cache retrieval
    console.log('\n📁 Step 3: Testing Cache Retrieval...');
    const cachedFiles = await deepwikiManager.getCachedRepositoryFiles(
      testRequest.repositoryUrl,
      prContext.prDetails.head.ref
    );
    console.log(`✓ Cache key used: ${testRequest.repositoryUrl}:${prContext.prDetails.head.ref}`);
    console.log(`✓ Cached files: ${cachedFiles.length}`);
    
    console.log('\n🛠️ Step 4: MCP Tool Context...');
    console.log('MCP tools would receive:');
    console.log(`- Repository: ${testRequest.repositoryUrl}`);
    console.log(`- Branch: ${prContext.prDetails.head.ref}`);
    console.log(`- Files from cache: ${cachedFiles.length}`);
    
    console.log('\n📊 Step 5: Data Flow Summary...');
    console.log('1. PR Context extracted with branch: feature/react-19-rc');
    console.log('2. DeepWiki triggered with branch parameter');
    console.log('3. Cache lookup uses branch-aware key');
    console.log('4. MCP tools would receive PR branch files');
    console.log('5. Agents would analyze PR branch content');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testDataFlow().catch(console.error);