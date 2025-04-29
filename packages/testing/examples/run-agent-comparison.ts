import { AgentTestRunner, AgentTestConfig } from '@codequal/testing/src/agent-test-runner';
import { AgentProvider, AgentRole, AgentSelection } from '@codequal/core/src/config/agent-registry';
import { createLogger } from '@codequal/core/src/utils';

// Create a logger for this file
const logger = createLogger('AgentComparison');

/**
 * TestResultModel interface for type safety
 */
interface TestResultModel {
  getTestRun: (testRunId: string) => Promise<{
    reportPath: string;
    [key: string]: unknown;
  }>;
}

/**
 * Run comparison of different agent configurations
 */
async function runAgentComparison(): Promise<void> {
  // Define test configuration
  const testConfig: AgentTestConfig = {
    name: "Claude vs PR-Agent Comparison",
    description: "Comparing Claude and PR-Agent for code quality and security analysis",
    prUrls: [
      "https://github.com/example/repo/pull/123",
      "https://github.com/example/repo/pull/456",
      "https://github.com/example/repo/pull/789"
    ],
    agentConfigurations: [
      {
        name: "CodeRabbit Configuration",
        selection: {
          [AgentRole.ORCHESTRATOR]: AgentProvider.CODE_RABBIT,
          [AgentRole.CODE_QUALITY]: AgentProvider.CODE_RABBIT,
          [AgentRole.SECURITY]: AgentProvider.CODE_RABBIT,
          [AgentRole.PERFORMANCE]: AgentProvider.CODE_RABBIT,
          [AgentRole.DEPENDENCY]: AgentProvider.CODE_RABBIT,
          [AgentRole.EDUCATIONAL]: AgentProvider.CODE_RABBIT,
          [AgentRole.REPORT_GENERATION]: AgentProvider.CODE_RABBIT
        }
      },
      {
        name: "All Claude",
        selection: {
          [AgentRole.ORCHESTRATOR]: AgentProvider.CLAUDE,
          [AgentRole.CODE_QUALITY]: AgentProvider.CLAUDE,
          [AgentRole.SECURITY]: AgentProvider.CLAUDE,
          [AgentRole.PERFORMANCE]: AgentProvider.CLAUDE,
          [AgentRole.DEPENDENCY]: AgentProvider.CLAUDE,
          [AgentRole.EDUCATIONAL]: AgentProvider.CLAUDE,
          [AgentRole.REPORT_GENERATION]: AgentProvider.CLAUDE
        }
      },
      {
        name: "Hybrid",
        selection: {
          [AgentRole.ORCHESTRATOR]: AgentProvider.OPENAI,
          [AgentRole.CODE_QUALITY]: AgentProvider.CLAUDE,
          [AgentRole.SECURITY]: AgentProvider.SNYK,
          [AgentRole.PERFORMANCE]: AgentProvider.DEEPSEEK_CODER,
          [AgentRole.DEPENDENCY]: AgentProvider.SNYK,
          [AgentRole.EDUCATIONAL]: AgentProvider.CLAUDE,
          [AgentRole.REPORT_GENERATION]: AgentProvider.OPENAI
        }
      }
    ],
    trackCosts: true,
    budgetLimit: 10.0, // $10 maximum for the test
    evaluationMetrics: {
      issueDetection: true,
      falsePositiveRate: true,
      explanationQuality: true,
      educationalValue: true,
      responseTime: true,
      tokenUsage: true
    },
    generateReport: true
  };
  
  // Create test runner
  const testRunner = new AgentTestRunner(testConfig);
  
  // Run test
  const testRunId = await testRunner.runTest();
  
  logger.info(`Test run completed. ID: ${testRunId}`);
  
  // Get test results from database
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TestResultModel: TestResultModel = require('@codequal/database/src/models/test-result').TestResultModel;
  const testRun = await TestResultModel.getTestRun(testRunId);
  
  logger.info(`Test report: ${testRun.reportPath}`);
}

// Run the test
runAgentComparison().catch(err => {
  logger.error('Error running agent comparison:', err);
  process.exit(1);
});