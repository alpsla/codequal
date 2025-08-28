#!/usr/bin/env ts-node

/**
 * Test real PR with fix suggestions
 */

import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import { DeepWikiRealAPI } from './src/standard/infrastructure/deepwiki/deepwiki-real-api';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';

async function testRealPR() {
  console.log('🚀 Testing Fix Suggestions with Real PR Data\n');
  console.log('📡 Repository: sindresorhus/is-odd (small repo for faster testing)');
  console.log('🔍 Mode: Real DeepWiki (USE_DEEPWIKI_MOCK=false)\n');
  
  // Initialize real DeepWiki
  const deepWikiAPI = new DeepWikiRealAPI({
    apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  });
  
  const deepwiki = new DeepWikiApiWrapper();
  deepwiki.registerDeepWikiAPI(deepWikiAPI);
  
  const generator = new ReportGeneratorV8Final();
  
  try {
    // Analyze a small repository with main branch
    console.log('⏳ Analyzing repository (this may take 30-60 seconds)...');
    const result = await deepwiki.analyzeRepository('https://github.com/sindresorhus/is-odd', {
      branch: 'main'
    });
    
    console.log(`\n✅ Analysis complete! Found ${result.issues.length} issues\n`);
    
    // Show sample issues
    console.log('📋 Sample Issues Found:');
    result.issues.slice(0, 5).forEach((issue: any, i: number) => {
      console.log(`\n${i + 1}. ${issue.title || issue.description}`);
      console.log(`   Severity: ${issue.severity} | Category: ${issue.category}`);
      console.log(`   Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
      if (issue.codeSnippet) {
        console.log(`   Code: ${issue.codeSnippet.split('\n')[0].substring(0, 60)}...`);
      }
    });
    
    // Generate report with fixes
    console.log('\n🔧 Generating report with fix suggestions...\n');
    const comparisonResult: any = {
      success: true,
      prIssues: result.issues,
      mainIssues: [],
      addedIssues: result.issues,
      fixedIssues: [],
      unchangedIssues: [],
      persistentIssues: [],
      newIssues: result.issues.map((i: any) => ({
        ...i, 
        message: i.description || i.title,
        codeSnippet: i.codeSnippet || ''
      })),
      resolvedIssues: [],
      changedIssues: []
    };
    
    const report = await generator.generateReport(comparisonResult);
    
    // Save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `test-reports/real-pr-analysis-${timestamp}.md`;
    fs.writeFileSync(reportPath, report);
    
    // Extract and display fixes
    console.log('📊 Fix Suggestions Generated:');
    
    // Count fixes by looking for patterns
    const templateMatches = (report.match(/Template Applied:/g) || []).length;
    const optionAMatches = (report.match(/OPTION A:/g) || []).length;
    const optionBMatches = (report.match(/OPTION B:/g) || []).length;
    const aiFallbacks = (report.match(/ai-fallback/g) || []).length;
    
    console.log(`\n   Template-based fixes: ${templateMatches}`);
    console.log(`   Drop-in replacements (Option A): ${optionAMatches}`);
    console.log(`   Refactored solutions (Option B): ${optionBMatches}`);
    console.log(`   AI-generated fixes: ${aiFallbacks}`);
    
    // Show a sample fix if found
    if (optionAMatches > 0) {
      console.log('\n📝 Sample Fix Generated (preserves function names):');
      const optionAStart = report.indexOf('OPTION A:');
      if (optionAStart > -1) {
        const sampleEnd = report.indexOf('OPTION B:', optionAStart);
        const sample = report.substring(optionAStart, Math.min(optionAStart + 400, sampleEnd));
        console.log(sample);
      }
    }
    
    console.log(`\n✅ Full report saved to: ${reportPath}`);
    console.log('\n📖 Open the report to review all fix suggestions with preserved function names!');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    return false;
  }
}

// Run the test
testRealPR().then(success => {
  if (success) {
    console.log('\n🎉 Test completed successfully!');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});