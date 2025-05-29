
const { UnifiedSearchService } = require('./dist/services/search/unified-search.service.js');

console.log('🔄 Testing concurrent request handling...');

async function testConcurrentRequests() {
  const search = new UnifiedSearchService();
  const queries = [
    'security vulnerability',
    'performance optimization',
    'error handling',
    'authentication bypass',
    'SQL injection'
  ];
  
  try {
    // Test parallel requests
    console.log('Sending 5 concurrent search requests...');
    const startTime = Date.now();
    
    const promises = queries.map(query => 
      search.search(query, { maxResults: 5 })
        .then(result => ({ query, success: true, results: result.results.length }))
        .catch(error => ({ query, success: false, error: error.message }))
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // Analyze results
    const successful = results.filter(r => r.success).length;
    console.log(`Completed in ${duration}ms`);
    console.log(`Success rate: ${successful}/${results.length}`);
    
    results.forEach(r => {
      if (r.success) {
        console.log(`✅ "${r.query}" - ${r.results} results`);
      } else {
        console.log(`❌ "${r.query}" - ${r.error}`);
      }
    });
    
    // Test rapid sequential requests
    console.log('\nTesting rapid sequential requests...');
    const sequentialStart = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await search.search('test query ' + i, { maxResults: 1 });
    }
    
    const sequentialDuration = Date.now() - sequentialStart;
    console.log(`10 sequential requests completed in ${sequentialDuration}ms`);
    console.log(`Average: ${(sequentialDuration / 10).toFixed(2)}ms per request`);
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testConcurrentRequests();
