/**
 * MCP Tool Integration for Existing Agents
 * Enhances CodeQual agents with tool capabilities without breaking existing architecture
 */

import { Tool, ToolResult, AnalysisContext, ConsolidatedToolResults } from '../core/interfaces';
import { toolRegistry } from '../core/registry';
import { toolManager } from '../core/tool-manager';
import { toolExecutor } from '../core/executor';
import type { Agent, AnalysisResult } from '@codequal/core';
import { logging } from '@codequal/core';

/**
 * Interface for tool-enhanced agents
 */
export interface ToolEnhancedAgent extends Agent {
  /**
   * Set tools for this agent
   */
  setTools(tools: Tool[]): void;
  
  /**
   * Get tool results from last analysis
   */
  getToolResults(): ConsolidatedToolResults | null;
  
  /**
   * Enable/disable tool usage
   */
  setToolsEnabled(enabled: boolean): void;
}

/**
 * Configuration for agent enhancement
 */
export interface AgentEnhancementConfig {
  /**
   * Enable tools by default
   */
  enableTools?: boolean;
  
  /**
   * Tool execution strategy
   */
  executionStrategy?: 'parallel-all' | 'parallel-by-role' | 'sequential';
  
  /**
   * Maximum parallel tool executions
   */
  maxParallelTools?: number;
  
  /**
   * Tool timeout in milliseconds
   */
  toolTimeout?: number;
}

/**
 * Enhances existing agents with MCP tool capabilities
 */
export class AgentToolEnhancer {
  private static logger = logging.createLogger('AgentToolEnhancer');
  
  /**
   * Enhance an existing agent with tool capabilities
   * @param agent The agent to enhance
   * @param role The agent's role
   * @param config Enhancement configuration
   * @returns Enhanced agent with tool capabilities
   */
  static async enhanceAgent(
    agent: Agent,
    role: string,
    config: AgentEnhancementConfig = {}
  ): Promise<ToolEnhancedAgent> {
    // Get tools for this role
    const tools = await toolRegistry.getToolsForRole(role as any);
    
    // Create enhanced agent wrapper
    return new ToolEnhancedAgentWrapper(agent, role, tools, config);
  }
  
  /**
   * Create an analysis context from PR data
   * @param prData PR data from orchestrator
   * @param agentRole Agent role
   * @param userId User ID
   * @returns Analysis context for tools
   */
  static createAnalysisContext(
    prData: any,
    agentRole: string,
    userId: string
  ): AnalysisContext {
    // Extract PR information
    const files = prData.files || [];
    const prNumber = prData.pull_request?.number || prData.prNumber || 0;
    const title = prData.pull_request?.title || prData.title || '';
    const description = prData.pull_request?.body || prData.description || '';
    const author = prData.pull_request?.user?.login || prData.author || '';
    
    // Detect languages and frameworks from files
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    
    files.forEach((file: any) => {
      // Detect language from file extension
      const ext = file.filename?.split('.').pop()?.toLowerCase();
      if (ext) {
        switch (ext) {
          case 'js':
          case 'jsx':
            languages.add('javascript');
            if (file.content?.includes('React')) frameworks.add('react');
            break;
          case 'ts':
          case 'tsx':
            languages.add('typescript');
            if (file.content?.includes('React')) frameworks.add('react');
            break;
          case 'py':
            languages.add('python');
            if (file.content?.includes('django')) frameworks.add('django');
            if (file.content?.includes('flask')) frameworks.add('flask');
            break;
          case 'java':
            languages.add('java');
            if (file.content?.includes('springframework')) frameworks.add('spring');
            break;
          case 'go':
            languages.add('go');
            break;
          case 'rs':
            languages.add('rust');
            break;
          case 'vue':
            languages.add('javascript');
            frameworks.add('vue');
            break;
        }
      }
    });
    
    // Determine primary language
    const langArray = Array.from(languages);
    const primaryLanguage = langArray.length > 0 ? langArray[0] : undefined;
    
    return {
      agentRole: agentRole as any,
      pr: {
        prNumber,
        title,
        description,
        baseBranch: prData.base?.ref || 'main',
        targetBranch: prData.head?.ref || 'feature',
        author,
        files: files.map((f: any) => ({
          path: f.filename || f.path,
          content: f.content || '',
          language: f.language,
          changeType: f.status === 'removed' ? 'deleted' : 
                      f.status === 'added' ? 'added' : 'modified',
          diff: f.patch || f.diff
        })),
        commits: prData.commits || []
      },
      repository: {
        name: prData.repository?.name || prData.repo || '',
        owner: prData.repository?.owner?.login || prData.owner || '',
        languages: langArray,
        frameworks: Array.from(frameworks),
        primaryLanguage
      },
      userContext: {
        userId,
        organizationId: prData.organization?.id,
        permissions: prData.permissions || ['read', 'write']
      },
      vectorDBConfig: prData.vectorDBConfig
    };
  }
}

/**
 * Wrapper that adds tool capabilities to existing agents
 */
class ToolEnhancedAgentWrapper implements ToolEnhancedAgent {
  private tools: Tool[] = [];
  private toolsEnabled: boolean;
  private lastToolResults: ConsolidatedToolResults | null = null;
  private logger = logging.createLogger('ToolEnhancedAgent');
  
  constructor(
    private agent: Agent,
    private role: string,
    tools: Tool[],
    private config: AgentEnhancementConfig
  ) {
    this.tools = tools;
    this.toolsEnabled = config.enableTools !== false;
  }
  
  /**
   * Set tools for this agent
   */
  setTools(tools: Tool[]): void {
    this.tools = tools;
  }
  
  /**
   * Get tool results from last analysis
   */
  getToolResults(): ConsolidatedToolResults | null {
    return this.lastToolResults;
  }
  
  /**
   * Enable/disable tool usage
   */
  setToolsEnabled(enabled: boolean): void {
    this.toolsEnabled = enabled;
  }
  
  /**
   * Enhanced analyze method that runs tools first
   */
  async analyze(data: any): Promise<AnalysisResult> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Run tools if enabled
      let toolResults: ConsolidatedToolResults | null = null;
      
      if (this.toolsEnabled && this.tools.length > 0) {
        this.logger.info(`Running ${this.tools.length} tools for ${this.role} agent`);
        
        // Create analysis context from data
        const context = AgentToolEnhancer.createAnalysisContext(
          data,
          this.role,
          data.userId || 'unknown'
        );
        
        // Execute tools
        toolResults = await toolExecutor.executeTools(
          { primary: this.tools, fallback: [], excluded: [] },
          context,
          {
            mode: this.config.executionStrategy || 'parallel-by-role',
            maxConcurrency: this.config.maxParallelTools || 3,
            timeout: this.config.toolTimeout || 30000
          }
        );
        
        this.lastToolResults = toolResults;
        
        // Log tool execution summary
        this.logger.info(`Tool execution complete: ${toolResults.toolsExecuted.length} succeeded, ${toolResults.toolsFailed.length} failed`);
      }
      
      // Enhance data with tool results
      const enhancedData = {
        ...data,
        toolResults: toolResults ? {
          findings: toolResults.findings,
          metrics: toolResults.metrics,
          toolsExecuted: toolResults.toolsExecuted,
          summary: this.summarizeToolResults(toolResults)
        } : null
      };
      
      // Call original agent's analyze method with enhanced data
      const result = await this.agent.analyze(enhancedData);
      
      // Add tool information to metadata
      if (toolResults) {
        result.metadata = {
          ...result.metadata,
          toolsUsed: toolResults.toolsExecuted,
          toolExecutionTime: toolResults.executionTime,
          toolFindings: toolResults.findings.length
        };
      }
      
      return result;
    } catch (error) {
      this.logger.error('Error in tool-enhanced analysis:', error as Error);
      // Fall back to original agent without tools
      return this.agent.analyze(data);
    }
  }
  
  /**
   * Summarize tool results for agent context
   */
  private summarizeToolResults(results: ConsolidatedToolResults): string {
    const summary: string[] = [];
    
    // Group findings by severity
    const bySeverity = new Map<string, number>();
    results.findings.forEach(f => {
      const count = bySeverity.get(f.severity) || 0;
      bySeverity.set(f.severity, count + 1);
    });
    
    // Add severity summary
    if (bySeverity.size > 0) {
      summary.push('Tool Findings by Severity:');
      bySeverity.forEach((count, severity) => {
        summary.push(`- ${severity}: ${count} issues`);
      });
    }
    
    // Group findings by category
    const byCategory = new Map<string, number>();
    results.findings.forEach(f => {
      const count = byCategory.get(f.category) || 0;
      byCategory.set(f.category, count + 1);
    });
    
    // Add category summary
    if (byCategory.size > 0) {
      summary.push('\nTool Findings by Category:');
      byCategory.forEach((count, category) => {
        summary.push(`- ${category}: ${count} issues`);
      });
    }
    
    // Add metrics summary
    if (Object.keys(results.metrics).length > 0) {
      summary.push('\nKey Metrics:');
      Object.entries(results.metrics).forEach(([key, value]) => {
        summary.push(`- ${key}: ${value}`);
      });
    }
    
    // Add tool execution summary
    summary.push(`\nTools Executed: ${results.toolsExecuted.join(', ')}`);
    if (results.toolsFailed.length > 0) {
      summary.push(`Tools Failed: ${results.toolsFailed.map(f => f.toolId).join(', ')}`);
    }
    
    return summary.join('\n');
  }
}

/**
 * Integration with Multi-Agent Executor
 * This modifies the executor to use tool-enhanced agents
 */
export class ToolIntegratedMultiAgentExecutor {
  private logger = logging.createLogger('ToolIntegratedExecutor');
  
  /**
   * Enhance the multi-agent executor with tool capabilities
   * @param executor Original executor
   * @param config Tool configuration
   */
  static enhance(executor: any, config: AgentEnhancementConfig = {}): any {
    // Store original createAgent method
    const originalCreateAgent = executor.createAgent;
    
    // Override createAgent to add tool enhancement
    executor.createAgent = async function(agentConfig: any, name: string) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Create agent using original method
      const agent = await originalCreateAgent.call(this, agentConfig, name);
      
      // Enhance with tools if not a special agent
      const specialAgents = ['orchestrator', 'reporter', 'repository-provider'];
      if (!specialAgents.includes(name)) {
        const enhancedAgent = await AgentToolEnhancer.enhanceAgent(
          agent,
          agentConfig.role,
          config
        );
        
        return enhancedAgent;
      }
      
      return agent;
    };
    
    return executor;
  }
}

/**
 * Export convenience function for integration
 */
export async function integrateToolsWithAgent(
  agent: Agent,
  role: string,
  config?: AgentEnhancementConfig
): Promise<ToolEnhancedAgent> {
  return AgentToolEnhancer.enhanceAgent(agent, role, config);
}
