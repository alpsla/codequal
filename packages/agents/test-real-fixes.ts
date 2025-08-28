#!/usr/bin/env npx ts-node
/**
 * Test that fix suggestions are real code, not placeholders
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';

async function testRealFixes() {
  console.log('=== Testing Real Fix Suggestions ===\n');
  
  // Force real DeepWiki
  delete process.env.USE_DEEPWIKI_MOCK;
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  try {
    // Initialize services
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    console.log('✅ Services initialized\n');
    
    // Quick analysis to get some issues
    console.log('Analyzing repository...');
    const result = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 1
    });
    
    const issues = result.issues || [];
    console.log(`Found ${issues.length} issues\n`);
    
    // Generate report with fixes
    console.log('Generating report with fix suggestions...');
    const comparisonResult = {
      success: true,
      mainBranch: { name: 'main', issues: [] },
      prBranch: { name: `PR #${prNumber}`, issues: [] },
      newIssues: issues.slice(0, 5), // Test with first 5 issues
      resolvedIssues: [],
      unchangedIssues: [],
      repositoryUrl,
      prNumber: prNumber.toString(),
      metadata: {
        timestamp: new Date(),
        modelUsed: 'test-validation'
      }
    };
    
    const report = await reportGenerator.generateReport(comparisonResult);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, 'test-reports', `real-fixes-${timestamp}.md`);
    fs.writeFileSync(outputPath, report);
    
    console.log(`\n✅ Report saved to: ${outputPath}`);
    
    // Validate fixes
    console.log('\n=== VALIDATION ===');
    
    // Check for placeholder patterns
    const badPatterns = [
      '// This is a mock response',
      '// AI-generated fix for',
      '// Original code here',
      'mock response for testing'
    ];
    
    let hasPlaceholders = false;
    badPatterns.forEach(pattern => {
      if (report.includes(pattern)) {
        console.log(`❌ Found placeholder: "${pattern}"`);
        hasPlaceholders = true;
      }
    });
    
    // Check for real fix patterns
    const goodPatterns = [
      'try {',
      'catch (error)',
      'if (!',
      'throw new Error',
      'const sanitized',
      'await db.execute',
      'parameterized'
    ];
    
    let hasRealFixes = false;
    goodPatterns.forEach(pattern => {
      if (report.includes(pattern)) {
        hasRealFixes = true;
      }
    });
    
    console.log('\n📊 Results:');
    console.log(`  Placeholders found: ${hasPlaceholders ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
    console.log(`  Real fixes found: ${hasRealFixes ? '✅ YES (GOOD)' : '❌ NO (BAD)'}`);
    
    if (hasPlaceholders) {
      console.log('\n⚠️ Fix suggestions still contain placeholders!');
    } else if (hasRealFixes) {
      console.log('\n✅ SUCCESS: Fix suggestions contain real code!');
    } else {
      console.log('\n⚠️ No fix patterns detected - check the report manually');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('\n⚠️ DeepWiki is not running. Start it with:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

// Run the test
testRealFixes().catch(console.error);