#!/usr/bin/env ts-node
/**
 * Test with real DeepWiki (not mock) for a specific PR
 * Generates a comprehensive report for manual validation
 */

import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

// Ensure we're using real DeepWiki
process.env.USE_DEEPWIKI_MOCK = 'false';

async function runRealPRAnalysis() {
  // Test case: A smaller repository for faster analysis
  const testCase = {
    name: 'SWR Data Fetching Library PR',
    repo: 'https://github.com/vercel/swr',
    pr: 2950,  // A recent PR number
    description: 'Testing with a smaller repository for faster real analysis'
  };
  
  console.log('🚀 Running Real PR Analysis (No Mock Data)');
  console.log('=' .repeat(80));
  console.log(`📋 Test Details:`);
  console.log(`   Repository: ${testCase.repo}`);
  console.log(`   PR: #${testCase.pr}`);
  console.log(`   Description: ${testCase.description}`);
  console.log(`   USE_DEEPWIKI_MOCK: ${process.env.USE_DEEPWIKI_MOCK}`);
  console.log('');
  
  try {
    // Import the analysis service
    const { analyzeWithStandardFramework } = require('../../apps/api/dist/services/standard-orchestrator-service.js');
    
    console.log('⏳ Starting real DeepWiki analysis...');
    console.log('   Note: This may take 2-5 minutes for real analysis\n');
    
    const startTime = Date.now();
    
    // Run the analysis
    const result = await analyzeWithStandardFramework(
      testCase.repo,
      testCase.pr,
      'main'
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Analysis completed in ${duration}s\n`);
    
    // Display results
    console.log('📊 Analysis Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Has Report: ${!!result.report}`);
    console.log(`   Has Comparison: ${!!result.comparison}`);
    
    if (result.comparison) {
      const metrics = {
        newIssues: result.comparison.newIssues?.length || 0,
        fixedIssues: result.comparison.fixedIssues?.length || 0,
        unchangedIssues: result.comparison.unchangedIssues?.length || 0,
        modifiedIssues: result.comparison.modifiedIssues?.length || 0,
        overallScore: result.comparison.overallScore || 0,
        decision: result.comparison.decision || 'UNKNOWN'
      };
      
      console.log(`\n📈 Issue Breakdown:`);
      console.log(`   New Issues: ${metrics.newIssues}`);
      console.log(`   Fixed Issues: ${metrics.fixedIssues}`);
      console.log(`   Unchanged Issues: ${metrics.unchangedIssues}`);
      console.log(`   Modified Issues: ${metrics.modifiedIssues}`);
      console.log(`   Total Issues: ${metrics.newIssues + metrics.fixedIssues + metrics.unchangedIssues + metrics.modifiedIssues}`);
      console.log(`\n   Overall Score: ${metrics.overallScore}/100`);
      console.log(`   Decision: ${metrics.decision}`);
      
      // Show sample issues if any
      if (metrics.newIssues > 0 && result.comparison.newIssues) {
        console.log(`\n🆕 Sample New Issues (first 3):`);
        result.comparison.newIssues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
          console.log(`      Category: ${issue.category}`);
          console.log(`      Location: ${issue.location?.file}:${issue.location?.line}`);
        });
      }
      
      if (metrics.fixedIssues > 0 && result.comparison.fixedIssues) {
        console.log(`\n✅ Sample Fixed Issues (first 3):`);
        result.comparison.fixedIssues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
        });
      }
    }
    
    // Save the report
    if (result.report) {
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(__dirname, 'real-pr-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `facebook-react-PR${testCase.pr}-${timestamp}.md`;
      const reportPath = path.join(reportsDir, filename);
      
      // Save the report
      fs.writeFileSync(reportPath, result.report);
      
      console.log('\n' + '=' .repeat(80));
      console.log('📄 REPORT SAVED SUCCESSFULLY');
      console.log('=' .repeat(80));
      console.log(`\n📍 Full report path:`);
      console.log(`   ${reportPath}`);
      console.log(`\n📁 Relative path:`);
      console.log(`   packages/agents/real-pr-reports/${filename}`);
      
      // Quick validation of report content
      console.log(`\n🔍 Report Content Summary:`);
      const report = result.report;
      const reportSize = (report.length / 1024).toFixed(2);
      const lineCount = report.split('\n').length;
      
      console.log(`   File size: ${reportSize} KB`);
      console.log(`   Line count: ${lineCount} lines`);
      
      const checks = [
        { name: 'Has PR Decision', found: /✅ APPROVED|❌ DECLINED/.test(report) },
        { name: 'Has Executive Summary', found: /Executive Summary/i.test(report) },
        { name: 'Has Security Analysis', found: /Security Analysis/i.test(report) },
        { name: 'Has Performance Analysis', found: /Performance Analysis/i.test(report) },
        { name: 'Has Code Quality', found: /Code Quality/i.test(report) },
        { name: 'Has Issue Details', found: /Issues|Repository Issues/i.test(report) },
        { name: 'Has Recommendations', found: /Recommendation|Action Items/i.test(report) }
      ];
      
      console.log(`\n   Report sections:`);
      checks.forEach(check => {
        console.log(`   ${check.found ? '✅' : '❌'} ${check.name}`);
      });
      
      console.log(`\n✨ Report ready for manual validation!`);
      console.log(`   Please review: ${reportPath}`);
      
    } else {
      console.log('\n❌ No report was generated');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during analysis:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

// Run the analysis
console.log('Starting real PR analysis...\n');
runRealPRAnalysis().catch(console.error);