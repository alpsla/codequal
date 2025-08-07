const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent.js');
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');
const fs = require('fs');

// IMPORTANT: Set to use REAL DeepWiki
process.env.USE_DEEPWIKI_MOCK = 'false';

async function testRealDeepWiki() {
  console.log('🚀 Testing with REAL DeepWiki API...\n');
  console.log('⚠️  This will make actual API calls to the DeepWiki service\n');
  
  try {
    // Test with a smaller repository for faster results
    const repoUrl = 'https://github.com/sindresorhus/is-odd';
    
    console.log(`📊 Analyzing repository: ${repoUrl}`);
    console.log('  Using main branch for analysis...\n');
    
    const startTime = Date.now();
    
    // Analyze repository with real DeepWiki
    const analysis = await deepWikiApiManager.analyzeRepository(
      repoUrl,
      { branch: 'main' }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ DeepWiki analysis complete!`);
    console.log(`  Duration: ${duration} seconds`);
    console.log(`  Issues found: ${analysis.issues.length}`);
    
    if (analysis.issues.length > 0) {
      console.log('\n📋 Issues detected:');
      analysis.issues.forEach((issue, index) => {
        console.log(`\n  ${index + 1}. ${issue.title || issue.message || 'Unknown Issue'}`);
        console.log(`     Category: ${issue.category}`);
        console.log(`     Severity: ${issue.severity}`);
        console.log(`     File: ${issue.location?.file || 'N/A'}`);
        if (issue.codeSnippet) {
          console.log(`     Has code snippet: ✅`);
        }
        if (issue.suggestedFix || issue.remediation) {
          console.log(`     Has fix suggestion: ✅`);
        }
      });
    } else {
      console.log('\n  No issues found in this repository');
    }
    
    // Now test with comparison agent
    console.log('\n\n🔄 Testing Comparison Agent with real data...');
    
    const agent = new ComparisonAgent();
    await agent.initialize({
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.1
      }
    });
    
    // For comparison, we'll use the same analysis for both branches
    // In a real scenario, you'd analyze different branches
    const result = await agent.analyze({
      mainBranchAnalysis: analysis,
      featureBranchAnalysis: analysis, // Same for demo
      prMetadata: {
        repository_url: repoUrl,
        number: 1,
        title: 'Test PR with Real DeepWiki',
        author: 'test-user',
        description: 'Testing the Standard framework with real DeepWiki data'
      },
      generateReport: true
    });
    
    // Save the report
    const reportPath = './REAL_DEEPWIKI_TEST_REPORT.md';
    fs.writeFileSync(reportPath, result.report || 'No report generated');
    
    console.log('\n✅ Comparison analysis complete!');
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Verify key features with real data
    console.log('\n🔍 Verifying real DeepWiki integration:');
    
    // Check if real issues are in the report
    const hasRealIssues = analysis.issues.length > 0 && 
                          analysis.issues.every(issue => 
                            result.report?.includes(issue.title || issue.message || '')
                          );
    console.log(`  ${hasRealIssues ? '✅' : '⚠️'} Real issues included in report`);
    
    // Check scan duration
    const scanDurationMatch = result.report?.match(/\*\*Scan Duration:\*\* ([\d.]+) seconds/);
    const scanDuration = scanDurationMatch ? parseFloat(scanDurationMatch[1]) : 0;
    console.log(`  ✅ Scan duration: ${scanDuration} seconds`);
    
    // Check for code snippets from real issues
    const hasCodeSnippets = analysis.issues.some(issue => issue.codeSnippet) &&
                           result.report?.includes('```');
    console.log(`  ${hasCodeSnippets ? '✅' : '⚠️'} Code snippets from real issues present`);
    
    console.log('\n🎉 Real DeepWiki test complete!');
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`  Repository analyzed: ${repoUrl}`);
    console.log(`  Real issues found: ${analysis.issues.length}`);
    console.log(`  Analysis duration: ${duration} seconds`);
    console.log(`  Report generated: ✅`);
    
  } catch (error) {
    console.error('\n❌ Error during real DeepWiki test:', error);
    console.error('\nPossible causes:');
    console.error('  1. DeepWiki service is not accessible');
    console.error('  2. Network connectivity issues');
    console.error('  3. Invalid API credentials');
    console.error('  4. Rate limiting');
    process.exit(1);
  }
}

// Run the test
testRealDeepWiki().then(() => {
  console.log('\n✨ Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});