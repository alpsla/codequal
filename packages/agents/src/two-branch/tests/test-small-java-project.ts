#!/usr/bin/env npx ts-node

/**
 * Test with Small Java Project
 *
 * Use a small Spring Boot sample project instead of massive Apache Kafka
 */

import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { logger } from '../utils/logger';
import * as fs from 'fs';

// Configure environment for Kubernetes
process.env.USE_KUBERNETES = 'true';
process.env.K8S_NAMESPACE = 'codequal-dev';

async function testSmallJavaProject() {
  logger.info('🚀 Testing with Small Java Project');
  logger.info('Using: spring-guides/gs-rest-service (Small REST API)');

  const analyzer = new V9AnalyzerFrameworkEnhanced();

  try {
    // Use a smaller Spring Boot sample project
    // This repo has only ~20 Java files vs Kafka's 5,583
    const result = await analyzer.analyzePR(
      'https://github.com/spring-guides/gs-rest-service',
      100,  // Recent PR number
      'java'
    );

    logger.info('✅ Analysis completed!');
    logger.info(`  Files analyzed: ${result.mainBranchAnalysis.filesAnalyzed}`);
    logger.info(`  Quality Score: ${result.qualityScore}/100`);
    logger.info(`  Main Branch Issues: ${result.mainBranchAnalysis.issues.length}`);
    logger.info(`  PR Branch Issues: ${result.prBranchAnalysis.issues.length}`);
    logger.info(`  New Issues: ${result.comparison.newIssues.length}`);
    logger.info(`  Execution Time: ${(result.metadata.totalExecutionTime / 1000).toFixed(2)}s`);

    // Check if we got any actual issues
    if (result.mainBranchAnalysis.issues.length > 0) {
      logger.info('\n🎉 SUCCESS! Found actual issues:');
      result.mainBranchAnalysis.issues.slice(0, 3).forEach((issue, idx) => {
        logger.info(`  ${idx + 1}. ${issue.message || issue.title}`);
        logger.info(`     File: ${issue.file}:${issue.line}`);
        logger.info(`     Tool: ${issue.tool}`);
      });
    } else {
      logger.warn('⚠️ Still no issues detected. Tool output not being parsed.');
    }

    // Save full result
    const reportFile = `small-java-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(result, null, 2));
    logger.info(`\n📄 Full report saved to: ${reportFile}`);

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);

    // Log more details
    if (error.stack) {
      logger.error('Stack trace:');
      console.error(error.stack);
    }
  }
}

testSmallJavaProject().catch(console.error);