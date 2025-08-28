/**
 * Quick test for real PR analysis without location finder to avoid timeouts
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';
import * as path from 'path';

loadEnvironment();

async function testRealPRQuick() {
  console.log('🚀 Quick Real PR Test (ky #700)\n');
  
  const agent = new ComparisonAgent();
  
  try {
    // Run the analysis
    console.log('📊 Running analysis...');
    const result = await agent.analyze({
      repositoryUrl: 'https://github.com/sindresorhus/ky',
      prNumber: 700
    });
    
    console.log('\n✅ Analysis complete!');
    console.log(`  Total issues found: ${result.allIssues?.length || 0}`);
    console.log(`  NEW: ${result.newIssues.length}`);
    console.log(`  FIXED: ${result.fixedIssues.length}`);
    console.log(`  UNCHANGED: ${result.unchangedIssues.length}`);
    console.log(`  Score: ${result.qualityScore}/100`);
    
    // Save the markdown report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname,
      'test-reports',
      `pr-analysis-quick-${timestamp}.md`
    );
    
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, result.report.markdown);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Show sample issues with real code
    console.log('\n📝 Sample Issues with Code:');
    
    const sampleIssues = [...result.newIssues.slice(0, 2), ...result.unchangedIssues.slice(0, 2)];
    sampleIssues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.title || issue.description}`);
      console.log(`   Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
      if (issue.codeSnippet && !issue.codeSnippet.includes('[exact code not provided]')) {
        console.log(`   Code: ${issue.codeSnippet.substring(0, 100)}...`);
      } else {
        console.log(`   Code: Not extracted`);
      }
    });
    
    // Check if we have real code snippets
    let realCodeCount = 0;
    let missingCodeCount = 0;
    
    const allIssues = [...result.newIssues, ...result.unchangedIssues, ...result.fixedIssues];
    allIssues.forEach(issue => {
      if (issue.codeSnippet && 
          !issue.codeSnippet.includes('[exact code not provided]') &&
          !issue.codeSnippet.includes('YOUR_API_KEY') &&
          !issue.codeSnippet.includes('// Code location:')) {
        realCodeCount++;
      } else {
        missingCodeCount++;
      }
    });
    
    console.log('\n📊 Code Extraction Stats:');
    console.log(`  Real code snippets: ${realCodeCount}`);
    console.log(`  Missing/placeholder: ${missingCodeCount}`);
    console.log(`  Success rate: ${((realCodeCount / allIssues.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealPRQuick().catch(console.error);