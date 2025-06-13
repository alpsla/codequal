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
    // This command will be executed in the DeepWiki pod
    // It needs to invoke the tool runner with the appropriate configuration
    
    const toolConfig = {
      repositoryPath: config.repositoryPath,
      enabledTools: config.enabledTools,
      timeout: config.timeout || 60000
    };
    
    // Create a Node.js script that runs the tools
    // In production, this would invoke the actual tool runner service
    const script = `
      const { ToolRunnerService } = require('./tool-runner.service');
      const logger = { 
        info: console.log, 
        warn: console.warn, 
        error: console.error 
      };
      
      const runner = new ToolRunnerService(logger);
      const config = ${JSON.stringify(toolConfig)};
      
      runner.runTools(config)
        .then(results => {
          console.log(JSON.stringify({ success: true, results }));
        })
        .catch(error => {
          console.log(JSON.stringify({ success: false, error: error.message }));
        });
    `;
    
    // Execute via node
    return `node -e '${script.replace(/'/g, "\\'")}'`;
  }
  
  /**
   * Parse tool output
   */
  private parseToolOutput(output: string): Record<string, ToolExecutionResult> {
    try {
      const parsed = JSON.parse(output);
      
      if (parsed.success && parsed.results) {
        return parsed.results;
      } else {
        return {
          error: {
            toolId: 'tool-runner',
            success: false,
            error: parsed.error || 'Unknown error',
            executionTime: 0
          }
        };
      }
    } catch (error) {
      return {
        error: {
          toolId: 'tool-runner',
          success: false,
          error: 'Failed to parse tool output',
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
