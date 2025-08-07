import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

// Force mock for faster testing
process.env.USE_DEEPWIKI_MOCK = 'true';

async function testIssueMatching() {
  console.log('Testing issue matching logic...\n');
  
  const { analyzeWithStandardFramework } = require('../../apps/api/dist/services/standard-orchestrator-service.js');
  
  const repositoryUrl = 'https://github.com/sindresorhus/is-odd';
  const prNumber = 10;
  
  console.log('Analyzing:', repositoryUrl, 'PR#', prNumber);
  console.log('Using MOCK DeepWiki for faster testing\n');
  
  try {
    const result = await analyzeWithStandardFramework(repositoryUrl, prNumber, 'main');
    
    console.log('\n=== ANALYSIS RESULTS ===');
    console.log('Success:', result.success);
    
    // Check comparison details
    if (result.comparison) {
      console.log('\n=== ISSUE COUNTS ===');
      console.log('Resolved Issues:', result.comparison.resolvedIssues?.length || 0);
      console.log('New Issues:', result.comparison.newIssues?.length || 0);
      console.log('Modified Issues:', result.comparison.modifiedIssues?.length || 0);
      console.log('Unchanged Issues:', result.comparison.unchangedIssues?.length || 0);
      
      // Show some unchanged issues if any
      if (result.comparison.unchangedIssues && result.comparison.unchangedIssues.length > 0) {
        console.log('\n=== UNCHANGED ISSUES (Pre-existing) ===');
        result.comparison.unchangedIssues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`${idx + 1}. ${issue.title || issue.message}`);
          console.log(`   Category: ${issue.category}, Severity: ${issue.severity}`);
          console.log(`   ID: ${issue.id}`);
        });
      } else {
        console.log('\n⚠️  NO UNCHANGED ISSUES FOUND - This is the problem!');
      }
    }
    
    // Check report for pre-existing issues section
    if (result.report) {
      const preExistingMatch = result.report.match(/### Pre-existing Issues.*?\n([\s\S]*?)(?=\n###|\n##|$)/);
      if (preExistingMatch) {
        console.log('\n=== REPORT: Pre-existing Issues Section ===');
        console.log(preExistingMatch[1].trim());
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testIssueMatching();