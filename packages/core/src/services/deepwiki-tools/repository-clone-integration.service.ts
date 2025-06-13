/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { DeepWikiWithToolsService } from './deepwiki-with-tools.service';
import { ToolResultStorageService } from './tool-result-storage.service';
import { VectorStorageService } from '@codequal/database/services/ingestion/vector-storage.service';
import { Logger } from '../../utils/logger';

/**
 * Repository event types
 */
export type RepositoryEventType = 
  | 'push' 
  | 'pull_request' 
  | 'scheduled' 
  | 'manual_trigger';

/**
 * Repository clone event interface
 */
export interface RepositoryCloneEvent {
  /**
   * Event type that triggered the clone
   */
  eventType: RepositoryEventType;
  
  /**
   * Repository URL
   */
  repositoryUrl: string;
  
  /**
   * Branch name (default: main)
   */
  branch?: string;
  
  /**
   * Pull request number (if applicable)
   */
  pullRequestNumber?: number;
  
  /**
   * Commit SHA that triggered the event
   */
  commitSha?: string;
  
  /**
   * User who triggered the event
   */
  triggeredBy?: {
    id: string;
    username: string;
    email?: string;
  };
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Tool execution configuration for repository events
 */
export interface ToolExecutionConfig {
  /**
   * Whether to run tools automatically after clone
   */
  enabled: boolean;
  
  /**
   * Specific tools to run (if not specified, runs all applicable tools)
   */
  enabledTools?: string[];
  
  /**
   * Event types that should trigger tool execution
   */
  triggerEvents: RepositoryEventType[];
  
  /**
   * Whether to run tools only on specific file changes
   */
  filePatterns?: string[];
  
  /**
   * Timeout for tool execution in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to require manual review before storing results
   */
  requireReview?: boolean;
}

/**
 * Service that integrates tool execution with repository clone events
 */
export class RepositoryCloneIntegrationService {
  private deepWikiService: DeepWikiWithToolsService;
  private toolStorageService: ToolResultStorageService;
  private logger: Logger;
  
  /**
   * Default tool execution configuration
   */
  private defaultConfig: ToolExecutionConfig = {
    enabled: true,
    triggerEvents: ['push', 'pull_request', 'scheduled'],
    enabledTools: [
      'npm-audit',
      'license-checker',
      'madge',
      'dependency-cruiser', 
      'npm-outdated'
    ],
    timeout: 300000, // 5 minutes
    requireReview: false
  };
  
  constructor(
    vectorStorageService: VectorStorageService,
    embeddingService: any,
    logger: Logger,
    kubernetesConfig?: {
      namespace?: string;
      podName?: string;
      containerName?: string;
    }
  ) {
    this.logger = logger;
    
    // Initialize services
    this.deepWikiService = new DeepWikiWithToolsService(
      logger,
      kubernetesConfig
    );
    
    this.toolStorageService = new ToolResultStorageService(
      vectorStorageService,
      embeddingService
    );
  }
  
  /**
   * Handle repository clone event with automatic tool execution
   */
  async handleRepositoryCloneEvent(
    event: RepositoryCloneEvent,
    config: Partial<ToolExecutionConfig> = {}
  ): Promise<{
    success: boolean;
    jobId?: string;
    toolResults?: any;
    error?: string;
  }> {
    try {
      this.logger.info('Processing repository clone event', {
        repositoryUrl: event.repositoryUrl,
        eventType: event.eventType,
        branch: event.branch,
        pullRequestNumber: event.pullRequestNumber
      });
      
      // Merge with default configuration
      const executionConfig = { ...this.defaultConfig, ...config };
      
      // Check if tool execution should be triggered for this event
      if (!this.shouldExecuteTools(event, executionConfig)) {
        this.logger.info('Tool execution skipped for event', {
          eventType: event.eventType,
          triggerEvents: executionConfig.triggerEvents
        });
        
        return { success: true };
      }
      
      // Wait for repository to be available (DeepWiki should have cloned it)
      await this.waitForRepositoryAvailability(event.repositoryUrl);
      
      // Execute tools
      const toolResults = await this.executeToolsForRepository(
        event,
        executionConfig
      );
      
      // Store results if execution was successful
      if (toolResults.success && toolResults.results) {
        await this.storeToolResults(event, toolResults.results);
        
        this.logger.info('Tool execution completed successfully', {
          repositoryUrl: event.repositoryUrl,
          toolsExecuted: Object.keys(toolResults.results),
          successfulTools: Object.values(toolResults.results).filter((r: any) => r.success).length
        });
      }
      
      return {
        success: toolResults.success,
        jobId: toolResults.jobId,
        toolResults: toolResults.results,
        error: toolResults.error
      };
      
    } catch (error) {
      this.logger.error('Failed to handle repository clone event', {
        repositoryUrl: event.repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Check if tools should be executed for this event
   */
  private shouldExecuteTools(
    event: RepositoryCloneEvent,
    config: ToolExecutionConfig
  ): boolean {
    // Check if tool execution is enabled
    if (!config.enabled) {
      return false;
    }
    
    // Check if event type should trigger execution
    if (!config.triggerEvents.includes(event.eventType)) {
      return false;
    }
    
    // TODO: Add file pattern matching if configured
    // This would check if changed files match the configured patterns
    
    return true;
  }
  
  /**
   * Wait for repository to be available in the DeepWiki pod
   */
  private async waitForRepositoryAvailability(
    repositoryUrl: string,
    maxWaitTime: number = 60000 // 1 minute
  ): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 5000; // 5 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if repository exists in the DeepWiki pod workspace
        const repoPath = this.getRepositoryPath(repositoryUrl);
        const checkCommand = `test -d ${repoPath} && echo "exists"`;
        
        const result = await this.deepWikiService['runCommandInPod'](
          checkCommand,
          10 // 10 second timeout for check
        );
        
        if (result.trim() === 'exists') {
          this.logger.info('Repository is available for tool execution', {
            repositoryUrl,
            repositoryPath: repoPath
          });
          return;
        }
      } catch (error) {
        // Repository not ready yet, continue waiting
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error(`Repository not available after ${maxWaitTime}ms: ${repositoryUrl}`);
  }
  
  /**
   * Execute tools for the repository
   */
  private async executeToolsForRepository(
    event: RepositoryCloneEvent,
    config: ToolExecutionConfig
  ): Promise<{
    success: boolean;
    jobId?: string;
    results?: any;
    error?: string;
  }> {
    try {
      // Run DeepWiki analysis with tools
      const analysisResult = await this.deepWikiService.analyzeRepositoryWithTools({
        repositoryUrl: event.repositoryUrl,
        branch: event.branch || 'main',
        mode: 'comprehensive',
        runTools: true,
        enabledTools: config.enabledTools,
        toolTimeout: config.timeout
      });
      
      if (analysisResult.status !== 'success') {
        return {
          success: false,
          error: analysisResult.error || 'Analysis failed'
        };
      }
      
      return {
        success: true,
        jobId: analysisResult.id,
        results: analysisResult.toolResults
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }
  
  /**
   * Store tool results in Vector DB
   */
  private async storeToolResults(
    event: RepositoryCloneEvent,
    toolResults: Record<string, any>
  ): Promise<void> {
    try {
      await this.toolStorageService.storeToolResults(
        event.repositoryUrl,
        toolResults,
        {
          prNumber: event.pullRequestNumber,
          eventType: event.eventType,
          commitSha: event.commitSha,
          triggeredBy: event.triggeredBy?.id
        }
      );
      
      this.logger.info('Tool results stored in Vector DB', {
        repositoryUrl: event.repositoryUrl,
        toolCount: Object.keys(toolResults).length
      });
      
    } catch (error) {
      this.logger.error('Failed to store tool results', {
        repositoryUrl: event.repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
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
   * Configure tool execution for a repository
   */
  async configureToolExecution(
    repositoryUrl: string,
    config: Partial<ToolExecutionConfig>
  ): Promise<void> {
    // TODO: Store configuration in database for per-repository settings
    this.logger.info('Tool execution configured for repository', {
      repositoryUrl,
      config
    });
  }
  
  /**
   * Get tool execution status for a repository
   */
  async getToolExecutionStatus(repositoryUrl: string): Promise<any> {
    // TODO: Retrieve tool execution history and status from Vector DB
    return {
      repositoryUrl,
      lastExecution: null,
      status: 'unknown'
    };
  }
}