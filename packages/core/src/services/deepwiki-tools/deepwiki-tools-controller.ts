/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { WebhookHandlerService, WebhookProcessingResult } from './webhook-handler.service';
import { RepositoryCloneIntegrationService } from './repository-clone-integration.service';
import { VectorStorageService } from '@codequal/database/services/ingestion/vector-storage.service';
import { Logger } from '../../utils/logger';

/**
 * API request interfaces
 */
export interface ManualTriggerRequest {
  repositoryUrl: string;
  branch?: string;
  enabledTools?: string[];
  requireReview?: boolean;
  triggeredBy?: {
    id: string;
    username: string;
    email?: string;
  };
}

export interface ScheduledScanRequest {
  repositoryUrl: string;
  branch?: string;
  enabledTools?: string[];
}

export interface WebhookRequest {
  eventType: string;
  payload: any;
  signature?: string;
}

/**
 * Controller for DeepWiki Tools API endpoints
 */
export class DeepWikiToolsController {
  private webhookHandler: WebhookHandlerService;
  private integrationService: RepositoryCloneIntegrationService;
  private logger: Logger;
  
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
    
    this.webhookHandler = new WebhookHandlerService(
      vectorStorageService,
      embeddingService,
      logger,
      kubernetesConfig
    );
    
    this.integrationService = new RepositoryCloneIntegrationService(
      vectorStorageService,
      embeddingService,
      logger,
      kubernetesConfig
    );
  }
  
  /**
   * Handle webhook events
   * POST /api/deepwiki-tools/webhook
   */
  async handleWebhook(request: WebhookRequest): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      this.logger.info('Webhook received', {
        eventType: request.eventType,
        hasPayload: !!request.payload
      });
      
      // TODO: Validate webhook signature
      if (request.signature) {
        // const isValid = this.webhookHandler.validateWebhookSignature(
        //   JSON.stringify(request.payload),
        //   request.signature,
        //   process.env.WEBHOOK_SECRET || ''
        // );
        // if (!isValid) {
        //   return {
        //     success: false,
        //     message: 'Invalid webhook signature',
        //     error: 'Unauthorized'
        //   };
        // }
      }
      
      const result = await this.webhookHandler.handleGitHubWebhook(
        request.eventType,
        request.payload
      );
      
      return {
        success: result.success,
        message: result.message,
        data: {
          jobId: result.jobId,
          toolResults: result.toolResults
        },
        error: result.error
      };
      
    } catch (error) {
      this.logger.error('Webhook handling failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Trigger manual tool execution
   * POST /api/deepwiki-tools/trigger
   */
  async triggerManualExecution(request: ManualTriggerRequest): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      this.logger.info('Manual trigger requested', {
        repositoryUrl: request.repositoryUrl,
        enabledTools: request.enabledTools
      });
      
      const result = await this.webhookHandler.handleManualTrigger(
        request.repositoryUrl,
        {
          branch: request.branch,
          enabledTools: request.enabledTools,
          requireReview: request.requireReview,
          triggeredBy: request.triggeredBy
        }
      );
      
      return {
        success: result.success,
        message: result.message,
        data: {
          jobId: result.jobId,
          toolResults: result.toolResults
        },
        error: result.error
      };
      
    } catch (error) {
      this.logger.error('Manual trigger failed', {
        repositoryUrl: request.repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Manual trigger failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Run scheduled scan
   * POST /api/deepwiki-tools/scheduled-scan
   */
  async runScheduledScan(request: ScheduledScanRequest): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      this.logger.info('Scheduled scan requested', {
        repositoryUrl: request.repositoryUrl,
        enabledTools: request.enabledTools
      });
      
      const result = await this.webhookHandler.handleScheduledScan(
        request.repositoryUrl,
        {
          branch: request.branch,
          enabledTools: request.enabledTools
        }
      );
      
      return {
        success: result.success,
        message: result.message,
        data: {
          jobId: result.jobId,
          toolResults: result.toolResults
        },
        error: result.error
      };
      
    } catch (error) {
      this.logger.error('Scheduled scan failed', {
        repositoryUrl: request.repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Scheduled scan failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get tool execution status
   * GET /api/deepwiki-tools/status/:repositoryUrl
   */
  async getExecutionStatus(repositoryUrl: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const status = await this.integrationService.getToolExecutionStatus(repositoryUrl);
      
      return {
        success: true,
        data: status
      };
      
    } catch (error) {
      this.logger.error('Failed to get execution status', {
        repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Configure tool execution for a repository
   * PUT /api/deepwiki-tools/configure/:repositoryUrl
   */
  async configureRepository(repositoryUrl: string, config: any): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      await this.integrationService.configureToolExecution(repositoryUrl, config);
      
      return {
        success: true,
        message: 'Repository configuration updated'
      };
      
    } catch (error) {
      this.logger.error('Failed to configure repository', {
        repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Configuration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get webhook status and configuration
   * GET /api/deepwiki-tools/webhook/status
   */
  async getWebhookStatus(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const status = await this.webhookHandler.getWebhookStatus();
      
      return {
        success: true,
        data: status
      };
      
    } catch (error) {
      this.logger.error('Failed to get webhook status', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Test tool execution (for development/debugging)
   * POST /api/deepwiki-tools/test
   */
  async testToolExecution(request: {
    repositoryUrl: string;
    tools?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      this.logger.info('Test tool execution requested', {
        repositoryUrl: request.repositoryUrl,
        tools: request.tools
      });
      
      // Use manual trigger for testing
      const result = await this.webhookHandler.handleManualTrigger(
        request.repositoryUrl,
        {
          enabledTools: request.tools || ['npm-audit', 'license-checker'],
          requireReview: false,
          triggeredBy: {
            id: 'test-user',
            username: 'test'
          }
        }
      );
      
      return {
        success: result.success,
        message: `Test execution ${result.success ? 'completed' : 'failed'}`,
        data: {
          jobId: result.jobId,
          toolResults: result.toolResults
        },
        error: result.error
      };
      
    } catch (error) {
      this.logger.error('Test execution failed', {
        repositoryUrl: request.repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}