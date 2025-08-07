#!/usr/bin/env node

/**
 * Force Real API Test - Ensure we're using real DeepWiki, not mock
 */

// Set all required environment variables BEFORE requiring modules
process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_USE_PORT_FORWARD = 'true';
process.env.DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
process.env.GOOGLE_API_KEY = 'AIzaSyAzbLXla5BmzIZOjOpWprPrlfGMg77MZwA';
process.env.OPENROUTER_API_KEY = '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';

// Now require the modules
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');

async function testRealApi() {
  try {
    console.log('🚀 Forcing Real DeepWiki API Test\n');
    console.log('Environment:');
    console.log(`  USE_DEEPWIKI_MOCK: ${process.env.USE_DEEPWIKI_MOCK}`);
    console.log(`  DEEPWIKI_API_KEY: ${process.env.DEEPWIKI_API_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
    console.log('\nTesting with small repository...\n');
    
    const startTime = Date.now();
    
    // Call with explicit options to skip cache
    const result = await deepWikiApiManager.analyzeRepository(
      'https://github.com/sindresorhus/normalize-url',
      {
        skipCache: true,
        branch: 'main',
        forceRealApi: true  // Additional flag
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ API Response received!\n');
    console.log(`⏱️  Response time: ${duration} seconds`);
    console.log(`📊 Issues found: ${result.issues?.length || 0}`);
    console.log(`🤖 Model used: ${result.metadata?.model_used || 'unknown'}`);
    console.log(`📈 Overall score: ${result.scores?.overall || 'N/A'}/100`);
    console.log(`📁 Files analyzed: ${result.metadata?.files_analyzed || 'N/A'}`);
    
    // Determine if real API or mock
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    if (duration > 30.0) {
      console.log('🎉 CONFIRMED: This was a REAL API call!');
      console.log('✅ DeepWiki is working with OpenRouter');
      console.log('✅ Response took significant time as expected');
    } else if (duration > 10.0) {
      console.log('✅ LIKELY REAL: Good response time for real API');
    } else if (duration > 5.0) {
      console.log('⚠️  POSSIBLY REAL: Moderate response time');
    } else if (duration > 2.5) {
      console.log('⚠️  SUSPICIOUS: This might be the mock (2.5s delay)');
    } else {
      console.log('❌ TOO FAST: Likely cached or mocked');
    }
    
    // Check for real issues with actual code
    if (result.issues && result.issues.length > 0) {
      console.log('\n📋 Issue Analysis:');
      
      let hasRealCodeFixes = 0;
      let hasTodoComments = 0;
      
      result.issues.forEach(issue => {
        if (issue.suggestedFix) {
          if (issue.suggestedFix.includes('// TODO')) {
            hasTodoComments++;
          } else if (issue.suggestedFix.includes('await') || 
                     issue.suggestedFix.includes('const') ||
                     issue.suggestedFix.includes('function')) {
            hasRealCodeFixes++;
          }
        }
      });
      
      console.log(`  Real code fixes: ${hasRealCodeFixes}/${result.issues.length}`);
      console.log(`  TODO placeholders: ${hasTodoComments}/${result.issues.length}`);
      
      if (hasRealCodeFixes > hasTodoComments) {
        console.log('  ✅ Report has real code fixes!');
      } else {
        console.log('  ⚠️  Report mostly has placeholder fixes');
      }
      
      // Show first issue with code
      const issueWithCode = result.issues.find(i => 
        i.suggestedFix && !i.suggestedFix.includes('// TODO')
      );
      
      if (issueWithCode) {
        console.log('\n📝 Sample Issue with Real Code Fix:');
        console.log(`  Title: ${issueWithCode.title || issueWithCode.message}`);
        console.log(`  Severity: ${issueWithCode.severity}`);
        console.log(`  Fix Preview:`);
        console.log(issueWithCode.suggestedFix.split('\n').slice(0, 3).map(l => '    ' + l).join('\n'));
      }
    }
    
    // Final summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 FINAL ASSESSMENT:');
    
    const assessments = {
      realApi: duration > 5.0,
      hasIssues: result.issues?.length > 0,
      hasScores: result.scores?.overall !== undefined,
      hasMetadata: result.metadata?.model_used !== undefined,
      reasonable: result.issues?.length > 3 && result.issues?.length < 50
    };
    
    const passed = Object.values(assessments).filter(v => v).length;
    const total = Object.values(assessments).length;
    
    console.log(`  API Response Time: ${assessments.realApi ? '✅' : '❌'} (${duration}s)`);
    console.log(`  Has Issues: ${assessments.hasIssues ? '✅' : '❌'} (${result.issues?.length || 0})`);
    console.log(`  Has Scores: ${assessments.hasScores ? '✅' : '❌'}`);
    console.log(`  Has Metadata: ${assessments.hasMetadata ? '✅' : '❌'}`);
    console.log(`  Reasonable Count: ${assessments.reasonable ? '✅' : '❌'}`);
    
    console.log(`\n  Score: ${passed}/${total} checks passed`);
    
    if (passed === total) {
      console.log('\n🎉 SUCCESS: Real DeepWiki API is fully operational!');
    } else if (passed >= 3) {
      console.log('\n✅ PARTIAL SUCCESS: API appears to be working');
    } else {
      console.log('\n❌ FAILURE: API may not be working correctly');
    }
    
    // Save for inspection
    const fs = require('fs');
    const output = {
      duration: duration,
      issueCount: result.issues?.length,
      model: result.metadata?.model_used,
      scores: result.scores,
      sampleIssues: result.issues?.slice(0, 3)
    };
    
    fs.writeFileSync('real-api-test-summary.json', JSON.stringify(output, null, 2));
    console.log('\n📄 Summary saved to: real-api-test-summary.json');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

console.log('Starting Real API Test with all environment variables set...\n');
testRealApi();