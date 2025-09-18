#!/usr/bin/env npx ts-node

/**
 * Language-by-Language Test Suite
 *
 * Tests the unified COW approach with real PRs for each supported language.
 * Generates detailed reports for each language before moving to the next.
 */

import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Configure environment for Kubernetes
process.env.USE_KUBERNETES = 'true';
process.env.K8S_NAMESPACE = 'codequal-dev';

interface LanguageTestCase {
  language: 'java' | 'python' | 'javascript' | 'typescript' | 'rust' | 'go';
  repository: string;
  prNumber: number;
  description: string;
  expectedFilePattern: string;
}

interface TestResult {
  language: string;
  repository: string;
  prNumber: number;
  success: boolean;
  metrics: {
    executionTime: number;
    filesAnalyzed: number;
    modifiedFiles: number;
    qualityScore: number;
    newIssues: number;
    resolvedIssues: number;
    codeSnippetsFound: number;
    cachedBase: boolean;
    cowCreationTime?: number;
  };
  errors?: string[];
  report?: any;
}

class LanguageTestRunner {
  private analyzer: V9AnalyzerFrameworkEnhanced;
  private results: TestResult[] = [];
  private testStartTime: number = Date.now();

  constructor() {
    this.analyzer = new V9AnalyzerFrameworkEnhanced();
  }

  /**
   * Test cases for each language with real, active PRs
   */
  private getTestCases(): LanguageTestCase[] {
    return [
      // Java - Apache Kafka
      {
        language: 'java',
        repository: 'https://github.com/apache/kafka',
        prNumber: 17620,
        description: 'Apache Kafka - Large Java project with extensive testing',
        expectedFilePattern: '*.java'
      },
      // Java - Spring Boot
      {
        language: 'java',
        repository: 'https://github.com/spring-projects/spring-boot',
        prNumber: 44537,
        description: 'Spring Boot - Enterprise Java framework',
        expectedFilePattern: '*.java'
      },
      // Java - Elasticsearch
      {
        language: 'java',
        repository: 'https://github.com/elastic/elasticsearch',
        prNumber: 120000,
        description: 'Elasticsearch - Distributed search engine',
        expectedFilePattern: '*.java'
      }
    ];
  }

  /**
   * Run test for a single language test case
   */
  private async runSingleTest(testCase: LanguageTestCase): Promise<TestResult> {
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`🧪 Testing: ${testCase.description}`);
    logger.info(`📦 Repository: ${testCase.repository}`);
    logger.info(`🔢 PR Number: #${testCase.prNumber}`);
    logger.info(`💻 Language: ${testCase.language.toUpperCase()}`);
    logger.info(`${'='.repeat(80)}\n`);

    const startTime = Date.now();
    const result: TestResult = {
      language: testCase.language,
      repository: testCase.repository,
      prNumber: testCase.prNumber,
      success: false,
      metrics: {
        executionTime: 0,
        filesAnalyzed: 0,
        modifiedFiles: 0,
        qualityScore: 0,
        newIssues: 0,
        resolvedIssues: 0,
        codeSnippetsFound: 0,
        cachedBase: false
      },
      errors: []
    };

    try {
      // Check if this is a repeat test (base should be cached)
      const isRepeatTest = this.results.some(r =>
        r.repository === testCase.repository && r.success
      );

      const cowStartTime = Date.now();

      // Run the analysis
      logger.info('🚀 Starting PR analysis...');
      const analysisResult = await this.analyzer.analyzePR(
        testCase.repository,
        testCase.prNumber,
        testCase.language
      );

      const executionTime = Date.now() - startTime;

      // Check if COW was used (should be fast if cached)
      if (isRepeatTest) {
        result.metrics.cowCreationTime = Date.now() - cowStartTime;
        result.metrics.cachedBase = result.metrics.cowCreationTime < 60000; // < 1 minute means cached
      }

      // Collect metrics
      result.metrics.executionTime = executionTime;
      result.metrics.filesAnalyzed = analysisResult.mainBranchAnalysis.filesAnalyzed;
      result.metrics.modifiedFiles = analysisResult.metadata.modifiedFiles.length;
      result.metrics.qualityScore = analysisResult.qualityScore;
      result.metrics.newIssues = analysisResult.comparison.newIssues.length;
      result.metrics.resolvedIssues = analysisResult.comparison.resolvedIssues.length;

      // Count real code snippets
      const issuesWithSnippets = analysisResult.comparison.newIssues.filter(
        issue => issue.codeSnippet &&
                 !issue.codeSnippet.includes('placeholder') &&
                 issue.codeSnippet.trim().length > 0
      );
      result.metrics.codeSnippetsFound = issuesWithSnippets.length;

      result.success = true;
      result.report = analysisResult;

      // Log immediate results
      this.logTestResults(result, testCase);

      // Validate language-specific patterns
      this.validateLanguageSpecific(result, testCase);

    } catch (error) {
      result.errors = [error.message, error.stack];
      logger.error(`❌ Test failed: ${error.message}`);
      logger.error(error.stack);
    }

    result.metrics.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Validate language-specific aspects
   */
  private validateLanguageSpecific(result: TestResult, testCase: LanguageTestCase): void {
    logger.info('\n📋 Language-Specific Validation:');

    switch (testCase.language) {
      case 'java':
        // Java-specific validations
        const javaIssues = result.report?.comparison.newIssues.filter(
          (i: any) => i.file.endsWith('.java')
        ) || [];

        logger.info(`  ✓ Java files with issues: ${javaIssues.length}`);

        // Check for common Java patterns
        const hasNullPointer = javaIssues.some((i: any) =>
          i.message?.toLowerCase().includes('null')
        );
        const hasResourceLeak = javaIssues.some((i: any) =>
          i.message?.toLowerCase().includes('resource') ||
          i.message?.toLowerCase().includes('close')
        );
        const hasConcurrency = javaIssues.some((i: any) =>
          i.message?.toLowerCase().includes('thread') ||
          i.message?.toLowerCase().includes('synchron')
        );

        logger.info(`  ✓ Null pointer issues detected: ${hasNullPointer ? 'YES' : 'NO'}`);
        logger.info(`  ✓ Resource leak issues detected: ${hasResourceLeak ? 'YES' : 'NO'}`);
        logger.info(`  ✓ Concurrency issues detected: ${hasConcurrency ? 'YES' : 'NO'}`);
        break;

      // Add more language-specific validations as we test them
      default:
        logger.info(`  ⓘ No specific validation rules for ${testCase.language} yet`);
    }
  }

  /**
   * Log test results
   */
  private logTestResults(result: TestResult, testCase: LanguageTestCase): void {
    logger.info('\n📊 Test Results:');
    logger.info(`  ✅ Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`  ⏱️ Execution Time: ${(result.metrics.executionTime / 1000).toFixed(2)} seconds`);
    logger.info(`  📁 Files Analyzed: ${result.metrics.filesAnalyzed}`);
    logger.info(`  📝 Modified Files: ${result.metrics.modifiedFiles}`);
    logger.info(`  📈 Quality Score: ${result.metrics.qualityScore}/100`);

    logger.info('\n🔍 Issues:');
    logger.info(`  🆕 New Issues: ${result.metrics.newIssues}`);
    logger.info(`  ✅ Resolved Issues: ${result.metrics.resolvedIssues}`);
    logger.info(`  📄 Code Snippets Retrieved: ${result.metrics.codeSnippetsFound}`);

    if (result.metrics.cachedBase) {
      logger.info('\n⚡ Performance:');
      logger.info(`  🚀 Base Clone: CACHED (reused)`);
      if (result.metrics.cowCreationTime) {
        logger.info(`  ⏱️ COW Creation: ${(result.metrics.cowCreationTime / 1000).toFixed(2)} seconds`);
      }
    } else {
      logger.info('\n⚡ Performance:');
      logger.info(`  🔄 Base Clone: NEW (first time)`);
    }

    // Sample some issues with code snippets
    if (result.report?.comparison.newIssues.length > 0) {
      logger.info('\n📝 Sample Issues:');
      const sampleIssues = result.report.comparison.newIssues.slice(0, 3);
      sampleIssues.forEach((issue: any, idx: number) => {
        logger.info(`\n  ${idx + 1}. ${issue.title || issue.message}`);
        logger.info(`     File: ${issue.file}:${issue.line}`);
        logger.info(`     Severity: ${issue.severity}`);
        if (issue.codeSnippet && !issue.codeSnippet.includes('placeholder')) {
          const snippet = issue.codeSnippet.substring(0, 100);
          logger.info(`     Code: ${snippet}${issue.codeSnippet.length > 100 ? '...' : ''}`);
        }
      });
    }
  }

  /**
   * Generate detailed report for a language
   */
  private generateLanguageReport(language: string): string {
    const languageResults = this.results.filter(r => r.language === language);

    if (languageResults.length === 0) {
      return `No results for ${language}`;
    }

    let report = `# ${language.toUpperCase()} Test Report\n\n`;
    report += `## Summary\n\n`;
    report += `- **Total Tests**: ${languageResults.length}\n`;
    report += `- **Successful**: ${languageResults.filter(r => r.success).length}\n`;
    report += `- **Failed**: ${languageResults.filter(r => !r.success).length}\n\n`;

    report += `## Performance Metrics\n\n`;

    const avgExecutionTime = languageResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.metrics.executionTime, 0) / languageResults.filter(r => r.success).length;

    const avgFilesAnalyzed = languageResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.metrics.filesAnalyzed, 0) / languageResults.filter(r => r.success).length;

    const avgQualityScore = languageResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.metrics.qualityScore, 0) / languageResults.filter(r => r.success).length;

    report += `- **Average Execution Time**: ${(avgExecutionTime / 1000).toFixed(2)} seconds\n`;
    report += `- **Average Files Analyzed**: ${Math.round(avgFilesAnalyzed)}\n`;
    report += `- **Average Quality Score**: ${avgQualityScore.toFixed(1)}/100\n\n`;

    report += `## Test Details\n\n`;

    languageResults.forEach((result, idx) => {
      report += `### Test ${idx + 1}: ${result.repository}\n\n`;
      report += `- **PR Number**: #${result.prNumber}\n`;
      report += `- **Status**: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
      report += `- **Execution Time**: ${(result.metrics.executionTime / 1000).toFixed(2)}s\n`;
      report += `- **Files Analyzed**: ${result.metrics.filesAnalyzed}\n`;
      report += `- **Modified Files**: ${result.metrics.modifiedFiles}\n`;
      report += `- **Quality Score**: ${result.metrics.qualityScore}/100\n`;
      report += `- **New Issues**: ${result.metrics.newIssues}\n`;
      report += `- **Resolved Issues**: ${result.metrics.resolvedIssues}\n`;
      report += `- **Code Snippets**: ${result.metrics.codeSnippetsFound}\n`;
      report += `- **Cached Base**: ${result.metrics.cachedBase ? 'Yes' : 'No'}\n`;

      if (result.metrics.cowCreationTime) {
        report += `- **COW Creation Time**: ${(result.metrics.cowCreationTime / 1000).toFixed(2)}s\n`;
      }

      if (result.errors && result.errors.length > 0) {
        report += `\n**Errors**:\n\`\`\`\n${result.errors.join('\n')}\n\`\`\`\n`;
      }

      report += '\n';
    });

    report += `## COW Optimization Analysis\n\n`;

    // Check if we had any cached bases
    const cachedTests = languageResults.filter(r => r.metrics.cachedBase);
    if (cachedTests.length > 0) {
      const avgCowTime = cachedTests
        .filter(r => r.metrics.cowCreationTime)
        .reduce((sum, r) => sum + (r.metrics.cowCreationTime || 0), 0) / cachedTests.length;

      report += `- **Tests with Cached Base**: ${cachedTests.length}\n`;
      report += `- **Average COW Creation**: ${(avgCowTime / 1000).toFixed(2)} seconds\n`;
      report += `- **Cache Hit Rate**: ${((cachedTests.length / languageResults.length) * 100).toFixed(1)}%\n`;
    } else {
      report += `- No cached bases detected (all tests were first-time clones)\n`;
    }

    return report;
  }

  /**
   * Save test results to file
   */
  private async saveResults(language: string, report: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${language}-test-report-${timestamp}.md`;
    const filePath = path.join(__dirname, 'reports', fileName);

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, report);
    logger.info(`\n📄 Report saved to: ${filePath}`);

    // Also save JSON data
    const jsonFileName = `${language}-test-data-${timestamp}.json`;
    const jsonPath = path.join(__dirname, 'reports', jsonFileName);
    const languageResults = this.results.filter(r => r.language === language);
    fs.writeFileSync(jsonPath, JSON.stringify(languageResults, null, 2));
    logger.info(`📊 Data saved to: ${jsonPath}`);
  }

  /**
   * Main test runner
   */
  async runTests(): Promise<void> {
    logger.info('🚀 Starting Language-by-Language Test Suite');
    logger.info('☸️ Using Kubernetes with COW optimization\n');

    // Get Java test cases only for now
    const testCases = this.getTestCases();

    // Group by language
    const javaTests = testCases.filter(tc => tc.language === 'java');

    // Test Java
    logger.info('\n' + '='.repeat(80));
    logger.info('🔥 TESTING JAVA PROJECTS');
    logger.info('='.repeat(80));

    for (const testCase of javaTests) {
      const result = await this.runSingleTest(testCase);
      this.results.push(result);

      // Add delay between tests to avoid overwhelming the system
      if (javaTests.indexOf(testCase) < javaTests.length - 1) {
        logger.info('\n⏸️ Waiting 10 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Generate Java report
    logger.info('\n' + '='.repeat(80));
    logger.info('📊 GENERATING JAVA REPORT');
    logger.info('='.repeat(80));

    const javaReport = this.generateLanguageReport('java');
    console.log('\n' + javaReport);
    await this.saveResults('java', javaReport);

    // Final summary
    const totalTime = Date.now() - this.testStartTime;
    logger.info('\n' + '='.repeat(80));
    logger.info('✅ JAVA TESTING COMPLETE');
    logger.info('='.repeat(80));
    logger.info(`\n📊 Final Statistics:`);
    logger.info(`  - Total Tests Run: ${this.results.length}`);
    logger.info(`  - Successful Tests: ${this.results.filter(r => r.success).length}`);
    logger.info(`  - Failed Tests: ${this.results.filter(r => !r.success).length}`);
    logger.info(`  - Total Execution Time: ${(totalTime / 1000).toFixed(2)} seconds`);

    const avgScore = this.results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.metrics.qualityScore, 0) / this.results.filter(r => r.success).length;

    logger.info(`  - Average Quality Score: ${avgScore.toFixed(1)}/100`);

    // Check COW effectiveness
    const cachedTests = this.results.filter(r => r.metrics.cachedBase);
    if (cachedTests.length > 0) {
      logger.info(`\n⚡ COW Performance:`);
      logger.info(`  - Tests with Cached Base: ${cachedTests.length}/${this.results.length}`);
      logger.info(`  - Cache Hit Rate: ${((cachedTests.length / this.results.length) * 100).toFixed(1)}%`);
    }

    logger.info('\n✨ Java testing phase complete! Ready for next language when requested.');
  }
}

// Run the tests
async function main() {
  const runner = new LanguageTestRunner();
  try {
    await runner.runTests();
  } catch (error) {
    logger.error('Fatal error during testing:', error);
    process.exit(1);
  }
}

// Execute
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});