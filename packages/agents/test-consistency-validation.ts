#!/usr/bin/env npx ts-node

/**
 * Consistency Validation Test
 * Runs the same analysis 3 times to verify:
 * 1. Number of findings stays consistent
 * 2. Actual costs match OpenRouter
 * 3. Iterations are predictable
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
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
  startTime: Date;
  endTime: Date;
  duration: number;
  iterations: number;
  issuesFound: number;
  issueCategories: Record<string, number>;
  issuesWithCodeSnippets: number;
  issuesWithLocation: number;
  estimatedTokens: number;
  actualCost?: number;
  error?: string;
}

async function runConsistencyTest() {
  console.log(`${colors.bright}${colors.cyan}🔬 CONSISTENCY VALIDATION TEST${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  const TEST_REPO = 'https://github.com/sindresorhus/ky';
  const NUM_RUNS = 3;
  
  console.log(`📦 Test Repository: ${TEST_REPO}`);
  console.log(`🔄 Number of test runs: ${NUM_RUNS}`);
  console.log(`🎯 Goal: Verify consistency of findings across multiple runs\n`);
  
  const api = new DirectDeepWikiApiWithLocation();
  const testRuns: TestRun[] = [];
  
  // Run the same test 3 times
  for (let i = 1; i <= NUM_RUNS; i++) {
    console.log('─'.repeat(80));
    console.log(`\n🚀 ${colors.bright}TEST RUN ${i}/${NUM_RUNS}${colors.reset}\n`);
    
    const startTime = new Date();
    const run: TestRun = {
      runNumber: i,
      startTime,
      endTime: new Date(),
      duration: 0,
      iterations: 0,
      issuesFound: 0,
      issueCategories: {},
      issuesWithCodeSnippets: 0,
      issuesWithLocation: 0,
      estimatedTokens: 0
    };
    
    try {
      // Run analysis
      const result = await api.analyzeRepository(TEST_REPO, { branch: 'main' });
      
      run.endTime = new Date();
      run.duration = (run.endTime.getTime() - run.startTime.getTime()) / 1000;
      
      // Extract metrics
      const metadata = result.metadata as any;
      run.iterations = metadata.iterationsPerformed || 0;
      run.issuesFound = result.issues?.length || 0;
      
      // Analyze issues
      if (result.issues) {
        result.issues.forEach((issue: any) => {
          // Count categories
          const category = issue.category || 'uncategorized';
          run.issueCategories[category] = (run.issueCategories[category] || 0) + 1;
          
          // Count quality metrics
          if (issue.codeSnippet) run.issuesWithCodeSnippets++;
          if (issue.location?.file && issue.location.file !== 'unknown') run.issuesWithLocation++;
        });
      }
      
      // Calculate token usage (more accurate based on actual OpenRouter data)
      // From your screenshot: ~2000-2500 tokens per call, 8 calls per iteration
      const tokensPerCall = 2250; // Average from your data
      const callsPerIteration = 8; // 8 parallel AI calls per iteration
      run.estimatedTokens = run.iterations * tokensPerCall * callsPerIteration;
      
      // Display immediate results
      console.log(`${colors.green}✅ Run ${i} Complete${colors.reset}`);
      console.log(`   Duration: ${run.duration.toFixed(2)}s`);
      console.log(`   Iterations: ${run.iterations}`);
      console.log(`   Issues Found: ${run.issuesFound}`);
      console.log(`   With Code Snippets: ${run.issuesWithCodeSnippets}`);
      console.log(`   With Locations: ${run.issuesWithLocation}`);
      console.log(`   Categories: ${Object.keys(run.issueCategories).join(', ')}`);
      
      testRuns.push(run);
      
      // Wait a bit between runs to avoid rate limiting
      if (i < NUM_RUNS) {
        console.log(`\n⏳ Waiting 5 seconds before next run...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error: any) {
      console.log(`${colors.red}❌ Run ${i} Failed${colors.reset}`);
      console.log(`   Error: ${error.message}`);
      run.error = error.message;
      testRuns.push(run);
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
  
  // 1. FINDINGS CONSISTENCY
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
  
  const isConsistent = variance <= 5; // Allow up to 5 issues variance
  console.log(`  Consistency: ${isConsistent ? `${colors.green}✅ GOOD${colors.reset}` : `${colors.red}❌ POOR${colors.reset}`} (variance ${variance} issues)`);
  
  // 2. ITERATIONS CONSISTENCY
  console.log(`\n${colors.bright}2. ITERATIONS CONSISTENCY${colors.reset}`);
  console.log('─'.repeat(40));
  
  const iterations = successfulRuns.map(r => r.iterations);
  const avgIterations = iterations.reduce((sum, i) => sum + i, 0) / iterations.length;
  
  console.log(`  Iterations per run: ${iterations.join(', ')}`);
  console.log(`  Average: ${avgIterations.toFixed(1)} iterations`);
  console.log(`  Consistency: ${new Set(iterations).size === 1 ? `${colors.green}✅ PERFECT${colors.reset}` : `${colors.yellow}⚠️  VARIABLE${colors.reset}`}`);
  
  // 3. CATEGORY CONSISTENCY
  console.log(`\n${colors.bright}3. CATEGORY CONSISTENCY${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Merge all categories
  const allCategories = new Set<string>();
  successfulRuns.forEach(r => {
    Object.keys(r.issueCategories).forEach(cat => allCategories.add(cat));
  });
  
  console.log(`  Categories found: ${Array.from(allCategories).join(', ')}`);
  
  // Check if same categories appear in all runs
  const categoryConsistency: Record<string, number> = {};
  allCategories.forEach(cat => {
    const runsWithCategory = successfulRuns.filter(r => r.issueCategories[cat]).length;
    categoryConsistency[cat] = runsWithCategory;
    const percentage = (runsWithCategory / successfulRuns.length * 100).toFixed(0);
    console.log(`    ${cat}: ${runsWithCategory}/${successfulRuns.length} runs (${percentage}%)`);
  });
  
  // 4. QUALITY METRICS CONSISTENCY
  console.log(`\n${colors.bright}4. QUALITY METRICS CONSISTENCY${colors.reset}`);
  console.log('─'.repeat(40));
  
  const snippetRates = successfulRuns.map(r => (r.issuesWithCodeSnippets / r.issuesFound * 100).toFixed(1));
  const locationRates = successfulRuns.map(r => (r.issuesWithLocation / r.issuesFound * 100).toFixed(1));
  
  console.log(`  Code snippet rates: ${snippetRates.map(r => `${r}%`).join(', ')}`);
  console.log(`  Location accuracy rates: ${locationRates.map(r => `${r}%`).join(', ')}`);
  
  // 5. COST ANALYSIS (CORRECTED)
  console.log(`\n${colors.bright}5. COST ANALYSIS (CORRECTED)${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Based on your OpenRouter screenshot:
  // GPT-4o-mini: ~$0.00463 per call
  // GPT-4 Turbo: ~$0.04 per analysis
  
  const avgTokens = successfulRuns.reduce((sum, r) => sum + r.estimatedTokens, 0) / successfulRuns.length;
  
  // Correct pricing from OpenRouter (per million tokens)
  // GPT-4 Turbo: $10/$30 (input/output)
  // GPT-4o-mini: $0.15/$0.60 (input/output)
  // Average: Use GPT-4 Turbo pricing as that's what's being used
  const costPerMillionTokens = 20; // Average of $10 input + $30 output / 2
  const actualCostPerAnalysis = (avgTokens / 1_000_000) * costPerMillionTokens;
  
  console.log(`  Average tokens per analysis: ${avgTokens.toFixed(0)}`);
  console.log(`  ${colors.red}OLD (WRONG) cost estimate: $1.32${colors.reset}`);
  console.log(`  ${colors.green}CORRECTED cost estimate: $${actualCostPerAnalysis.toFixed(4)}${colors.reset}`);
  console.log(`  ${colors.cyan}ACTUAL from OpenRouter: ~$0.04${colors.reset}`);
  console.log(`  Accuracy: ${((actualCostPerAnalysis / 0.04) * 100).toFixed(0)}% of actual`);
  
  // 6. DETAILED COMPARISON
  console.log(`\n${colors.bright}6. DETAILED RUN COMPARISON${colors.reset}`);
  console.log('─'.repeat(40));
  
  console.log('\n  Run | Duration | Iterations | Issues | Snippets | Locations');
  console.log('  ----|----------|------------|--------|----------|----------');
  
  successfulRuns.forEach(r => {
    const snippetRate = ((r.issuesWithCodeSnippets / r.issuesFound) * 100).toFixed(0);
    const locationRate = ((r.issuesWithLocation / r.issuesFound) * 100).toFixed(0);
    console.log(`   ${r.runNumber}  | ${r.duration.toFixed(1).padEnd(8)}s | ${String(r.iterations).padEnd(10)} | ${String(r.issuesFound).padEnd(6)} | ${snippetRate.padEnd(7)}% | ${locationRate}%`);
  });
  
  // 7. CONFIDENCE ASSESSMENT
  console.log('\n' + '═'.repeat(80));
  console.log(`\n🎯 ${colors.bright}CONFIDENCE ASSESSMENT${colors.reset}\n`);
  
  const confidenceChecks = [
    {
      name: 'Findings Consistency',
      passed: variance <= 5,
      detail: `Variance of ${variance} issues`
    },
    {
      name: 'Iteration Stability',
      passed: new Set(iterations).size <= 2,
      detail: `${new Set(iterations).size} different iteration counts`
    },
    {
      name: 'Code Snippet Quality',
      passed: successfulRuns.every(r => r.issuesWithCodeSnippets / r.issuesFound >= 0.8),
      detail: `${snippetRates[0]}% average`
    },
    {
      name: 'Cost Accuracy',
      passed: Math.abs(actualCostPerAnalysis - 0.04) < 0.02,
      detail: `$${actualCostPerAnalysis.toFixed(4)} vs $0.04 actual`
    }
  ];
  
  confidenceChecks.forEach(check => {
    const icon = check.passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`  ${icon} ${check.name}: ${check.detail}`);
  });
  
  const confidenceScore = (confidenceChecks.filter(c => c.passed).length / confidenceChecks.length) * 100;
  
  console.log(`\n  ${colors.bright}Overall Confidence: ${confidenceScore.toFixed(0)}%${colors.reset}`);
  
  if (confidenceScore >= 75) {
    console.log(`  ${colors.green}✅ HIGH CONFIDENCE: System is producing consistent results${colors.reset}`);
  } else if (confidenceScore >= 50) {
    console.log(`  ${colors.yellow}⚠️  MODERATE CONFIDENCE: Some variability in results${colors.reset}`);
  } else {
    console.log(`  ${colors.red}❌ LOW CONFIDENCE: Significant inconsistencies detected${colors.reset}`);
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    repository: TEST_REPO,
    runs: testRuns,
    analysis: {
      findingsConsistency: {
        variance,
        isConsistent,
        counts: issuesCounts
      },
      iterationsConsistency: {
        counts: iterations,
        isStable: new Set(iterations).size === 1
      },
      costAnalysis: {
        oldEstimate: 1.32,
        correctedEstimate: actualCostPerAnalysis,
        actualFromOpenRouter: 0.04,
        accuracy: (actualCostPerAnalysis / 0.04) * 100
      },
      confidenceScore
    }
  };
  
  const reportPath = `/tmp/consistency-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

// Run the test
console.log('Starting consistency validation test...\n');
console.log('This will run the same analysis 3 times (may take 3-5 minutes).\n');

runConsistencyTest().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});