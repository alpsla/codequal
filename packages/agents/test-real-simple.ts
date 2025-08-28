#!/usr/bin/env ts-node

/**
 * Simple test with real DeepWiki data
 */

import { PRAnalysisOrchestrator } from './src/standard/comparison/orchestrator';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';

async function testRealSimple() {
  console.log('🚀 Testing Real PR Analysis with Fix Suggestions\n');
  console.log('📡 Repository: sindresorhus/is-odd');
  console.log('🔍 Mode: Real DeepWiki (USE_DEEPWIKI_MOCK=false)\n');
  
  const orchestrator = new PRAnalysisOrchestrator();
  const generator = new ReportGeneratorV8Final();
  
  try {
    // Analyze a simple repository
    console.log('⏳ Analyzing repository...');
    const result = await orchestrator.analyzePR(
      'sindresorhus',
      'is-odd',
      1  // Using PR #1 as an example
    );
    
    if (!result || !result.success) {
      // If no PR, just analyze main branch
      console.log('📝 Analyzing main branch instead...');
      const mainResult = await orchestrator.analyzeRepository(
        'https://github.com/sindresorhus/is-odd',
        'main'
      );
      
      console.log(`\n✅ Found ${mainResult.issues.length} issues\n`);
      
      // Create comparison result for report
      const comparisonResult: any = {
        success: true,
        prIssues: mainResult.issues,
        mainIssues: [],
        addedIssues: mainResult.issues,
        fixedIssues: [],
        unchangedIssues: [],
        newIssues: mainResult.issues.map((i: any) => ({
          ...i,
          message: i.description || i.title || i.message,
          codeSnippet: i.codeSnippet || ''
        })),
        resolvedIssues: [],
        changedIssues: []
      };
      
      // Generate report
      console.log('🔧 Generating report with fix suggestions...\n');
      const report = await generator.generateReport(comparisonResult);
      
      // Save report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = `test-reports/real-analysis-${timestamp}.md`;
      fs.writeFileSync(reportPath, report);
      
      // Display summary
      console.log('📊 Analysis Summary:');
      console.log(`   Total issues: ${mainResult.issues.length}`);
      
      // Count fix types
      const templateCount = (report.match(/Template Applied:/g) || []).length;
      const optionACount = (report.match(/OPTION A:/g) || []).length;
      const aiFallbackCount = (report.match(/ai-fallback/g) || []).length;
      
      console.log(`\n   Fix Suggestions Generated:`);
      console.log(`   - Template-based fixes: ${templateCount}`);
      console.log(`   - Drop-in replacements: ${optionACount}`);
      console.log(`   - AI-generated fixes: ${aiFallbackCount}`);
      
      console.log(`\n✅ Report saved to: ${reportPath}`);
      console.log('\n📖 Review the report to see function names preserved in fixes!');
      
      return true;
    }
    
    // Generate report if PR analysis succeeded
    console.log(`\n✅ PR Analysis complete!`);
    const report = await generator.generateReport(result);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `test-reports/real-pr-${timestamp}.md`;
    fs.writeFileSync(reportPath, report);
    
    console.log(`📝 Report saved to: ${reportPath}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

testRealSimple().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});