#!/usr/bin/env npx ts-node

/**
 * Show Current Monitoring Status
 * Displays aggregated metrics from all recent analyses
 */

import * as fs from 'fs';
import * as path from 'path';

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

function showMonitoringStatus() {
  console.log(`\n${colors.bright}${colors.cyan}📊 CODEQUAL MONITORING STATUS${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  const metricsFile = '/tmp/codequal-metrics/analysis-metrics.jsonl';
  
  if (!fs.existsSync(metricsFile)) {
    console.log(`${colors.red}❌ No metrics file found${colors.reset}`);
    console.log('Run some analyses first to generate metrics.');
    return;
  }
  
  // Read all metrics
  const content = fs.readFileSync(metricsFile, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line);
  const metrics = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(m => m !== null);
  
  console.log(`\n📈 ${colors.bright}AGGREGATED METRICS${colors.reset}`);
  console.log(`   Total analyses recorded: ${metrics.length}`);
  console.log(`   Period: Last ${metrics.length} analyses\n`);
  
  // Calculate aggregates
  const successfulAnalyses = metrics.filter(m => m.success);
  const failedAnalyses = metrics.filter(m => !m.success);
  
  if (successfulAnalyses.length === 0) {
    console.log(`${colors.yellow}⚠️  No successful analyses recorded yet${colors.reset}`);
    return;
  }
  
  // Iteration statistics
  const iterations = successfulAnalyses.map(m => m.iterations);
  const avgIterations = iterations.reduce((sum, i) => sum + i, 0) / iterations.length;
  const minIterations = Math.min(...iterations);
  const maxIterations = Math.max(...iterations);
  
  console.log(`${colors.bright}1. ITERATION STATISTICS${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  Average: ${avgIterations.toFixed(2)} iterations`);
  console.log(`  Range: ${minIterations} - ${maxIterations} iterations`);
  console.log(`  ${colors.green}✓ Target: 3-10 iterations${colors.reset}\n`);
  
  // Check iteration distribution
  const iterationCounts: Record<number, number> = {};
  iterations.forEach(i => {
    iterationCounts[i] = (iterationCounts[i] || 0) + 1;
  });
  
  console.log(`  Distribution:`);
  Object.entries(iterationCounts).sort(([a], [b]) => Number(a) - Number(b)).forEach(([iter, count]) => {
    const percentage = ((count / iterations.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.ceil(Number(percentage) / 5));
    console.log(`    ${iter} iterations: ${bar} ${count} (${percentage}%)`);
  });
  
  // Performance metrics
  const durations = successfulAnalyses.map(m => m.duration / 1000); // Convert to seconds
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  console.log(`\n${colors.bright}2. PERFORMANCE METRICS${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  Average duration: ${avgDuration.toFixed(2)}s`);
  console.log(`  Range: ${minDuration.toFixed(2)}s - ${maxDuration.toFixed(2)}s`);
  console.log(`  Success rate: ${((successfulAnalyses.length / metrics.length) * 100).toFixed(1)}%`);
  
  // Memory usage
  const memoryUsages = successfulAnalyses
    .filter(m => m.memoryUsed && m.memoryUsed > 0)
    .map(m => m.memoryUsed / 1024 / 1024); // Convert to MB
  
  if (memoryUsages.length > 0) {
    const avgMemory = memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length;
    console.log(`  Average memory: ${avgMemory.toFixed(2)}MB`);
  }
  
  // Issues found
  const issuesCounts = successfulAnalyses.map(m => m.issuesFound);
  const avgIssues = issuesCounts.reduce((sum, i) => sum + i, 0) / issuesCounts.length;
  const minIssues = Math.min(...issuesCounts);
  const maxIssues = Math.max(...issuesCounts);
  
  console.log(`\n${colors.bright}3. ANALYSIS RESULTS${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  Average issues found: ${avgIssues.toFixed(1)}`);
  console.log(`  Range: ${minIssues} - ${maxIssues} issues`);
  console.log(`  Issues per iteration: ${(avgIssues / avgIterations).toFixed(2)}`);
  
  // Repository analysis
  const repoAnalyses: Record<string, number> = {};
  metrics.forEach(m => {
    const repo = m.repositoryUrl.replace('https://github.com/', '');
    repoAnalyses[repo] = (repoAnalyses[repo] || 0) + 1;
  });
  
  console.log(`\n${colors.bright}4. REPOSITORIES ANALYZED${colors.reset}`);
  console.log('─'.repeat(40));
  Object.entries(repoAnalyses).forEach(([repo, count]) => {
    console.log(`  ${repo}: ${count} analyses`);
  });
  
  // Recent analyses
  console.log(`\n${colors.bright}5. RECENT ANALYSES (Last 5)${colors.reset}`);
  console.log('─'.repeat(40));
  
  const recentAnalyses = metrics.slice(-5).reverse();
  recentAnalyses.forEach((m, index) => {
    const repo = m.repositoryUrl.replace('https://github.com/', '');
    const status = m.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const time = new Date(m.timestamp).toLocaleString();
    
    console.log(`  ${index + 1}. ${status} ${repo}`);
    console.log(`     Time: ${time}`);
    console.log(`     Iterations: ${m.iterations}, Duration: ${(m.duration / 1000).toFixed(2)}s, Issues: ${m.issuesFound}`);
    if (m.error) {
      console.log(`     ${colors.red}Error: ${m.error}${colors.reset}`);
    }
    console.log();
  });
  
  // Cost estimation
  console.log(`${colors.bright}6. COST ESTIMATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Estimate based on average iterations and token usage
  const tokensPerIteration = 8000; // Approximate
  const avgTokens = avgIterations * tokensPerIteration;
  const costPerToken = 0.000045; // Average of GPT-4 input/output pricing
  const avgCost = avgTokens * costPerToken;
  const costPerIssue = avgCost / avgIssues;
  
  console.log(`  Estimated tokens per analysis: ${avgTokens.toFixed(0)}`);
  console.log(`  Estimated cost per analysis: $${avgCost.toFixed(4)}`);
  console.log(`  Cost per issue found: $${costPerIssue.toFixed(4)}`);
  console.log(`  Monthly cost (100 analyses): $${(avgCost * 100).toFixed(2)}`);
  
  // System health
  console.log(`\n${colors.bright}7. SYSTEM HEALTH${colors.reset}`);
  console.log('─'.repeat(40));
  
  const healthChecks = [
    {
      name: 'Iteration Control',
      status: avgIterations >= 2 && maxIterations <= 10,
      message: avgIterations >= 2 && maxIterations <= 10 ? 'Working correctly' : 'Check configuration'
    },
    {
      name: 'Performance',
      status: avgDuration < 120,
      message: avgDuration < 120 ? 'Acceptable' : 'Slow - may need optimization'
    },
    {
      name: 'Success Rate',
      status: (successfulAnalyses.length / metrics.length) >= 0.8,
      message: `${((successfulAnalyses.length / metrics.length) * 100).toFixed(1)}%`
    },
    {
      name: 'Data Quality',
      status: avgIssues >= 10,
      message: avgIssues >= 10 ? 'Good coverage' : 'Low issue detection'
    }
  ];
  
  healthChecks.forEach(check => {
    const icon = check.status ? `${colors.green}✓${colors.reset}` : `${colors.yellow}⚠${colors.reset}`;
    console.log(`  ${icon} ${check.name}: ${check.message}`);
  });
  
  const allHealthy = healthChecks.every(c => c.status);
  
  console.log('\n' + '═'.repeat(80));
  if (allHealthy) {
    console.log(`\n${colors.green}${colors.bright}✨ MONITORING CONFIRMS: All systems operational!${colors.reset}`);
    console.log(`Iterative collection with enhanced prompts is working as expected.\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some health checks need attention.${colors.reset}\n`);
  }
}

// Run status check
showMonitoringStatus();