#!/usr/bin/env ts-node

/**
 * Test Real DeepWiki Integration with Standard Framework
 * 
 * This script tests the real DeepWiki API integration by:
 * 1. Registering the real DeepWiki API
 * 2. Running analysis using the Standard framework
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Import registration function
import { registerDeepWikiWithStandard } from './src/services/register-deepwiki-standard';

// Import DeepWiki API wrapper interfaces
import { 
  registerDeepWikiApi, 
  IDeepWikiApi 
} from '../packages/agents/dist/standard/services/deepwiki-api-wrapper';

// Import the actual API manager
import { deepWikiApiManager } from './src/services/deepwiki-api-manager';

async function testRealDeepWikiIntegration() {
  console.log('🚀 Testing Real DeepWiki Integration with Standard Framework');
  console.log('==========================================================\n');

  // Check environment
  console.log('🔍 Checking environment...');
  console.log(`DEEPWIKI_API_KEY: ${process.env.DEEPWIKI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`DEEPWIKI_NAMESPACE: ${process.env.DEEPWIKI_NAMESPACE || 'codequal-dev'}`);
  console.log(`DEEPWIKI_POD_NAME: ${process.env.DEEPWIKI_POD_NAME || 'deepwiki'}\n`);

  // Register the real DeepWiki API
  console.log('📝 Registering real DeepWiki API...');
  
  // Create adapter that implements IDeepWikiApi
  const adapter: IDeepWikiApi = {
    async analyzeRepository(repositoryUrl: string, options?: any) {
      return await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
    }
  };
  
  registerDeepWikiApi(adapter);
  console.log('✅ Real DeepWiki API registered!\n');

  // Now test the integration
  console.log('🧪 Testing DeepWiki analysis...');
  
  try {
    // Import and use the Standard framework
    const { createDeepWikiService } = await import('../packages/agents/dist/standard/services/deepwiki-service');
    
    // Create service (should use real API now)
    const deepWikiService = createDeepWikiService(undefined, false);
    
    // Test repository
    const repository = 'https://github.com/vercel/swr';
    const prNumber = '2950';
    
    console.log(`Repository: ${repository}`);
    console.log(`PR: #${prNumber}\n`);
    
    // Run analysis
    console.log('🔄 Running analysis with real DeepWiki...');
    const startTime = Date.now();
    
    const result = await deepWikiService.analyzeRepositoryForComparison(
      repository,
      'main'
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Analysis completed in ${duration}s`);
    console.log(`Issues found: ${result.issues.length}`);
    console.log(`Score: ${result.score}`);
    console.log(`Files analyzed: ${result.metadata?.files_analyzed || 0}`);
    
    // Display first few issues
    if (result.issues.length > 0) {
      console.log('\n📋 Sample Issues:');
      result.issues.slice(0, 3).forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.message}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Category: ${issue.category}`);
        console.log(`   File: ${issue.location?.file || 'N/A'}`);
        console.log(`   Line: ${issue.location?.line || 'N/A'}`);
      });
      
      if (result.issues.length > 3) {
        console.log(`\n... and ${result.issues.length - 3} more issues`);
      }
    }
    
    // Save detailed report
    const fs = await import('fs');
    const outputDir = join(__dirname, 'test-output');
    fs.mkdirSync(outputDir, { recursive: true });
    
    const reportPath = join(outputDir, 'deepwiki-real-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testRealDeepWikiIntegration()
    .then(() => {
      console.log('\n🎉 Real DeepWiki integration test complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testRealDeepWikiIntegration };