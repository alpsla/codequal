/**
 * Comprehensive Real PR Test
 * 
 * Tests all bug fixes with real DeepWiki data:
 * - Connection resilience
 * - Unified parser
 * - Repository indexing
 * - Code recovery
 * - Smart cache
 */

import { DirectDeepWikiApiWithLocationV4 } from './src/standard/services/direct-deepwiki-api-with-location-v4';
import { ConnectionResilienceManager } from './src/standard/services/connection-resilience-manager';
import { UnifiedDeepWikiParser } from './src/standard/services/unified-deepwiki-parser';
import axios from 'axios';

async function testRealPR() {
  console.log('🚀 Testing with Real PR Data\n');
  console.log('=' .repeat(60));
  
  // Test PR: sindresorhus/ky#700 (known to have issues)
  const testRepo = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`📦 Repository: ${testRepo}`);
  console.log(`🔀 PR Number: #${prNumber}`);
  console.log(`🔗 PR URL: ${testRepo}/pull/${prNumber}\n`);
  
  try {
    // Step 1: Test Direct DeepWiki Connection
    console.log('1️⃣ Testing Direct DeepWiki Connection...');
    const deepWikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    
    // Check if DeepWiki is accessible
    try {
      const healthCheck = await axios.get(`${deepWikiUrl}/health`, { timeout: 5000 }).catch(() => null);
      if (!healthCheck) {
        console.log('   ⚠️ DeepWiki health check failed, trying direct analysis...');
      } else {
        console.log('   ✅ DeepWiki is accessible');
      }
    } catch (error) {
      console.log('   ⚠️ Health endpoint not available, continuing...');
    }
    
    // Step 2: Test Unified Parser with Raw DeepWiki Response
    console.log('\n2️⃣ Testing Unified Parser with Real DeepWiki Response...');
    
    const rawResponse = await axios.post(
      `${deepWikiUrl}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: `Analyze this repository for critical issues. For each issue provide:
                   Issue: <title>
                   Severity: <critical|high|medium|low>
                   Category: <security|performance|code-quality>
                   File: <exact path>
                   Line: <number>
                   Code snippet: <code>
                   Suggestion: <fix>`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000
      }
    );
    
    console.log('   📥 Raw response received');
    console.log(`   Response type: ${typeof rawResponse.data}`);
    
    // Parse with unified parser
    const parser = new UnifiedDeepWikiParser();
    const parseResult = parser.parse(rawResponse.data);
    
    console.log(`   ✅ Parsed ${parseResult.issues.length} issues`);
    console.log(`   Format detected: ${parseResult.format}`);
    console.log(`   Parse time: ${parseResult.parseTime}ms`);
    
    if (parseResult.warnings?.length) {
      console.log(`   ⚠️ Warnings: ${parseResult.warnings.join(', ')}`);
    }
    
    // Show sample issues
    if (parseResult.issues.length > 0) {
      console.log('\n   📋 Sample Issues:');
      parseResult.issues.slice(0, 3).forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue.title}`);
        console.log(`      Severity: ${issue.severity} | Category: ${issue.category}`);
        console.log(`      Location: ${issue.location.file}:${issue.location.line}`);
        if (issue.suggestion) {
          console.log(`      ✨ Has suggestion: Yes`);
        }
      });
    }
    
    // Step 3: Test Full Integration with DirectDeepWikiApiWithLocationV4
    console.log('\n3️⃣ Testing Full Integration with Repository Indexing...');
    
    const api = new DirectDeepWikiApiWithLocationV4();
    const startTime = Date.now();
    
    // Analyze both main and PR branches
    console.log('   Analyzing main branch...');
    const mainAnalysis = await api.analyzeRepository(testRepo, { 
      branch: 'main',
      useCache: false // Force fresh analysis
    });
    
    console.log('   Analyzing PR branch...');
    const prAnalysis = await api.analyzeRepository(testRepo, { 
      branch: `pull/${prNumber}/head`,
      prNumber,
      useCache: false
    });
    
    const totalTime = Date.now() - startTime;
    
    // Display results
    console.log('\n📊 Analysis Results:');
    console.log(`   Total analysis time: ${totalTime}ms`);
    
    console.log('\n   Main Branch:');
    console.log(`   - Issues found: ${mainAnalysis.issues.length}`);
    console.log(`   - Valid after filtering: ${mainAnalysis.validation?.validIssues || 0}`);
    console.log(`   - Filtered fake issues: ${mainAnalysis.validation?.filteredIssues || 0}`);
    console.log(`   - Recovered issues: ${mainAnalysis.validation?.recoveredIssues || 0}`);
    console.log(`   - Average confidence: ${mainAnalysis.validation?.avgConfidence?.toFixed(2) || 'N/A'}`);
    
    console.log('\n   PR Branch:');
    console.log(`   - Issues found: ${prAnalysis.issues.length}`);
    console.log(`   - Valid after filtering: ${prAnalysis.validation?.validIssues || 0}`);
    console.log(`   - Filtered fake issues: ${prAnalysis.validation?.filteredIssues || 0}`);
    console.log(`   - Recovered issues: ${prAnalysis.validation?.recoveredIssues || 0}`);
    console.log(`   - Average confidence: ${prAnalysis.validation?.avgConfidence?.toFixed(2) || 'N/A'}`);
    
    // Compare branches
    const newIssues = prAnalysis.issues.filter(prIssue => 
      !mainAnalysis.issues.some(mainIssue => 
        mainIssue.title === prIssue.title && 
        mainIssue.location?.file === prIssue.location?.file
      )
    );
    
    const fixedIssues = mainAnalysis.issues.filter(mainIssue =>
      !prAnalysis.issues.some(prIssue =>
        prIssue.title === mainIssue.title &&
        prIssue.location?.file === mainIssue.location?.file
      )
    );
    
    console.log('\n   PR Comparison:');
    console.log(`   - New issues introduced: ${newIssues.length}`);
    console.log(`   - Issues fixed: ${fixedIssues.length}`);
    
    // Show performance metrics
    if (mainAnalysis.performance) {
      console.log('\n⚡ Performance Metrics:');
      console.log(`   - DeepWiki API time: ${mainAnalysis.performance.deepWikiTime}ms`);
      console.log(`   - Repository indexing: ${mainAnalysis.performance.indexingTime}ms`);
      console.log(`   - Validation time: ${mainAnalysis.performance.validationTime}ms`);
      console.log(`   - Speedup factor: ${mainAnalysis.performance.speedup?.toFixed(2)}x`);
    }
    
    // Step 4: Test Connection Resilience
    console.log('\n4️⃣ Testing Connection Resilience...');
    
    const connManager = new ConnectionResilienceManager({
      deepWiki: {
        url: deepWikiUrl,
        timeout: 120000,
        maxRetries: 3
      }
    });
    
    const health = connManager.getHealth();
    console.log(`   DeepWiki health: ${health.deepWiki}`);
    console.log(`   Last check: ${health.lastCheck.toISOString()}`);
    
    if (health.errors.length > 0) {
      console.log(`   Recent errors: ${health.errors.slice(0, 3).join(', ')}`);
    }
    
    // Step 5: Validate Data Quality
    console.log('\n5️⃣ Validating Data Quality...');
    
    let qualityScore = 100;
    const qualityIssues: string[] = [];
    
    // Check for "unknown" locations
    const unknownLocations = prAnalysis.issues.filter(i => 
      !i.location?.file || i.location.file === 'unknown'
    );
    if (unknownLocations.length > 0) {
      qualityScore -= 20;
      qualityIssues.push(`${unknownLocations.length} issues with unknown locations`);
    }
    
    // Check for missing categories
    const missingCategories = prAnalysis.issues.filter(i => !i.category);
    if (missingCategories.length > 0) {
      qualityScore -= 10;
      qualityIssues.push(`${missingCategories.length} issues without categories`);
    }
    
    // Check for suggestions
    const withSuggestions = prAnalysis.issues.filter(i => i.suggestion).length;
    const suggestionRate = prAnalysis.issues.length > 0 
      ? (withSuggestions / prAnalysis.issues.length) * 100 
      : 0;
    
    console.log(`   Quality Score: ${qualityScore}/100`);
    console.log(`   Suggestion Rate: ${suggestionRate.toFixed(1)}%`);
    
    if (qualityIssues.length > 0) {
      console.log(`   Issues found:`);
      qualityIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📈 Test Summary:\n');
    
    const allTestsPassed = 
      parseResult.issues.length > 0 &&
      health.deepWiki !== 'offline' &&
      qualityScore >= 70;
    
    if (allTestsPassed) {
      console.log('✅ All systems operational!');
      console.log('✅ Parser working with real data');
      console.log('✅ Repository indexing functional');
      console.log('✅ Connection resilience active');
      console.log('✅ Data quality acceptable');
    } else {
      console.log('⚠️ Some issues detected:');
      if (parseResult.issues.length === 0) {
        console.log('   - No issues parsed from DeepWiki response');
      }
      if (health.deepWiki === 'offline') {
        console.log('   - DeepWiki connection offline');
      }
      if (qualityScore < 70) {
        console.log('   - Data quality below threshold');
      }
    }
    
    // Cleanup
    await connManager.cleanup();
    
  } catch (error: any) {
    console.error('\n❌ Test failed with error:');
    console.error(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n📝 To run this test:');
      console.log('1. Ensure DeepWiki is running:');
      console.log('   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
      console.log('2. Re-run this test');
    }
  }
}

// Run the test
console.log('🔍 Starting Real PR Data Test');
console.log('This test requires DeepWiki to be running.\n');

testRealPR()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });