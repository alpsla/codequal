import { AgentFactory } from '@codequal/agents/factory/agent-factory';
import { AgentProvider, AgentRole, AgentSelection } from '@codequal/core/config/agent-registry';
import { AnalysisResult, Insight, Suggestion, EducationalContent } from '@codequal/core/types/agent';

/**
 * Cost tracker for agent testing
 */
export class CostTracker {
  /**
   * Cost entries
   */
  private costs: Array<{
    provider: string;
    role: string;
    configName: string;
    callCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
  }> = [];
  
  private pricingModels: Record<string, Record<string, number>> = {
    [AgentProvider.CLAUDE]: { 
      inputTokenCost: 0.0000080, 
      outputTokenCost: 0.0000240 
    },
    [AgentProvider.MCP_OPENAI]: { 
      inputTokenCost: 0.0000050, 
      outputTokenCost: 0.0000150 
    },
    [AgentProvider.MCP_GEMINI]: { 
      inputTokenCost: 0.0000025, 
      outputTokenCost: 0.0000125 
    },
    [AgentProvider.DEEPSEEK_CODER]: { 
      inputTokenCost: 0.00000014, // $0.14 per million tokens
      outputTokenCost: 0.00000028  // $0.28 per million tokens
    },
    [AgentProvider.BITO]: { 
      baseCost: 0.50, 
      callCost: 0.03 
    },
    [AgentProvider.CODE_RABBIT]: { 
      prCost: 0.05 
    }
  };
  
  /**
   * Reset cost tracking
   */
  resetTracking(): void {
    this.costs = [];
  }
  
  /**
   * Track API call
   * @param provider Provider
   * @param role Role
   * @param configName Configuration name
   * @param inputTokens Input tokens
   * @param outputTokens Output tokens
   */
  trackCall(
    provider: AgentProvider,
    role: AgentRole,
    configName: string,
    inputTokens: number,
    outputTokens: number
  ): void {
    const pricing = this.pricingModels[provider] || { 
      inputTokenCost: 0, 
      outputTokenCost: 0 
    };
    
    // Calculate token cost
    const tokenCost = 
      (inputTokens * (pricing.inputTokenCost || 0)) + 
      (outputTokens * (pricing.outputTokenCost || 0));
    
    // Add fixed costs if applicable
    const baseCost = pricing.baseCost || 0;
    const callCost = pricing.callCost || 0;
    const prCost = pricing.prCost || 0;
    
    const estimatedCost = tokenCost + callCost + prCost;
    
    // Find existing entry
    const existingEntry = this.costs.find(
      c => c.provider === provider && 
           c.role === role && 
           c.configName === configName
    );
    
    if (existingEntry) {
      // Update existing entry
      existingEntry.callCount++;
      existingEntry.inputTokens += inputTokens;
      existingEntry.outputTokens += outputTokens;
      existingEntry.estimatedCost += estimatedCost;
    } else {
      // Add new entry
      this.costs.push({
        provider,
        role,
        configName,
        callCount: 1,
        inputTokens,
        outputTokens,
        estimatedCost: baseCost + estimatedCost // Include base cost only once
      });
    }
  }
  
  /**
   * Get cost summary
   * @returns Cost summary
   */
  getSummary(): {
    detailedCosts: Array<{
      provider: string;
      role: string;
      configName: string;
      callCount: number;
      inputTokens: number;
      outputTokens: number;
      estimatedCost: number;
    }>;
    grandTotal: number;
    costByProvider: Record<string, number>;
    costByRole: Record<string, number>;
    costByConfig: Record<string, number>;
    costByProviderAndRole: Record<string, Record<string, number>>;
  } {
    // Aggregate costs
    let grandTotal = 0;
    const costByProvider: Record<string, number> = {};
    const costByRole: Record<string, number> = {};
    const costByConfig: Record<string, number> = {};
    const costByProviderAndRole: Record<string, Record<string, number>> = {};
    
    for (const entry of this.costs) {
      // Update grand total
      grandTotal += entry.estimatedCost;
      
      // Update by provider
      costByProvider[entry.provider] = 
        (costByProvider[entry.provider] || 0) + entry.estimatedCost;
      
      // Update by role
      costByRole[entry.role] = 
        (costByRole[entry.role] || 0) + entry.estimatedCost;
      
      // Update by config
      costByConfig[entry.configName] = 
        (costByConfig[entry.configName] || 0) + entry.estimatedCost;
      
      // Update by provider and role
      if (!costByProviderAndRole[entry.provider]) {
        costByProviderAndRole[entry.provider] = {};
      }
      
      costByProviderAndRole[entry.provider][entry.role] = 
        (costByProviderAndRole[entry.provider][entry.role] || 0) + entry.estimatedCost;
    }
    
    return {
      detailedCosts: this.costs,
      grandTotal,
      costByProvider,
      costByRole,
      costByConfig,
      costByProviderAndRole
    };
  }
  
  /**
   * Update pricing model
   * @param provider Provider
   * @param newPricing New pricing model
   */
  updatePricingModel(provider: string, newPricing: Record<string, number>): void {
    this.pricingModels[provider] = newPricing;
  }
}

/**
 * Configuration for agent tests
 */
export interface AgentTestConfig {
  /**
   * Test name
   */
  name: string;
  
  /**
   * Test description
   */
  description?: string;
  
  /**
   * PR URLs to test
   */
  prUrls: string[];
  
  /**
   * Agent configurations to test
   */
  agentConfigurations: Array<{
    /**
     * Configuration name
     */
    name: string;
    
    /**
     * Agent selection
     */
    selection: AgentSelection;
  }>;
  
  /**
   * Enable cost tracking
   */
  trackCosts: boolean;
  
  /**
   * Budget limit
   */
  budgetLimit?: number;
  
  /**
   * Metrics to evaluate
   */
  evaluationMetrics: {
    issueDetection: boolean;
    falsePositiveRate: boolean;
    explanationQuality: boolean;
    educationalValue: boolean;
    responseTime: boolean;
    tokenUsage: boolean;
  };
  
  /**
   * Generate report
   */
  generateReport: boolean;
}

/**
 * Import types for metrics calculator and report generator
 */
interface MetricsResult {
  issueDetectionRate: number;
  falsePositiveRate: number;
  explanationQuality: number;
  educationalValue: number;
  [key: string]: number;
}

interface MetricsCalculator {
  calculateMetrics: (results: Record<AgentRole, AnalysisResult>) => MetricsResult;
}

interface TestReportGenerator {
  generateReport: (testRunId: string, results: unknown, costs: unknown) => Promise<void>;
}

interface TestResultModel {
  // Add proper type definitions as needed
  id: string;
  results: unknown;
}

/**
 * Runner for agent tests
 */
export class AgentTestRunner {
  /**
   * Test configuration
   */
  private config: AgentTestConfig;
  
  /**
   * Cost tracker
   */
  private costTracker: CostTracker;
  
  /**
   * Metrics calculator
   */
  private metricsCalculator: MetricsCalculator;
  
  /**
   * Report generator
   */
  private reportGenerator: TestReportGenerator;
  
  /**
   * @param config Test configuration
   */
  constructor(config: AgentTestConfig) {
    this.config = config;
    this.costTracker = new CostTracker();
    this.metricsCalculator = {
      calculateMetrics: (results: Record<AgentRole, AnalysisResult>) => ({
        // Placeholder implementation
        issueDetectionRate: 0.8,
        falsePositiveRate: 0.1,
        explanationQuality: 0.7,
        educationalValue: 0.9
      })
    };
    this.reportGenerator = {
      generateReport: async (testRunId: string, results: any, costs: any) => {
        console.log('Generating report for test run:', testRunId);
      }
    };
  }
  
  /**
   * Run the test
   * @returns Test result
   */
  async runTest(): Promise<string> {
    try {
      console.log(`Starting agent test: ${this.config.name}`);
      
      // 1. Create test run record
      const testRunId = "test-123"; // Placeholder

      // Update test run status
      console.log("Test run status: running");
      
      // 2. Reset cost tracking
      if (this.config.trackCosts) {
        this.costTracker.resetTracking();
      }
      
      // 3. Run test for each PR
      const prResults = [];
      
      for (const prUrl of this.config.prUrls) {
        const prResult = await this.testSinglePR(testRunId, prUrl);
        prResults.push(prResult);
      }
      
      // 4. Aggregate results
      const aggregatedResults = this.aggregateResults(prResults);
      
      // 5. Get cost summary
      const costSummary = this.config.trackCosts ? 
        this.costTracker.getSummary() : 
        { totalCost: 0 };
      
      // 6. Store aggregated results
      console.log("Storing aggregated results");
      
      // 7. Generate report
      if (this.config.generateReport) {
        await this.reportGenerator.generateReport(
          testRunId,
          aggregatedResults,
          costSummary
        );
      }
      
      // 8. Update test run status
      console.log("Test run status: completed");
      
      return testRunId;
    } catch (error) {
      console.error('Error running agent test:', error);
      throw error;
    }
  }
  
  /**
   * Test a single PR with all configurations
   * @param testRunId Test run ID
   * @param prUrl PR URL
   * @returns PR test result
   */
  private async testSinglePR(testRunId: string, prUrl: string): Promise<any> {
    console.log(`Testing PR: ${prUrl}`);
    
    const configResults = [];
    
    // 1. For each agent configuration
    for (const configData of this.config.agentConfigurations) {
      const { name, selection } = configData as { name: string; selection: AgentSelection };
      console.log(`Testing configuration: ${name}`);
      
      const configResult = {
        configName: name,
        roleResults: {} as Record<AgentRole, AnalysisResult>,
        metrics: {} as Record<string, any>,
        timing: {} as Record<string, number>
      };
      
      // 2. Create orchestrator to fetch PR data
      const orchestratorStartTime = Date.now();
      const orchestrator = AgentFactory.createAgent(
        AgentRole.ORCHESTRATOR,
        selection[AgentRole.ORCHESTRATOR],
        {}
      );
      
      // 3. Fetch PR data
      const prData = await orchestrator.analyze({ url: prUrl });
      const orchestratorEndTime = Date.now();
      
      configResult.timing[AgentRole.ORCHESTRATOR] = orchestratorEndTime - orchestratorStartTime;
      
      // Track cost if enabled
      if (this.config.trackCosts) {
        this.costTracker.trackCall(
          selection[AgentRole.ORCHESTRATOR],
          AgentRole.ORCHESTRATOR,
          name,
          this.estimateTokenCount(JSON.stringify({ url: prUrl })),
          this.estimateTokenCount(JSON.stringify(prData))
        );
      }
      
      // 4. For each role, run analysis
      for (const role of Object.values(AgentRole)) {
        if (role === AgentRole.ORCHESTRATOR) continue; // Skip orchestrator, already done
        
        // Create agent for this role
        const roleStartTime = Date.now();
        const agent = AgentFactory.createAgent(role, selection[role], {});
        
        // Analyze PR
        const analysisResult = await agent.analyze(prData);
        const roleEndTime = Date.now();
        
        configResult.roleResults[role] = analysisResult;
        configResult.timing[role] = roleEndTime - roleStartTime;
        
        // Track cost if enabled
        if (this.config.trackCosts) {
          this.costTracker.trackCall(
            selection[role],
            role,
            name,
            this.estimateTokenCount(JSON.stringify(prData)),
            this.estimateTokenCount(JSON.stringify(analysisResult))
          );
        }
        
        // Store result in database
        console.log(`Storing test result for ${prUrl}, ${name}, ${role}`);
      }
      
      // 5. Calculate metrics for this configuration
      configResult.metrics = this.metricsCalculator.calculateMetrics(configResult.roleResults);
      
      configResults.push(configResult);
    }
    
    return {
      prUrl,
      results: configResults
    };
  }
  
  /**
   * Aggregate results across all PRs
   * @param prResults PR test results
   * @returns Aggregated results
   */
  private aggregateResults(prResults: Array<{
    prUrl: string;
    results: Array<{
      configName: string;
      roleResults: Record<string, AnalysisResult>;
      metrics: Record<string, number>;
      timing: Record<string, number>;
    }>;
  }>): Record<string, unknown> {
    // Initialize aggregated results
    const aggregated = {
      configurations: {} as Record<string, any>,
      roles: {} as Record<string, any>,
      metrics: {} as Record<string, any>,
      winners: {} as Record<string, string>
    };
    
    // Process configuration results
    for (const prResult of prResults) {
      for (const config of prResult.results) {
        const configName = config.configName;
        
        // Initialize configuration in aggregated results if needed
        if (!aggregated.configurations[configName]) {
          aggregated.configurations[configName] = {
            totalTime: 0,
            roleTimes: {} as Record<string, number>,
            metrics: {} as Record<string, number>
          };
        }
        
        // Add timing information
        for (const [role, time] of Object.entries(config.timing)) {
          aggregated.configurations[configName].totalTime += time as number;
          aggregated.configurations[configName].roleTimes[role] = 
            (aggregated.configurations[configName].roleTimes[role] || 0) + (time as number);
        }
        
        // Add metrics
        for (const [metric, value] of Object.entries(config.metrics)) {
          if (typeof value === 'number') {
            aggregated.configurations[configName].metrics[metric] = 
              (aggregated.configurations[configName].metrics[metric] || 0) + value;
          }
        }
        
        // Process per-role results
        for (const [role, result] of Object.entries(config.roleResults)) {
          const analysisResult = result as AnalysisResult;
          // Initialize role in aggregated results if needed
          if (!aggregated.roles[role]) {
            aggregated.roles[role] = {
              configurations: {} as Record<string, any>
            };
          }
          
          // Initialize configuration in role results if needed
          if (!aggregated.roles[role].configurations[configName]) {
            aggregated.roles[role].configurations[configName] = {
              insightCount: 0,
              suggestionCount: 0,
              educationalCount: 0,
              totalTime: 0
            };
          }
          
          // Add results
          const roleConfig = aggregated.roles[role].configurations[configName];
          roleConfig.insightCount += (analysisResult.insights || []).length;
          roleConfig.suggestionCount += (analysisResult.suggestions || []).length;
          roleConfig.educationalCount += (analysisResult.educational || []).length;
          roleConfig.totalTime += config.timing[role] as number;
        }
      }
    }
    
    // Calculate averages
    for (const [configName, configData] of Object.entries(aggregated.configurations)) {
      const prCount = prResults.length;
      
      // Average times
      configData.totalTime /= prCount;
      for (const role of Object.keys(configData.roleTimes)) {
        configData.roleTimes[role] /= prCount;
      }
      
      // Average metrics
      for (const metric of Object.keys(configData.metrics)) {
        configData.metrics[metric] /= prCount;
      }
    }
    
    // Determine winners for each category
    this.determineWinners(aggregated);
    
    return aggregated;
  }
  
  /**
   * Determine winners for each category
   * @param aggregated Aggregated results
   */
  private determineWinners(aggregated: {
    configurations: Record<string, {
      totalTime: number;
      roleTimes: Record<string, number>;
      metrics: Record<string, number>;
    }>;
    roles: Record<string, {
      configurations: Record<string, {
        insightCount: number;
        suggestionCount: number;
        educationalCount: number;
        totalTime: number;
      }>;
    }>;
    metrics: Record<string, unknown>;
    winners: Record<string, string>;
  }): void {
    // 1. Overall performance (weighted score)
    const overallScores: Record<string, number> = {};
    
    for (const [configName, configData] of Object.entries(aggregated.configurations)) {
      // Simple weighted score example
      overallScores[configName] = 
        (configData.metrics.issueDetectionRate || 0) * 0.4 +
        (1 - (configData.metrics.falsePositiveRate || 0)) * 0.2 +
        (configData.metrics.explanationQuality || 0) * 0.2 +
        (configData.metrics.educationalValue || 0) * 0.2;
    }
    
    // Find config with highest score
    let bestOverallConfig = '';
    let bestOverallScore = -1;
    
    for (const [configName, score] of Object.entries(overallScores)) {
      if (score > bestOverallScore) {
        bestOverallScore = score;
        bestOverallConfig = configName;
      }
    }
    
    aggregated.winners.overall = bestOverallConfig;
    
    // 2. Best for each role
    for (const role of Object.keys(aggregated.roles)) {
      let bestConfig = '';
      let bestScore = -1;
      
      for (const [configName, configData] of Object.entries(aggregated.roles[role].configurations)) {
        // Simple score based on insights and suggestions count, adjusted by time
        const timeAdjustmentFactor = 1000 / Math.max(1, configData.totalTime);
        const score = (configData.insightCount + configData.suggestionCount) * timeAdjustmentFactor;
        
        if (score > bestScore) {
          bestScore = score;
          bestConfig = configName;
        }
      }
      
      aggregated.winners[role] = bestConfig;
    }
    
    // 3. Best value for money (if tracking costs)
    if (this.config.trackCosts) {
      const costSummary = this.costTracker.getSummary();
      const costPerConfig: Record<string, number> = {};
      
      for (const [configName, configData] of Object.entries(aggregated.configurations)) {
        const configCost = costSummary.costByConfig?.[configName] || 0.01; // Avoid division by zero
        costPerConfig[configName] = overallScores[configName] / configCost;
      }
      
      // Find config with best value
      let bestValueConfig = '';
      let bestValueScore = -1;
      
      for (const [configName, score] of Object.entries(costPerConfig)) {
        if (score > bestValueScore) {
          bestValueScore = score;
          bestValueConfig = configName;
        }
      }
      
      aggregated.winners.bestValue = bestValueConfig;
    }
  }
  
  /**
   * Estimate token count for a string
   * @param text Text to estimate
   * @returns Estimated token count
   */
  private estimateTokenCount(text: string): number {
    // Simple estimation: approximately 4 characters per token
    return Math.ceil(text.length / 4);
  }
}