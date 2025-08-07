const { config } = require('dotenv');
const path = require('path');

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

// Force mock for testing
process.env.USE_DEEPWIKI_MOCK = 'true';

async function testDeepWikiDirect() {
  console.log('Testing DeepWiki directly without comparison agent...\n');
  
  const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');
  
  const repositoryUrl = 'https://github.com/vercel/next.js';
  const prNumber = 82359;
  
  console.log('Repository:', repositoryUrl);
  console.log('PR Number:', prNumber);
  console.log('Using Mock DeepWiki\n');
  
  try {
    // Test main branch
    console.log('=== MAIN BRANCH ANALYSIS ===');
    const startMain = Date.now();
    const mainAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, { 
      branch: 'main' 
    });
    const mainDuration = ((Date.now() - startMain) / 1000).toFixed(2);
    
    console.log(`Analysis Duration: ${mainDuration} seconds`);
    console.log(`Issues Found: ${mainAnalysis.issues.length}`);
    console.log('\nMain Branch Issues:');
    mainAnalysis.issues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.message || issue.title}`);
      console.log(`   ID: ${issue.id || 'NO ID'}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      console.log(`   Has suggestion: ${!!issue.suggestion}`);
      console.log(`   Has evidence: ${!!issue.evidence}`);
      console.log(`   Has remediation: ${!!issue.remediation}`);
      if (issue.evidence?.snippet) {
        console.log(`   Code snippet preview: ${issue.evidence.snippet.substring(0, 50)}...`);
      }
    });
    
    // Test PR branch
    console.log('\n=== PR BRANCH ANALYSIS ===');
    const startPR = Date.now();
    const prAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, { 
      branch: `pr/${prNumber}` 
    });
    const prDuration = ((Date.now() - startPR) / 1000).toFixed(2);
    
    console.log(`Analysis Duration: ${prDuration} seconds`);
    console.log(`Issues Found: ${prAnalysis.issues.length}`);
    console.log('\nPR Branch Issues:');
    prAnalysis.issues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.message || issue.title}`);
      console.log(`   ID: ${issue.id || 'NO ID'}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      console.log(`   Has suggestion: ${!!issue.suggestion}`);
      console.log(`   Has evidence: ${!!issue.evidence}`);
      console.log(`   Has remediation: ${!!issue.remediation}`);
      if (issue.evidence?.snippet) {
        console.log(`   Code snippet preview: ${issue.evidence.snippet.substring(0, 50)}...`);
      }
    });
    
    // Check for differences
    console.log('\n=== COMPARISON ===');
    const mainIds = new Set(mainAnalysis.issues.map(i => i.id));
    const prIds = new Set(prAnalysis.issues.map(i => i.id));
    
    const newInPR = [...prIds].filter(id => !mainIds.has(id));
    const fixedInPR = [...mainIds].filter(id => !prIds.has(id));
    const unchanged = [...mainIds].filter(id => prIds.has(id));
    
    console.log(`New issues in PR: ${newInPR.length}`);
    console.log(`Fixed in PR: ${fixedInPR.length}`);
    console.log(`Unchanged: ${unchanged.length}`);
    
    // Check data structure
    console.log('\n=== DATA STRUCTURE CHECK ===');
    if (mainAnalysis.issues.length > 0) {
      const sampleIssue = mainAnalysis.issues[0];
      console.log('Sample issue structure:');
      console.log(JSON.stringify(sampleIssue, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

// Kill after 15 seconds
setTimeout(() => {
  console.log('\nExiting...');
  process.exit(0);
}, 15000);

testDeepWikiDirect();