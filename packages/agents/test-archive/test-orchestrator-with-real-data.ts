#!/usr/bin/env ts-node
/**
 * Test the full orchestrator flow with real DeepWiki data
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '.env.production') });
config({ path: path.resolve(__dirname, '../../.env') });

async function testOrchestratorWithRealData() {
  console.log('🔍 Testing Full Orchestrator Flow with Real DeepWiki Data\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Import required modules
    const { ComparisonOrchestrator } = require('./src/standard/orchestrator/comparison-orchestrator');
    const { DeepWikiService } = require('./src/standard/services/deepwiki-service');
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    
    // Create logger
    const logger = {
      debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
      error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data ? JSON.stringify(data, null, 2) : '')
    };
    
    // Create DeepWiki service
    const deepWikiApiManager = new DeepWikiApiManager();
    const deepWikiService = new DeepWikiService(deepWikiApiManager, logger);
    
    // Create orchestrator with real DeepWiki service
    const orchestrator = new ComparisonOrchestrator(
      deepWikiService,
      undefined, // comparison agent (will be created internally)
      undefined, // data store
      logger
    );
    
    // Test configuration
    const repositoryUrl = 'https://github.com/vercel/swr';
    const prNumber = 2950;
    const mainBranch = 'main';
    
    console.log('📋 Configuration:');
    console.log(`   Repository: ${repositoryUrl}`);
    console.log(`   PR Number: ${prNumber}`);
    console.log(`   Main Branch: ${mainBranch}\n`);
    
    console.log('🚀 Starting orchestrated analysis...\n');
    const startTime = Date.now();
    
    // Run the full orchestration
    const result = await orchestrator.executeComparison({
      repository: repositoryUrl,
      prNumber: prNumber,
      baseBranch: mainBranch,
      generateReport: true
    });
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Orchestration completed in ${(duration / 1000).toFixed(2)}s\n`);
    
    // Display results
    console.log('📊 Orchestration Results:');
    console.log('=' .repeat(50));
    console.log(`   Success: ${result.success}`);
    console.log(`   Has comparison: ${!!result.comparison}`);
    console.log(`   Has report: ${!!result.report}`);
    console.log(`   Has PR comment: ${!!result.prComment}\n`);
    
    if (result.comparison) {
      const comp = result.comparison;
      console.log('📋 Comparison Details:');
      console.log(`   New issues: ${comp.newIssues?.length || 0}`);
      console.log(`   Fixed issues: ${comp.fixedIssues?.length || 0}`);
      console.log(`   Resolved issues: ${comp.resolvedIssues?.length || 0}`);
      console.log(`   Unchanged issues: ${comp.unchangedIssues?.length || 0}`);
      
      if (comp.newIssues && comp.newIssues.length > 0) {
        console.log('\n🆕 New Issues:');
        comp.newIssues.forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase() || issue.issue?.severity?.toUpperCase()}] ${issue.title || issue.issue?.title || issue.issue?.message}`);
        });
      }
      
      if (comp.fixedIssues && comp.fixedIssues.length > 0) {
        console.log('\n✅ Fixed Issues:');
        comp.fixedIssues.forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase() || issue.issue?.severity?.toUpperCase()}] ${issue.title || issue.issue?.title || issue.issue?.message}`);
        });
      }
    }
    
    // Check report content
    if (result.report) {
      const reportLines = result.report.split('\n');
      const prIssuesSection = reportLines.findIndex((line: string) => line.includes('6. PR Issues'));
      const repoIssuesSection = reportLines.findIndex((line: string) => line.includes('7. Repository Issues'));
      
      console.log('\n📄 Report Analysis:');
      console.log(`   Total lines: ${reportLines.length}`);
      console.log(`   Has PR Issues section: ${prIssuesSection > -1}`);
      console.log(`   Has Repository Issues section: ${repoIssuesSection > -1}`);
      
      // Extract issue counts from report
      const newIssuesMatch = result.report.match(/New Critical\/High Issues:\s*(\d+)/);
      const preExistingMatch = result.report.match(/Pre-existing Issues:\s*(\d+)/);
      
      if (newIssuesMatch || preExistingMatch) {
        console.log('\n📊 Issues in Report:');
        if (newIssuesMatch) console.log(`   New Critical/High Issues: ${newIssuesMatch[1]}`);
        if (preExistingMatch) console.log(`   Pre-existing Issues: ${preExistingMatch[1]}`);
      }
      
      // Show first few lines of PR issues section if it exists
      if (prIssuesSection > -1) {
        console.log('\n📝 PR Issues Section Preview:');
        for (let i = prIssuesSection; i < Math.min(prIssuesSection + 10, reportLines.length); i++) {
          if (reportLines[i].trim()) {
            console.log(`   ${reportLines[i]}`);
          }
        }
      }
    }
    
    // Summary
    console.log('\n\n🎯 Final Check:');
    const hasNewIssues = result.comparison?.newIssues && result.comparison.newIssues.length > 0;
    const hasFixedIssues = result.comparison?.fixedIssues && result.comparison.fixedIssues.length > 0;
    const reportShowsIssues = result.report && (result.report.includes('NEW - MUST BE FIXED') || result.report.includes('Fixed Issues'));
    
    if (hasNewIssues || hasFixedIssues) {
      if (reportShowsIssues) {
        console.log('✅ SUCCESS: Orchestrator correctly processed DeepWiki findings and generated report!');
      } else {
        console.log('⚠️  WARNING: Orchestrator has issues but report doesn\'t show them properly');
      }
    } else {
      console.log('❌ ERROR: Orchestrator returned no comparison data despite DeepWiki returning issues!');
    }
    
    return result;
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testOrchestratorWithRealData()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testOrchestratorWithRealData };