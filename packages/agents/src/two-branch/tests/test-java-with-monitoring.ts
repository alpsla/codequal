#!/usr/bin/env npx ts-node

/**
 * Java Test with Monitoring
 *
 * Tests Java PR analysis with real-time monitoring of Kubernetes resources
 */

import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configure environment for Kubernetes
process.env.USE_KUBERNETES = 'true';
process.env.K8S_NAMESPACE = 'codequal-dev';

class MonitoredJavaTest {
  private analyzer: V9AnalyzerFrameworkEnhanced;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.analyzer = new V9AnalyzerFrameworkEnhanced();
  }

  /**
   * Start monitoring Kubernetes resources
   */
  private async startMonitoring(): Promise<void> {
    logger.info('📊 Starting Kubernetes monitoring...');

    this.monitorInterval = setInterval(async () => {
      try {
        // Check running jobs
        const { stdout: jobs } = await execAsync('kubectl get jobs -n codequal-dev --no-headers | tail -5');
        if (jobs.trim()) {
          logger.info('📋 Recent Jobs:');
          jobs.split('\n').filter(line => line.trim()).forEach(job => {
            const parts = job.split(/\s+/);
            const name = parts[0];
            const status = parts[1];
            const completions = parts[2];
            logger.info(`  - ${name}: ${status} (${completions})`);
          });
        }

        // Check running pods
        const { stdout: pods } = await execAsync('kubectl get pods -n codequal-dev --field-selector=status.phase=Running --no-headers | tail -5');
        if (pods.trim()) {
          logger.info('🏃 Running Pods:');
          pods.split('\n').filter(line => line.trim()).forEach(pod => {
            const parts = pod.split(/\s+/);
            const name = parts[0];
            const ready = parts[1];
            const status = parts[2];
            logger.info(`  - ${name}: ${ready} (${status})`);
          });
        }

        // Check PVCs
        const { stdout: pvcs } = await execAsync('kubectl get pvc -n codequal-dev --no-headers | tail -5');
        if (pvcs.trim()) {
          logger.info('💾 PVCs:');
          pvcs.split('\n').filter(line => line.trim()).forEach(pvc => {
            const parts = pvc.split(/\s+/);
            const name = parts[0];
            const status = parts[1];
            const size = parts[3];
            logger.info(`  - ${name}: ${status} (${size})`);
          });
        }
      } catch (error) {
        // Ignore monitoring errors
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('📊 Monitoring stopped');
    }
  }

  /**
   * Run the Java test
   */
  async runTest(): Promise<void> {
    logger.info('🚀 Starting Java PR Analysis Test with Monitoring');
    logger.info('=' .repeat(80));

    // Test configuration
    const testCase = {
      repository: 'https://github.com/apache/kafka',
      prNumber: 17620,
      language: 'java' as const,
      description: 'Apache Kafka - Testing with real Kubernetes resources'
    };

    logger.info(`📦 Repository: ${testCase.repository}`);
    logger.info(`🔢 PR Number: #${testCase.prNumber}`);
    logger.info(`💻 Language: ${testCase.language.toUpperCase()}`);
    logger.info('');

    // Start monitoring
    await this.startMonitoring();

    const startTime = Date.now();

    try {
      logger.info('🔧 Starting PR analysis...');

      const result = await this.analyzer.analyzePR(
        testCase.repository,
        testCase.prNumber,
        testCase.language
      );

      const executionTime = Date.now() - startTime;

      // Display results
      logger.info('\n' + '='.repeat(80));
      logger.info('✅ ANALYSIS COMPLETE');
      logger.info('='.repeat(80));

      logger.info('\n📊 Metrics:');
      logger.info(`  ⏱️ Execution Time: ${(executionTime / 1000).toFixed(2)} seconds`);
      logger.info(`  📁 Main Branch Files: ${result.mainBranchAnalysis.filesAnalyzed}`);
      logger.info(`  📁 PR Branch Files: ${result.prBranchAnalysis.filesAnalyzed}`);
      logger.info(`  📝 Modified Files: ${result.metadata.modifiedFiles.length}`);
      logger.info(`  📈 Quality Score: ${result.qualityScore}/100`);

      logger.info('\n🔍 Issues Summary:');
      logger.info(`  🆕 New Issues: ${result.comparison.newIssues.length}`);
      logger.info(`  📌 Existing (in modified): ${result.comparison.existingInModified.length}`);
      logger.info(`  📍 Existing (in unmodified): ${result.comparison.existingInUnmodified.length}`);
      logger.info(`  ✅ Resolved Issues: ${result.comparison.resolvedIssues.length}`);

      // Check for real code snippets
      const issuesWithCode = result.comparison.newIssues.filter(
        i => i.codeSnippet && !i.codeSnippet.includes('placeholder')
      );
      logger.info(`  📄 Issues with Code Snippets: ${issuesWithCode.length}/${result.comparison.newIssues.length}`);

      // Sample issues
      if (result.comparison.newIssues.length > 0) {
        logger.info('\n📋 Sample New Issues:');
        result.comparison.newIssues.slice(0, 3).forEach((issue, idx) => {
          logger.info(`\n  ${idx + 1}. ${issue.title || issue.message}`);
          logger.info(`     File: ${issue.file}:${issue.line}`);
          logger.info(`     Severity: ${issue.severity}`);
          logger.info(`     Tool: ${issue.tool}`);
          if (issue.codeSnippet && !issue.codeSnippet.includes('placeholder')) {
            const snippet = issue.codeSnippet.substring(0, 100);
            logger.info(`     Code: ${snippet}${issue.codeSnippet.length > 100 ? '...' : ''}`);
          }
        });
      }

      // Save report
      const reportPath = path.join(__dirname, `java-test-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
      logger.info(`\n📄 Full report saved to: ${reportPath}`);

      logger.info('\n✨ Test completed successfully!');

    } catch (error) {
      logger.error(`\n❌ Test failed: ${error.message}`);
      logger.error(error.stack);

      // Try to get more details about what failed
      try {
        const { stdout: failedJobs } = await execAsync('kubectl get jobs -n codequal-dev --field-selector=status.successful=0 --no-headers | tail -5');
        if (failedJobs.trim()) {
          logger.error('\n❌ Failed Jobs:');
          logger.error(failedJobs);
        }

        const { stdout: failedPods } = await execAsync('kubectl get pods -n codequal-dev --field-selector=status.phase=Failed --no-headers | tail -5');
        if (failedPods.trim()) {
          logger.error('\n❌ Failed Pods:');
          logger.error(failedPods);
        }
      } catch (debugError) {
        // Ignore debug errors
      }
    } finally {
      // Stop monitoring
      this.stopMonitoring();

      // Show final resource status
      logger.info('\n📊 Final Resource Status:');
      try {
        const { stdout: jobs } = await execAsync('kubectl get jobs -n codequal-dev --no-headers | wc -l');
        logger.info(`  Total Jobs: ${jobs.trim()}`);

        const { stdout: pvcs } = await execAsync('kubectl get pvc -n codequal-dev --no-headers | wc -l');
        logger.info(`  Total PVCs: ${pvcs.trim()}`);

        const { stdout: pods } = await execAsync('kubectl get pods -n codequal-dev --no-headers | wc -l');
        logger.info(`  Total Pods: ${pods.trim()}`);
      } catch (error) {
        // Ignore
      }
    }
  }
}

// Run the test
async function main() {
  const tester = new MonitoredJavaTest();
  try {
    await tester.runTest();
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});