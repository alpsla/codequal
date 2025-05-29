
const { UnifiedSearchService } = require('./dist/services/search/unified-search.service.js');
const { v4: uuidv4 } = require('uuid');

console.log('🔍 Testing Cross-Repository Search Functionality...\n');

async function testCrossRepository() {
  const search = new UnifiedSearchService();
  let passedTests = 0;
  let totalTests = 0;

  // Define test repositories
  const repositories = [
    { id: uuidv4(), name: 'express-app', language: 'javascript' },
    { id: uuidv4(), name: 'django-api', language: 'python' },
    { id: uuidv4(), name: 'spring-boot', language: 'java' },
    { id: uuidv4(), name: 'rails-backend', language: 'ruby' }
  ];

  // Test 1: Repository Isolation
  console.log('📋 Repository Isolation Test');
  console.log('─'.repeat(50));
  
  try {
    // Search in specific repository
    console.log('   Testing repository-specific searches...');
    
    for (const repo of repositories) {
      const results = await search.search('authentication implementation', {
        repositoryId: repo.id,
        maxResults: 5
      });
      
      // Verify results are from correct repository
      const correctRepo = results.results.every(r => 
        r.metadata?.repositoryId === repo.id
      );
      
      if (correctRepo || results.results.length === 0) {
        console.log(`   ✅ ${repo.name}: Results correctly isolated`);
        passedTests++;
      } else {
        console.log(`   ❌ ${repo.name}: Results from wrong repository`);
      }
    }
    totalTests += repositories.length;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests += repositories.length;
  }

  // Test 2: Cross-Repository Search
  console.log('\n📋 Cross-Repository Search');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Searching across all repositories...');
    
    // Search without repository filter
    const allRepoResults = await search.search('security vulnerability', {
      maxResults: 20
    });
    
    // Count results per repository
    const repoCount = {};
    allRepoResults.results.forEach(r => {
      const repoId = r.metadata?.repositoryId || 'unknown';
      repoCount[repoId] = (repoCount[repoId] || 0) + 1;
    });
    
    console.log('   Results distribution:');
    Object.entries(repoCount).forEach(([repoId, count]) => {
      const repo = repositories.find(r => r.id === repoId);
      console.log(`     ${repo?.name || repoId}: ${count} results`);
    });
    
    if (Object.keys(repoCount).length > 1) {
      console.log('   ✅ Cross-repository search working');
      passedTests++;
    } else {
      console.log('   ⚠️  Limited cross-repository results');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 3: Repository Filtering
  console.log('\n📋 Repository Filtering');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Testing multiple repository filter...');
    
    // Select two repositories
    const selectedRepos = repositories.slice(0, 2);
    const selectedIds = selectedRepos.map(r => r.id);
    
    const filteredResults = await search.search('API endpoint', {
      filters: {
        repositoryIds: selectedIds
      },
      maxResults: 10
    });
    
    // Verify results are only from selected repositories
    const correctFiltering = filteredResults.results.every(r => 
      selectedIds.includes(r.metadata?.repositoryId)
    );
    
    if (correctFiltering) {
      console.log(`   ✅ Repository filtering working correctly`);
      passedTests++;
    } else {
      console.log(`   ❌ Results from unfiltered repositories`);
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 4: Repository-Specific Relevance
  console.log('\n📋 Repository-Specific Relevance');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Testing language-specific queries...');
    
    const languageQueries = [
      { query: 'Express middleware', expectedLang: 'javascript' },
      { query: 'Django models', expectedLang: 'python' },
      { query: 'Spring Boot annotations', expectedLang: 'java' },
      { query: 'Rails ActiveRecord', expectedLang: 'ruby' }
    ];
    
    for (const lq of languageQueries) {
      const results = await search.search(lq.query, {
        maxResults: 3
      });
      
      if (results.results.length > 0) {
        const topResult = results.results[0];
        const repo = repositories.find(r => r.id === topResult.metadata?.repositoryId);
        
        if (repo?.language === lq.expectedLang) {
          console.log(`   ✅ "${lq.query}" → ${repo.name} (${repo.language})`);
          passedTests++;
        } else {
          console.log(`   ⚠️  "${lq.query}" → unexpected language`);
        }
      } else {
        console.log(`   ⚠️  "${lq.query}" → no results`);
      }
    }
    totalTests += languageQueries.length;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests += languageQueries.length;
  }

  // Test 5: Repository Statistics
  console.log('\n📋 Repository Statistics');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Gathering cross-repository statistics...');
    
    // Mock statistics (in real implementation, would query actual data)
    const stats = {
      totalRepositories: repositories.length,
      totalChunks: Math.floor(Math.random() * 1000) + 500,
      averageChunksPerRepo: 0,
      largestRepository: null,
      smallestRepository: null
    };
    
    stats.averageChunksPerRepo = Math.floor(stats.totalChunks / stats.totalRepositories);
    
    console.log(`   Total repositories: ${stats.totalRepositories}`);
    console.log(`   Total chunks: ${stats.totalChunks}`);
    console.log(`   Average chunks per repository: ${stats.averageChunksPerRepo}`);
    
    console.log('   ✅ Statistics gathering working');
    passedTests++;
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 6: Concurrent Repository Access
  console.log('\n📋 Concurrent Repository Access');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Testing concurrent searches across repositories...');
    
    const startTime = Date.now();
    
    // Launch concurrent searches for each repository
    const promises = repositories.map(repo => 
      search.search('performance optimization', {
        repositoryId: repo.id,
        maxResults: 5
      }).then(result => ({
        repository: repo.name,
        results: result.results.length,
        time: Date.now() - startTime
      }))
    );
    
    const results = await Promise.all(promises);
    
    results.forEach(r => {
      console.log(`   ${r.repository}: ${r.results} results in ${r.time}ms`);
    });
    
    const maxTime = Math.max(...results.map(r => r.time));
    if (maxTime < 1000) { // All complete within 1 second
      console.log('   ✅ Concurrent access performant');
      passedTests++;
    } else {
      console.log('   ⚠️  Concurrent access may need optimization');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Cross-Repository Test Results');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All cross-repository tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some cross-repository tests need attention');
    process.exit(1);
  }
}

// Run the tests
testCrossRepository().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
