#!/usr/bin/env npx ts-node
/**
 * Test with REAL DeepWiki only - no mocking
 * This ensures we get actual code snippets from the repository
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

async function testRealDeepWikiOnly() {
  console.log('=== Testing with REAL DeepWiki (No Mocking) ===\n');
  
  // Explicitly set to false (though we're not checking it anymore)
  delete process.env.USE_DEEPWIKI_MOCK;
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  try {
    // Initialize services
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    console.log('✅ Services initialized for REAL analysis\n');
    
    // Step 1: Analyze MAIN branch
    console.log('Step 1: Analyzing MAIN branch with real DeepWiki...');
    const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 1 // Just 1 iteration for testing
    });
    
    const mainIssues = mainResult.issues || [];
    console.log(`✅ Main branch: ${mainIssues.length} real issues found\n`);
    
    // Check code snippets
    console.log('Main branch code snippets:');
    mainIssues.slice(0, 3).forEach((issue: any, idx: number) => {
      console.log(`  Issue ${idx + 1}: "${issue.title}"`);
      console.log(`    Code Snippet: ${issue.codeSnippet ? 
        (issue.codeSnippet.substring(0, 50) + '...') : 
        'MISSING'}`);
    });
    
    // Step 2: Analyze PR branch
    console.log('\nStep 2: Analyzing PR branch with real DeepWiki...');
    const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      useCache: false,
      maxIterations: 1,
      mainBranchIssues: mainIssues // Pass for tracking
    });
    
    const prIssues = prResult.issues || [];
    console.log(`✅ PR branch: ${prIssues.length} real issues found\n`);
    
    // Check code snippets
    console.log('PR branch code snippets:');
    prIssues.slice(0, 3).forEach((issue: any, idx: number) => {
      console.log(`  Issue ${idx + 1}: "${issue.title}"`);
      console.log(`    Code Snippet: ${issue.codeSnippet ? 
        (issue.codeSnippet.substring(0, 50) + '...') : 
        'MISSING'}`);
    });
    
    // Step 3: Categorize
    console.log('\nStep 3: Categorizing real issues...');
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    console.log('Categorization results:');
    console.log(`  NEW: ${categorized.summary.totalNew}`);
    console.log(`  FIXED: ${categorized.summary.totalFixed}`);
    console.log(`  UNCHANGED: ${categorized.summary.totalUnchanged}`);
    
    // Step 4: Generate report
    console.log('\nStep 4: Generating report with real data...');
    const comparisonResult = {
      success: true,
      mainBranch: { name: 'main', issues: mainIssues },
      prBranch: { name: `PR #${prNumber}`, issues: prIssues },
      newIssues: categorized.newIssues?.map((item: any) => item.issue || item) || [],
      resolvedIssues: categorized.fixedIssues?.map((item: any) => item.issue || item) || [],
      unchangedIssues: categorized.unchangedIssues?.map((item: any) => item.issue || item) || [],
      repositoryUrl,
      prNumber: prNumber.toString(),
      metadata: {
        analysisDate: new Date().toISOString(),
        modelUsed: 'real-deepwiki',
        note: 'Using REAL DeepWiki analysis - no mocking'
      }
    };
    
    const report = await reportGenerator.generateReport(comparisonResult);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, 'test-reports', `real-only-${timestamp}.md`);
    fs.writeFileSync(outputPath, report);
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    
    // Validate no placeholders
    const hasPlaceholders = report.includes('// Code related to') || 
                          report.includes('// Code that handles') ||
                          report.includes('// Network request logic');
    
    if (hasPlaceholders) {
      console.log('\n❌ WARNING: Report still contains placeholder code snippets!');
      console.log('   This means DeepWiki is not returning real code.');
    } else {
      console.log('\n✅ SUCCESS: Report contains real code snippets!');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('\n⚠️  DeepWiki is not running. Start it with:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

// Run the test
testRealDeepWikiOnly().catch(console.error);