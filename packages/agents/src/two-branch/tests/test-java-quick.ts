#!/usr/bin/env npx ts-node

/**
 * Quick Java Test
 *
 * Minimal test to verify Java analyzer image works
 */

import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { logger } from '../utils/logger';

// Configure environment for Kubernetes
process.env.USE_KUBERNETES = 'true';
process.env.K8S_NAMESPACE = 'codequal-dev';

async function quickTest() {
  logger.info('🚀 Quick Java PR Analysis Test');
  logger.info('Testing with correct image: lang-java-v4.9');

  const analyzer = new V9AnalyzerFrameworkEnhanced();

  try {
    const result = await analyzer.analyzePR(
      'https://github.com/apache/kafka',
      17620,
      'java'
    );

    logger.info('✅ Analysis completed successfully!');
    logger.info(`  Files analyzed: ${result.mainBranchAnalysis.filesAnalyzed}`);
    logger.info(`  Quality Score: ${result.qualityScore}/100`);
    logger.info(`  New Issues: ${result.comparison.newIssues.length}`);

    // Save summary
    require('fs').writeFileSync(
      `java-quick-test-${Date.now()}.json`,
      JSON.stringify({
        success: true,
        filesAnalyzed: result.mainBranchAnalysis.filesAnalyzed,
        qualityScore: result.qualityScore,
        newIssues: result.comparison.newIssues.length,
        executionTime: result.metadata.totalExecutionTime
      }, null, 2)
    );

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

quickTest().catch(console.error);