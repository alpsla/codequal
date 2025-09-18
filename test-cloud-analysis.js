const axios = require('axios');

// Cloud endpoints
const HYBRID_AGENT_URL = 'http://129.212.136.24';

// Sample issues from Apache Kafka PR #17620 (Java)
const kafkaIssues = [
  {
    tool: 'spotbugs',
    type: 'quality',
    category: 'BAD_PRACTICE',
    rule: 'NP_NULL_ON_SOME_PATH_FROM_RETURN_VALUE',
    message: 'Possible null pointer dereference',
    file: 'core/src/main/java/kafka/server/ReplicaManager.java',
    line: 234,
    language: 'java',
    complexity: 'medium'
  },
  {
    tool: 'spotbugs',
    type: 'quality',
    category: 'BAD_PRACTICE',
    rule: 'DLS_DEAD_LOCAL_STORE',
    message: 'Dead store to local variable',
    file: 'core/src/main/java/kafka/server/KafkaServer.java',
    line: 567,
    language: 'java',
    complexity: 'low'
  },
  {
    tool: 'checkstyle',
    type: 'style',
    category: 'coding',
    rule: 'MissingJavadocMethod',
    message: 'Missing Javadoc comment for public method',
    file: 'clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java',
    line: 123,
    language: 'java',
    complexity: 'low'
  },
  {
    tool: 'pmd',
    type: 'quality',
    category: 'performance',
    rule: 'AvoidInstantiatingObjectsInLoops',
    message: 'Avoid instantiating objects in loops',
    file: 'core/src/main/java/kafka/log/LogManager.java',
    line: 890,
    language: 'java',
    complexity: 'medium'
  },
  {
    tool: 'security-scan',
    type: 'security',
    category: 'vulnerability',
    rule: 'HARD_CODED_CREDENTIALS',
    message: 'Hard-coded credentials detected',
    file: 'core/src/test/java/kafka/security/SaslTest.java',
    line: 45,
    language: 'java',
    complexity: 'high'
  }
];

async function testCloudAnalysis() {
  console.log('🚀 Testing Cloud-Based PR Analysis');
  console.log('=====================================\n');

  // PR Information
  const prInfo = {
    repository: 'apache/kafka',
    prNumber: 17620,
    url: 'https://github.com/apache/kafka/pull/17620',
    title: 'KAFKA-16345: Improve consumer group rebalancing',
    language: 'java',
    files: 15,
    additions: 456,
    deletions: 234
  };

  console.log('📋 PR Details:');
  console.log(`   Repository: ${prInfo.repository}`);
  console.log(`   PR #${prInfo.prNumber}: ${prInfo.title}`);
  console.log(`   Changes: +${prInfo.additions} -${prInfo.deletions} in ${prInfo.files} files\n`);

  try {
    // Test 1: Check service health
    console.log('1️⃣ Checking Cloud Service Health...');
    const healthResponse = await axios.get(`${HYBRID_AGENT_URL}/health`);
    console.log(`   ✅ Service: ${healthResponse.data.service}`);
    console.log(`   ✅ Status: ${healthResponse.data.status}`);
    console.log(`   ✅ Redis: ${healthResponse.data.redis}`);
    console.log(`   📊 Stats:`, healthResponse.data.stats);
    console.log();

    // Test 2: Process issues in batch
    console.log('2️⃣ Processing Batch of Issues...');
    const startTime = Date.now();

    const batchResponse = await axios.post(`${HYBRID_AGENT_URL}/fix/batch`, {
      issues: kafkaIssues,
      prInfo: prInfo
    });

    const processingTime = Date.now() - startTime;
    console.log(`   ⏱️  Processing Time: ${processingTime}ms`);
    console.log(`   📊 Results:`, batchResponse.data.stats);
    console.log();

    // Test 3: Show sample fixes
    console.log('3️⃣ Sample Fixes Generated:');
    const results = batchResponse.data.results.slice(0, 3);
    results.forEach((result, i) => {
      if (result.success) {
        console.log(`\n   Issue ${i + 1}: ${result.issue.message}`);
        console.log(`   Tool: ${result.issue.tool} | Category: ${result.issue.category}`);
        console.log(`   Fix: ${result.fix.fix.substring(0, 150)}...`);
        console.log(`   Agent: ${result.fix.agent} | Confidence: ${result.fix.confidence}`);
        console.log(`   Cached: ${result.fix.cached ? '✅ Yes' : '❌ No'}`);
      }
    });

    // Test 4: Run again to test cache
    console.log('\n4️⃣ Testing Cache Performance (2nd run)...');
    const startTime2 = Date.now();

    const batchResponse2 = await axios.post(`${HYBRID_AGENT_URL}/fix/batch`, {
      issues: kafkaIssues,
      prInfo: prInfo
    });

    const processingTime2 = Date.now() - startTime2;
    console.log(`   ⏱️  Processing Time: ${processingTime2}ms (${Math.round(processingTime/processingTime2)}x faster)`);
    console.log(`   📊 Cache Stats:`, batchResponse2.data.stats);

    // Test 5: Get overall stats
    console.log('\n5️⃣ Overall Performance Stats:');
    const statsResponse = await axios.get(`${HYBRID_AGENT_URL}/stats`);
    console.log(`   Cache Hit Rate: ${statsResponse.data.cacheHitRate}`);
    console.log(`   Total Requests: ${statsResponse.data.total}`);
    console.log(`   Cache Hits: ${statsResponse.data.hits}`);
    console.log(`   Cache Misses: ${statsResponse.data.misses}`);
    console.log(`   API Calls Made: ${statsResponse.data.apiCalls}`);
    console.log(`   Errors: ${statsResponse.data.errors}`);
    console.log(`   Uptime: ${statsResponse.data.uptime}`);

    // Summary
    console.log('\n=====================================');
    console.log('✅ Cloud Analysis Test Complete!');
    console.log(`📈 Performance Improvement: ${Math.round(processingTime/processingTime2)}x faster with cache`);
    console.log(`💰 Cost Savings: ${Math.round(((statsResponse.data.hits / statsResponse.data.total) * 100))}% requests from cache`);
    console.log('=====================================\n');

    // Generate V8 Report Summary
    console.log('📄 V8 Report Summary:');
    console.log('```markdown');
    console.log(`# PR Analysis Report - ${prInfo.repository}#${prInfo.prNumber}`);
    console.log(`## Summary`);
    console.log(`- **Total Issues**: ${kafkaIssues.length}`);
    console.log(`- **Critical**: ${kafkaIssues.filter(i => i.complexity === 'high').length}`);
    console.log(`- **Fixed Automatically**: ${batchResponse.data.stats.total - batchResponse.data.stats.failed}`);
    console.log(`- **Cache Performance**: ${batchResponse2.data.stats.cacheHitRate}`);
    console.log(`## Categories`);
    console.log(`- Security: ${kafkaIssues.filter(i => i.type === 'security').length} issues`);
    console.log(`- Quality: ${kafkaIssues.filter(i => i.type === 'quality').length} issues`);
    console.log(`- Style: ${kafkaIssues.filter(i => i.type === 'style').length} issues`);
    console.log('```');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testCloudAnalysis();