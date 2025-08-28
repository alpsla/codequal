/**
 * Test Parallel Indexing Performance
 * 
 * Compares V3 (sequential) vs V4 (parallel indexing) performance
 */

import { DirectDeepWikiApiWithLocationV3 } from './src/standard/services/direct-deepwiki-api-with-location-v3';
import { DirectDeepWikiApiWithLocationV4 } from './src/standard/services/direct-deepwiki-api-with-location-v4';

async function testParallelIndexing() {
  console.log('🧪 Testing Parallel Indexing Performance Improvements\n');
  console.log('=' .repeat(70));
  
  // Test repository (small, fast to clone)
  const testRepo = 'https://github.com/sindresorhus/ky';
  const testBranch = 'main';
  
  // Use mock mode for consistent testing
  process.env.USE_DEEPWIKI_MOCK = 'true';
  process.env.DEEPWIKI_TIMEOUT = '5000'; // Short timeout for mock
  
  console.log('📊 Test Configuration:');
  console.log(`  Repository: ${testRepo}`);
  console.log(`  Branch: ${testBranch}`);
  console.log(`  Mode: ${process.env.USE_DEEPWIKI_MOCK === 'true' ? 'Mock' : 'Real'}`);
  console.log('');
  
  try {
    // Test V3 (Sequential)
    console.log('🔵 Testing V3 (Sequential Processing)...\n');
    const v3Api = new DirectDeepWikiApiWithLocationV3();
    const v3StartTime = Date.now();
    
    const v3Result = await v3Api.analyzeRepository(testRepo, { branch: testBranch });
    
    const v3Time = Date.now() - v3StartTime;
    
    console.log(`\n📊 V3 Results:`);
    console.log(`  Total time: ${v3Time}ms`);
    console.log(`  Issues found: ${v3Result.issues?.length || 0}`);
    console.log(`  Valid issues: ${v3Result.validation?.validIssues || 0}`);
    console.log(`  Filtered issues: ${v3Result.validation?.filteredIssues || 0}`);
    
    // Test V4 (Parallel Indexing)
    console.log('\n' + '=' .repeat(70));
    console.log('\n🟢 Testing V4 (Parallel Indexing)...\n');
    const v4Api = new DirectDeepWikiApiWithLocationV4();
    const v4StartTime = Date.now();
    
    const v4Result = await v4Api.analyzeRepository(testRepo, { branch: testBranch });
    
    const v4Time = Date.now() - v4StartTime;
    
    console.log(`\n📊 V4 Results:`);
    console.log(`  Total time: ${v4Time}ms`);
    console.log(`  Issues found: ${v4Result.issues?.length || 0}`);
    console.log(`  Valid issues: ${v4Result.validation?.validIssues || 0}`);
    console.log(`  Filtered issues: ${v4Result.validation?.filteredIssues || 0}`);
    console.log(`  Recovered issues: ${v4Result.validation?.recoveredIssues || 0} 🆕`);
    
    // Performance comparison
    console.log('\n' + '=' .repeat(70));
    console.log('\n🏁 PERFORMANCE COMPARISON:\n');
    
    const timeDifference = v3Time - v4Time;
    const speedup = (v3Time / v4Time).toFixed(2);
    const percentImprovement = ((timeDifference / v3Time) * 100).toFixed(1);
    
    console.log(`  V3 (Sequential): ${v3Time}ms`);
    console.log(`  V4 (Parallel):   ${v4Time}ms`);
    console.log(`  Time saved:      ${timeDifference}ms`);
    console.log(`  Speedup:         ${speedup}x`);
    console.log(`  Improvement:     ${percentImprovement}%`);
    
    if (v4Result.performance) {
      console.log(`\n📈 V4 Detailed Performance:`);
      console.log(`  DeepWiki time:    ${v4Result.performance.deepWikiTime}ms`);
      console.log(`  Indexing time:    ${v4Result.performance.indexingTime}ms (parallel)`);
      console.log(`  Validation time:  ${v4Result.performance.validationTime}ms`);
      console.log(`  Validation speedup: ${v4Result.performance.speedup.toFixed(1)}x`);
    }
    
    // Show performance stats
    console.log(`\n📊 V4 Cumulative Stats:`);
    const stats = v4Api.getPerformanceStats();
    console.log(`  Total analyses:     ${stats.totalAnalyses}`);
    console.log(`  Recovered issues:   ${stats.totalRecoveredIssues}`);
    console.log(`  Avg DeepWiki time:  ${stats.averageTimes.deepWiki}ms`);
    console.log(`  Avg indexing time:  ${stats.averageTimes.indexing}ms`);
    console.log(`  Avg validation:     ${stats.averageTimes.validation}ms`);
    
    // Test code recovery feature
    console.log('\n' + '=' .repeat(70));
    console.log('\n🔄 Testing Code Recovery Feature:\n');
    
    // Create a fake issue with wrong file path but real code
    const fakeIssues = [
      {
        title: 'Missing error handling',
        description: 'No error handling in fetch operation',
        type: 'error-handling',
        severity: 'medium',
        location: { file: 'wrong-file.ts', line: 10 }, // Wrong file
        codeSnippet: 'export class HTTPError extends Error {' // Real code from ky
      }
    ];
    
    // Test recovery with V4
    const v4ApiRecovery = new DirectDeepWikiApiWithLocationV4();
    const validator = new (await import('./src/standard/services/deepwiki-data-validator-indexed')).DeepWikiDataValidatorIndexed();
    const indexer = new (await import('./src/standard/services/repository-indexer')).RepositoryIndexer();
    
    const repoPath = `/tmp/codequal-repos/sindresorhus-ky-main`;
    const index = await indexer.buildIndex(repoPath, testRepo);
    
    console.log('🧪 Testing issue with wrong file path...');
    const validationResult = await validator.validateAndFilterWithIndex(
      fakeIssues,
      index,
      repoPath
    );
    
    console.log(`\n✅ Recovery Results:`);
    console.log(`  Original file: ${fakeIssues[0].location.file}`);
    console.log(`  Issue valid: ${validationResult.valid.length > 0}`);
    console.log(`  Recovered: ${validationResult.recovered.length > 0}`);
    
    if (validationResult.recovered.length > 0) {
      console.log(`  New location: ${validationResult.recovered[0].recoveredPath}`);
      console.log(`  ✨ Code recovery successful!`);
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testParallelIndexing().catch(console.error);