#!/usr/bin/env ts-node
/**
 * Test the complete flow from DeepWiki to final report
 * Validates that all issues are properly reported
 */

import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

async function testFullIssueFlow() {
  console.log('🔍 Testing Full Issue Flow from DeepWiki to Report\n');
  console.log('=' .repeat(80));
  
  try {
    // Import services
    const { analyzeWithStandardFramework } = require('../../apps/api/src/services/standard-orchestrator-service');
    const { MockDeepWikiApiWrapper } = require('./src/standard/services/deepwiki-api-wrapper');
    
    // First, let's see what issues the mock DeepWiki returns
    console.log('\n📊 Step 1: DeepWiki Mock Data');
    console.log('-'.repeat(40));
    
    const mockApi = new MockDeepWikiApiWrapper();
    const mainData = await mockApi.analyzeRepository('https://github.com/test/repo', { branch: 'main' });
    const prData = await mockApi.analyzeRepository('https://github.com/test/repo', { branch: 'pr/123' });
    
    console.log('\n🌿 Main Branch Issues from DeepWiki:');
    mainData.issues.forEach((issue: any, idx: number) => {
      console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title}`);
      console.log(`     Category: ${issue.category}`);
      console.log(`     ID: ${issue.id}`);
      console.log(`     Has metadata: ${!!issue.metadata}`);
      if (issue.metadata) {
        console.log(`     Has codeSnippet: ${!!issue.metadata.codeSnippet}`);
        console.log(`     Has suggestedFix: ${!!issue.metadata.suggestedFix}`);
      }
    });
    
    console.log('\n🔀 PR Branch Issues from DeepWiki:');
    prData.issues.forEach((issue: any, idx: number) => {
      console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title}`);
      console.log(`     Category: ${issue.category}`);
      console.log(`     ID: ${issue.id}`);
    });
    
    // Now run the full Standard framework analysis
    console.log('\n📊 Step 2: Running Standard Framework Analysis');
    console.log('-'.repeat(40));
    
    const result = await analyzeWithStandardFramework(
      'https://github.com/test/repo',
      123,
      'main'
    );
    
    console.log('\n✅ Analysis Complete:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Has Report: ${!!result.report}`);
    console.log(`  Has Comparison: ${!!result.comparison}`);
    
    if (result.comparison) {
      console.log('\n📊 Step 3: Comparison Results');
      console.log('-'.repeat(40));
      
      console.log('\n🆕 New Issues (should block PR if critical/high):');
      if (result.comparison.newIssues?.length > 0) {
        result.comparison.newIssues.forEach((issue: any, idx: number) => {
          console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
          console.log(`     Category: ${issue.category}`);
          console.log(`     Has codeSnippet: ${!!issue.codeSnippet}`);
          console.log(`     Has suggestedFix: ${!!issue.suggestedFix}`);
        });
      } else {
        console.log('  None');
      }
      
      console.log('\n✅ Fixed/Resolved Issues:');
      if (result.comparison.fixedIssues?.length > 0) {
        result.comparison.fixedIssues.forEach((issue: any, idx: number) => {
          console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
        });
      } else {
        console.log('  None');
      }
      
      console.log('\n📍 Unchanged Issues (existing in both branches):');
      if (result.comparison.unchangedIssues?.length > 0) {
        result.comparison.unchangedIssues.forEach((issue: any, idx: number) => {
          console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
          console.log(`     Category: ${issue.category}`);
        });
      } else {
        console.log('  None');
      }
      
      console.log('\n📊 Summary:');
      console.log(`  Total issues in main: ${mainData.issues.length}`);
      console.log(`  Total issues in PR: ${prData.issues.length}`);
      console.log(`  New issues reported: ${result.comparison.newIssues?.length || 0}`);
      console.log(`  Fixed issues reported: ${result.comparison.fixedIssues?.length || 0}`);
      console.log(`  Unchanged issues reported: ${result.comparison.unchangedIssues?.length || 0}`);
      console.log(`  Modified issues reported: ${result.comparison.modifiedIssues?.length || 0}`);
      
      const totalReported = (result.comparison.newIssues?.length || 0) + 
                           (result.comparison.fixedIssues?.length || 0) + 
                           (result.comparison.unchangedIssues?.length || 0) +
                           (result.comparison.modifiedIssues?.length || 0);
      
      console.log(`\n  ⚠️  Issues found by DeepWiki: ${prData.issues.length}`);
      console.log(`  📋 Issues in comparison result: ${totalReported}`);
      
      if (totalReported !== prData.issues.length) {
        console.log(`\n  ❌ ISSUE MISMATCH! ${prData.issues.length - totalReported} issues lost in processing!`);
      } else {
        console.log(`\n  ✅ All issues accounted for!`);
      }
    }
    
    // Save the report for manual inspection
    if (result.report) {
      console.log('\n📊 Step 4: Generating Report');
      console.log('-'.repeat(40));
      
      const reportPath = path.join(__dirname, 'test-full-flow-report.md');
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n📄 Report saved to: ${reportPath}`);
      
      // Check what's in the report
      const reportLines = result.report.split('\n');
      const newIssuesSection = reportLines.findIndex((line: string) => line.includes('New Issues'));
      const repoIssuesSection = reportLines.findIndex((line: string) => line.includes('Repository Issues'));
      
      if (newIssuesSection > -1) {
        console.log('\n✅ Report contains "New Issues" section');
      } else {
        console.log('\n❌ Report missing "New Issues" section');
      }
      
      if (repoIssuesSection > -1) {
        console.log('✅ Report contains "Repository Issues" section');
      } else {
        console.log('❌ Report missing "Repository Issues" section');
      }
      
      // Count issues mentioned in report
      const issueMatches = result.report.match(/\[\w+\]/g) || [];
      console.log(`\n📊 Issue severity tags in report: ${issueMatches.length}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testFullIssueFlow();