#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Test Tool Results Flow Through Orchestrator
 * 
 * This test verifies the complete flow:
 * 1. Agents execute tools
 * 2. Tool results are captured in agent results
 * 3. Orchestrator compiles tool results
 * 4. DeepWiki manager extracts tool data
 * 5. Reporter includes tool results in final report
 */

import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { PRAnalysisRequest } from '../../../../apps/api/src/services/result-orchestrator';
import { AuthenticatedUser } from '../../../../apps/api/src/middleware/auth-middleware';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const _logger = createLogger('ToolResultsFlow');

// Import the orchestrator directly to test
async function runTest() {
  // For TypeScript compilation, we'll use require after build
  const { ResultOrchestrator } = await import('../../../../apps/api/src/services/result-orchestrator.js');
  
  console.log(chalk.cyan('\n🔬 Testing Tool Results Flow Through Orchestrator\n'));

  // Create authenticated user
  const authenticatedUser: AuthenticatedUser = {
    id: 'tool-flow-test-user',
    email: 'tooltest@example.com',
    organizationId: 'test-org',
    permissions: ['analyze', 'view_reports'],
    role: 'user',
    status: 'active',
    session: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  // Create orchestrator with authenticated user
  const orchestrator = new ResultOrchestrator(authenticatedUser);

  // Create test PR that should trigger multiple tools
  const prRequest: PRAnalysisRequest = {
    repositoryUrl: 'https://github.com/test/security-demo',
    prNumber: 456,
    analysisMode: 'comprehensive',
    authenticatedUser,
    githubToken: process.env.GITHUB_TOKEN,
    reportFormat: 'STANDARD' as any
  };

  try {
    console.log(chalk.yellow('1. Starting PR analysis with tool tracking...\n'));
    
    // Add a custom logger to track tool executions
    const originalLog = console.log;
    const toolExecutions: string[] = [];
    
    // Temporarily capture tool-related logs
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('tool') || message.includes('Tool') || 
          message.includes('npm-audit') || message.includes('eslint') ||
          message.includes('semgrep') || message.includes('ast-grep')) {
        toolExecutions.push(message);
      }
      originalLog(...args);
    };

    // Execute the analysis
    const result = await orchestrator.analyzePR(prRequest);
    
    // Restore original console.log
    console.log = originalLog;

    console.log(chalk.yellow('\n2. Analysis completed. Checking results...\n'));

    // Check for tool executions in logs
    console.log(chalk.blue('Tool Executions Detected:'));
    if (toolExecutions.length > 0) {
      console.log(chalk.green(`  ✓ ${toolExecutions.length} tool-related log entries found`));
      toolExecutions.slice(0, 5).forEach(log => {
        console.log(chalk.gray(`    - ${log.substring(0, 80)}...`));
      });
    } else {
      console.log(chalk.red('  ✗ No tool executions detected in logs'));
    }

    // Check analysis metadata
    console.log(chalk.blue('\nAnalysis Metadata:'));
    if (result.analysis) {
      console.log(chalk.green(`  ✓ Agents used: ${result.analysis.agentsUsed.join(', ')}`));
      console.log(`  - Processing time: ${result.analysis.processingTime}ms`);
      console.log(`  - Total findings: ${result.analysis.totalFindings}`);
    }

    // Check for tool data in various places
    console.log(chalk.blue('\nTool Data Locations:'));
    
    // Check metadata for tools
    const hasToolsInMetadata = result.metadata?.processingSteps?.some(step => 
      step.toLowerCase().includes('tool') || step.toLowerCase().includes('executing')
    );
    console.log(hasToolsInMetadata
      ? chalk.green('  ✓ Tools mentioned in processing steps')
      : chalk.red('  ✗ No tool mentions in processing steps')
    );

    // Check DeepWiki integration
    const hasDeepWikiData = (result.compiledEducationalData as any)?.deepWikiContext ||
                           (result.report?.fullReport && JSON.stringify(result.report.fullReport).includes('DeepWiki')) ||
                           (result.educationalContent && JSON.stringify(result.educationalContent).includes('deepwiki'));
    console.log(hasDeepWikiData
      ? chalk.green('  ✓ DeepWiki data integrated')
      : chalk.red('  ✗ No DeepWiki data found')
    );

    // Check findings for tool sources
    console.log(chalk.blue('\nFindings Analysis:'));
    let toolSourcedFindings = 0;
    let totalFindings = 0;
    
    Object.values(result.findings || {}).forEach((categoryFindings) => {
      if (Array.isArray(categoryFindings)) {
        totalFindings += categoryFindings.length;
        categoryFindings.forEach(finding => {
          if (finding.tool || (finding as any).source || finding.metadata?.tool) {
            toolSourcedFindings++;
          }
        });
      }
    });

    console.log(`  - Total findings: ${totalFindings}`);
    console.log(`  - Tool-sourced findings: ${toolSourcedFindings}`);
    console.log(toolSourcedFindings > 0
      ? chalk.green(`  ✓ ${Math.round(toolSourcedFindings/totalFindings*100)}% of findings have tool sources`)
      : chalk.red('  ✗ No findings with tool sources')
    );

    // Check the final report structure
    console.log(chalk.blue('\nFinal Report Structure:'));
    if (result.report) {
      const reportKeys = Object.keys(result.report as Record<string, unknown>);
      console.log(`  - Report sections: ${reportKeys.join(', ')}`);
      
      // Check PR comment for tool mentions
      if (result.report.prComment) {
        const prCommentHasTools = result.report.prComment.toLowerCase().includes('tool') ||
                                 result.report.prComment.includes('detected by') ||
                                 result.report.prComment.includes('found by');
        console.log(prCommentHasTools
          ? chalk.green('  ✓ PR comment mentions tools')
          : chalk.yellow('  ⚠️  PR comment doesn\'t mention tools')
        );
      }

      // Check full report
      if (result.report.fullReport) {
        const reportStr = JSON.stringify(result.report.fullReport);
        const toolMentions = ['tool', 'npm-audit', 'eslint', 'semgrep', 'ast-grep', 'scanner', 'analyzer']
          .filter(term => reportStr.toLowerCase().includes(term));
        
        console.log(toolMentions.length > 0
          ? chalk.green(`  ✓ Full report mentions tools: ${toolMentions.join(', ')}`)
          : chalk.red('  ✗ Full report doesn\'t mention tools')
        );
      }
    }

    // Educational content check
    console.log(chalk.blue('\nEducational Content:'));
    if (result.compiledEducationalData) {
      const hasToolRelatedEducation = JSON.stringify(result.compiledEducationalData)
        .toLowerCase().includes('tool');
      console.log(hasToolRelatedEducation
        ? chalk.green('  ✓ Educational content references tools')
        : chalk.yellow('  ⚠️  Educational content doesn\'t reference tools')
      );
    }

    // Save detailed results
    const fs = await import('fs');
    const resultPath = path.join(__dirname, 'tool-flow-test-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(chalk.gray(`\n📁 Full results saved to: ${resultPath}`));

    // Final summary
    console.log(chalk.cyan('\n📊 Tool Integration Summary:\n'));
    
    const toolIntegrationScore = [
      toolExecutions.length > 0,
      hasToolsInMetadata,
      hasDeepWikiData,
      toolSourcedFindings > 0,
      result.report?.prComment?.includes('tool') || false
    ].filter(Boolean).length;

    console.log(`Tool Integration Score: ${toolIntegrationScore}/5`);
    
    if (toolIntegrationScore >= 4) {
      console.log(chalk.green('✅ Excellent tool integration!'));
    } else if (toolIntegrationScore >= 2) {
      console.log(chalk.yellow('⚠️  Partial tool integration - some components may not be passing tool data'));
    } else {
      console.log(chalk.red('❌ Poor tool integration - tool results are not flowing through the system'));
    }

    // Recommendations
    if (toolIntegrationScore < 5) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      if (!hasToolsInMetadata) {
        console.log('  - Ensure agents add toolsExecuted to their metadata');
      }
      if (!hasDeepWikiData) {
        console.log('  - Check DeepWikiManager is properly extracting tool results');
      }
      if (toolSourcedFindings === 0) {
        console.log('  - Ensure agents add tool/source fields to their findings');
      }
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error(chalk.red('Failed to run test:'), error);
  process.exit(1);
});