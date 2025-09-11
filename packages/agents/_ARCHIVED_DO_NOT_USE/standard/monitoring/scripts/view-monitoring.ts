#!/usr/bin/env npx ts-node

/**
 * Script to view monitoring metrics and costs
 */

import { 
  monitoring, 
  costTracker,
  dynamicCostTracker,
  generateCostReport,
  getCostSummary,
  generateMonitoringReport,
  getRepositoryCostAnalysis
} from '../index';
import * as fs from 'fs/promises';
import * as path from 'path';

async function viewMonitoring() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 CODEQUAL MONITORING DASHBOARD');
  console.log('='.repeat(80) + '\n');
  
  // Get aggregated metrics
  const metrics = monitoring.getAggregatedMetrics();
  
  // Performance Metrics
  console.log('⚡ PERFORMANCE METRICS');
  console.log('-'.repeat(40));
  console.log(`  Active Operations: ${metrics.performance.totalOperations}`);
  console.log(`  Average Duration: ${(metrics.performance.averageDuration / 1000).toFixed(2)}s`);
  console.log(`  Success Rate: ${(metrics.performance.successRate * 100).toFixed(1)}%`);
  console.log();
  
  // Analysis Metrics
  console.log('🔍 ANALYSIS METRICS');
  console.log('-'.repeat(40));
  console.log(`  Total Analyses: ${metrics.analysis.totalAnalyses}`);
  console.log(`  Average Duration: ${(metrics.analysis.averageDuration / 1000).toFixed(1)}s`);
  console.log(`  Average Issues Found: ${metrics.analysis.averageIssuesFound.toFixed(1)}`);
  console.log(`  Location Resolution: ${(metrics.analysis.averageLocationResolutionRate * 100).toFixed(1)}%`);
  console.log(`  Success Rate: ${(metrics.analysis.successRate * 100).toFixed(1)}%`);
  console.log();
  
  // Memory Metrics
  console.log('💾 MEMORY USAGE');
  console.log('-'.repeat(40));
  console.log(`  Current Heap: ${(metrics.memory.currentHeapUsed / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Average Heap: ${(metrics.memory.averageHeapUsed / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Peak Heap: ${(metrics.memory.peakHeapUsed / 1024 / 1024).toFixed(1)} MB`);
  console.log();
  
  // Cost Report
  console.log('💰 COST TRACKING');
  console.log('-'.repeat(40));
  const costSummary = getCostSummary();
  console.log(`  Daily Cost: $${costSummary.daily.toFixed(3)}`);
  console.log(`  Weekly Cost: $${costSummary.weekly.toFixed(3)}`);
  console.log(`  Monthly Cost: $${costSummary.monthly.toFixed(3)}`);
  console.log(`  Projected Monthly: $${costSummary.projectedMonthly.toFixed(2)}`);
  console.log();
  
  console.log('  By Service:');
  Object.entries(costSummary.byService)
    .sort((a, b) => b[1] - a[1])
    .forEach(([service, cost]) => {
      console.log(`    ${service}: $${cost.toFixed(3)}`);
    });
  console.log();
  
  console.log('  Token Usage:');
  console.log(`    Input: ${costSummary.tokensUsed.input.toLocaleString()}`);
  console.log(`    Output: ${costSummary.tokensUsed.output.toLocaleString()}`);
  console.log(`    Total: ${costSummary.tokensUsed.total.toLocaleString()}`);
  console.log();
  
  // Agent Cost Breakdown
  const showAgents = process.argv.includes('--agents');
  
  if (showAgents) {
    console.log('🤖 AGENT COST BREAKDOWN');
    console.log('-'.repeat(40));
    console.log('  Note: Agent costs are tracked in Supabase');
    console.log('  Use --analysis <repo> to see repository costs');
    console.log();
  }
  
  // Generate reports
  const generateReports = process.argv.includes('--generate-reports');
  
  if (generateReports) {
    console.log('📝 GENERATING REPORTS...');
    console.log('-'.repeat(40));
    
    // Generate HTML dashboard
    const dashboardPath = await generateMonitoringReport();
    console.log(`  ✅ HTML Dashboard: ${dashboardPath}`);
    
    // Generate cost report
    const costReportPath = '/tmp/codequal-metrics/cost-report.txt';
    const costReport = generateCostReport();
    await fs.writeFile(costReportPath, costReport);
    console.log(`  ✅ Cost Report: ${costReportPath}`);
    
    // Export cost data as CSV
    const csvPath = '/tmp/codequal-metrics/costs.csv';
    const csvData = costTracker.exportToCSV();
    await fs.writeFile(csvPath, csvData);
    console.log(`  ✅ Cost CSV: ${csvPath}`);
    
    console.log();
  }
  
  // Show recent analyses
  const showRecent = process.argv.includes('--recent');
  
  if (showRecent) {
    console.log('📈 RECENT ANALYSES');
    console.log('-'.repeat(40));
    
    // Read recent analysis metrics
    const metricsFile = '/tmp/codequal-metrics/analysis-metrics.jsonl';
    
    try {
      const content = await fs.readFile(metricsFile, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      const recentMetrics = lines.slice(-5).map(line => JSON.parse(line));
      
      recentMetrics.forEach((m: any) => {
        const duration = m.duration ? `${(m.duration / 1000).toFixed(1)}s` : 'N/A';
        const success = m.success ? '✅' : '❌';
        console.log(`  ${success} ${m.repositoryUrl} - ${duration} - ${m.issuesFound || 0} issues`);
      });
    } catch (error) {
      console.log('  No recent analyses found');
    }
    
    console.log();
  }
  
  console.log('='.repeat(80));
  console.log('💡 Tips:');
  console.log('  --generate-reports  Generate HTML dashboard and reports');
  console.log('  --recent           Show recent analyses');
  console.log('  --agents           Show agent cost breakdown');
  console.log('  --analysis <repo>  Show cost breakdown for specific repository');
  console.log('  --clear-old        Clear metrics older than 30 days');
  console.log('='.repeat(80));
  
  // Show specific analysis breakdown if requested
  const analysisIndex = process.argv.indexOf('--analysis');
  if (analysisIndex !== -1 && process.argv[analysisIndex + 1]) {
    const repo = process.argv[analysisIndex + 1];
    console.log(`\n📊 Analysis Breakdown for: ${repo}`);
    console.log('-'.repeat(40));
    
    try {
      const breakdown = await getRepositoryCostAnalysis(repo);
      
      if (breakdown.total_cost > 0) {
        console.log(`  Total Cost: $${breakdown.total_cost.toFixed(3)}`);
        console.log();
        
        console.log('  By Agent:');
        Object.entries(breakdown.by_agent)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .forEach(([agent, cost]) => {
            console.log(`    ${agent}: $${(cost as number).toFixed(3)}`);
          });
        console.log();
        
        console.log('  By Model:');
        Object.entries(breakdown.by_model)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 5)
          .forEach(([model, cost]) => {
            console.log(`    ${model}: $${(cost as number).toFixed(3)}`);
          });
        console.log();
        
        if (breakdown.recommendations.length > 0) {
          console.log('  Recommendations:');
          breakdown.recommendations.forEach(rec => {
            console.log(`    - ${rec}`);
          });
        }
      } else {
        console.log('  No cost data found for this repository');
      }
    } catch (error) {
      console.log('  Unable to fetch cost data from Supabase');
    }
    
    console.log();
  }
  
  // Clear old data if requested
  if (process.argv.includes('--clear-old')) {
    const cleared = costTracker.clearOldData(30);
    console.log(`\n🗑️  Cleared ${cleared} old cost entries\n`);
  }
}

// Run the script
viewMonitoring().catch(console.error);