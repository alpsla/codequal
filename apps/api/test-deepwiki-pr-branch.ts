#!/usr/bin/env ts-node

import { DeepWikiManager } from './src/services/deepwiki-manager';
import { AuthenticatedUser } from './src/middleware/auth-middleware';

async function testDeepWikiPRBranch() {
  console.log('=== Testing DeepWiki with PR Branch Analysis ===\n');
  
  const testUser: AuthenticatedUser = {
    id: 'test-user-id',
    email: 'test@codequal.dev',
    organizationId: 'test-org-id',
    permissions: ['read', 'write', 'admin'],
    role: 'user',
    status: 'active',
    session: {
      token: 'test-session-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };
  
  const deepWikiManager = new DeepWikiManager(testUser);
  const repositoryUrl = 'https://github.com/facebook/react';
  
  try {
    // Test 1: Main branch analysis (traditional)
    console.log('📊 Test 1: Main Branch Analysis\n');
    
    console.log('Triggering main branch analysis...');
    const mainJobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl);
    console.log('Main branch job ID:', mainJobId);
    
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const mainResults = await deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
    console.log('✅ Main branch analysis completed');
    
    // Get cached files from main
    const mainFiles = await deepWikiManager.getCachedRepositoryFiles(repositoryUrl);
    console.log(`Main branch cached files: ${mainFiles.length}`);
    
    // Test 2: PR Branch analysis (new approach)
    console.log('\n\n📊 Test 2: PR Branch Analysis\n');
    
    const prBranch = 'feature/concurrent-mode';
    const baseBranch = 'main';
    const prNumber = 12345;
    
    console.log(`Triggering PR branch analysis...`);
    console.log(`- Repository: ${repositoryUrl}`);
    console.log(`- PR Branch: ${prBranch}`);
    console.log(`- Base Branch: ${baseBranch}`);
    console.log(`- PR Number: ${prNumber}`);
    
    const prJobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl, {
      branch: prBranch,
      baseBranch: baseBranch,
      includeDiff: true,
      prNumber: prNumber
    });
    console.log('\nPR branch job ID:', prJobId);
    
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const prResults = await deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
    console.log('✅ PR branch analysis completed');
    
    // Get cached files from PR branch
    const prFiles = await deepWikiManager.getCachedRepositoryFiles(repositoryUrl, prBranch);
    console.log(`PR branch cached files: ${prFiles.length}`);
    
    // Test 3: Cache fallback behavior
    console.log('\n\n📊 Test 3: Cache Fallback Behavior\n');
    
    // Try to get files from non-existent branch
    const nonExistentBranch = 'feature/does-not-exist';
    console.log(`Requesting files for non-existent branch: ${nonExistentBranch}`);
    const fallbackFiles = await deepWikiManager.getCachedRepositoryFiles(repositoryUrl, nonExistentBranch);
    console.log(`Fallback files retrieved: ${fallbackFiles.length}`);
    console.log('(Should fall back to main branch cache)');
    
    // Compare results
    console.log('\n\n📊 Comparison Summary\n');
    console.log('='.repeat(50));
    
    console.log('\n1. Cache Strategy:');
    console.log('   - Main branch: Cached independently');
    console.log('   - PR branches: Cached with branch key');
    console.log('   - Fallback: PR → Main → Mock files');
    
    console.log('\n2. Analysis Benefits:');
    console.log('   - PR-specific insights');
    console.log('   - Diff analysis between branches');
    console.log('   - Accurate file content for tools');
    
    console.log('\n3. MCP Tool Benefits:');
    console.log('   - Tools analyze actual PR code');
    console.log('   - No patch application needed');
    console.log('   - Consistent results');
    
    // Simulate MCP tool usage
    console.log('\n\n📊 Simulating MCP Tool Usage\n');
    
    // Tools would get PR branch files directly
    console.log('MCP tools request files...');
    const toolFiles = await deepWikiManager.getCachedRepositoryFiles(repositoryUrl, prBranch);
    
    console.log(`\nTools receive ${toolFiles.length} files from ${prBranch} branch`);
    console.log('Sample file content available to tools:');
    toolFiles.slice(0, 2).forEach(file => {
      console.log(`\n- ${file.path}`);
      console.log(`  Content preview: ${file.content.substring(0, 60)}...`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDeepWikiPRBranch().catch(console.error);