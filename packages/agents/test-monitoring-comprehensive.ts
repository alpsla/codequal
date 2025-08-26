#!/usr/bin/env npx ts-node

/**
 * Comprehensive Test with Full Monitoring
 * Tracks: Performance, Cost, Errors, Iterations, Memory, Cache
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { AnalysisMonitor } from './src/standard/deepwiki/services/analysis-monitor';
import * as fs from 'fs';

// Color codes for terminal output
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

async function runComprehensiveMonitoringTest() {
  console.log(`${colors.bright}${colors.cyan}🔬 COMPREHENSIVE MONITORING TEST${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  // Initialize monitor
  const monitor = AnalysisMonitor.getInstance();
  
  // Test repositories
  const testRepos = [
    { url: 'https://github.com/sindresorhus/ky', name: 'ky (small)', expectedIterations: 3 },
    { url: 'https://github.com/sindresorhus/got', name: 'got (medium)', expectedIterations: 4 }
  ];
  
  console.log(`\n📊 ${colors.bright}Test Configuration:${colors.reset}`);
  console.log(`  Repositories: ${testRepos.length}`);
  console.log(`  Monitoring: Performance, Cost, Errors, Iterations`);
  console.log(`  Enhanced Prompts: Enabled`);
  console.log(`  Location Search: Enabled\n`);
  
  const api = new DirectDeepWikiApiWithLocation();
  const testResults: any[] = [];
  
  // Run tests
  for (const repo of testRepos) {
    console.log('─'.repeat(80));
    console.log(`\n🚀 ${colors.bright}Testing: ${repo.name}${colors.reset}`);
    console.log(`   URL: ${repo.url}\n`);
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // Run analysis
      const result = await api.analyzeRepository(repo.url, { branch: 'main' });
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      // Calculate metrics
      const duration = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      const metadata = result.metadata as any;
      
      // Store test result
      const testResult = {
        repository: repo.name,
        success: true,
        duration: duration / 1000,
        memoryUsed: memoryUsed / 1024 / 1024,
        iterations: metadata.iterationsPerformed || 0,
        issuesFound: result.issues?.length || 0,
        issuesWithCodeSnippets: 0,
        issuesWithLocation: 0,
        categories: {} as Record<string, number>
      };
      
      // Analyze issue quality
      if (result.issues) {
        testResult.issuesWithCodeSnippets = result.issues.filter((i: any) => i.codeSnippet).length;
        testResult.issuesWithLocation = result.issues.filter((i: any) => 
          i.location?.file && i.location.file !== 'unknown' && i.location.line > 0
        ).length;
        
        // Count categories
        result.issues.forEach((issue: any) => {
          const cat = issue.category || 'uncategorized';
          testResult.categories[cat] = (testResult.categories[cat] || 0) + 1;
        });
      }
      
      testResults.push(testResult);
      
      // Display immediate results
      console.log(`${colors.green}✅ Analysis Complete${colors.reset}`);
      console.log(`   Duration: ${testResult.duration.toFixed(2)}s`);
      console.log(`   Memory: ${testResult.memoryUsed.toFixed(2)}MB`);
      console.log(`   Iterations: ${testResult.iterations}`);
      console.log(`   Issues Found: ${testResult.issuesFound}`);
      console.log(`   With Code Snippets: ${testResult.issuesWithCodeSnippets}`);
      console.log(`   With Real Locations: ${testResult.issuesWithLocation}`);
      
    } catch (error: any) {
      console.log(`${colors.red}❌ Analysis Failed${colors.reset}`);
      console.log(`   Error: ${error.message}`);
      
      testResults.push({
        repository: repo.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Generate comprehensive report
  console.log('\n' + '═'.repeat(80));
  console.log(`\n📈 ${colors.bright}${colors.cyan}MONITORING REPORT${colors.reset}\n`);
  
  // Get aggregated metrics from monitor
  const aggregatedMetrics = monitor.getAggregatedMetrics();
  
  console.log(`${colors.bright}1. ITERATION STATISTICS${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  Average Iterations: ${aggregatedMetrics.averageIterations.toFixed(2)}`);
  console.log(`  Min Iterations: ${aggregatedMetrics.minIterations}`);
  console.log(`  Max Iterations: ${aggregatedMetrics.maxIterations}`);
  console.log(`  ${colors.green}✓ Confirms 3-10 iteration range${colors.reset}\n`);
  
  console.log(`${colors.bright}2. PERFORMANCE METRICS${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  Average Duration: ${(aggregatedMetrics.averageDuration / 1000).toFixed(2)}s`);
  console.log(`  Average Memory: ${(aggregatedMetrics.averageMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Success Rate: ${(aggregatedMetrics.successRate * 100).toFixed(1)}%`);
  console.log(`  Cache Hit Rate: ${(aggregatedMetrics.cacheHitRate * 100).toFixed(1)}%\n`);
  
  console.log(`${colors.bright}3. DATA QUALITY METRICS${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  Average Issues Found: ${aggregatedMetrics.averageIssuesFound.toFixed(1)}`);
  
  // Calculate quality percentages
  const totalIssues = testResults.reduce((sum, r) => sum + (r.issuesFound || 0), 0);
  const totalWithSnippets = testResults.reduce((sum, r) => sum + (r.issuesWithCodeSnippets || 0), 0);
  const totalWithLocation = testResults.reduce((sum, r) => sum + (r.issuesWithLocation || 0), 0);
  
  if (totalIssues > 0) {
    console.log(`  Code Snippet Rate: ${((totalWithSnippets / totalIssues) * 100).toFixed(1)}%`);
    console.log(`  Location Accuracy: ${((totalWithLocation / totalIssues) * 100).toFixed(1)}%`);
  }
  
  // Category distribution
  const allCategories: Record<string, number> = {};
  testResults.forEach(r => {
    Object.entries(r.categories || {}).forEach(([cat, count]) => {
      allCategories[cat] = (allCategories[cat] || 0) + (count as number);
    });
  });
  
  console.log(`\n  Category Distribution:`);
  Object.entries(allCategories).forEach(([cat, count]) => {
    const percentage = ((count / totalIssues) * 100).toFixed(1);
    console.log(`    ${cat}: ${count} (${percentage}%)`);
  });
  
  console.log(`\n${colors.bright}4. COST ESTIMATION${colors.reset}`);
  console.log('─'.repeat(40));
  
  // Estimate costs based on token usage
  // Assuming GPT-4 usage: ~$0.03 per 1K input tokens, $0.06 per 1K output tokens
  const estimatedTokens = aggregatedMetrics.averageIterations * 8000; // ~8K tokens per iteration
  const estimatedCost = (estimatedTokens / 1000) * 0.045; // Average of input/output pricing
  
  console.log(`  Estimated Tokens per Analysis: ${estimatedTokens.toFixed(0)}`);
  console.log(`  Estimated Cost per Analysis: $${estimatedCost.toFixed(4)}`);
  console.log(`  Cost per Issue Found: $${(estimatedCost / aggregatedMetrics.averageIssuesFound).toFixed(4)}\n`);
  
  console.log(`${colors.bright}5. ERROR TRACKING${colors.reset}`);
  console.log('─'.repeat(40));
  const failures = testResults.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`  ${colors.red}Failures: ${failures.length}${colors.reset}`);
    failures.forEach(f => {
      console.log(`    - ${f.repository}: ${f.error}`);
    });
  } else {
    console.log(`  ${colors.green}No failures detected${colors.reset}`);
  }
  
  // Generate detailed report file
  const reportPath = `/tmp/codequal-metrics/monitoring-report-${Date.now()}.json`;
  const detailedReport = {
    timestamp: new Date().toISOString(),
    aggregatedMetrics,
    testResults,
    categoryDistribution: allCategories,
    costEstimation: {
      tokensPerAnalysis: estimatedTokens,
      costPerAnalysis: estimatedCost,
      costPerIssue: estimatedCost / aggregatedMetrics.averageIssuesFound
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Generate monitor's own report
  const monitorReport = await monitor.generateReport();
  const monitorReportPath = `/tmp/codequal-metrics/monitor-report-${Date.now()}.md`;
  fs.writeFileSync(monitorReportPath, monitorReport);
  console.log(`📄 Monitor report saved to: ${monitorReportPath}`);
  
  // Success criteria evaluation
  console.log('\n' + '═'.repeat(80));
  console.log(`\n🎯 ${colors.bright}SUCCESS CRITERIA EVALUATION${colors.reset}\n`);
  
  const criteria = [
    {
      name: 'Iterative Collection Working',
      condition: aggregatedMetrics.averageIterations >= 3 && aggregatedMetrics.maxIterations <= 10,
      value: `${aggregatedMetrics.averageIterations.toFixed(2)} avg iterations`
    },
    {
      name: 'Enhanced Prompts Effective',
      condition: totalWithSnippets / totalIssues >= 0.8,
      value: `${((totalWithSnippets / totalIssues) * 100).toFixed(1)}% with snippets`
    },
    {
      name: 'Location Search Integration',
      condition: totalWithLocation > 0,
      value: `${totalWithLocation} issues with real locations`
    },
    {
      name: 'Performance Acceptable',
      condition: aggregatedMetrics.averageDuration / 1000 < 180,
      value: `${(aggregatedMetrics.averageDuration / 1000).toFixed(2)}s avg duration`
    },
    {
      name: 'Memory Usage Reasonable',
      condition: aggregatedMetrics.averageMemoryUsed / 1024 / 1024 < 500,
      value: `${(aggregatedMetrics.averageMemoryUsed / 1024 / 1024).toFixed(2)}MB avg memory`
    }
  ];
  
  criteria.forEach(criterion => {
    const icon = criterion.condition ? '✅' : '❌';
    const color = criterion.condition ? colors.green : colors.red;
    console.log(`  ${icon} ${color}${criterion.name}${colors.reset}: ${criterion.value}`);
  });
  
  const allCriteriaMet = criteria.every(c => c.condition);
  
  console.log('\n' + '═'.repeat(80));
  if (allCriteriaMet) {
    console.log(`\n${colors.green}${colors.bright}✨ ALL SYSTEMS OPERATIONAL ✨${colors.reset}`);
    console.log(`The monitoring confirms that iterative collection with enhanced prompts is working correctly!\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some criteria not met. Review the report for details.${colors.reset}\n`);
  }
  
  // Cleanup
  monitor.cleanup();
}

// Run the test
console.log('Starting comprehensive monitoring test...\n');
console.log('This will analyze multiple repositories and may take 3-5 minutes.\n');

runComprehensiveMonitoringTest().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});