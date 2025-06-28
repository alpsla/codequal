#!/usr/bin/env ts-node
/**
 * Real PR Analysis with Monitoring
 * 
 * This test performs actual PR analysis using real AI models from OpenRouter
 * and captures all monitoring metrics.
 */

import chalk from 'chalk';
import { config } from 'dotenv';
import * as path from 'path';
import { MonitoredTestRunner } from '../monitoring/monitored-test-runner';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

interface PRTestScenario {
  name: string;
  repository: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep';
  expectedCharacteristics: string[];
}

async function runRealPRAnalysis() {
  console.log(chalk.bold.blue('\n🚀 Real PR Analysis with Monitoring\n'));

  // Check prerequisites
  if (!process.env.OPENROUTER_API_KEY || !process.env.GITHUB_TOKEN) {
    console.log(chalk.red('❌ Missing required environment variables:'));
    if (!process.env.OPENROUTER_API_KEY) console.log(chalk.red('   - OPENROUTER_API_KEY'));
    if (!process.env.GITHUB_TOKEN) console.log(chalk.red('   - GITHUB_TOKEN'));
    return false;
  }

  console.log(chalk.green('✅ Environment variables configured'));

  const monitoredRunner = new MonitoredTestRunner();

  // Test scenario - using a real, small PR for quick testing
  const scenario: PRTestScenario = {
    name: 'Small Feature PR',
    repository: 'https://github.com/facebook/react',
    prNumber: 28000, // A small, closed PR
    analysisMode: 'quick',
    expectedCharacteristics: ['documentation', 'low complexity']
  };

  console.log(chalk.bold.yellow(`\n📋 Analyzing: ${scenario.name}`));
  console.log(chalk.gray(`Repository: ${scenario.repository}`));
  console.log(chalk.gray(`PR: #${scenario.prNumber}`));
  console.log(chalk.gray(`Mode: ${scenario.analysisMode}`));
  console.log(chalk.gray('─'.repeat(60)));

  try {
    // Create authenticated user for the test
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

    // Dynamically import ResultOrchestrator to avoid compilation issues
    const { ResultOrchestrator } = await import('../../../../apps/api/src/services/result-orchestrator.js');
    const orchestrator = new ResultOrchestrator(authenticatedUser);

    // Run analysis with monitoring
    const { result, metrics } = await monitoredRunner.runAnalysisWithMonitoring(
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

    // Display results
    console.log(chalk.green('\n✅ Analysis completed successfully!'));
    
    // Show key metrics
    console.log(chalk.blue('\n📊 Key Metrics:'));
    console.log(chalk.gray(`   Execution time: ${metrics.executionTime}ms`));
    console.log(chalk.gray(`   Total cost: $${metrics.totalCost.toFixed(4)}`));
    console.log(chalk.gray(`   Token usage: ${metrics.totalTokens} tokens`));
    
    // Show findings summary
    if (result.findings) {
      const totalFindings = Object.values(result.findings).reduce((sum: number, arr: any) => 
        sum + (Array.isArray(arr) ? arr.length : 0), 0
      );
      console.log(chalk.gray(`   Total findings: ${totalFindings}`));
    }
    
    // Show models used
    if (metrics.modelBreakdown && metrics.modelBreakdown.length > 0) {
      console.log(chalk.blue('\n🤖 Models Used:'));
      metrics.modelBreakdown.forEach((model: any) => {
        console.log(chalk.gray(`   ${model.model}: ${model.calls} calls, $${model.cost.toFixed(4)}`));
      });
    }

    // Monitoring reports are automatically saved by MonitoredTestRunner

    return true;
  } catch (error) {
    console.log(chalk.red('\n❌ Analysis failed'));
    console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    if (error instanceof Error && error.stack) {
      console.log(chalk.gray(error.stack));
    }
    return false;
  }
}

// Run the test
if (require.main === module) {
  runRealPRAnalysis()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✨ Real PR analysis with monitoring completed successfully!'));
      } else {
        console.log(chalk.red.bold('\n❌ Real PR analysis failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

export { runRealPRAnalysis };