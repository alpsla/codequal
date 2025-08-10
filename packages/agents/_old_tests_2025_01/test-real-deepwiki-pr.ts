#!/usr/bin/env ts-node

/**
 * Test Real PR with All Features
 * 
 * This script tests the ACTUAL implementation with:
 * - Real DeepWiki analysis
 * - Real DiffAnalyzer for breaking changes
 * - Real AI Location Finder for enhancement
 * - Real V7 report generation
 */

import { DeepWikiService } from './src/standard/services/deepwiki-service';
import { ComparisonOrchestrator } from './src/standard/orchestrator/comparison-orchestrator';
import { ReportGeneratorV7Complete } from './src/standard/comparison/report-generator-v7-complete';
import { createLogger } from '@codequal/core/utils';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('RealDeepWikiPRTest');

// Test with a real GitHub PR
const TEST_CONFIG = {
  repositoryUrl: 'https://github.com/vercel/swr',
  prNumber: 2950,  // Real PR number
  mainBranch: 'main'
};

async function main() {
  console.log('\n🎯 Testing Real DeepWiki with PR Analysis\n');
  console.log('═'.repeat(60));
  console.log(`Repository: ${TEST_CONFIG.repositoryUrl}`);
  console.log(`PR Number: ${TEST_CONFIG.prNumber}`);
  console.log('═'.repeat(60) + '\n');

  try {
    // Initialize orchestrator (it handles everything internally)
    const orchestrator = new ComparisonOrchestrator();
    
    // Run the complete analysis
    console.log('🚀 Starting complete analysis pipeline...\n');
    
    const result = await orchestrator.analyzePR({
      repositoryUrl: TEST_CONFIG.repositoryUrl,
      prNumber: TEST_CONFIG.prNumber,
      mainBranch: TEST_CONFIG.mainBranch,
      options: {
        useDeepWiki: true,
        enhanceLocations: true,
        detectBreakingChanges: true,
        generateV7Report: true
      }
    });

    // Display results
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ANALYSIS RESULTS');
    console.log('═'.repeat(60));
    
    // Issues summary
    console.log('\n📌 Issues Found:');
    console.log(`  • New Issues: ${result.newIssues?.length || 0}`);
    console.log(`  • Fixed Issues: ${result.fixedIssues?.length || 0}`);
    console.log(`  • Persisting Issues: ${result.persistingIssues?.length || 0}`);
    
    // Breaking changes
    if (result.breakingChanges && result.breakingChanges.length > 0) {
      console.log('\n⚠️  Breaking Changes Detected:');
      result.breakingChanges.forEach((change, idx) => {
        console.log(`\n  ${idx + 1}. ${change.type}`);
        console.log(`     File: ${change.file}:${change.line}`);
        console.log(`     Impact: ${change.impact}`);
        console.log(`     Suggestion: ${change.suggestion}`);
      });
    }
    
    // Location enhancements
    const enhancedCount = result.newIssues?.filter(i => i.location?.enhanced).length || 0;
    console.log(`\n📍 Location Enhancements: ${enhancedCount} issues with precise locations`);
    
    // Sample enhanced locations
    if (enhancedCount > 0) {
      console.log('\n  Sample Enhanced Locations:');
      result.newIssues?.filter(i => i.location?.enhanced).slice(0, 3).forEach(issue => {
        console.log(`  • ${issue.title}`);
        console.log(`    ${issue.location.file}:${issue.location.line} (confidence: ${issue.location.confidence})`);
      });
    }

    // Save the V7 report
    if (result.report) {
      const outputDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const reportPath = path.join(outputDir, `pr-${TEST_CONFIG.prNumber}-v7-report-${timestamp}.md`);
      fs.writeFileSync(reportPath, result.report);
      
      console.log(`\n📄 V7 Report saved to: ${reportPath}`);
      
      // Show a preview of the report
      console.log('\n' + '═'.repeat(60));
      console.log('📋 V7 REPORT PREVIEW');
      console.log('═'.repeat(60));
      const lines = result.report.split('\n').slice(0, 50);
      console.log(lines.join('\n'));
      if (result.report.split('\n').length > 50) {
        console.log('\n... [Report continues - see full file for complete content]');
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('═'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // If it's a DeepWiki connection error, provide helpful info
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure DeepWiki is running and port forwarding is active:');
      console.log('   kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001');
    }
    
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);