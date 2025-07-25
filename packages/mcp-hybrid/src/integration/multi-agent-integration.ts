/**
 * Integration module for enhancing existing CodeQual multi-agent executor
 * Adds tool capabilities without modifying core executor logic
 */

import { toolRegistry } from '../core/registry';
import { toolManager } from '../core/tool-manager';
import { agentToolService } from './tool-aware-agent';
import { AnalysisContext, AgentRole } from '../core/interfaces';
import { logging } from '@codequal/core';

// Type definitions for multi-agent system
export interface AgentConfig {
  role: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: unknown;
}

export interface AgentData {
  repositoryUrl?: string;
  prNumber?: number;
  files?: Array<{
    path: string;
    content?: string;
    diff?: string;
  }>;
  [key: string]: unknown;
}

export interface Agent {
  analyze(data: AgentData): Promise<unknown>;
  [key: string]: unknown;
}

export interface MultiAgentExecutor {
  createAgent(agentConfig: AgentConfig, name: string): Promise<Agent>;
  [key: string]: unknown;
}

/**
 * Configuration for multi-agent tool integration
 */
export interface MultiAgentToolConfig {
  /**
   * Enable tools for agents
   */
  enableTools: boolean;
  
  /**
   * Tool execution timeout
   */
  toolTimeout?: number;
  
  /**
   * Maximum parallel tool executions per agent
   */
  maxParallelToolsPerAgent?: number;
  
  /**
   * Roles to skip tool enhancement
   */
  skipToolsForRoles?: string[];
}

/**
 * Enhances the existing MultiAgentExecutor with tool capabilities
 */
export class MultiAgentToolIntegration {
  private logger = logging.createLogger('MultiAgentToolIntegration');
  private config: MultiAgentToolConfig;
  
  constructor(config: MultiAgentToolConfig = { enableTools: true }) {
    this.config = config;
  }
  
  /**
   * Enhance the multi-agent executor's createAgent method
   * This wraps agents with tool capabilities
   */
  enhanceExecutor(executor: MultiAgentExecutor): void {
    const originalCreateAgent = executor.createAgent.bind(executor);
    
    // Override createAgent method
    executor.createAgent = async (agentConfig: AgentConfig, name: string) => {
      // Create agent using original method
      const agent = await originalCreateAgent(agentConfig, name);
      
      // All agents get tool enhancement
      // agentContexts includes dependencies and scoring for each role
      
      // Skip if tools are disabled
      if (!this.config.enableTools) {
        return agent;
      }
      
      // Enhance agent with tool capabilities
      return this.wrapAgentWithTools(agent, agentConfig, name);
    };
    
    // Add tool result collection method
    executor.collectToolResults = () => {
      return this.toolResults;
    };
    
    this.logger.info('Multi-agent executor enhanced with tool capabilities');
  }
  
  /**
   * Storage for tool results across all agents
   */
  private toolResults = new Map<string, unknown>();
  
  /**
   * Wrap an agent with tool execution capabilities
   */
  private wrapAgentWithTools(agent: Agent, agentConfig: AgentConfig, name: string): Agent {
    const originalAnalyze = agent.analyze.bind(agent);
    
    // Create enhanced analyze method
    agent.analyze = async (data: AgentData) => {
      this.logger.info(`Running tools FIRST for ${name} (${agentConfig.role})`);
      
      try {
        // Step 1: Create analysis context from data
        const context = this.createAnalysisContext(agentConfig, data);
        
        // Step 2: Run tools FIRST to get concrete findings
        const toolResults = await agentToolService.runToolsForRole(
          agentConfig.role as AgentRole,
          context,
          {
            timeout: this.config.toolTimeout,
            maxParallel: this.config.maxParallelToolsPerAgent
          }
        );
        
        this.logger.info(`Tools completed for ${name}: ${toolResults.toolsExecuted.length} tools, ${toolResults.findings.length} findings`);
        
        // Store tool results
        this.toolResults.set(name, toolResults);
        
        // Step 3: Prepare enhanced data with tool results and agent context
        const enhancedData = {
          ...data,
          // Tool results come first
          toolAnalysis: {
            findings: toolResults.findings,
            metrics: toolResults.metrics,
            summary: agentToolService.formatToolResultsForPrompt(toolResults, agentConfig.role as AgentRole),
            toolsExecuted: toolResults.toolsExecuted,
            executionTime: toolResults.executionTime
          },
          // Agent context from Vector DB (includes dependencies and scoring)
          agentContext: data.agentContext || data.vectorDBConfig,
          // Role-specific focus areas
          focusAreas: agentConfig.focusAreas || data.focusAreas
        };
        
        // Step 4: Agent analyzes based on tool results and context
        this.logger.info(`${name} analyzing with tool results and context`);
        const result = await originalAnalyze(enhancedData);
        
        // Agent result is a compiled report, not raw tool findings
        // Add metadata about tool usage
        if (result && typeof result === 'object') {
          (result as any).metadata = {
            ...(result as any).metadata,
            toolsUsed: toolResults.toolsExecuted,
            toolFindingsCount: toolResults.findings.length,
            toolExecutionTime: toolResults.executionTime
          };
        }
        
        return result;
      } catch (error) {
        this.logger.error(`Tool execution failed for ${name}:`, error as Error);
        
        // Fall back to original analysis without tools
        return originalAnalyze(data);
      }
    };
    
    return agent;
  }
  
  /**
   * Create analysis context from agent data
   */
  private createAnalysisContext(agentConfig: AgentConfig, data: AgentData): AnalysisContext {
    // Extract PR information from data
    const pr: any = data.pull_request || data.pr || {};
    const repo: any = data.repository || data.repo || {};
    const files: any[] = data.files || pr.files || [];
    
    return {
      agentRole: agentConfig.role as AgentRole,
      pr: {
        prNumber: pr.number || data.prNumber || 0,
        title: pr.title || data.title || '',
        description: pr.body || data.description || '',
        baseBranch: pr.base?.ref || data.baseBranch || 'main',
        targetBranch: pr.head?.ref || data.targetBranch || 'feature',
        author: pr.user?.login || data.author || '',
        files: files.map((f) => ({
          path: f.filename || f.path,
          content: f.content || '',
          changeType: f.status === 'removed' ? 'deleted' : 
                      f.status === 'added' ? 'added' : 'modified',
          diff: f.patch || f.diff
        })),
        commits: (data.commits || []) as Array<{ sha: string; message: string; author: string }>
      },
      repository: {
        name: repo.name || data.repoName || '',
        owner: repo.owner?.login || data.owner || '',
        languages: this.detectLanguages(files),
        frameworks: this.detectFrameworks(files),
        primaryLanguage: data.primaryLanguage as string | undefined
      },
      userContext: {
        userId: (data.userId || 'unknown') as string,
        organizationId: data.organizationId as string | undefined,
        permissions: (data.permissions || ['read', 'write']) as string[]
      },
      vectorDBConfig: (data.vectorDBConfig || data.specializedContext) as any
    };
  }
  
  /**
   * Detect languages from files
   */
  private detectLanguages(files: AgentData['files']): string[] {
    const languages = new Set<string>();
    
    files?.forEach((file) => {
      const ext = ((file as any).filename || file.path || '').split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'js':
        case 'jsx':
          languages.add('javascript');
          break;
        case 'ts':
        case 'tsx':
          languages.add('typescript');
          break;
        case 'py':
          languages.add('python');
          break;
        case 'java':
          languages.add('java');
          break;
        case 'go':
          languages.add('go');
          break;
        case 'rs':
          languages.add('rust');
          break;
      }
    });
    
    return Array.from(languages);
  }
  
  /**
   * Detect frameworks from files
   */
  private detectFrameworks(files: AgentData['files']): string[] {
    const frameworks = new Set<string>();
    
    files?.forEach((file) => {
      const content = file.content || '';
      const filename = (file as any).filename || file.path || '';
      
      // React detection
      if (content.includes('import React') || content.includes('from "react"')) {
        frameworks.add('react');
      }
      
      // Vue detection
      if (filename.endsWith('.vue') || content.includes('Vue.')) {
        frameworks.add('vue');
      }
      
      // Angular detection
      if (content.includes('@angular/') || content.includes('ng-')) {
        frameworks.add('angular');
      }
      
      // Express detection
      if (content.includes('express()') || content.includes('require("express")')) {
        frameworks.add('express');
      }
      
      // Django detection
      if (content.includes('django.') || filename.includes('manage.py')) {
        frameworks.add('django');
      }
    });
    
    return Array.from(frameworks);
  }
  
  /**
   * Get tool results for all agents
   */
  getToolResults(): Map<string, unknown> {
    return new Map(this.toolResults);
  }
  
  /**
   * Clear tool results
   */
  clearToolResults(): void {
    this.toolResults.clear();
  }
}

/**
 * Factory function to create enhanced executor
 */
export function createToolEnhancedExecutor<T extends new (...args: any[]) => MultiAgentExecutor>(
  ExecutorClass: T,
  config?: MultiAgentToolConfig
): T {
  return class ToolEnhancedExecutor extends ExecutorClass {
    private toolIntegration: MultiAgentToolIntegration;
    
    constructor(...args: any[]) {
      super(...args);
      
      // Create tool integration
      this.toolIntegration = new MultiAgentToolIntegration(config);
      
      // Enhance this executor instance
      this.toolIntegration.enhanceExecutor(this);
    }
    
    /**
     * Get tool results after execution
     */
    getToolResults() {
      return this.toolIntegration.getToolResults();
    }
    
    /**
     * Clear tool results
     */
    clearToolResults() {
      this.toolIntegration.clearToolResults();
    }
  };
}

/**
 * Integration helper for existing code
 */
export class MCPHybridIntegration {
  private static logger = logging.createLogger('MCPHybridIntegration');
  
  /**
   * Initialize MCP Hybrid system
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize tool manager
      await toolManager.initialize();
      
      // Register all tool adapters
      await this.registerAllAdapters();
      
      this.logger.info('MCP Hybrid system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MCP Hybrid:', error as Error);
      throw error;
    }
  }
  
  /**
   * Register all available tool adapters
   */
  private static async registerAllAdapters(): Promise<void> {
    // Import and register adapters
    const { mcpScanAdapter } = await import('../adapters/mcp/mcp-scan');
    const { eslintMCPAdapter } = await import('../adapters/mcp/eslint-mcp');
    const { contextMCPAdapter } = await import('../adapters/mcp/context-mcp');
    const { chartJSMCPAdapter } = await import('../adapters/mcp/chartjs-mcp');
    const { prettierDirectAdapter, dependencyCruiserDirectAdapter } = await import('../adapters/direct/base-adapter');
    
    // Register with tool registry
    toolRegistry.register(mcpScanAdapter);
    toolRegistry.register(eslintMCPAdapter);
    toolRegistry.register(contextMCPAdapter);
    toolRegistry.register(chartJSMCPAdapter);
    toolRegistry.register(prettierDirectAdapter);
    toolRegistry.register(dependencyCruiserDirectAdapter);
    
    this.logger.info(`Registered ${toolRegistry.getAllTools().length} tool adapters`);
  }
  
  /**
   * Shutdown MCP Hybrid system
   */
  static async shutdown(): Promise<void> {
    await toolManager.shutdown();
    this.logger.info('MCP Hybrid system shut down');
  }
}
