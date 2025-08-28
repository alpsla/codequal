#!/usr/bin/env npx ts-node
/**
 * Test BUG-072 fix: DeepWiki iteration stabilization
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

async function testIterationFix() {
  console.log('🧪 Testing BUG-072 Fix: DeepWiki Iteration Stabilization\n');
  
  // Force mock mode for predictable testing
  process.env.USE_DEEPWIKI_MOCK = 'true';
  
  const deepwikiClient = new DirectDeepWikiApiWithLocation();
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  
  console.log('📊 Testing iteration behavior...\n');
  
  const startTime = Date.now();
  const result = await deepwikiClient.analyzeRepository(repositoryUrl, {
    branch: 'main'
  });
  const duration = Date.now() - startTime;
  
  console.log('\n📋 Results:');
  console.log(`  - Total issues found: ${result.issues?.length || 0}`);
  console.log(`  - Analysis duration: ${duration}ms`);
  
  // Check metadata for iteration information
  if (result.metadata) {
    console.log('\n🔄 Iteration Details:');
    console.log(`  - Total iterations: ${result.metadata.iterations || 'N/A'}`);
    console.log(`  - Converged: ${result.metadata.converged ? 'Yes' : 'No'}`);
    console.log(`  - Stability achieved: ${result.metadata.stabilityAchieved ? 'Yes' : 'No'}`);
    
    if (result.metadata.iterationDetails) {
      console.log('\n📈 Iteration breakdown:');
      result.metadata.iterationDetails.forEach((iter: any) => {
        console.log(`  - Iteration ${iter.iteration}: ${iter.newIssuesFound} new issues (total: ${iter.totalIssues})`);
      });
    }
  }
  
  // Verify minimum iterations were performed
  const minIterationsExpected = 3;
  if (result.metadata?.iterations >= minIterationsExpected) {
    console.log(`\n✅ SUCCESS: Performed at least ${minIterationsExpected} iterations as required`);
  } else {
    console.log(`\n❌ FAILURE: Only ${result.metadata?.iterations || 0} iterations performed, expected at least ${minIterationsExpected}`);
  }
  
  // Display sample issues
  if (result.issues?.length > 0) {
    console.log('\n📝 Sample issues found:');
    result.issues.slice(0, 3).forEach((issue: any, idx: number) => {
      console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
      console.log(`     - Severity: ${issue.severity}`);
      console.log(`     - Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ BUG-072 FIX VERIFICATION COMPLETE');
  console.log('='.repeat(60));
}

// Run the test
testIterationFix().catch(console.error);