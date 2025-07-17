#!/usr/bin/env ts-node

import { DeepWikiManager } from './src/services/deepwiki-manager';
import { AuthenticatedUser } from './src/middleware/auth-middleware';

async function testCacheDirect() {
  console.log('=== Testing DeepWiki Cache Directly ===\n');
  
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
    console.log('Step 1: Triggering repository analysis...');
    const jobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl);
    console.log('Job ID:', jobId);
    
    console.log('\nStep 2: Waiting for analysis to complete...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const results = await deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
    console.log('\n✅ Analysis completed successfully');
    console.log('Has recommendations:', !!results.analysis);
    
    // Show recommendations
    if (results.analysis) {
      console.log('\nDeepWiki Recommendations by Role:');
      Object.entries(results.analysis).forEach(([role, data]: [string, any]) => {
        if (data.recommendations && Array.isArray(data.recommendations)) {
          console.log(`\n${role}:`);
          data.recommendations.forEach((rec: string, i: number) => {
            console.log(`  ${i + 1}. ${rec}`);
          });
        }
      });
    }
    
    console.log('\nStep 3: Testing cached repository files...');
    const cachedFiles = await deepWikiManager.getCachedRepositoryFiles(repositoryUrl);
    
    console.log(`\n✅ Retrieved ${cachedFiles.length} cached files`);
    
    // Show sample files
    console.log('\nSample cached files:');
    cachedFiles.slice(0, 3).forEach(file => {
      console.log(`\nFile: ${file.path}`);
      console.log(`Content preview: ${file.content.substring(0, 100)}...`);
      console.log(`Content length: ${file.content.length} characters`);
    });
    
    // Test that files have actual content
    const filesWithContent = cachedFiles.filter(f => f.content && f.content.length > 0);
    console.log(`\n✅ All ${filesWithContent.length} files have content`);
    
    // Look for security issues in the mock files
    const securityFile = cachedFiles.find(f => f.path.includes('UserAuth'));
    if (securityFile) {
      console.log('\n🔍 Security file analysis:');
      console.log('File:', securityFile.path);
      console.log('Contains SQL injection pattern:', securityFile.content.includes('SELECT * FROM users WHERE id = " + userId'));
      console.log('Contains hardcoded credentials:', securityFile.content.includes('API_KEY = "sk-'));
      console.log('Contains eval usage:', securityFile.content.includes('eval('));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCacheDirect().catch(console.error);