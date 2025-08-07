#!/usr/bin/env ts-node
/**
 * Generate a comprehensive test report to validate all fixes
 */

import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

async function generateTestReport() {
  console.log('📊 Generating Comprehensive Test Report\n');
  console.log('=' .repeat(80));
  
  try {
    // Import needed modules
    const { MockDeepWikiApiWrapper } = require('./src/standard/services/deepwiki-api-wrapper');
    const { createTestOrchestrator } = require('./src/standard/infrastructure/factory');
    const { IssueIdGenerator } = require('./src/standard/services/issue-id-generator');
    
    // Create mock API
    const mockApi = new MockDeepWikiApiWrapper();
    
    // Get mock data for both branches
    const mainData = await mockApi.analyzeRepository('https://github.com/test/repo', { 
      branch: 'main' 
    });
    const prData = await mockApi.analyzeRepository('https://github.com/test/repo', { 
      branch: 'pr/123' 
    });
    
    console.log('\n📋 Mock Data Summary:');
    console.log(`  Main branch issues: ${mainData.issues.length}`);
    console.log(`  PR branch issues: ${prData.issues.length}`);
    
    // Create orchestrator
    const orchestrator = await createTestOrchestrator();
    
    // Prepare the analysis request
    const request = {
      userId: 'test-user',
      teamId: 'test-team',
      language: 'javascript',
      sizeCategory: 'medium' as const,
      mainBranchAnalysis: {
        score: mainData.scores.overall,
        issues: mainData.issues.map((issue: any) => ({
          id: issue.id || IssueIdGenerator.generateIssueId({
            category: issue.category,
            severity: issue.severity,
            title: issue.title,
            message: issue.description,
            location: issue.location
          }),
          category: issue.category,
          severity: issue.severity,
          location: issue.location,
          message: issue.description || issue.title,
          title: issue.title,
          description: issue.description,
          codeSnippet: issue.metadata?.codeSnippet,
          suggestedFix: issue.metadata?.suggestedFix,
          metadata: issue.metadata
        })),
        summary: 'Main branch analysis',
        metadata: mainData.metadata
      },
      featureBranchAnalysis: {
        score: prData.scores.overall,
        issues: prData.issues.map((issue: any) => ({
          id: issue.id || IssueIdGenerator.generateIssueId({
            category: issue.category,
            severity: issue.severity,
            title: issue.title,
            message: issue.description,
            location: issue.location
          }),
          category: issue.category,
          severity: issue.severity,
          location: issue.location,
          message: issue.description || issue.title,
          title: issue.title,
          description: issue.description,
          codeSnippet: issue.metadata?.codeSnippet,
          suggestedFix: issue.metadata?.suggestedFix,
          metadata: issue.metadata
        })),
        summary: 'PR branch analysis',
        metadata: prData.metadata
      },
      prMetadata: {
        id: 'pr-123',
        number: 123,
        title: 'Test PR for Validation',
        author: 'test-user',
        repository: 'test/repo',
        targetBranch: 'main',
        sourceBranch: 'feature/test'
      }
    };
    
    // Run the comparison
    console.log('\n🔄 Running comparison analysis...');
    const result = await orchestrator.executeComparison(request);
    
    // Display results
    console.log('\n✅ Analysis Complete!\n');
    console.log('📊 Comparison Results:');
    console.log(`  New Issues: ${result.newIssues?.length || 0}`);
    console.log(`  Fixed Issues: ${result.fixedIssues?.length || 0}`);
    console.log(`  Unchanged Issues: ${result.unchangedIssues?.length || 0}`);
    console.log(`  Modified Issues: ${result.modifiedIssues?.length || 0}`);
    console.log(`  Overall Score: ${result.overallScore}/100`);
    console.log(`  Decision: ${result.decision}`);
    
    // List issues
    if (result.fixedIssues && result.fixedIssues.length > 0) {
      console.log('\n✅ Fixed Issues:');
      result.fixedIssues.forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
      });
    }
    
    if (result.newIssues && result.newIssues.length > 0) {
      console.log('\n🆕 New Issues:');
      result.newIssues.forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
        if (issue.codeSnippet) {
          console.log(`     Has code snippet: ✅`);
        }
        if (issue.suggestedFix) {
          console.log(`     Has suggested fix: ✅`);
        }
      });
    }
    
    if (result.unchangedIssues && result.unchangedIssues.length > 0) {
      console.log('\n📍 Unchanged Issues:');
      result.unchangedIssues.forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
      });
    }
    
    // Save the report
    if (result.report) {
      const reportPath = path.join(__dirname, 'validation-report.md');
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n📄 Full report saved to: ${reportPath}`);
      
      // Validate report content
      console.log('\n🔍 Report Validation:');
      const report = result.report;
      
      const checks = [
        { name: 'PR Decision', pattern: /✅ APPROVED|❌ DECLINED/ },
        { name: 'Executive Summary', pattern: /Executive Summary/ },
        { name: 'New Issues Section', pattern: /New Issues|PR Issues/ },
        { name: 'Repository Issues', pattern: /Repository Issues|Existing Issues/ },
        { name: 'Fixed Issues', pattern: /Fixed Issues|Resolved Issues/ },
        { name: 'Code Snippets', pattern: /```/ },
        { name: 'Severity Badges', pattern: /\[CRITICAL\]|\[HIGH\]|\[MEDIUM\]|\[LOW\]/ },
        { name: 'Score Display', pattern: /\d+\/100/ }
      ];
      
      checks.forEach(check => {
        const found = check.pattern.test(report);
        console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
      });
      
      // Count issues in report
      const criticalMatches = (report.match(/\[CRITICAL\]/g) || []).length;
      const highMatches = (report.match(/\[HIGH\]/g) || []).length;
      const mediumMatches = (report.match(/\[MEDIUM\]/g) || []).length;
      const lowMatches = (report.match(/\[LOW\]/g) || []).length;
      
      console.log('\n📊 Issues in Report:');
      console.log(`  Critical: ${criticalMatches}`);
      console.log(`  High: ${highMatches}`);
      console.log(`  Medium: ${mediumMatches}`);
      console.log(`  Low: ${lowMatches}`);
      console.log(`  Total: ${criticalMatches + highMatches + mediumMatches + lowMatches}`);
    }
    
    // Final validation
    console.log('\n' + '=' .repeat(80));
    console.log('🎯 VALIDATION SUMMARY');
    console.log('=' .repeat(80));
    
    const expectedFixed = 1;  // main-issue-1 should be fixed
    const expectedNew = 3;     // pr-0, pr-1, pr-2 should be new
    const expectedUnchanged = 2; // main-issue-2 and main-issue-3 remain
    
    const actualFixed = result.fixedIssues?.length || 0;
    const actualNew = result.newIssues?.length || 0;
    const actualUnchanged = result.unchangedIssues?.length || 0;
    
    console.log('\nExpected vs Actual:');
    console.log(`  Fixed Issues: Expected ${expectedFixed}, Got ${actualFixed} ${actualFixed === expectedFixed ? '✅' : '❌'}`);
    console.log(`  New Issues: Expected ${expectedNew}, Got ${actualNew} ${actualNew === expectedNew ? '✅' : '❌'}`);
    console.log(`  Unchanged Issues: Expected ${expectedUnchanged}, Got ${actualUnchanged} ${actualUnchanged === expectedUnchanged ? '✅' : '❌'}`);
    
    if (actualFixed === expectedFixed && actualNew === expectedNew && actualUnchanged === expectedUnchanged) {
      console.log('\n✅ ALL TESTS PASSED! The issue matching is working correctly.');
    } else {
      console.log('\n❌ TEST FAILED! Issue matching is not working as expected.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
generateTestReport();