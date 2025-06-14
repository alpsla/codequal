/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { DeepWikiKubernetesService, DeepWikiAnalysisOptions, DeepWikiAnalysisResult } from '../deepwiki-kubernetes.service';
import { ToolRunnerService, ToolExecutionResult } from './tool-runner.service';
import { Logger } from '../../utils/logger';

/**
 * Extended analysis options that include tool execution
 */
export interface DeepWikiAnalysisWithToolsOptions extends DeepWikiAnalysisOptions {
  /**
   * Enable tool execution alongside DeepWiki analysis
   */
  runTools?: boolean;
  
  /**
   * Specific tools to run (if not specified, all applicable tools will run)
   */
  enabledTools?: string[];
  
  /**
   * Timeout for each tool in milliseconds
   */
  toolTimeout?: number;
}

/**
 * Extended analysis result that includes tool results
 */
export interface DeepWikiAnalysisWithToolsResult extends DeepWikiAnalysisResult {
  /**
   * Tool execution results
   */
  toolResults?: Record<string, ToolExecutionResult>;
}

/**
 * Enhanced DeepWiki Kubernetes Service that includes tool execution
 * This extends the base service to run analysis tools alongside DeepWiki
 */
export class DeepWikiWithToolsService extends DeepWikiKubernetesService {
  private toolRunner: ToolRunnerService;
  
  constructor(logger: Logger, options?: { 
    namespace?: string;
    podName?: string;
    containerName?: string;
  }) {
    super(logger, options);
    this.toolRunner = new ToolRunnerService(logger);
  }
  
  /**
   * Analyze repository with optional tool execution
   */
  async analyzeRepositoryWithTools(
    options: DeepWikiAnalysisWithToolsOptions
  ): Promise<DeepWikiAnalysisWithToolsResult> {
    const logger = (this as any).logger;
    logger.info('Starting repository analysis with tools', {
      repositoryUrl: options.repositoryUrl,
      runTools: options.runTools,
      enabledTools: options.enabledTools
    });
    
    // Run base DeepWiki analysis
    const baseResult = await this.analyzeRepository(options);
    
    // If tools are not enabled or analysis failed, return base result
    if (!options.runTools || baseResult.status !== 'success') {
      return baseResult;
    }
    
    // Prepare tool execution
    const repositoryPath = this.getRepositoryPath(options.repositoryUrl);
    const enabledTools = options.enabledTools || [
      'npm-audit',
      'license-checker',
      'madge',
      'dependency-cruiser',
      'npm-outdated'
    ];
    
    try {
      // Execute tools in the DeepWiki pod
      const toolCommand = this.buildToolCommand({
        repositoryPath,
        enabledTools,
        timeout: options.toolTimeout
      });
      
      const toolOutput = await this.runCommandInPod(
        toolCommand,
        300 // 5 minute timeout for all tools
      );
      
      // Parse tool results
      const toolResults = this.parseToolOutput(toolOutput);
      
      logger.info('Tool execution completed', {
        successfulTools: Object.values(toolResults).filter(r => r.success).length,
        failedTools: Object.values(toolResults).filter(r => !r.success).length
      });
      
      // Return combined result
      return {
        ...baseResult,
        toolResults
      };
    } catch (error) {
      logger.error('Tool execution failed', { error });
      
      // Return base result with tool error noted
      return {
        ...baseResult,
        toolResults: {
          error: {
            toolId: 'tool-runner',
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: 0
          }
        }
      };
    }
  }
  
  /**
   * Build command to execute tools
   */
  private buildToolCommand(config: {
    repositoryPath: string;
    enabledTools: string[];
    timeout?: number;
  }): string {
    // Use the deployed tool-executor.js in the DeepWiki pod
    const toolsString = config.enabledTools.join(',');
    const timeout = config.timeout || 60000;
    
    // Command to execute the tool-executor.js directly
    // This uses the tool-executor.js we deployed to /tools/
    return `cd ${config.repositoryPath} && node /tools/tool-executor.js ${config.repositoryPath} "${toolsString}" ${timeout}`;
  }
  
  /**
   * Parse tool output
   */
  private parseToolOutput(output: string): Record<string, ToolExecutionResult> {
    try {
      // The tool-executor.js outputs format: 
      // {
      //   "timestamp": "...",
      //   "repository": "...",
      //   "totalExecutionTime": 1000,
      //   "results": {
      //     "tool-name": { toolId, success, output, executionTime, metadata }
      //   }
      // }
      
      // Extract JSON from output (skip any console logs before JSON)
      const lines = output.trim().split('\n');
      let jsonLine = '';
      
      // Find the JSON output (starts with '{')
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          jsonLine = line.trim();
          break;
        }
      }
      
      if (!jsonLine) {
        throw new Error('No JSON output found in tool execution');
      }
      
      const parsed = JSON.parse(jsonLine);
      
      if (parsed.results) {
        // Convert the tool results to the expected format
        const toolResults: Record<string, ToolExecutionResult> = {};
        
        for (const [toolId, result] of Object.entries(parsed.results)) {
          const toolResult = result as any;
          toolResults[toolId] = {
            toolId: toolResult.toolId || toolId,
            success: toolResult.success || false,
            output: toolResult.output,
            error: toolResult.error,
            executionTime: toolResult.executionTime || 0,
            metadata: toolResult.metadata
          };
        }
        
        return toolResults;
      } else {
        throw new Error('Invalid tool output format');
      }
    } catch (error) {
      return {
        error: {
          toolId: 'tool-runner',
          success: false,
          error: `Failed to parse tool output: ${error instanceof Error ? error.message : String(error)}`,
          executionTime: 0
        }
      };
    }
  }
  
  /**
   * Get repository path in the DeepWiki pod
   */
  private getRepositoryPath(repositoryUrl: string): string {
    // Extract repository name from URL
    const match = repositoryUrl.match(/\/([^/]+?)(?:\.git)?$/);
    const repoName = match ? match[1] : 'repository';
    
    // DeepWiki clones repositories to /workspace/<repo-name>
    return `/workspace/${repoName}`;
  }
  
  /**
   * Helper to access protected executeCommandInPod from base class
   */
  private async runCommandInPod(command: string, timeout: number): Promise<string> {
    // Access the protected method from base class
    return (this as any).executeCommandInPod(command, timeout);
  }
}
