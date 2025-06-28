#!/usr/bin/env node
/**
 * Real Data E2E Test Runner
 * 
 * This module executes tests against the actual CodeQual API using real GitHub repositories
 * and measures actual performance metrics instead of simulations.
 * 
 * Features:
 * - Real API calls to the CodeQual analysis endpoint
 * - Actual GitHub repository analysis
 * - Real-time performance monitoring integration
 * - Comprehensive error handling and retry logic
 * - Detailed result validation
 */

import { PerformanceMonitor } from './performance-monitor';
import { E2E_TEST_SCENARIOS, TestScenario } from './test-scenarios';
import chalk from 'chalk';
import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface RealDataTestConfig {
  apiUrl: string;
  apiKey: string;
  githubToken: string;
  maxRetries: number;
  retryDelay: number;
  performanceMonitor: PerformanceMonitor;
}

interface TestExecutionResult {
  scenario: TestScenario;
  success: boolean;
  executionTime: number;
  apiResponse?: any;
  findings: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  educationalContent: {
    total: number;
    bySkillLevel: Record<string, number>;
    byTopic: Record<string, number>;
  };
  performance: {
    apiCallTime: number;
    totalTokens: number;
    totalCost: number;
    memoryUsage: number;
  };
  errors: string[];
  validationResults: {
    meetsMinFindings: boolean;
    hasExpectedCategories: boolean;
    meetsPerformanceTarget: boolean;
    hasEducationalContent: boolean;
  };
}

export class RealDataTestRunner {
  private config: RealDataTestConfig;
  private results: TestExecutionResult[] = [];

  constructor(config: Partial<RealDataTestConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl || process.env.CODEQUAL_API_URL || 'http://localhost:3001/api',
      apiKey: config.apiKey || process.env.CODEQUAL_API_KEY || '',
      githubToken: config.githubToken || process.env.GITHUB_TOKEN || '',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      performanceMonitor: config.performanceMonitor || new PerformanceMonitor()
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('CODEQUAL_API_KEY environment variable is required');
    }
    if (!this.config.githubToken) {
      console.warn(chalk.yellow('⚠️  GITHUB_TOKEN not provided - rate limiting may occur'));
    }
  }

  /**
   * Run all test scenarios with real API calls
   */
  async runAllScenarios(scenarioIds?: string[]): Promise<void> {
    console.log(chalk.bold.blue('\n🚀 Starting Real Data E2E Test Suite\n'));
    console.log(chalk.gray(`API URL: ${this.config.apiUrl}`));
    console.log(chalk.gray(`Scenarios: ${scenarioIds?.join(', ') || 'ALL'}`));
    console.log(chalk.gray('─'.repeat(60)));

    // Start performance monitoring
    this.config.performanceMonitor.startSession('Real Data E2E Tests');

    // Filter scenarios if specific IDs provided
    const scenarios = scenarioIds 
      ? E2E_TEST_SCENARIOS.filter(s => scenarioIds.includes(s.id))
      : E2E_TEST_SCENARIOS;

    // Execute each scenario
    for (const scenario of scenarios) {
      await this.executeScenario(scenario);
    }

    // Generate summary report
    await this.generateSummaryReport();
  }

  /**
   * Execute a single test scenario
   */
  private async executeScenario(scenario: TestScenario): Promise<void> {
    console.log(chalk.bold(`\n📋 Testing: ${scenario.name}`));
    console.log(chalk.gray(`Repository: ${scenario.repositoryUrl}`));
    console.log(chalk.gray(`PR #${scenario.prNumber} | ${scenario.primaryLanguage} | ${scenario.repositorySize}`));
    
    const startTime = Date.now();
    const result: TestExecutionResult = {
      scenario,
      success: false,
      executionTime: 0,
      findings: { total: 0, byCategory: {}, bySeverity: {} },
      educationalContent: { total: 0, bySkillLevel: {}, byTopic: {} },
      performance: { apiCallTime: 0, totalTokens: 0, totalCost: 0, memoryUsage: 0 },
      errors: [],
      validationResults: {
        meetsMinFindings: false,
        hasExpectedCategories: false,
        meetsPerformanceTarget: false,
        hasEducationalContent: false
      }
    };

    try {
      // Record start of API call
      this.config.performanceMonitor.recordPerformance(
        scenario.id, 
        'api-call-start', 
        0
      );

      // Make the actual API call
      const apiStartTime = Date.now();
      const response = await this.callAnalysisAPI(scenario);
      const apiEndTime = Date.now();
      
      result.apiResponse = response.data;
      result.performance.apiCallTime = apiEndTime - apiStartTime;

      // Record API performance
      this.config.performanceMonitor.recordApiCall(
        'codequal-api',
        '/analysis/pr',
        result.performance.apiCallTime,
        false
      );

      // Process and validate results
      this.processAnalysisResults(result, response.data);
      
      // Validate against expectations
      this.validateResults(result);

      // Record token usage (if available in response)
      if (response.data.metrics?.tokenUsage) {
        const { promptTokens, completionTokens, totalCost } = response.data.metrics.tokenUsage;
        this.config.performanceMonitor.recordTokenUsage(
          scenario.id,
          promptTokens || 0,
          completionTokens || 0,
          'sonnet' // Adjust based on actual model used
        );
        result.performance.totalTokens = (promptTokens || 0) + (completionTokens || 0);
        result.performance.totalCost = totalCost || 0;
      }

      result.success = true;
      console.log(chalk.green(`✅ Scenario completed successfully`));

    } catch (error) {
      result.errors.push(this.formatError(error));
      console.log(chalk.red(`❌ Scenario failed: ${result.errors[0]}`));
      
      // Record failure in performance monitor
      this.config.performanceMonitor.recordApiCall(
        'codequal-api',
        '/analysis/pr',
        Date.now() - startTime,
        true // rate limited or failed
      );
    }

    result.executionTime = Date.now() - startTime;
    result.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

    // Record overall performance
    this.config.performanceMonitor.recordPerformance(
      scenario.id,
      'total-execution',
      result.executionTime
    );

    this.results.push(result);
    this.printScenarioResult(result);
  }

  /**
   * Make the actual API call with retry logic
   */
  private async callAnalysisAPI(scenario: TestScenario): Promise<any> {
    const payload = {
      repositoryUrl: scenario.repositoryUrl,
      prNumber: scenario.prNumber,
      analysisMode: this.getAnalysisMode(scenario),
      githubToken: this.config.githubToken,
      reportFormat: 'enhanced' as const
    };

    const headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(chalk.gray(`  Attempt ${attempt}/${this.config.maxRetries}...`));
        
        const response = await axios.post(
          `${this.config.apiUrl}/analysis/pr`,
          payload,
          { 
            headers,
            timeout: scenario.timeout,
            validateStatus: (status) => status < 500 // Don't throw on 4xx errors
          }
        );

        if (response.status >= 400) {
          throw new Error(`API returned ${response.status}: ${response.data?.error || 'Unknown error'}`);
        }

        return response;

      } catch (error) {
        lastError = error as Error;
        
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          // Don't retry on client errors (4xx)
          if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
            throw error;
          }
          
          // Check for rate limiting
          if (axiosError.response?.status === 429) {
            const retryAfter = parseInt(axiosError.response.headers['retry-after'] || '60');
            console.log(chalk.yellow(`  Rate limited. Waiting ${retryAfter}s...`));
            await this.delay(retryAfter * 1000);
            continue;
          }
        }

        if (attempt < this.config.maxRetries) {
          console.log(chalk.yellow(`  Retrying in ${this.config.retryDelay / 1000}s...`));
          await this.delay(this.config.retryDelay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Process the API response and extract metrics
   */
  private processAnalysisResults(result: TestExecutionResult, apiResponse: any): void {
    // Extract findings
    if (apiResponse.findings) {
      const allFindings = [
        ...(apiResponse.findings.security || []),
        ...(apiResponse.findings.architecture || []),
        ...(apiResponse.findings.performance || []),
        ...(apiResponse.findings.codeQuality || [])
      ];

      result.findings.total = allFindings.length;

      // Count by category
      Object.entries(apiResponse.findings).forEach(([category, findings]) => {
        if (Array.isArray(findings)) {
          result.findings.byCategory[category] = findings.length;
        }
      });

      // Count by severity
      allFindings.forEach((finding: any) => {
        const severity = finding.severity || 'unknown';
        result.findings.bySeverity[severity] = (result.findings.bySeverity[severity] || 0) + 1;
      });
    }

    // Extract educational content
    if (apiResponse.educationalContent && Array.isArray(apiResponse.educationalContent)) {
      result.educationalContent.total = apiResponse.educationalContent.length;

      apiResponse.educationalContent.forEach((content: any) => {
        // Count by skill level
        const skillLevel = content.skillLevel || 'unknown';
        result.educationalContent.bySkillLevel[skillLevel] = 
          (result.educationalContent.bySkillLevel[skillLevel] || 0) + 1;

        // Count by topic
        if (content.topics && Array.isArray(content.topics)) {
          content.topics.forEach((topic: string) => {
            result.educationalContent.byTopic[topic] = 
              (result.educationalContent.byTopic[topic] || 0) + 1;
          });
        }
      });
    }

    // Extract performance metrics if available
    if (apiResponse.analysis) {
      result.performance.apiCallTime = apiResponse.analysis.processingTime || result.performance.apiCallTime;
    }
  }

  /**
   * Validate results against scenario expectations
   */
  private validateResults(result: TestExecutionResult): void {
    const scenario = result.scenario;

    // Validate minimum findings
    result.validationResults.meetsMinFindings = 
      result.findings.total >= scenario.expectedFindings.minTotalFindings;

    // Validate expected categories
    const foundCategories = Object.keys(result.findings.byCategory);
    result.validationResults.hasExpectedCategories = 
      scenario.expectedFindings.expectedCategories.some(cat => 
        foundCategories.includes(cat)
      );

    // Validate performance
    result.validationResults.meetsPerformanceTarget = 
      result.executionTime <= (scenario.performanceTargets.maxExecutionTime * 1000);

    // Validate educational content
    result.validationResults.hasEducationalContent = 
      result.educationalContent.total >= scenario.expectedEducationalContent.minResourceCount;
  }

  /**
   * Print individual scenario results
   */
  private printScenarioResult(result: TestExecutionResult): void {
    console.log(chalk.gray('\n  Results:'));
    
    // Findings summary
    console.log(`    📊 Findings: ${result.findings.total} total`);
    console.log(`       By category: ${JSON.stringify(result.findings.byCategory)}`);
    console.log(`       By severity: ${JSON.stringify(result.findings.bySeverity)}`);
    
    // Educational content summary
    console.log(`    📚 Educational: ${result.educationalContent.total} resources`);
    if (result.educationalContent.total > 0) {
      console.log(`       By level: ${JSON.stringify(result.educationalContent.bySkillLevel)}`);
    }
    
    // Performance summary
    console.log(`    ⚡ Performance:`);
    console.log(`       API call: ${(result.performance.apiCallTime / 1000).toFixed(2)}s`);
    console.log(`       Total time: ${(result.executionTime / 1000).toFixed(2)}s`);
    if (result.performance.totalTokens > 0) {
      console.log(`       Tokens: ${result.performance.totalTokens.toLocaleString()}`);
      console.log(`       Cost: $${result.performance.totalCost.toFixed(4)}`);
    }
    
    // Validation results
    console.log(`    ✓ Validation:`);
    const validations = result.validationResults;
    console.log(`       Min findings: ${this.getCheckmark(validations.meetsMinFindings)}`);
    console.log(`       Categories: ${this.getCheckmark(validations.hasExpectedCategories)}`);
    console.log(`       Performance: ${this.getCheckmark(validations.meetsPerformanceTarget)}`);
    console.log(`       Educational: ${this.getCheckmark(validations.hasEducationalContent)}`);
    
    if (result.errors.length > 0) {
      console.log(chalk.red(`    ⚠️  Errors:`));
      result.errors.forEach(err => console.log(chalk.red(`       - ${err}`)));
    }
  }

  /**
   * Generate final summary report
   */
  private async generateSummaryReport(): Promise<void> {
    console.log(chalk.bold.blue('\n\n📊 REAL DATA TEST SUMMARY'));
    console.log(chalk.gray('═'.repeat(60)));

    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const successRate = ((successful / total) * 100).toFixed(1);

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total scenarios: ${total}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${total - successful}`);
    console.log(`   Success rate: ${successRate}%`);

    // Aggregate metrics
    const totalFindings = this.results.reduce((sum, r) => sum + r.findings.total, 0);
    const totalEducational = this.results.reduce((sum, r) => sum + r.educationalContent.total, 0);
    const totalTokens = this.results.reduce((sum, r) => sum + r.performance.totalTokens, 0);
    const totalCost = this.results.reduce((sum, r) => sum + r.performance.totalCost, 0);
    const avgApiTime = this.results.reduce((sum, r) => sum + r.performance.apiCallTime, 0) / total / 1000;

    console.log(`\n📊 Aggregate Metrics:`);
    console.log(`   Total findings: ${totalFindings}`);
    console.log(`   Total educational resources: ${totalEducational}`);
    console.log(`   Total tokens used: ${totalTokens.toLocaleString()}`);
    console.log(`   Total cost: $${totalCost.toFixed(2)}`);
    console.log(`   Average API response time: ${avgApiTime.toFixed(2)}s`);

    // Validation summary
    const validationSummary = {
      meetsMinFindings: this.results.filter(r => r.validationResults.meetsMinFindings).length,
      hasExpectedCategories: this.results.filter(r => r.validationResults.hasExpectedCategories).length,
      meetsPerformanceTarget: this.results.filter(r => r.validationResults.meetsPerformanceTarget).length,
      hasEducationalContent: this.results.filter(r => r.validationResults.hasEducationalContent).length
    };

    console.log(`\n✅ Validation Summary:`);
    console.log(`   Meet minimum findings: ${validationSummary.meetsMinFindings}/${total}`);
    console.log(`   Have expected categories: ${validationSummary.hasExpectedCategories}/${total}`);
    console.log(`   Meet performance targets: ${validationSummary.meetsPerformanceTarget}/${total}`);
    console.log(`   Have educational content: ${validationSummary.hasEducationalContent}/${total}`);

    // Performance report
    console.log(this.config.performanceMonitor.generateReport());

    // Save detailed results
    await this.saveDetailedResults();
  }

  /**
   * Save detailed test results to file
   */
  private async saveDetailedResults(): Promise<void> {
    const timestamp = new Date().toISOString();
    const filename = `reports/real-data-test-${timestamp}.json`;
    
    const detailedReport = {
      timestamp,
      summary: {
        totalScenarios: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      scenarios: this.results.map(r => ({
        id: r.scenario.id,
        name: r.scenario.name,
        success: r.success,
        executionTime: r.executionTime,
        findings: r.findings,
        educationalContent: r.educationalContent,
        performance: r.performance,
        validationResults: r.validationResults,
        errors: r.errors
      })),
      performanceStats: this.config.performanceMonitor.getStatistics()
    };

    // Write to file
    const fs = await import('fs');
    const path = await import('path');
    const reportPath = path.join(__dirname, '../../', filename);
    
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    console.log(chalk.gray(`\n💾 Detailed results saved to: ${filename}`));
  }

  /**
   * Helper methods
   */
  private getAnalysisMode(scenario: TestScenario): string {
    // Map scenario complexity to analysis mode
    switch (scenario.complexity) {
      case 'simple':
        return 'quick';
      case 'moderate':
        return 'comprehensive';
      case 'complex':
        return 'deep';
      default:
        return 'comprehensive';
    }
  }

  private formatError(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.data || axiosError.message}`;
      }
      return `Network error: ${axiosError.message}`;
    }
    return error.message || String(error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCheckmark(passed: boolean): string {
    return passed ? chalk.green('✓') : chalk.red('✗');
  }
}

/**
 * CLI execution
 */
if (require.main === module) {
  const runner = new RealDataTestRunner();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const scenarioIds = args.length > 0 ? args : undefined;
  
  runner.runAllScenarios(scenarioIds)
    .then(() => {
      console.log(chalk.green('\n✨ Real data tests completed!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('\n❌ Test runner failed:'), error);
      process.exit(1);
    });
}