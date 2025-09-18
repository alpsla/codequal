#!/usr/bin/env npx ts-node

/**
 * Quick Python Test
 *
 * Test Python analyzer with Django repository
 */

import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { logger } from '../utils/logger';

// Configure environment for Kubernetes
process.env.USE_KUBERNETES = 'true';
process.env.K8S_NAMESPACE = 'codequal-dev';

async function quickPythonTest() {
  logger.info('🚀 Quick Python PR Analysis Test');
  logger.info('Testing with Django repository');

  const analyzer = new V9AnalyzerFrameworkEnhanced();

  try {
    const result = await analyzer.analyzePR(
      'https://github.com/django/django',
      18900,
      'python'
    );

    logger.info('✅ Python analysis completed successfully!');
    logger.info(`  Files analyzed: ${result.mainBranchAnalysis.filesAnalyzed}`);
    logger.info(`  Quality Score: ${result.qualityScore}/100`);
    logger.info(`  New Issues: ${result.comparison.newIssues.length}`);
    logger.info(`  Execution Time: ${(result.metadata.totalExecutionTime / 1000).toFixed(2)}s`);

    // Save summary
    require('fs').writeFileSync(
      `python-quick-test-${Date.now()}.json`,
      JSON.stringify({
        success: true,
        repository: 'django/django',
        prNumber: 18900,
        filesAnalyzed: result.mainBranchAnalysis.filesAnalyzed,
        qualityScore: result.qualityScore,
        newIssues: result.comparison.newIssues.length,
        executionTime: result.metadata.totalExecutionTime
      }, null, 2)
    );

  } catch (error) {
    logger.error(`❌ Python test failed: ${error.message}`);
    process.exit(1);
  }
}

quickPythonTest().catch(console.error);