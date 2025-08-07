const { config } = require('dotenv');
const path = require('path');

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

// Force mock for controlled testing
process.env.USE_DEEPWIKI_MOCK = 'true';

async function testFullMatchingFlow() {
  console.log('Testing full issue matching flow with mock DeepWiki...\n');
  
  const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');
  const { analyzeWithStandardFramework } = require('../../apps/api/dist/services/standard-orchestrator-service.js');
  
  const repositoryUrl = 'https://github.com/sindresorhus/is-odd';
  const prNumber = 10;
  
  console.log('Step 1: Getting mock DeepWiki analysis for main branch...');
  const mainAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, { branch: 'main' });
  console.log(`Main branch issues: ${mainAnalysis.issues.length}`);
  mainAnalysis.issues.forEach(issue => {
    console.log(`  - ${issue.message} (${issue.severity}) - ID: ${issue.id || 'NO ID'}`);
  });
  
  console.log('\nStep 2: Getting mock DeepWiki analysis for PR branch...');
  const prAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, { branch: `pr/${prNumber}` });
  console.log(`PR branch issues: ${prAnalysis.issues.length}`);
  prAnalysis.issues.forEach(issue => {
    console.log(`  - ${issue.message} (${issue.severity}) - ID: ${issue.id || 'NO ID'}`);
  });
  
  console.log('\nStep 3: Running Standard framework analysis...');
  const result = await analyzeWithStandardFramework(
    repositoryUrl,
    prNumber,
    'main',
    {
      mainBranchAnalysis: mainAnalysis,
      prBranchAnalysis: prAnalysis
    }
  );
  
  console.log('\n=== STANDARD FRAMEWORK RESULTS ===');
  console.log('Success:', result.success);
  
  if (result.comparison) {
    console.log('\nIssue Breakdown:');
    console.log('- Resolved (fixed in PR):', result.comparison.resolvedIssues?.length || 0);
    console.log('- New (introduced in PR):', result.comparison.newIssues?.length || 0);
    console.log('- Modified (changed in PR):', result.comparison.modifiedIssues?.length || 0);
    console.log('- Unchanged (pre-existing):', result.comparison.unchangedIssues?.length || 0);
    
    if (result.comparison.unchangedIssues && result.comparison.unchangedIssues.length > 0) {
      console.log('\n✅ SUCCESS: Found pre-existing issues!');
      console.log('Pre-existing issues:');
      result.comparison.unchangedIssues.slice(0, 3).forEach(issue => {
        console.log(`  - ${issue.title || issue.message} (${issue.severity})`);
      });
    } else {
      console.log('\n❌ PROBLEM: No pre-existing issues found!');
      console.log('This means the report will show "0 unfixed repository issues"');
    }
  }
  
  // Check the report
  if (result.report) {
    const preExistingMatch = result.report.match(/### Pre-existing Issues.*?\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (preExistingMatch) {
      console.log('\n=== REPORT: Pre-existing Issues Section ===');
      const content = preExistingMatch[1].trim();
      if (content.includes('0 unfixed') || content.includes('No pre-existing')) {
        console.log('❌ Report shows 0 pre-existing issues');
      } else {
        console.log('✅ Report shows pre-existing issues:');
        console.log(content.substring(0, 500));
      }
    }
  }
}

testFullMatchingFlow().catch(console.error);