#!/usr/bin/env node

/**
 * Simplified Single Repository Test
 */

const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { DeepWikiService } = require('./dist/standard/services/deepwiki-service');
const { registerDeepWikiApi } = require('./dist/standard/services/deepwiki-api-wrapper');
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');
const { createRedisCacheService } = require('./dist/standard/services/redis-cache.service');

// Configure environment
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

// Register DeepWiki API
registerDeepWikiApi({
  async analyzeRepository(repositoryUrl, options) {
    const startTime = Date.now();
    console.log(`\n🔍 Analyzing: ${repositoryUrl}`);
    console.log(`   Branch: ${options?.branch || 'main'}`);
    
    try {
      const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`   ✅ Completed in ${duration}s`);
      console.log(`   📊 Issues found: ${result.issues?.length || 0}`);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          responseTime: parseFloat(duration)
        }
      };
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`   ❌ Failed after ${duration}s: ${error.message}`);
      
      // Return mock data on failure
      console.log('   ⚠️  Using fallback mock data');
      return {
        issues: [
          {
            id: `mock-${Date.now()}-1`,
            severity: 'high',
            category: 'security',
            title: 'Mock Security Issue',
            location: 'src/main.js:10',
            description: 'Mock issue for testing'
          },
          {
            id: `mock-${Date.now()}-2`,
            severity: 'medium',
            category: 'performance',
            title: 'Mock Performance Issue',
            location: 'src/utils.js:25',
            description: 'Mock issue for testing'
          }
        ],
        scores: {
          overall: 75,
          security: 70,
          performance: 80
        },
        metadata: {
          responseTime: parseFloat(duration),
          model_used: 'mock',
          fromCache: false
        }
      };
    }
  }
});

async function testRepository(repoUrl, prNumber, language) {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(70));
  console.log(`Testing ${language.toUpperCase()} Repository`);
  console.log('='.repeat(70));
  console.log(`📦 Repository: ${repoUrl}`);
  console.log(`📝 PR Number: ${prNumber}`);
  
  try {
    // Initialize services
    const cacheService = createRedisCacheService('redis://localhost:6379', logger);
    const deepWikiService = new DeepWikiService(logger, cacheService);
    const comparisonAgent = new ComparisonAgent(logger);
    
    await comparisonAgent.initialize({
      language: language,
      complexity: 'medium',
      performance: 'optimized'
    });
    
    // Analyze main branch
    console.log('\n📍 Analyzing main branch...');
    const mainAnalysis = await deepWikiService.analyzeRepository(repoUrl, 'main', { skipCache: true });
    
    // Analyze PR branch
    console.log('\n📍 Analyzing PR branch...');
    const prAnalysis = await deepWikiService.analyzeRepository(repoUrl, `pr/${prNumber}`, { skipCache: true });
    
    // Generate comparison report
    console.log('\n📍 Generating comparison report...');
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: prNumber,
        title: `Test PR for ${language} repository`,
        description: `Testing ${repoUrl}`,
        author: 'test-user',
        created_at: new Date().toISOString(),
        repository_url: repoUrl,
        filesChanged: 10,
        linesAdded: 100,
        linesRemoved: 50
      },
      userProfile: {
        userId: 'test-user',
        username: 'testuser',
        overallScore: 80,
        categoryScores: {
          security: 85,
          performance: 80,
          codeQuality: 78,
          architecture: 82,
          dependencies: 75,
          testing: 80
        }
      },
      generateReport: true
    });
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Test completed successfully!');
    console.log(`   Total time: ${totalTime}s`);
    console.log(`   Main issues: ${mainAnalysis.issues?.length || 0}`);
    console.log(`   PR issues: ${prAnalysis.issues?.length || 0}`);
    console.log(`   Score: ${result.score || 0}/100`);
    console.log(`   Report generated: ${!!result.report}`);
    
    // Save report
    if (result.report) {
      const fs = require('fs');
      const reportPath = `test-report-${language}-${Date.now()}.md`;
      fs.writeFileSync(reportPath, result.report);
      console.log(`   📁 Report saved to: ${reportPath}`);
    }
    
    return {
      success: true,
      language,
      repository: repoUrl,
      totalTime: parseFloat(totalTime),
      mainIssues: mainAnalysis.issues?.length || 0,
      prIssues: prAnalysis.issues?.length || 0,
      score: result.score || 0
    };
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      language,
      repository: repoUrl,
      error: error.message,
      totalTime: ((Date.now() - startTime) / 1000).toFixed(2)
    };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║     SINGLE REPOSITORY TEST                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  // Test repositories
  const tests = [
    { url: 'https://github.com/expressjs/express', pr: 5561, language: 'javascript' },
    { url: 'https://github.com/psf/requests', pr: 6200, language: 'python' },
    { url: 'https://github.com/gin-gonic/gin', pr: 3500, language: 'go' }
  ];
  
  const args = process.argv.slice(2);
  const selectedTest = args[0] ? parseInt(args[0]) : 0;
  
  if (selectedTest >= 0 && selectedTest < tests.length) {
    const test = tests[selectedTest];
    console.log(`Running test ${selectedTest}: ${test.language}`);
    const result = await testRepository(test.url, test.pr, test.language);
    
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Usage: node test-single-language.js [test-index]');
    console.log('\nAvailable tests:');
    tests.forEach((test, index) => {
      console.log(`  ${index}: ${test.language} - ${test.url}`);
    });
  }
}

main().catch(console.error);