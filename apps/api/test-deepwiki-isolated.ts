#!/usr/bin/env ts-node

import { DeepWikiManager } from './src/services/deepwiki-manager';
import { AuthenticatedUser } from './src/middleware/auth-middleware';

async function testDeepWiki() {
  console.log('=== Testing DeepWiki Isolated ===\n');
  
  // Create test user
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

  // Create DeepWiki manager
  const deepWikiManager = new DeepWikiManager(testUser);
  console.log('✓ DeepWiki Manager created\n');

  // Test repository
  const repositoryUrl = 'https://github.com/facebook/react';
  
  try {
    // Step 1: Check if repository exists in Vector DB
    console.log('Step 1: Checking if repository exists in Vector DB...');
    const exists = await deepWikiManager.checkRepositoryExists(repositoryUrl);
    console.log(`Repository exists in Vector DB: ${exists}\n`);

    // Step 2: Trigger analysis
    console.log('Step 2: Triggering DeepWiki analysis...');
    const jobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl);
    console.log('Analysis job created with ID:', jobId);
    console.log('');

    // Step 3: Wait for analysis to complete
    console.log('Step 3: Waiting for analysis to complete (this may take a while)...');
    const startTime = Date.now();
    
    // Poll for status
    let completed = false;
    while (!completed && (Date.now() - startTime) < 60000) { // 1 minute timeout
      const status = await deepWikiManager.getJobStatus(jobId);
      if (status) {
        console.log(`Status: ${status.status}`);
        if (status.status === 'completed' || status.status === 'failed') {
          completed = true;
          if (status.status === 'failed') {
            console.error('Analysis failed:', status.error);
          }
        }
      }
      if (!completed) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }

    // Step 4: Get analysis results
    if (completed) {
      console.log('\nStep 4: Retrieving analysis results...');
      try {
        const results = await deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
        console.log('\n✅ DeepWiki Analysis Results:');
        console.log(JSON.stringify(results, null, 2));
      } catch (error) {
        console.error('Failed to retrieve results:', error);
      }
    } else {
      console.error('Analysis timed out');
    }

  } catch (error) {
    console.error('❌ DeepWiki test failed:', error);
  }
}

// Run the test
testDeepWiki().catch(console.error);