/**
 * Test to verify PR branches get NEW issues introduced
 */

// Force mock to ensure consistent behavior
process.env.USE_DEEPWIKI_MOCK = 'true';

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { DeepWikiService } from './src/standard/services/deepwiki-service';
import * as fs from 'fs';

async function testPRWithNewIssues() {
  console.log('🚀 Testing PR with NEW issues introduced...\n');
  console.log('Configuration:');
  console.log(`  USE_DEEPWIKI_MOCK: ${process.env.USE_DEEPWIKI_MOCK}`);
  console.log('');
  
  try {
    const repoUrl = 'https://github.com/vercel/next.js';
    const deepwiki = new DeepWikiService();
    
    // Analyze main branch
    console.log('📊 Analyzing main branch...');
    const mainAnalysis = await deepwiki.analyzeRepository(repoUrl, 'main');
    console.log(`  Main branch issues: ${mainAnalysis.issues.length}`);
    
    // List main branch issue IDs
    const mainIssueIds = mainAnalysis.issues.map(i => i.id || `${i.category}-${i.severity}`);
    console.log('  Main branch issue IDs:', mainIssueIds);
    
    // Analyze PR branch - this should have DIFFERENT issues
    console.log('\n📊 Analyzing PR branch (pr/82359)...');
    const prAnalysis = await deepwiki.analyzeRepository(repoUrl, 'pr/82359');
    console.log(`  PR branch issues: ${prAnalysis.issues.length}`);
    
    // List PR branch issue IDs
    const prIssueIds = prAnalysis.issues.map(i => i.id || `${i.category}-${i.severity}`);
    console.log('  PR branch issue IDs:', prIssueIds);
    
    // Calculate differences
    const mainSet = new Set(mainIssueIds);
    const prSet = new Set(prIssueIds);
    
    const fixedIssues = [...mainSet].filter(id => !prSet.has(id));
    const newIssues = [...prSet].filter(id => !mainSet.has(id));
    const unchangedIssues = [...prSet].filter(id => mainSet.has(id));
    
    console.log('\n📈 Issue Comparison:');
    console.log(`  ✅ Fixed issues (in main, not in PR): ${fixedIssues.length}`);
    console.log('     IDs:', fixedIssues);
    console.log(`  🚨 NEW issues (in PR, not in main): ${newIssues.length}`);
    console.log('     IDs:', newIssues);
    console.log(`  📍 Unchanged issues: ${unchangedIssues.length}`);
    
    // Find the actual new issues
    const actualNewIssues = prAnalysis.issues.filter(i => 
      newIssues.includes(i.id || `${i.category}-${i.severity}`)
    );
    
    if (actualNewIssues.length > 0) {
      console.log('\n🚨 NEW ISSUES INTRODUCED IN PR:');
      actualNewIssues.forEach((issue, idx) => {
        console.log(`\n  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     ID: ${issue.id}`);
        console.log(`     Severity: ${issue.severity}`);
        console.log(`     Category: ${issue.category}`);
        console.log(`     File: ${issue.location?.file || issue.file || 'N/A'}`);
      });
    }
    
    // Now test with comparison agent
    console.log('\n\n🔄 Running Comparison Agent...');
    
    const agent = new ComparisonAgent();
    await agent.initialize({
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.1
      }
    });
    
    const result = await agent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        repository_url: repoUrl,
        number: 82359,
        title: 'Turbopack: run styled-jsx after typescript transform',
        author: 'mischnic',
        description: 'This PR introduces some new code that may have issues'
      },
      generateReport: true
    });
    
    // Save report
    const reportPath = './PR_WITH_NEW_ISSUES_REPORT.md';
    fs.writeFileSync(reportPath, result.report || 'No report generated');
    
    console.log('\n✅ Report generated!');
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Verify report shows new issues
    console.log('\n🔍 Report Verification:');
    
    const hasNewIssuesSection = result.report?.includes('PR Issues (NEW');
    console.log(`  ${hasNewIssuesSection ? '✅' : '❌'} Report has "PR Issues (NEW" section`);
    
    const hasHighIssues = result.report?.includes('High Issues');
    console.log(`  ${hasHighIssues ? '✅' : '❌'} Report shows High severity issues`);
    
    const hasMediumIssues = result.report?.includes('Medium Issues');
    console.log(`  ${hasMediumIssues ? '✅' : '❌'} Report shows Medium severity issues`);
    
    const hasBlockingMessage = result.report?.includes('MUST BE FIXED') || 
                               result.report?.includes('DECLINED');
    console.log(`  ${hasBlockingMessage ? '✅' : '❌'} Report indicates PR needs fixes`);
    
    // Check if PR decision reflects new issues
    const prDecisionMatch = result.report?.match(/## PR Decision: ([^\\n]+)/);
    if (prDecisionMatch) {
      console.log(`\n📋 PR Decision: ${prDecisionMatch[1]}`);
    }
    
    // Count new issues in report
    const newIssueMatches = result.report?.match(/PR-(HIGH|MEDIUM|LOW|CRITICAL)-\\d+/g) || [];
    console.log(`\n📊 New issues found in report: ${newIssueMatches.length}`);
    
    if (newIssues.length === 0) {
      console.log('\n⚠️  WARNING: No new issues found in PR branch!');
      console.log('  The mock should be returning different issues for PR branches.');
    } else {
      console.log('\n✅ SUCCESS: PR branch has NEW issues as expected!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPRWithNewIssues().then(() => {
  console.log('\n✨ Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});