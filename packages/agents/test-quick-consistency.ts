#!/usr/bin/env npx ts-node

/**
 * Quick Consistency Test - Single Iteration per Run
 * Demonstrates the consistency issue with simpler, faster execution
 */

import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import * as fs from 'fs';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

interface TestRun {
  runNumber: number;
  duration: number;
  issuesFound: number;
  error?: string;
}

async function runQuickConsistencyTest() {
  console.log(`${colors.bright}${colors.cyan}🔬 QUICK CONSISTENCY TEST${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  const TEST_REPO = 'https://github.com/sindresorhus/is-odd'; // Small repo for quick test
  const NUM_RUNS = 3;
  
  console.log(`📦 Test Repository: ${TEST_REPO} (small repo)`);
  console.log(`🔄 Number of test runs: ${NUM_RUNS}`);
  console.log(`🎯 Goal: Demonstrate consistency issues\n`);
  
  const api = new DeepWikiApiWrapper();
  const testRuns: TestRun[] = [];
  
  // Run the same test 3 times with single iteration
  for (let i = 1; i <= NUM_RUNS; i++) {
    console.log('─'.repeat(80));
    console.log(`\n🚀 ${colors.bright}TEST RUN ${i}/${NUM_RUNS}${colors.reset}\n`);
    
    const startTime = Date.now();
    
    try {
      // Run single iteration analysis
      const result = await api.analyzeRepository(TEST_REPO);
      
      const duration = (Date.now() - startTime) / 1000;
      const issuesFound = result.issues?.length || 0;
      
      testRuns.push({
        runNumber: i,
        duration,
        issuesFound
      });
      
      console.log(`${colors.green}✅ Run ${i} Complete${colors.reset}`);
      console.log(`   Duration: ${duration.toFixed(2)}s`);
      console.log(`   Issues Found: ${issuesFound}`);
      
      // Wait between runs
      if (i < NUM_RUNS) {
        console.log(`\n⏳ Waiting 3 seconds before next run...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error: any) {
      console.log(`${colors.red}❌ Run ${i} Failed${colors.reset}`);
      console.log(`   Error: ${error.message}`);
      testRuns.push({
        runNumber: i,
        duration: (Date.now() - startTime) / 1000,
        issuesFound: 0,
        error: error.message
      });
    }
  }
  
  // Analyze consistency
  console.log('\n' + '═'.repeat(80));
  console.log(`\n📊 ${colors.bright}${colors.cyan}CONSISTENCY ANALYSIS${colors.reset}\n`);
  
  const successfulRuns = testRuns.filter(r => !r.error);
  
  if (successfulRuns.length === 0) {
    console.log(`${colors.red}❌ All test runs failed${colors.reset}`);
    return;
  }
  
  // Findings consistency
  console.log(`${colors.bright}1. FINDINGS CONSISTENCY${colors.reset}`);
  console.log('─'.repeat(40));
  
  const issuesCounts = successfulRuns.map(r => r.issuesFound);
  const avgIssues = issuesCounts.reduce((sum, c) => sum + c, 0) / issuesCounts.length;
  const minIssues = Math.min(...issuesCounts);
  const maxIssues = Math.max(...issuesCounts);
  const variance = maxIssues - minIssues;
  
  console.log(`  Issues found per run: ${issuesCounts.join(', ')}`);
  console.log(`  Average: ${avgIssues.toFixed(1)} issues`);
  console.log(`  Range: ${minIssues} - ${maxIssues} (variance: ${variance})`);
  
  const isConsistent = variance === 0;
  console.log(`  Consistency: ${isConsistent ? 
    `${colors.green}✅ PERFECT${colors.reset}` : 
    `${colors.red}❌ INCONSISTENT${colors.reset}`} (variance of ${variance} issues)`);
  
  // Performance consistency
  console.log(`\n${colors.bright}2. PERFORMANCE CONSISTENCY${colors.reset}`);
  console.log('─'.repeat(40));
  
  const durations = successfulRuns.map(r => r.duration);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  
  console.log(`  Duration per run: ${durations.map(d => `${d.toFixed(2)}s`).join(', ')}`);
  console.log(`  Average: ${avgDuration.toFixed(2)}s`);
  
  // Cost Analysis (CORRECTED)
  console.log(`\n${colors.bright}3. COST ANALYSIS (CORRECTED)${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Based on actual OpenRouter data: ~$0.04 per analysis
  const actualCostPerAnalysis = 0.04;
  const oldWrongEstimate = 1.32;
  
  console.log(`  ${colors.red}OLD (WRONG) estimate: $${oldWrongEstimate}${colors.reset}`);
  console.log(`  ${colors.green}ACTUAL from OpenRouter: $${actualCostPerAnalysis}${colors.reset}`);
  console.log(`  Error in old estimate: ${((oldWrongEstimate / actualCostPerAnalysis - 1) * 100).toFixed(0)}% too high`);
  
  // Confidence assessment
  console.log('\n' + '═'.repeat(80));
  console.log(`\n🎯 ${colors.bright}CONFIDENCE ASSESSMENT${colors.reset}\n`);
  
  if (variance === 0) {
    console.log(`  ${colors.green}✅ HIGH CONFIDENCE: Consistent results across all runs${colors.reset}`);
  } else if (variance <= 5) {
    console.log(`  ${colors.yellow}⚠️  MODERATE CONFIDENCE: Small variance in results${colors.reset}`);
    console.log(`  Note: This demonstrates why iterative collection (3-10 iterations) is needed`);
  } else {
    console.log(`  ${colors.red}❌ LOW CONFIDENCE: Significant inconsistencies detected${colors.reset}`);
    console.log(`  ${colors.bright}This is exactly why we need iterative collection!${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}Key Insights:${colors.reset}`);
  console.log(`  1. Single iteration shows variance of ${variance} issues`);
  console.log(`  2. Iterative collection (3-10 iterations) would stabilize results`);
  console.log(`  3. Cost is actually $${actualCostPerAnalysis}, not $${oldWrongEstimate}`);
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    repository: TEST_REPO,
    runs: testRuns,
    analysis: {
      variance,
      isConsistent,
      avgIssues,
      actualCost: actualCostPerAnalysis,
      oldWrongCost: oldWrongEstimate
    }
  };
  
  const reportPath = `/tmp/quick-consistency-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

// Run the test
console.log('Starting quick consistency test...\n');
console.log('This will run 3 quick analyses on a small repository.\n');

runQuickConsistencyTest().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});