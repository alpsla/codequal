import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@codequal/core/src/utils';

// Create a logger for this file
const logger = createLogger('TestReportGenerator');

/**
 * TestResultModel interface for type safety
 */
interface TestResultModel {
  getTestRun: (testRunId: string) => Promise<TestRun>;
  updateTestRun: (testRunId: string, data: Partial<TestRun>) => Promise<void>;
}

/**
 * TestRun interface for type safety
 */
export interface TestRun {
  id: string;
  name: string;
  description?: string;
  status: string;
  startedAt?: Date;
  createdAt: Date;
  prUrls: string[];
  agentSelections: unknown[];
  reportPath?: string;
  [key: string]: unknown;
}

/**
 * Aggregated Results interface
 */
export interface AggregatedResults {
  winners: Record<string, string>;
  configurations: Record<string, ConfigurationData>;
  roles: Record<string, RoleData>;
}

/**
 * Configuration Data interface
 */
interface ConfigurationData {
  metrics: {
    issueDetectionRate: number;
    falsePositiveRate: number;
    explanationQuality: number;
    educationalValue: number;
    [key: string]: number;
  };
  totalTime: number;
}

/**
 * Role Data interface
 */
interface RoleData {
  configurations: Record<string, {
    insightCount: number;
    suggestionCount: number;
    educationalCount: number;
    totalTime: number;
  }>;
}

/**
 * Cost Summary interface
 */
export interface CostSummary {
  grandTotal: number;
  costByConfig: Record<string, number>;
  costByProvider: Record<string, number>;
  costByRole: Record<string, number>;
}

// Import the TestResultModel
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestResultModel: TestResultModel = require('@codequal/database/src/models/test-result').TestResultModel;

/**
 * Generator for test reports
 */
export class TestReportGenerator {
  /**
   * Generate test report
   * @param testRunId Test run ID
   * @param aggregatedResults Aggregated results
   * @param costSummary Cost summary
   * @returns Report path
   */
  async generateReport(
    testRunId: string,
    aggregatedResults: AggregatedResults,
    costSummary: CostSummary
  ): Promise<string> {
    try {
      // 1. Get test run data
      const testRun = await TestResultModel.getTestRun(testRunId);
      
      // 2. Generate report content
      const reportContent = this.generateReportContent(
        testRun,
        aggregatedResults,
        costSummary
      );
      
      // 3. Create reports directory if it doesn't exist
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // 4. Write report file
      const reportPath = path.join(reportsDir, `test-report-${testRunId}.md`);
      fs.writeFileSync(reportPath, reportContent);
      
      // 5. Store report path in database
      await TestResultModel.updateTestRun(testRunId, {
        reportPath
      });
      
      return reportPath;
    } catch (error) {
      logger.error('Error generating test report:', error);
      throw error;
    }
  }
  
  /**
   * Generate report content
   * @param testRun Test run data
   * @param aggregatedResults Aggregated results
   * @param costSummary Cost summary
   * @returns Report content
   */
  private generateReportContent(
    testRun: TestRun,
    aggregatedResults: AggregatedResults,
    costSummary: CostSummary
  ): string {
    let content = '';
    
    // 1. Header
    content += `# Agent Test Report: ${testRun.name}\n\n`;
    content += `**Date:** ${new Date(testRun.startedAt || testRun.createdAt).toISOString().split('T')[0]}\n\n`;
    
    if (testRun.description) {
      content += `${testRun.description}\n\n`;
    }
    
    // 2. Test Summary
    content += `## Test Summary\n\n`;
    content += `- **Test Run ID:** ${testRun.id}\n`;
    content += `- **Status:** ${testRun.status}\n`;
    content += `- **PRs Tested:** ${testRun.prUrls.length}\n`;
    content += `- **Configurations Tested:** ${testRun.agentSelections.length}\n`;
    content += `- **Total Cost:** $${costSummary.grandTotal.toFixed(3)}\n\n`;
    
    // 3. Winners
    content += `## Test Winners\n\n`;
    content += `| Category | Best Configuration |\n`;
    content += `|----------|--------------------|\n`;
    
    for (const [category, winner] of Object.entries(aggregatedResults.winners)) {
      content += `| ${this.formatCategory(category)} | ${winner} |\n`;
    }
    
    content += '\n';
    
    // 4. Configuration Comparison
    content += `## Configuration Comparison\n\n`;
    content += `| Configuration | Issue Detection | False Positive Rate | Explanation Quality | Educational Value | Total Time (ms) | Cost |\n`;
    content += `|---------------|----------------|--------------------|---------------------|-------------------|-----------------|------|\n`;
    
    for (const [configName, configData] of Object.entries(aggregatedResults.configurations)) {
      const metrics = configData.metrics;
      
      content += `| ${configName} | `;
      content += `${(metrics.issueDetectionRate * 100).toFixed(1)}% | `;
      content += `${(metrics.falsePositiveRate * 100).toFixed(1)}% | `;
      content += `${(metrics.explanationQuality * 10).toFixed(1)}/10 | `;
      content += `${(metrics.educationalValue * 10).toFixed(1)}/10 | `;
      content += `${Math.round(configData.totalTime)} | `;
      
      const costValue = costSummary.costByConfig[configName];
      content += `$${costValue !== undefined ? costValue.toFixed(3) : '0.000'} |\n`;
    }
    
    content += '\n';
    
    // 5. Role Performance
    content += `## Performance by Role\n\n`;
    
    for (const [role, roleData] of Object.entries(aggregatedResults.roles)) {
      content += `### ${this.formatCategory(role)}\n\n`;
      content += `| Configuration | Insights | Suggestions | Educational Items | Time (ms) |\n`;
      content += `|---------------|----------|-------------|-------------------|----------|\n`;
      
      for (const [configName, configData] of Object.entries(roleData.configurations)) {
        content += `| ${configName} | `;
        content += `${configData.insightCount} | `;
        content += `${configData.suggestionCount} | `;
        content += `${configData.educationalCount} | `;
        content += `${Math.round(configData.totalTime)} |\n`;
      }
      
      content += '\n';
    }
    
    // 6. Cost Analysis
    content += `## Cost Analysis\n\n`;
    content += `### Overall Costs\n\n`;
    content += `| Category | Cost |\n`;
    content += `|----------|------|\n`;
    content += `| Total Cost | $${costSummary.grandTotal.toFixed(3)} |\n`;
    
    // Cost by provider
    content += '\n### Cost by Provider\n\n';
    content += `| Provider | Cost |\n`;
    content += `|----------|------|\n`;
    
    for (const [provider, cost] of Object.entries(costSummary.costByProvider)) {
      content += `| ${provider} | $${(cost as number).toFixed(3)} |\n`;
    }
    
    // Cost by role
    content += '\n### Cost by Role\n\n';
    content += `| Role | Cost |\n`;
    content += `|------|------|\n`;
    
    for (const [role, cost] of Object.entries(costSummary.costByRole)) {
      content += `| ${this.formatCategory(role)} | $${(cost as number).toFixed(3)} |\n`;
    }
    
    // 7. Recommendations
    content += `\n## Recommendations\n\n`;
    
    // Best overall configuration
    const bestOverall = aggregatedResults.winners.overall;
    content += `### Best Overall Configuration\n\n`;
    content += `Based on the test results, the **${bestOverall}** configuration provides the best overall performance, `;
    content += `with high accuracy and good explanations. `;
    
    if (aggregatedResults.winners.bestValue) {
      const bestValue = aggregatedResults.winners.bestValue;
      
      if (bestValue === bestOverall) {
        content += `This configuration also provides the best value for money.\n\n`;
      } else {
        content += `However, for better cost efficiency, consider the **${bestValue}** configuration.\n\n`;
      }
    }
    
    // Role-specific recommendations
    content += `### Role-Specific Recommendations\n\n`;
    content += `For optimal performance across different aspects of PR analysis, consider this specialized configuration:\n\n`;
    content += '```json\n{\n';
    
    for (const [role, winner] of Object.entries(aggregatedResults.winners)) {
      if (role !== 'overall' && role !== 'bestValue') {
        content += `  "${role}": "${winner}",\n`;
      }
    }
    
    content = content.slice(0, -2) + '\n'; // Remove trailing comma
    content += '}\n```\n\n';
    
    // Cost optimization recommendations
    if (costSummary.grandTotal > 0.1) {
      content += `### Cost Optimization\n\n`;
      content += `To reduce costs without significantly impacting performance, consider these changes:\n\n`;
      
      // Find expensive providers
      const expensiveProviders = Object.entries(costSummary.costByProvider)
        .filter(([_, cost]) => (cost as number) > costSummary.grandTotal * 0.2)
        .map(([provider, _]) => provider);
      
      // Suggest alternatives
      if (expensiveProviders.includes('claude')) {
        content += `- Consider using MCP_GEMINI instead of CLAUDE for non-critical roles\n`;
      }
      
      if (expensiveProviders.includes('openai')) {
        content += `- Consider using CODE_RABBIT instead of OPENAI for CODE_QUALITY analysis\n`;
      }
      
      // General cost optimization tips
      content += `- Implement caching for unchanged PR files to reduce token usage\n`;
      content += `- Add pre-filtering to reduce the amount of code sent to LLMs\n`;
    }
    
    return content;
  }
  
  /**
   * Format category name for display
   * @param category Category name
   * @returns Formatted category name
   */
  private formatCategory(category: string): string {
    // Convert camelCase to Title Case with Spaces
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
}