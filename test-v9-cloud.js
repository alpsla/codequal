#!/usr/bin/env node

/**
 * V9 Unified Cloud Analysis Test
 *
 * Tests the unified V9 framework with cloud infrastructure for ANY language
 */

const axios = require('axios');

// Cloud endpoints (deployed to DigitalOcean Kubernetes)
const HYBRID_AGENT_URL = process.env.HYBRID_AGENT_URL || 'http://129.212.136.24';

// Test repositories for different languages
const TEST_REPOS = {
  java: {
    url: 'https://github.com/apache/kafka',
    pr: 17620,
    name: 'Apache Kafka',
    sampleIssues: [
      {
        tool: 'spotbugs',
        type: 'quality',
        category: 'BAD_PRACTICE',
        rule: 'NP_NULL_ON_SOME_PATH',
        message: 'Possible null pointer dereference',
        file: 'core/src/main/java/kafka/server/ReplicaManager.java',
        line: 234,
        language: 'java'
      },
      {
        tool: 'checkstyle',
        type: 'style',
        category: 'coding',
        message: 'Missing Javadoc comment',
        file: 'clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java',
        line: 123,
        language: 'java'
      }
    ]
  },
  python: {
    url: 'https://github.com/django/django',
    pr: 15234,
    name: 'Django',
    sampleIssues: [
      {
        tool: 'pylint',
        type: 'quality',
        category: 'convention',
        message: 'Line too long (95 characters)',
        file: 'django/core/handlers/wsgi.py',
        line: 45,
        language: 'python'
      },
      {
        tool: 'bandit',
        type: 'security',
        category: 'vulnerability',
        message: 'Possible SQL injection',
        file: 'django/db/models/query.py',
        line: 890,
        language: 'python'
      }
    ]
  },
  javascript: {
    url: 'https://github.com/facebook/react',
    pr: 28000,
    name: 'React',
    sampleIssues: [
      {
        tool: 'eslint',
        type: 'quality',
        category: 'style',
        message: 'Missing semicolon',
        file: 'packages/react/src/ReactElement.js',
        line: 234,
        language: 'javascript'
      },
      {
        tool: 'jshint',
        type: 'quality',
        category: 'warning',
        message: 'Unused variable',
        file: 'packages/react-dom/src/client/ReactDOMRoot.js',
        line: 56,
        language: 'javascript'
      }
    ]
  },
  rust: {
    url: 'https://github.com/rust-lang/rust',
    pr: 120456,
    name: 'Rust',
    sampleIssues: [
      {
        tool: 'clippy',
        type: 'quality',
        category: 'style',
        message: 'Use of unwrap on Result',
        file: 'compiler/rustc_middle/src/ty/mod.rs',
        line: 1234,
        language: 'rust'
      }
    ]
  },
  go: {
    url: 'https://github.com/kubernetes/kubernetes',
    pr: 123456,
    name: 'Kubernetes',
    sampleIssues: [
      {
        tool: 'golint',
        type: 'quality',
        category: 'style',
        message: 'Exported function should have comment',
        file: 'pkg/controller/deployment/deployment_controller.go',
        line: 89,
        language: 'go'
      }
    ]
  }
};

async function testV9UnifiedAnalysis(language = 'java') {
  const repo = TEST_REPOS[language];
  if (!repo) {
    console.error(`❌ Unsupported language: ${language}`);
    console.log(`   Available: ${Object.keys(TEST_REPOS).join(', ')}`);
    return;
  }

  console.log('🚀 V9 Unified Cloud Analysis Test');
  console.log('=' .repeat(60));
  console.log(`📦 Repository: ${repo.name} (${language})`);
  console.log(`🔗 URL: ${repo.url}`);
  console.log(`📝 PR: #${repo.pr}`);
  console.log('=' .repeat(60));

  try {
    // Step 1: Check cloud service health
    console.log('\n1️⃣ Checking Cloud Infrastructure...');
    const health = await axios.get(`${HYBRID_AGENT_URL}/health`);
    console.log(`   ✅ Hybrid Agent: ${health.data.status}`);
    console.log(`   ✅ Redis Cache: ${health.data.redis}`);
    console.log(`   ✅ Environment: ${health.data.environment}`);
    console.log(`   📊 Current Stats:`, health.data.stats);

    // Step 2: Simulate V9 analysis with sample issues
    console.log('\n2️⃣ Simulating V9 Analysis Pipeline...');
    console.log(`   🔍 Language: ${language}`);
    console.log(`   🛠️ Tools: ${[...new Set(repo.sampleIssues.map(i => i.tool))].join(', ')}`);
    console.log(`   📋 Issues to analyze: ${repo.sampleIssues.length}`);

    // Step 3: Generate fixes using cloud hybrid agent
    console.log('\n3️⃣ Generating Fixes with Cloud Hybrid Agent...');
    const startTime = Date.now();

    const fixResponse = await axios.post(
      `${HYBRID_AGENT_URL}/fix/batch`,
      {
        issues: repo.sampleIssues,
        prInfo: {
          repository: repo.url,
          prNumber: repo.pr,
          language: language
        }
      }
    );

    const processingTime = Date.now() - startTime;

    console.log(`   ⏱️  Processing Time: ${processingTime}ms`);
    console.log(`   📊 Results:`, fixResponse.data.stats);

    // Step 4: Display sample fixes
    console.log('\n4️⃣ Sample Fixes Generated:');
    const results = fixResponse.data.results.slice(0, 3);
    results.forEach((result, i) => {
      if (result.success) {
        console.log(`\n   Issue ${i + 1}: ${result.issue.message}`);
        console.log(`   Tool: ${result.issue.tool}`);
        console.log(`   Fix: ${result.fix.fix ? result.fix.fix.substring(0, 150) + '...' : 'N/A'}`);
        console.log(`   Confidence: ${result.fix.confidence || 'N/A'}`);
        console.log(`   From Cache: ${result.fix.cached ? '✅' : '❌'}`);
      }
    });

    // Step 5: Test cache performance (run again)
    console.log('\n5️⃣ Testing Cache Performance (2nd run)...');
    const startTime2 = Date.now();

    const fixResponse2 = await axios.post(
      `${HYBRID_AGENT_URL}/fix/batch`,
      {
        issues: repo.sampleIssues,
        prInfo: {
          repository: repo.url,
          prNumber: repo.pr,
          language: language
        }
      }
    );

    const processingTime2 = Date.now() - startTime2;
    const speedup = Math.round(processingTime / processingTime2);

    console.log(`   ⏱️  Processing Time: ${processingTime2}ms (${speedup}x faster)`);
    console.log(`   📊 Cache Performance:`, fixResponse2.data.stats);

    // Step 6: Generate V9 Report Summary
    console.log('\n6️⃣ V9 Analysis Report Summary:');
    console.log('=' .repeat(60));
    console.log('```markdown');
    console.log(`# V9 Analysis Report - ${repo.name}`);
    console.log(`## Language: ${language.toUpperCase()}`);
    console.log(`## Repository: ${repo.url}`);
    console.log(`## PR: #${repo.pr}`);
    console.log('');
    console.log('## Performance Metrics');
    console.log(`- Initial Processing: ${processingTime}ms`);
    console.log(`- Cached Processing: ${processingTime2}ms`);
    console.log(`- Speed Improvement: ${speedup}x`);
    console.log(`- Cache Hit Rate: ${fixResponse2.data.stats.cacheHitRate}`);
    console.log('');
    console.log('## Issue Summary');
    console.log(`- Total Issues: ${repo.sampleIssues.length}`);
    console.log(`- Fixed Automatically: ${fixResponse.data.stats.total - fixResponse.data.stats.failed}`);
    console.log(`- Tools Used: ${[...new Set(repo.sampleIssues.map(i => i.tool))].join(', ')}`);
    console.log('```');
    console.log('=' .repeat(60));

    // Step 7: Show overall statistics
    console.log('\n7️⃣ Cloud Infrastructure Statistics:');
    const stats = await axios.get(`${HYBRID_AGENT_URL}/stats`);
    console.log(`   Total Requests: ${stats.data.total}`);
    console.log(`   Cache Hit Rate: ${stats.data.cacheHitRate}`);
    console.log(`   API Calls Made: ${stats.data.apiCalls}`);
    console.log(`   Uptime: ${stats.data.uptime}`);

    console.log('\n✅ V9 Unified Analysis Complete!');
    console.log(`   Language: ${language}`);
    console.log(`   Performance: ${speedup}x faster with cache`);
    console.log(`   Ready for: Production deployment`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const language = args[0] || 'java';

  if (language === '--all') {
    // Test all languages
    console.log('🌍 Testing all supported languages...\n');
    for (const lang of Object.keys(TEST_REPOS)) {
      await testV9UnifiedAnalysis(lang);
      console.log('\n' + '='.repeat(80) + '\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    // Test specific language
    await testV9UnifiedAnalysis(language);
  }
}

// Run the test
main().catch(console.error);