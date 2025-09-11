#!/usr/bin/env node
/**
 * E2E Test: Real PR Analysis with OpenRouter Models
 * 
 * This test performs actual PR analysis using real AI models from OpenRouter
 */

import chalk from 'chalk';
import { ResultOrchestrator } from '../../../../apps/api/src/services/result-orchestrator';
import { MonitoredTestRunner } from '../monitoring/monitored-test-runner';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

interface TestScenario {
  name: string;
  repository: string;
  prNumber: number;
  expectedCharacteristics: string[];
  analysisMode: 'quick' | 'comprehensive' | 'deep';
}

class RealPRAnalysisTest {
  private monitoredRunner: MonitoredTestRunner;
  
  constructor() {
    this.monitoredRunner = new MonitoredTestRunner();
  }

  async runTests() {
    console.log(chalk.bold.blue('\n🚀 E2E Test: Real PR Analysis with OpenRouter Models\n'));

    // Check prerequisites
    if (!process.env.OPENROUTER_API_KEY || !process.env.GITHUB_TOKEN) {
      console.log(chalk.red('❌ Missing required environment variables:'));
      if (!process.env.OPENROUTER_API_KEY) console.log(chalk.red('   - OPENROUTER_API_KEY'));
      if (!process.env.GITHUB_TOKEN) console.log(chalk.red('   - GITHUB_TOKEN'));
      return false;
    }

    console.log(chalk.green('✅ Environment variables configured'));
    console.log(chalk.gray('   - OpenRouter API Key: Set'));
    console.log(chalk.gray('   - GitHub Token: Set'));

    // Test scenarios - using real, public PRs
    const scenarios: TestScenario[] = [
      {
        name: 'Small Documentation PR',
        repository: 'https://github.com/facebook/react',
        prNumber: 28000, // Small, closed PR
        expectedCharacteristics: ['documentation', 'low complexity'],
        analysisMode: 'quick'
      },
      {
        name: 'Medium Feature PR',
        repository: 'https://github.com/microsoft/vscode',
        prNumber: 200000, // Medium-sized PR
        expectedCharacteristics: ['feature', 'tests included'],
        analysisMode: 'comprehensive'
      },
      {
        name: 'Security-Related PR',
        repository: 'https://github.com/nodejs/node',
        prNumber: 45000, // Security-related changes
        expectedCharacteristics: ['security', 'critical'],
        analysisMode: 'comprehensive'
      }
    ];

    let allPassed = true;

    for (const scenario of scenarios) {
      console.log(chalk.bold.yellow(`\n📋 ${scenario.name}`));
      console.log(chalk.gray(`Repository: ${scenario.repository}`));
      console.log(chalk.gray(`PR: #${scenario.prNumber}`));
      console.log(chalk.gray(`Mode: ${scenario.analysisMode}`));
      console.log(chalk.gray('─'.repeat(60)));

      try {
        const result = await this.runScenario(scenario);
        
        if (result.success) {
          console.log(chalk.green('\n✅ Scenario passed'));
          this.printAnalysisResults(result);
        } else {
          console.log(chalk.red('\n❌ Scenario failed'));
          console.log(chalk.red(`Error: ${result.error}`));
          allPassed = false;
        }
      } catch (error) {
        console.log(chalk.red('\n❌ Scenario crashed'));
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        allPassed = false;
      }
    }

    return allPassed;
  }

  private async runScenario(scenario: TestScenario): Promise<any> {
    const authenticatedUser = {
      id: 'test-user',
      email: 'test@codequal.com',
      role: 'user' as const,
      permissions: ['read'],
      status: 'active' as const,
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000)
      }
    };

    const orchestrator = new ResultOrchestrator(authenticatedUser);

    // Run analysis with monitoring
    const { result, metrics } = await this.monitoredRunner.runAnalysisWithMonitoring(
      async () => {
        return await orchestrator.analyzePR({
          repositoryUrl: scenario.repository,
          prNumber: scenario.prNumber,
          analysisMode: scenario.analysisMode,
          authenticatedUser,
          githubToken: process.env.GITHUB_TOKEN
        });
      },
      {
        repositoryUrl: scenario.repository,
        prNumber: scenario.prNumber,
        analysisMode: scenario.analysisMode
      }
    );

    // Validate results
    const validation = this.validateResults(result, scenario);
    
    return {
      success: validation.isValid,
      error: validation.error,
      result,
      metrics,
      validation
    };
  }

  private validateResults(result: any, _scenario: TestScenario): any {
    const validation = {
      isValid: true,
      error: null as string | null,
      checks: {
        hasFindings: false,
        hasReport: false,
        hasEducationalContent: false,
        hasCostData: false,
        modelsUsed: [] as string[]
      }
    };

    // Check for basic structure
    if (!result || !result.analysisId) {
      validation.isValid = false;
      validation.error = 'Missing analysis result';
      return validation;
    }

    // Check findings
    if (result.findings && Object.keys(result.findings).length > 0) {
      validation.checks.hasFindings = true;
    }

    // Check report
    if (result.report && result.report.content) {
      validation.checks.hasReport = true;
    }

    // Check educational content
    if (result.educationalContent && result.educationalContent.recommendations) {
      validation.checks.hasEducationalContent = true;
    }

    // Check cost data
    if (result.metadata && result.metadata.totalCost !== undefined) {
      validation.checks.hasCostData = true;
    }

    // Extract models used
    if (result.metadata && result.metadata.modelsUsed) {
      validation.checks.modelsUsed = result.metadata.modelsUsed;
    }

    return validation;
  }

  private printAnalysisResults(result: any) {
    console.log(chalk.blue('\n📊 Analysis Results:'));
    
    // Findings summary
    const findings = result.result.findings || {};
    const totalFindings = Object.values(findings).reduce((sum: number, arr: any) => 
      sum + (Array.isArray(arr) ? arr.length : 0), 0
    );
    console.log(chalk.gray(`   Total findings: ${totalFindings}`));
    
    // Models used
    if (result.validation.checks.modelsUsed.length > 0) {
      console.log(chalk.gray(`   Models used: ${result.validation.checks.modelsUsed.join(', ')}`));
    }
    
    // Cost data
    if (result.result.metadata?.totalCost !== undefined) {
      console.log(chalk.gray(`   Total cost: $${result.result.metadata.totalCost.toFixed(4)}`));
    }
    
    // Performance
    if (result.result.metadata?.executionTime) {
      console.log(chalk.gray(`   Execution time: ${result.result.metadata.executionTime}ms`));
    }
    
    // Validation checks
    console.log(chalk.blue('\n✓ Validation Checks:'));
    console.log(chalk.gray(`   Has findings: ${result.validation.checks.hasFindings ? '✅' : '❌'}`));
    console.log(chalk.gray(`   Has report: ${result.validation.checks.hasReport ? '✅' : '❌'}`));
    console.log(chalk.gray(`   Has educational content: ${result.validation.checks.hasEducationalContent ? '✅' : '❌'}`));
    console.log(chalk.gray(`   Has cost data: ${result.validation.checks.hasCostData ? '✅' : '❌'}`));
  }
}

// Run the test
if (require.main === module) {
  const test = new RealPRAnalysisTest();
  test.runTests()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✅ All E2E tests passed!'));
        console.log(chalk.gray('\nThe system successfully analyzed real PRs using OpenRouter models.'));
      } else {
        console.log(chalk.red.bold('\n❌ Some E2E tests failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

export { RealPRAnalysisTest };