/**
 * Base Cloud Agent
 * Abstract base class for agents that communicate with cloud analysis service
 */

import { CloudAnalysisClient } from '../services/CloudAnalysisClient';

export interface AgentAnalysisResult {
  tool: string;
  status: 'success' | 'failure' | 'timeout';
  issues: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    file?: string;
    line?: number;
    message: string;
    rule?: string;
  }>;
  metrics?: Record<string, any>;
  executionTime?: number;
  cached?: boolean;
}

export abstract class BaseCloudAgent {
  protected client: CloudAnalysisClient;
  protected name: string;
  protected tools: string[];

  constructor(
    name: string,
    tools: string[],
    cloudUrl?: string,
    redisUrl?: string
  ) {
    this.name = name;
    this.tools = tools;
    this.client = new CloudAnalysisClient(cloudUrl, redisUrl);
  }

  /**
   * Analyze repository with all agent's tools
   */
  async analyzeRepository(
    repository: string,
    branch?: string,
    prNumber?: number
  ): Promise<AgentAnalysisResult[]> {
    console.log(`[${this.name}] Starting analysis of ${repository}`);
    
    // Check cloud service health
    const isHealthy = await this.client.healthCheck();
    if (!isHealthy) {
      console.warn(`[${this.name}] Cloud service is not healthy, using fallback`);
      return this.fallbackAnalysis(repository);
    }

    // Run all tools in parallel
    const results = await this.client.batchAnalyze(
      repository,
      this.tools,
      { branch, prNumber }
    );

    // Transform results to agent format
    const agentResults: AgentAnalysisResult[] = [];
    for (const [tool, result] of results) {
      if (result.status === 'completed' && result.results) {
        agentResults.push(
          this.transformResults(tool, result.results, result.cached || false)
        );
      } else if (result.status === 'failed') {
        console.error(`[${this.name}] Tool ${tool} failed:`, result.error);
        agentResults.push({
          tool,
          status: 'failure',
          issues: [],
          cached: false
        });
      }
    }

    return agentResults;
  }

  /**
   * Transform cloud results to agent format
   * Override in specific agents for custom transformation
   */
  protected abstract transformResults(
    tool: string,
    results: any,
    cached: boolean
  ): AgentAnalysisResult;

  /**
   * Fallback analysis when cloud service is unavailable
   * Override in specific agents to provide local alternatives
   */
  protected fallbackAnalysis(repository: string): Promise<AgentAnalysisResult[]> {
    console.warn(`[${this.name}] No fallback analysis implemented`);
    return Promise.resolve([]);
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get supported tools
   */
  getTools(): string[] {
    return this.tools;
  }
}