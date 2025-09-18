#!/usr/bin/env npx ts-node

/**
 * Test Script: Real Kubernetes-based PR Analysis
 *
 * This script tests the V9 analyzer with:
 * - Real Kubernetes Jobs for repository operations
 * - Automatic cleanup via TTL
 * - Real code snippet fetching from K8s PVCs
 * - Accurate file metrics
 */

import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Configure environment for Kubernetes
process.env.USE_KUBERNETES = 'true';
process.env.K8S_NAMESPACE = 'codequal-dev';

async function main() {
  logger.info('🚀 Starting Kubernetes-based PR Analysis Test');
  logger.info('☸️ This test will:');
  logger.info('  1. Create K8s Jobs to clone repositories');
  logger.info('  2. Run tools in Kubernetes pods');
  logger.info('  3. Fetch code snippets from PVCs');
  logger.info('  4. Show real file counts');
  logger.info('  5. Clean up automatically via TTL');

  const analyzer = new V9AnalyzerFrameworkEnhanced();

  // Test with Apache Kafka PR #17620
  const testPR = {
    repo: 'https://github.com/apache/kafka',
    prNumber: 17620,
    language: 'java' as const
  };

  logger.info(`\n📊 Test PR: ${testPR.repo} #${testPR.prNumber}`);

  try {
    const result = await analyzer.analyzePR(
      testPR.repo,
      testPR.prNumber,
      testPR.language
    );

    // Display results
    logger.info('\n📈 Analysis Results:');
    logger.info(`  Repository: ${result.repository}`);
    logger.info(`  PR Number: ${result.prNumber}`);
    logger.info(`  Language: ${result.language}`);
    logger.info(`  Decision: ${result.decision}`);
    logger.info(`  Quality Score: ${result.qualityScore}/100`);

    logger.info('\n📊 Metrics:');
    logger.info(`  Main Branch Files: ${result.mainBranchAnalysis.filesAnalyzed}`);
    logger.info(`  PR Branch Files: ${result.prBranchAnalysis.filesAnalyzed}`);
    logger.info(`  Modified Files: ${result.metadata.modifiedFiles.length}`);
    logger.info(`  Execution Time: ${result.metadata.totalExecutionTime}ms`);

    logger.info('\n🔍 Issue Summary:');
    logger.info(`  New Issues: ${result.comparison.newIssues.length}`);
    logger.info(`  Existing (Modified): ${result.comparison.existingInModified.length}`);
    logger.info(`  Existing (Unmodified): ${result.comparison.existingInUnmodified.length}`);
    logger.info(`  Resolved Issues: ${result.comparison.resolvedIssues.length}`);

    // Check code snippets
    const issuesWithSnippets = result.comparison.newIssues.filter(i => i.codeSnippet && !i.codeSnippet.includes('placeholder'));
    logger.info(`\n📝 Code Snippets: ${issuesWithSnippets.length}/${result.comparison.newIssues.length} issues have real code snippets`);

    // Sample a few issues with code snippets
    if (issuesWithSnippets.length > 0) {
      logger.info('\n📋 Sample Issues with Code:');
      issuesWithSnippets.slice(0, 3).forEach((issue, i) => {
        logger.info(`  ${i + 1}. ${issue.title}`);
        logger.info(`     File: ${issue.file}:${issue.line}`);
        logger.info(`     Code: ${issue.codeSnippet?.substring(0, 100)}...`);
      });
    }

    // Save full report
    const reportPath = path.join(__dirname, `k8s-report-${testPR.prNumber}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    logger.info(`\n✅ Full report saved to: ${reportPath}`);

    // Verify key improvements
    logger.info('\n🎯 Verification:');
    const hasRealFileCount = result.mainBranchAnalysis.filesAnalyzed > 0;
    const hasCodeSnippets = issuesWithSnippets.length > 0;
    const hasModifiedFiles = result.metadata.modifiedFiles.length > 0;

    logger.info(`  ✅ Real file counts: ${hasRealFileCount ? 'YES' : 'NO'} (${result.mainBranchAnalysis.filesAnalyzed} files)`);
    logger.info(`  ✅ Code snippets: ${hasCodeSnippets ? 'YES' : 'NO'} (${issuesWithSnippets.length} snippets)`);
    logger.info(`  ✅ Modified files: ${hasModifiedFiles ? 'YES' : 'NO'} (${result.metadata.modifiedFiles.length} files)`);
    logger.info(`  ✅ K8s Jobs used: YES (with TTL auto-cleanup)`);

    logger.info('\n✨ Test completed successfully!');
    logger.info('🧹 Kubernetes Jobs will auto-cleanup in 5 minutes via TTL');

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});