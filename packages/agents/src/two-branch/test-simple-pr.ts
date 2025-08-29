#!/usr/bin/env ts-node

/**
 * Simple test script for Two-Branch Analysis System
 */

import { TwoBranchAnalyzer } from './core/TwoBranchAnalyzer';

async function main() {
  console.log('🚀 Testing Two-Branch Analysis System\n');
  console.log('=' .repeat(50));

  // Initialize analyzer
  const analyzer = new TwoBranchAnalyzer({
    cacheService: undefined, // Will use in-memory cache
    specializedAgents: []
  });

  // Test PR URL (small repo for quick testing)
  const prUrl = 'https://github.com/sindresorhus/ky/pull/700';
  
  console.log(`\n📍 Analyzing PR: ${prUrl}`);
  console.log(`⚙️  Mock Mode: ${process.env.USE_DEEPWIKI_MOCK === 'true' ? 'Yes' : 'No'}`);
  console.log(`📦 MCP Integration: Available\n`);
  
  try {
    // Analyze PR
    const startTime = Date.now();
    const result = await analyzer.analyzePullRequest(prUrl, {
      useCache: false,
      parallel: true,
      includeEducational: false,
      includeMetrics: true,
      tools: ['eslint', 'semgrep'] // Start with just a few tools
    });
    
    const duration = Date.now() - startTime;
    
    // Display results
    console.log('\n✅ Analysis Complete!');
    console.log('=' .repeat(50));
    
    console.log('\n📊 Summary:');
    console.log(`  Repository: ${result.repository.owner}/${result.repository.name}`);
    console.log(`  PR Number: #${result.prNumber}`);
    console.log(`  Branches: ${result.branches.main} → ${result.branches.pr}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`  Tools Used: ${result.metadata.toolsUsed.join(', ')}`);
    
    console.log('\n🐛 Issues Found:');
    console.log(`  New Issues: ${result.comparison.newIssues.length}`);
    console.log(`  Fixed Issues: ${result.comparison.fixedIssues.length}`);
    console.log(`  Unchanged Issues: ${result.comparison.unchangedIssues.length}`);
    
    if (result.comparison.newIssues.length > 0) {
      console.log('\n📌 Sample New Issues:');
      result.comparison.newIssues.slice(0, 3).forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.severity}] ${issue.message}`);
        console.log(`     File: ${issue.file || 'Unknown'}`);
        console.log(`     Category: ${issue.category}`);
      });
    }
    
    console.log('\n📈 Metrics:');
    console.log(`  Overall Score: ${result.comparison.metrics.scores.overall}/100`);
    console.log(`  Security Score: ${result.comparison.metrics.scores.security}/100`);
    console.log(`  Quality Score: ${result.comparison.metrics.scores.quality}/100`);
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
    console.error('\nDebug info:');
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    }
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);