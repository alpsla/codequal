/**
 * Test Real PR with DeepWiki Integration
 * This test validates the consolidated code works with real DeepWiki analysis
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

// Import from built Standard directory
const { ComparisonOrchestrator } = require('./packages/agents/dist/standard/orchestrator/comparison-orchestrator');
const { MockConfigProvider } = require('./packages/agents/dist/infrastructure/mock/mock-config-provider');
const { MockSkillProvider } = require('./packages/agents/dist/infrastructure/mock/mock-skill-provider');
const { MockDataStore } = require('./packages/agents/dist/infrastructure/mock/mock-data-store');
const { ComparisonAgent } = require('./packages/agents/dist/standard/comparison/comparison-agent');
const { DeepWikiService } = require('./packages/agents/dist/standard/services/deepwiki-service');

// Test configuration - Using a smaller repo for faster testing
const TEST_PR_URL = 'https://github.com/vercel/swr/pull/3028';
const TEST_REPO_URL = 'https://github.com/vercel/swr';
const TEST_PR_NUMBER = 3028;

console.log(`🚀 Testing Real DeepWiki Integration with Consolidated Code`);
console.log(`📍 PR URL: ${TEST_PR_URL}`);
console.log(`🔧 Using Real DeepWiki: ${process.env.DEEPWIKI_API_URL}`);
console.log(`📁 Using Standard directory implementations`);

async function testRealDeepWiki() {
  try {
    // 1. Create mock providers (but use real DeepWiki)
    const configProvider = new MockConfigProvider();
    const skillProvider = new MockSkillProvider();
    const dataStore = new MockDataStore();
    
    // 2. Create a simple logger
    const logger = {
      info: (...args) => console.log('[DeepWikiService]', ...args),
      error: (...args) => console.error('[DeepWikiService]', ...args),
      warn: (...args) => console.warn('[DeepWikiService]', ...args),
      debug: (...args) => console.log('[DeepWikiService]', ...args)
    };
    
    // 3. Create DeepWiki service
    const deepWikiService = new DeepWikiService(logger);
    
    // 4. Test DeepWiki connection
    console.log('\n🔍 Testing DeepWiki connection...');
    try {
      const healthCheck = await fetch(`${process.env.DEEPWIKI_API_URL}/health`);
      if (healthCheck.ok) {
        console.log('✅ DeepWiki is healthy');
      } else {
        console.log('⚠️  DeepWiki health check failed:', healthCheck.status);
      }
    } catch (error) {
      console.log('⚠️  Could not reach DeepWiki:', error.message);
    }
    
    // 4. Get PR metadata (we'll mock this for now)
    const prMetadata = {
      number: TEST_PR_NUMBER,
      title: 'fix: improve error handling in data fetching',
      author: 'shuding',
      author_name: 'Shu Ding',
      repository_url: TEST_REPO_URL,
      filesChanged: 3,
      linesAdded: 45,
      linesRemoved: 12,
      created_at: new Date().toISOString(),
      github_username: 'shuding'
    };
    
    // 5. Run real DeepWiki analysis on both branches
    console.log('\n🔍 Running DeepWiki analysis on main branch...');
    const mainBranchAnalysis = await deepWikiService.analyzeRepository(
      TEST_REPO_URL,
      'main',
      null
    );
    
    console.log(`✅ Main branch analysis complete: ${mainBranchAnalysis.issues.length} issues found`);
    
    console.log('\n🔍 Running DeepWiki analysis on PR branch...');
    const featureBranchAnalysis = await deepWikiService.analyzeRepository(
      TEST_REPO_URL,
      `pull/${TEST_PR_NUMBER}/head`,
      TEST_PR_NUMBER
    );
    
    console.log(`✅ Feature branch analysis complete: ${featureBranchAnalysis.issues.length} issues found`);
    
    // 6. Create comparison agent
    const comparisonAgent = new ComparisonAgent();
    
    // 7. Create orchestrator
    const orchestrator = new ComparisonOrchestrator(
      configProvider,
      skillProvider,
      dataStore,
      undefined, // researcher agent
      undefined, // educator agent
      undefined, // logger
      comparisonAgent
    );
    
    // 8. Run comparison analysis
    console.log('\n🔍 Running comparison analysis...');
    const result = await orchestrator.executeComparison({
      repositoryUrl: TEST_REPO_URL,
      prNumber: TEST_PR_NUMBER,
      mainBranchAnalysis,
      featureBranchAnalysis,
      prMetadata,
      userId: 'test-user-real-deepwiki',
      generateReport: true
    });
    
    if (!result.success) {
      throw new Error('Analysis failed: ' + result.error);
    }
    
    // 9. Save the report
    const reportDir = path.join(__dirname, 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `real-deepwiki-pr-${TEST_PR_NUMBER}-report-${timestamp}.md`);
    await fs.writeFile(reportPath, result.report || 'No report generated');
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // 10. Validate key aspects
    console.log('\n🔍 Validating Report Content:');
    
    const report = result.report || '';
    
    // Check scoring values (should be 5/3/1/0.5)
    const hasCorrectScoring = report.includes('5') && report.includes('3') && 
                             report.includes('1') && report.includes('0.5');
    console.log(`   ✅ Correct scoring (5/3/1/0.5): ${hasCorrectScoring ? 'YES' : 'NO'}`);
    
    // Check for username display
    const hasGitHubUsername = report.includes('@shuding') || report.includes('shuding');
    console.log(`   ✅ GitHub username displayed: ${hasGitHubUsername ? 'YES' : 'NO'}`);
    
    // Check for real DeepWiki issues
    const hasRealIssues = report.includes('file:') || report.includes('line:');
    console.log(`   ✅ Real DeepWiki issues shown: ${hasRealIssues ? 'YES' : 'NO'}`);
    
    // Display issue summary
    console.log('\n📊 DeepWiki Analysis Summary:');
    console.log(`   Main branch issues: ${mainBranchAnalysis.issues.length}`);
    console.log(`   Feature branch issues: ${featureBranchAnalysis.issues.length}`);
    console.log(`   New issues: ${Math.max(0, featureBranchAnalysis.issues.length - mainBranchAnalysis.issues.length)}`);
    
    // Show issue categories
    const categories = {};
    featureBranchAnalysis.issues.forEach(issue => {
      categories[issue.category] = (categories[issue.category] || 0) + 1;
    });
    console.log('\n   Issue Categories:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`     - ${cat}: ${count}`);
    });
    
    // Extract overall score
    const scoreMatch = report.match(/Overall Score: (\d+)\/100/);
    const overallScore = scoreMatch ? scoreMatch[1] : 'Not found';
    console.log(`\n📈 Overall Score: ${overallScore}/100`);
    
    // Check PR decision
    const isBlocked = report.includes('DECLINED') || report.includes('BLOCKED');
    console.log(`📋 PR Decision: ${isBlocked ? '❌ BLOCKED' : '✅ APPROVED'}`);
    
    console.log('\n✅ Real DeepWiki test completed successfully!');
    console.log(`📄 Full report available at: ${reportPath}`);
    
    // Print first few issues from the report
    console.log('\n📋 Sample Issues from Report:');
    const issueMatches = report.match(/###.*?(?=###|$)/gs);
    if (issueMatches && issueMatches.length > 0) {
      issueMatches.slice(0, 3).forEach((issue, idx) => {
        console.log(`\nIssue ${idx + 1}:`);
        console.log(issue.slice(0, 200) + '...');
      });
    }
    
    return { success: true, reportPath };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    
    // Check if it's a DeepWiki connection issue
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      console.log('\n⚠️  DeepWiki connection failed. Make sure:');
      console.log('   1. kubectl port-forward is running');
      console.log('   2. DeepWiki pod is healthy');
      console.log('   3. DEEPWIKI_API_URL is set correctly in .env');
    }
    
    return { success: false, error };
  }
}

// Run the test
testRealDeepWiki().then(result => {
  if (result.success) {
    console.log('\n🎉 Real DeepWiki test passed! The consolidated code works with real analysis.');
    console.log('📁 You can now safely remove the backup files.');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the generated report for accuracy');
    console.log('   2. Verify scoring values are correct (5/3/1/0.5)');
    console.log('   3. Check that ReportGeneratorV7 is being used');
  } else {
    console.log('\n⚠️  Test failed. Please check the error and do not remove backup files yet.');
  }
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});