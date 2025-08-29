/**
 * MCP Tool Adapter
 * Bridges the Two-Branch system with the MCP-hybrid tool execution
 */

import { ParallelToolExecutor as MCPExecutor } from '@codequal/mcp-hybrid/dist/integration/parallel-tool-executor';
import { ToolRegistry } from '@codequal/mcp-hybrid/dist/core/registry';
import { IndividualToolResponse } from '../types/mcp-types';
import { ToolName } from '../types';
import { logger } from '../utils/logger';

// Import actual tool adapters
import { ESLintDirectAdapter } from '@codequal/mcp-hybrid/dist/adapters/direct/eslint-direct';
import { SonarJSDirectAdapter } from '@codequal/mcp-hybrid/dist/adapters/direct/sonarjs-direct';
import { NpmAuditDirectAdapter } from '@codequal/mcp-hybrid/dist/adapters/direct/npm-audit-direct';
import { MadgeDirectAdapter } from '@codequal/mcp-hybrid/dist/adapters/direct/madge-direct';
import { DependencyCruiserDirectAdapter } from '@codequal/mcp-hybrid/dist/adapters/direct/dependency-cruiser-direct';
import { SemgrepMCPAdapter } from '@codequal/mcp-hybrid/dist/adapters/mcp/semgrep-mcp';
import { SerenaMCPAdapter } from '@codequal/mcp-hybrid/dist/adapters/mcp/serena-mcp';

export class MCPToolAdapter {
  private executor: MCPExecutor;
  private registry: ToolRegistry;
  private toolsInitialized = false;

  constructor() {
    this.executor = new MCPExecutor();
    this.registry = new ToolRegistry();
  }

  /**
   * Initialize and register all available tools
   */
  private async initializeTools(): Promise<void> {
    if (this.toolsInitialized) return;

    try {
      // Register direct adapters
      this.registry.register(new ESLintDirectAdapter());
      this.registry.register(new SonarJSDirectAdapter());
      this.registry.register(new NpmAuditDirectAdapter());
      this.registry.register(new MadgeDirectAdapter());
      this.registry.register(new DependencyCruiserDirectAdapter());
      
      // Register MCP adapters
      this.registry.register(new SemgrepMCPAdapter());
      this.registry.register(new SerenaMCPAdapter());

      this.toolsInitialized = true;
      logger.info('✅ MCP tools initialized and registered');
    } catch (error) {
      logger.error('Failed to initialize MCP tools:', error);
      throw error;
    }
  }

  /**
   * Run multiple tools in parallel
   */
  async runTools(
    repoPath: string,
    tools: ToolName[],
    options?: {
      timeout?: number;
      continueOnError?: boolean;
      baseBranch?: string;
      prBranch?: string;
    }
  ): Promise<IndividualToolResponse[]> {
    await this.initializeTools();

    const results: IndividualToolResponse[] = [];
    
    try {
      // Get changed files if branches are provided
      let changedFiles: any[] = [];
      if (options?.baseBranch && options?.prBranch) {
        changedFiles = await this.executor.extractChangedFiles(
          repoPath,
          options.baseBranch,
          options.prBranch
        );
      }

      // Create execution context
      const context = {
        repository: repoPath,
        branch: options?.prBranch || 'main',
        changedFiles,
        language: 'typescript', // TODO: Detect from repo
        filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']
      };

      // Execute tools based on their role mappings
      const toolsToRun = tools.filter(tool => 
        this.registry.hasTool(tool as string)
      );

      // For now, run tools sequentially with basic execution
      // TODO: Implement proper parallel execution with ToolExecutionPlan
      for (const toolName of toolsToRun) {
        try {
          const tool = this.registry.getTool(toolName as string);
          if (!tool) {
            logger.warn(`Tool ${toolName} not found in registry`);
            continue;
          }

          const startTime = Date.now();
          const result = await tool.analyze(context as any);
          
          results.push({
            tool: toolName as string,
            success: result.success,
            results: result.findings,
            executionTime: Date.now() - startTime
          });
        } catch (error) {
          logger.error(`Tool ${toolName} failed:`, error);
          if (!options?.continueOnError) throw error;
          
          results.push({
            tool: toolName as string,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            results: []
          });
        }
      }
    } catch (error) {
      logger.error('Tool execution failed:', error);
      throw error;
    }

    return results;
  }

  /**
   * Run a single tool
   */
  async runTool(
    tool: ToolName,
    repoPath: string,
    options?: { timeout?: number }
  ): Promise<IndividualToolResponse> {
    const results = await this.runTools(repoPath, [tool], {
      timeout: options?.timeout,
      continueOnError: false
    });
    
    return results[0] || {
      tool: tool as string,
      success: false,
      error: 'Tool execution failed',
      results: []
    };
  }

  /**
   * Get available tools for a specific role
   */
  getToolsForRole(role: 'security' | 'codeQuality' | 'architecture' | 'performance' | 'dependency'): string[] {
    const tools = this.registry.getToolsForRole(role as any);
    return tools.map(tool => tool.id);
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(tool: ToolName): boolean {
    return this.registry.hasTool(tool as string);
  }
}