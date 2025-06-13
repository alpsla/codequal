/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { RepositoryCloneIntegrationService, RepositoryCloneEvent, RepositoryEventType } from './repository-clone-integration.service';
import { VectorStorageService } from '@codequal/database/services/ingestion/vector-storage.service';
import { Logger } from '../../utils/logger';

/**
 * GitHub webhook payload interface
 */
export interface GitHubWebhookPayload {
  action?: string;
  repository: {
    full_name: string;
    clone_url: string;
    default_branch: string;
  };
  sender: {
    login: string;
    id: number;
  };
  ref?: string;
  head_commit?: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
  };
  pull_request?: {
    number: number;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
  };
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  jobId?: string;
  toolResults?: any;
  error?: string;
}

/**
 * Service that handles webhook events and triggers tool execution
 */
export class WebhookHandlerService {
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
    this.integrationService = new RepositoryCloneIntegrationService(
      vectorStorageService,
      embeddingService,
      logger,
      kubernetesConfig
    );
  }
  
  /**
   * Handle GitHub webhook events
   */
  async handleGitHubWebhook(
    eventType: string,
    payload: GitHubWebhookPayload
  ): Promise<WebhookProcessingResult> {
    try {
      this.logger.info('Processing GitHub webhook', {
        eventType,
        repository: payload.repository.full_name,
        action: payload.action
      });
      
      // Convert GitHub webhook to repository clone event
      const cloneEvent = this.convertGitHubPayloadToCloneEvent(eventType, payload);
      
      if (!cloneEvent) {
        return {
          success: true,
          message: 'Event ignored - not configured to trigger tool execution'
        };
      }
      
      // Process the clone event
      const result = await this.integrationService.handleRepositoryCloneEvent(
        cloneEvent,
        this.getToolConfigForEvent(cloneEvent)
      );
      
      if (result.success) {
        return {
          success: true,
          message: `Tool execution ${result.jobId ? 'started' : 'completed'} for ${cloneEvent.repositoryUrl}`,
          jobId: result.jobId,
          toolResults: result.toolResults
        };
      } else {
        return {
          success: false,
          message: 'Tool execution failed',
          error: result.error
        };
      }
      
    } catch (error) {
      this.logger.error('Webhook processing failed', {
        eventType,
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
   * Handle manual repository analysis triggers
   */
  async handleManualTrigger(
    repositoryUrl: string,
    options: {
      branch?: string;
      enabledTools?: string[];
      requireReview?: boolean;
      triggeredBy?: {
        id: string;
        username: string;
        email?: string;
      };
    } = {}
  ): Promise<WebhookProcessingResult> {
    try {
      this.logger.info('Processing manual tool execution trigger', {
        repositoryUrl,
        branch: options.branch,
        enabledTools: options.enabledTools
      });
      
      const cloneEvent: RepositoryCloneEvent = {
        eventType: 'manual_trigger',
        repositoryUrl,
        branch: options.branch || 'main',
        triggeredBy: options.triggeredBy,
        metadata: {
          source: 'manual_trigger',
          timestamp: new Date().toISOString()
        }
      };
      
      const result = await this.integrationService.handleRepositoryCloneEvent(
        cloneEvent,
        {
          enabled: true,
          enabledTools: options.enabledTools,
          requireReview: options.requireReview,
          triggerEvents: ['manual_trigger']
        }
      );
      
      if (result.success) {
        return {
          success: true,
          message: `Manual tool execution ${result.jobId ? 'started' : 'completed'} for ${repositoryUrl}`,
          jobId: result.jobId,
          toolResults: result.toolResults
        };
      } else {
        return {
          success: false,
          message: 'Manual tool execution failed',
          error: result.error
        };
      }
      
    } catch (error) {
      this.logger.error('Manual trigger processing failed', {
        repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Manual trigger processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Handle scheduled repository scans
   */
  async handleScheduledScan(
    repositoryUrl: string,
    options: {
      enabledTools?: string[];
      branch?: string;
    } = {}
  ): Promise<WebhookProcessingResult> {
    try {
      this.logger.info('Processing scheduled repository scan', {
        repositoryUrl,
        enabledTools: options.enabledTools
      });
      
      const cloneEvent: RepositoryCloneEvent = {
        eventType: 'scheduled',
        repositoryUrl,
        branch: options.branch || 'main',
        metadata: {
          source: 'scheduled_scan',
          timestamp: new Date().toISOString()
        }
      };
      
      const result = await this.integrationService.handleRepositoryCloneEvent(
        cloneEvent,
        {
          enabled: true,
          enabledTools: options.enabledTools,
          triggerEvents: ['scheduled'],
          requireReview: false // Scheduled scans auto-approve
        }
      );
      
      if (result.success) {
        return {
          success: true,
          message: `Scheduled scan ${result.jobId ? 'started' : 'completed'} for ${repositoryUrl}`,
          jobId: result.jobId,
          toolResults: result.toolResults
        };
      } else {
        return {
          success: false,
          message: 'Scheduled scan failed',
          error: result.error
        };
      }
      
    } catch (error) {
      this.logger.error('Scheduled scan processing failed', {
        repositoryUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'Scheduled scan processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Convert GitHub webhook payload to repository clone event
   */
  private convertGitHubPayloadToCloneEvent(
    eventType: string,
    payload: GitHubWebhookPayload
  ): RepositoryCloneEvent | null {
    const baseEvent = {
      repositoryUrl: payload.repository.clone_url,
      triggeredBy: {
        id: payload.sender.id.toString(),
        username: payload.sender.login
      }
    };
    
    switch (eventType) {
      case 'push':
        // Only process pushes to main/master branches
        const branch = payload.ref?.replace('refs/heads/', '');
        if (!branch || !['main', 'master', 'develop'].includes(branch)) {
          return null;
        }
        
        return {
          ...baseEvent,
          eventType: 'push' as RepositoryEventType,
          branch,
          commitSha: payload.head_commit?.id,
          metadata: {
            commitMessage: payload.head_commit?.message,
            author: payload.head_commit?.author
          }
        };
        
      case 'pull_request':
        // Only process opened, synchronize, and reopened actions
        if (!payload.action || !['opened', 'synchronize', 'reopened'].includes(payload.action)) {
          return null;
        }
        
        return {
          ...baseEvent,
          eventType: 'pull_request' as RepositoryEventType,
          branch: payload.pull_request?.head.ref,
          pullRequestNumber: payload.pull_request?.number,
          commitSha: payload.pull_request?.head.sha,
          metadata: {
            action: payload.action,
            baseBranch: payload.pull_request?.base.ref
          }
        };
        
      default:
        // Other event types not handled
        return null;
    }
  }
  
  /**
   * Get tool configuration based on event type
   */
  private getToolConfigForEvent(event: RepositoryCloneEvent) {
    switch (event.eventType) {
      case 'push':
        // Full analysis for pushes to main branches
        return {
          enabled: true,
          enabledTools: [
            'npm-audit',
            'license-checker',
            'madge',
            'dependency-cruiser',
            'npm-outdated'
          ],
          requireReview: false,
          timeout: 300000 // 5 minutes
        };
        
      case 'pull_request':
        // Quick security scan for PRs
        return {
          enabled: true,
          enabledTools: [
            'npm-audit',
            'license-checker'
          ],
          requireReview: true, // PRs should be reviewed
          timeout: 180000 // 3 minutes
        };
        
      case 'scheduled':
        // Comprehensive analysis for scheduled runs
        return {
          enabled: true,
          enabledTools: [
            'npm-audit',
            'license-checker', 
            'madge',
            'dependency-cruiser',
            'npm-outdated'
          ],
          requireReview: false,
          timeout: 600000 // 10 minutes
        };
        
      case 'manual_trigger':
        // Full configuration for manual triggers
        return {
          enabled: true,
          requireReview: false,
          timeout: 300000 // 5 minutes
        };
        
      default:
        return {
          enabled: false
        };
    }
  }
  
  /**
   * Validate webhook signature (for security)
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // TODO: Implement webhook signature validation
    // This should verify the webhook came from the configured source
    return true;
  }
  
  /**
   * Get supported event types
   */
  getSupportedEventTypes(): string[] {
    return ['push', 'pull_request'];
  }
  
  /**
   * Get webhook status and statistics
   */
  async getWebhookStatus(): Promise<{
    isConfigured: boolean;
    supportedEvents: string[];
    recentProcessing: any[];
  }> {
    return {
      isConfigured: true,
      supportedEvents: this.getSupportedEventTypes(),
      recentProcessing: [] // TODO: Implement recent processing history
    };
  }
}