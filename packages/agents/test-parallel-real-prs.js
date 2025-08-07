#!/usr/bin/env node

/**
 * Parallel Request Testing with Real PRs
 * Tests system performance under concurrent load with Redis caching
 */

const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { DeepWikiService } = require('./dist/standard/services/deepwiki-service');
const { registerDeepWikiApi } = require('./dist/standard/services/deepwiki-api-wrapper');
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');
const { createRedisCacheService } = require('./dist/standard/services/redis-cache.service');
const fs = require('fs');
const path = require('path');

// Configure environment for real API
process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_USE_PORT_FORWARD = 'true';
process.env.DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyAzbLXla5BmzIZOjOpWprPrlfGMg77MZwA';
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: (msg, data) => process.env.DEBUG ? console.log(`[DEBUG] ${msg}`, data || '') : null
};

// Real PRs from different repositories for testing
const REAL_PRS = [
  {
    repo: 'https://github.com/facebook/react',
    pr: 28807,
    name: 'React PR #28807',
    language: 'javascript',
    size: 'large'
  },
  {
    repo: 'https://github.com/vercel/next.js',
    pr: 63456,
    name: 'Next.js PR #63456',
    language: 'javascript',
    size: 'large'
  },
  {
    repo: 'https://github.com/expressjs/express',
    pr: 5561,
    name: 'Express PR #5561',
    language: 'javascript',
    size: 'medium'
  },
  {
    repo: 'https://github.com/django/django',
    pr: 17888,
    name: 'Django PR #17888',
    language: 'python',
    size: 'large'
  },
  {
    repo: 'https://github.com/pallets/flask',
    pr: 5462,
    name: 'Flask PR #5462',
    language: 'python',
    size: 'medium'
  },
  {
    repo: 'https://github.com/kubernetes/kubernetes',
    pr: 123456,
    name: 'Kubernetes PR #123456',
    language: 'go',
    size: 'enterprise'
  },
  {
    repo: 'https://github.com/gin-gonic/gin',
    pr: 3897,
    name: 'Gin PR #3897',
    language: 'go',
    size: 'medium'
  },
  {
    repo: 'https://github.com/rust-lang/rust',
    pr: 119369,
    name: 'Rust PR #119369',
    language: 'rust',
    size: 'large'
  }
];

// Performance tracking
const performanceMetrics = {
  requests: [],
  parallel: {
    started: 0,
    completed: 0,
    failed: 0,
    cacheHits: 0,
    cacheMisses: 0
  },
  timing: {
    minTime: Infinity,
    maxTime: 0,
    totalTime: 0,
    avgTime: 0
  }
};

// Register DeepWiki API with metrics tracking
registerDeepWikiApi({
  async analyzeRepository(repositoryUrl, options) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    performanceMetrics.parallel.started++;
    
    console.log(`[${requestId}] Starting analysis: ${repositoryUrl} (${options?.branch || 'main'})`);
    
    try {
      const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Determine if cached (fast response)
      const wasCached = duration < 2.0;
      if (wasCached) {
        performanceMetrics.parallel.cacheHits++;
      } else {
        performanceMetrics.parallel.cacheMisses++;
      }
      
      performanceMetrics.parallel.completed++;
      performanceMetrics.timing.totalTime += parseFloat(duration);
      performanceMetrics.timing.minTime = Math.min(performanceMetrics.timing.minTime, parseFloat(duration));
      performanceMetrics.timing.maxTime = Math.max(performanceMetrics.timing.maxTime, parseFloat(duration));
      
      console.log(`[${requestId}] ✅ Completed in ${duration}s (${wasCached ? 'CACHED' : 'API'})`);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          requestId,
          responseTime: parseFloat(duration),
          fromCache: wasCached
        }
      };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      performanceMetrics.parallel.failed++;
      
      console.error(`[${requestId}] ❌ Failed after ${duration}s: ${error.message}`);
      throw error;
    }
  }
});

async function analyzeRealPR(prConfig, cacheService) {
  const startTime = Date.now();
  const requestId = `PR-${prConfig.pr}-${Date.now()}`;
  
  console.log(`\n📋 [${requestId}] Analyzing ${prConfig.name}`);
  console.log(`   Repository: ${prConfig.repo}`);
  console.log(`   PR: #${prConfig.pr}`);
  console.log(`   Language: ${prConfig.language}`);
  console.log(`   Size: ${prConfig.size}`);
  
  try {
    // Initialize services
    const deepWikiService = new DeepWikiService(logger, cacheService);
    const comparisonAgent = new ComparisonAgent(logger);
    
    await comparisonAgent.initialize({
      language: prConfig.language,
      complexity: prConfig.size === 'large' || prConfig.size === 'enterprise' ? 'high' : 'medium',
      performance: 'optimized'
    });
    
    // Analyze both branches
    const [mainAnalysis, prAnalysis] = await Promise.all([
      deepWikiService.analyzeRepository(prConfig.repo, 'main'),
      deepWikiService.analyzeRepository(prConfig.repo, `pr/${prConfig.pr}`)
    ]);
    
    // Generate report
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: prConfig.pr,
        title: prConfig.name,
        description: `Real PR analysis for ${prConfig.name}`,
        author: 'real-user',
        created_at: new Date().toISOString(),
        repository_url: prConfig.repo,
        filesChanged: Math.floor(Math.random() * 100) + 10,
        linesAdded: Math.floor(Math.random() * 1000) + 100,
        linesRemoved: Math.floor(Math.random() * 500) + 50
      },
      userProfile: {
        userId: 'test-user',
        username: 'testuser',
        overallScore: 75,
        categoryScores: {
          security: 80,
          performance: 75,
          codeQuality: 78,
          architecture: 82,
          dependencies: 70,
          testing: 75
        }
      },
      generateReport: true
    });
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Save report
    const reportPath = path.join(__dirname, 'parallel-reports', `${prConfig.language}-${prConfig.pr}-${Date.now()}.md`);
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    fs.writeFileSync(reportPath, result.report || 'No report generated');
    
    const metric = {
      requestId,
      pr: prConfig.name,
      success: true,
      totalTime: parseFloat(totalTime),
      mainCached: mainAnalysis.metadata?.fromCache,
      prCached: prAnalysis.metadata?.fromCache,
      mainIssues: mainAnalysis.issues?.length || 0,
      prIssues: prAnalysis.issues?.length || 0,
      score: result.score || 0,
      reportPath: path.basename(reportPath)
    };
    
    performanceMetrics.requests.push(metric);
    
    console.log(`   ✅ [${requestId}] Completed in ${totalTime}s`);
    console.log(`   📊 Score: ${metric.score}/100`);
    console.log(`   📁 Report: ${metric.reportPath}`);
    
    return metric;
    
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const metric = {
      requestId,
      pr: prConfig.name,
      success: false,
      totalTime: parseFloat(totalTime),
      error: error.message
    };
    
    performanceMetrics.requests.push(metric);
    
    console.error(`   ❌ [${requestId}] Failed: ${error.message}`);
    
    return metric;
  }
}

async function runParallelTests(concurrency = 3) {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     PARALLEL REAL PR TESTING WITH REDIS                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  // Initialize Redis
  console.log('🔌 Initializing Redis connection...');
  const cacheService = createRedisCacheService('redis://localhost:6379', logger);
  
  // Test Redis
  try {
    const testKey = `test:parallel:${Date.now()}`;
    await cacheService.cacheDeepWikiAnalysis({ test: testKey }, { data: 'test' }, { ttl: 10 });
    const retrieved = await cacheService.getCachedDeepWikiAnalysis({ test: testKey });
    if (retrieved) {
      console.log('   ✅ Redis connected and working');
    }
  } catch (error) {
    console.error('   ❌ Redis connection failed:', error.message);
    console.log('   ⚠️  Proceeding without cache');
  }
  
  console.log(`\n📊 Test Configuration:`);
  console.log(`   Total PRs: ${REAL_PRS.length}`);
  console.log(`   Concurrency: ${concurrency} parallel requests`);
  console.log(`   Mode: Real DeepWiki API via OpenRouter`);
  
  const testStartTime = Date.now();
  
  // Process PRs in batches
  console.log('\n🚀 Starting parallel analysis...\n');
  
  const results = [];
  for (let i = 0; i < REAL_PRS.length; i += concurrency) {
    const batch = REAL_PRS.slice(i, i + concurrency);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Batch ${Math.floor(i / concurrency) + 1}: Processing ${batch.length} PRs in parallel`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    const batchResults = await Promise.allSettled(
      batch.map(pr => analyzeRealPR(pr, cacheService))
    );
    
    results.push(...batchResults);
    
    // Short delay between batches
    if (i + concurrency < REAL_PRS.length) {
      console.log('\n⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const totalTestTime = ((Date.now() - testStartTime) / 1000).toFixed(2);
  
  // Calculate final metrics
  performanceMetrics.timing.avgTime = performanceMetrics.timing.totalTime / performanceMetrics.parallel.completed || 0;
  
  // Generate performance report
  console.log('\n' + '═'.repeat(70));
  console.log('PERFORMANCE REPORT');
  console.log('═'.repeat(70));
  
  console.log('\n📊 Overall Statistics:');
  console.log(`   Total Requests: ${performanceMetrics.parallel.started}`);
  console.log(`   Successful: ${performanceMetrics.parallel.completed}`);
  console.log(`   Failed: ${performanceMetrics.parallel.failed}`);
  console.log(`   Cache Hits: ${performanceMetrics.parallel.cacheHits} (${(performanceMetrics.parallel.cacheHits / performanceMetrics.parallel.started * 100).toFixed(1)}%)`);
  console.log(`   Cache Misses: ${performanceMetrics.parallel.cacheMisses} (${(performanceMetrics.parallel.cacheMisses / performanceMetrics.parallel.started * 100).toFixed(1)}%)`);
  
  console.log('\n⏱️  Timing Analysis:');
  console.log(`   Total Test Time: ${totalTestTime}s`);
  console.log(`   Min Response: ${performanceMetrics.timing.minTime.toFixed(2)}s`);
  console.log(`   Max Response: ${performanceMetrics.timing.maxTime.toFixed(2)}s`);
  console.log(`   Avg Response: ${performanceMetrics.timing.avgTime.toFixed(2)}s`);
  console.log(`   Throughput: ${(performanceMetrics.parallel.completed / parseFloat(totalTestTime)).toFixed(2)} req/s`);
  
  console.log('\n📈 Per-PR Results:');
  console.log('┌─────────────────────────┬───────┬────────┬────────┬───────┬─────────┐');
  console.log('│ PR Name                 │ Time  │ Cached │ Issues │ Score │ Status  │');
  console.log('├─────────────────────────┼───────┼────────┼────────┼───────┼─────────┤');
  
  performanceMetrics.requests.forEach(req => {
    const name = req.pr.padEnd(23).substring(0, 23);
    const time = `${req.totalTime.toFixed(1)}s`.padEnd(5);
    const cached = req.success ? (req.mainCached && req.prCached ? 'Yes' : req.mainCached || req.prCached ? 'Part' : 'No').padEnd(6) : 'N/A'.padEnd(6);
    const issues = req.success ? `${req.mainIssues + req.prIssues}`.padEnd(6) : 'N/A'.padEnd(6);
    const score = req.success ? `${req.score}`.padEnd(5) : 'N/A'.padEnd(5);
    const status = req.success ? '✅ Pass' : '❌ Fail';
    
    console.log(`│ ${name} │ ${time} │ ${cached} │ ${issues} │ ${score} │ ${status} │`);
  });
  
  console.log('└─────────────────────────┴───────┴────────┴────────┴───────┴─────────┘');
  
  // Save detailed report
  const reportData = {
    testDate: new Date().toISOString(),
    configuration: {
      totalPRs: REAL_PRS.length,
      concurrency,
      mode: 'Real DeepWiki API',
      redis: 'Local Redis'
    },
    performance: performanceMetrics,
    testDuration: totalTestTime,
    throughput: (performanceMetrics.parallel.completed / parseFloat(totalTestTime)).toFixed(2)
  };
  
  const reportPath = path.join(__dirname, `parallel-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  console.log(`\n📁 Detailed report saved to: ${path.basename(reportPath)}`);
  console.log(`📁 Individual reports saved in: parallel-reports/`);
  
  // System health assessment
  console.log('\n🏥 System Health Assessment:');
  
  const successRate = (performanceMetrics.parallel.completed / performanceMetrics.parallel.started * 100);
  const cacheHitRate = (performanceMetrics.parallel.cacheHits / performanceMetrics.parallel.started * 100);
  const avgResponseTime = performanceMetrics.timing.avgTime;
  
  if (successRate >= 95 && cacheHitRate >= 50 && avgResponseTime < 30) {
    console.log('   ✅ EXCELLENT - System performing optimally');
  } else if (successRate >= 80 && avgResponseTime < 60) {
    console.log('   🟡 GOOD - System stable with minor issues');
  } else {
    console.log('   ❌ POOR - System needs optimization');
  }
  
  console.log(`\n   Success Rate: ${successRate.toFixed(1)}% ${successRate >= 95 ? '✅' : successRate >= 80 ? '🟡' : '❌'}`);
  console.log(`   Cache Hit Rate: ${cacheHitRate.toFixed(1)}% ${cacheHitRate >= 50 ? '✅' : cacheHitRate >= 30 ? '🟡' : '❌'}`);
  console.log(`   Avg Response: ${avgResponseTime.toFixed(1)}s ${avgResponseTime < 30 ? '✅' : avgResponseTime < 60 ? '🟡' : '❌'}`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('PARALLEL TEST COMPLETED');
  console.log('═'.repeat(70));
  
  return reportData;
}

async function main() {
  const args = process.argv.slice(2);
  const concurrency = parseInt(args[0]) || 3;
  const prCount = parseInt(args[1]) || REAL_PRS.length;
  
  // Limit PRs if specified
  if (prCount < REAL_PRS.length) {
    REAL_PRS.length = prCount;
  }
  
  console.log('Starting parallel PR testing...');
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Total PRs: ${REAL_PRS.length}`);
  
  try {
    await runParallelTests(concurrency);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);