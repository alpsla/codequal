/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { RepositoryCloneIntegrationService, RepositoryCloneEvent, RepositoryEventType } from './repository-clone-integration.service';
import { VectorStorageService } from '@codequal/database';
import { Logger } from '../../utils/logger';
import * as crypto from 'crypto';

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
 * GitLab webhook payload interface
 */
export interface GitLabWebhookPayload {
  object_kind: string;
  event_type?: string;
  user: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  project: {
    id: number;
    name: string;
    path_with_namespace: string;
    web_url: string;
    default_branch: string;
    git_http_url?: string;
    git_ssh_url?: string;
  };
  object_attributes?: {
    id: number;
    iid: number;
    title: string;
    description: string;
    state: string;
    action: string;
    target_branch: string;
    source_branch: string;
    url: string;
    created_at: string;
    updated_at: string;
    source?: {
      name: string;
      path_with_namespace: string;
    };
    target?: {
      name: string;
      path_with_namespace: string;
    };
  };
  changes?: Record<string, any>;
  repository?: {
    name: string;
    url: string;
    description: string;
    homepage: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  }>;
  ref?: string;
  checkout_sha?: string;
  before?: string;
  after?: string;
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
   * Handle GitLab webhook events
   */
  async handleGitLabWebhook(
    payload: GitLabWebhookPayload
  ): Promise<WebhookProcessingResult> {
    try {
      this.logger.info('Processing GitLab webhook', {
        objectKind: payload.object_kind,
        eventType: payload.event_type,
        project: payload.project.path_with_namespace,
        action: payload.object_attributes?.action
      });
      
      // Convert GitLab webhook to repository clone event
      const cloneEvent = this.convertGitLabPayloadToCloneEvent(payload);
      
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
      this.logger.error('GitLab webhook processing failed', {
        objectKind: payload.object_kind,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        message: 'GitLab webhook processing failed',
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
      case 'push': {
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
      }
        
      case 'pull_request': {
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
      }
        
      default:
        // Other event types not handled
        return null;
    }
  }
  
  /**
   * Convert GitLab webhook payload to repository clone event
   */
  private convertGitLabPayloadToCloneEvent(
    payload: GitLabWebhookPayload
  ): RepositoryCloneEvent | null {
    const baseEvent = {
      repositoryUrl: payload.project.git_http_url || payload.project.web_url + '.git',
      triggeredBy: {
        id: payload.user.id.toString(),
        username: payload.user.username,
        email: payload.user.email
      }
    };
    
    switch (payload.object_kind) {
      case 'push': {
        // Only process pushes to main/master branches
        const branch = payload.ref?.replace('refs/heads/', '');
        if (!branch || !['main', 'master', 'develop'].includes(branch)) {
          return null;
        }
        
        const latestCommit = payload.commits?.[payload.commits.length - 1];
        
        return {
          ...baseEvent,
          eventType: 'push' as RepositoryEventType,
          branch,
          commitSha: payload.checkout_sha || payload.after,
          metadata: {
            commitMessage: latestCommit?.message,
            author: latestCommit?.author,
            totalCommits: payload.commits?.length || 0,
            before: payload.before,
            after: payload.after
          }
        };
      }
        
      case 'merge_request': {
        // Only process opened, updated, and reopened actions
        const action = payload.object_attributes?.action;
        if (!action || !['open', 'update', 'reopen'].includes(action)) {
          return null;
        }
        
        return {
          ...baseEvent,
          eventType: 'pull_request' as RepositoryEventType,
          branch: payload.object_attributes?.source_branch,
          pullRequestNumber: payload.object_attributes?.iid, // GitLab uses iid (internal id)
          commitSha: payload.checkout_sha,
          metadata: {
            action: action,
            baseBranch: payload.object_attributes?.target_branch,
            mrId: payload.object_attributes?.id,
            mrIid: payload.object_attributes?.iid,
            title: payload.object_attributes?.title,
            description: payload.object_attributes?.description,
            state: payload.object_attributes?.state,
            url: payload.object_attributes?.url
          }
        };
      }
        
      case 'tag_push': {
        // Handle tag creation events
        if (!payload.ref?.startsWith('refs/tags/')) {
          return null;
        }
        
        const tagName = payload.ref.replace('refs/tags/', '');
        
        return {
          ...baseEvent,
          eventType: 'push' as RepositoryEventType,
          branch: payload.project.default_branch,
          commitSha: payload.checkout_sha || payload.after,
          metadata: {
            tagName,
            tagPush: true,
            before: payload.before,
            after: payload.after
          }
        };
      }
        
      default:
        // Other event types not handled (wiki page update, issue events, etc.)
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
            // Security Tools
            'npm-audit',
            'license-checker',
            // Architecture Tools
            'madge',
            'dependency-cruiser',
            // Dependency Tools
            'npm-outdated',
            // Code Quality Tools
            'eslint',
            'prettier-check',
            // Type Safety Tools
            'typescript-strict'
          ],
          requireReview: false,
          timeout: 600000 // 10 minutes (increased for more tools)
        };
        
      case 'pull_request':
        // Quick analysis for PRs
        return {
          enabled: true,
          enabledTools: [
            // Security Tools
            'npm-audit',
            'license-checker',
            // Code Quality Tools
            'eslint',
            'prettier-check',
            // Type Safety Tools
            'typescript-strict'
          ],
          requireReview: true, // PRs should be reviewed
          timeout: 300000 // 5 minutes (increased for more tools)
        };
        
      case 'scheduled':
        // Comprehensive analysis for scheduled runs
        return {
          enabled: true,
          enabledTools: [
            // Security Tools
            'npm-audit',
            'license-checker',
            // Architecture Tools
            'madge',
            'dependency-cruiser',
            // Dependency Tools
            'npm-outdated',
            // Code Quality Tools
            'eslint',
            'prettier-check',
            // Type Safety Tools
            'typescript-strict',
            // Test Coverage Tools
            'jest-coverage',
            'nyc-coverage',
            // Performance Tools
            'bundlephobia'
          ],
          requireReview: false,
          timeout: 900000 // 15 minutes (comprehensive analysis)
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
    secret: string,
    platform: 'github' | 'gitlab' = 'github'
  ): boolean {
    if (platform === 'github') {
      // GitHub uses HMAC SHA-256 with 'sha256=' prefix
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload, 'utf8');
      const expectedSignature = `sha256=${hmac.digest('hex')}`;
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } else if (platform === 'gitlab') {
      // GitLab uses simple token comparison in X-Gitlab-Token header
      return signature === secret;
    }
    
    return false;
  }
  
  /**
   * Validate GitLab webhook token
   */
  validateGitLabWebhookToken(
    token: string,
    secret: string
  ): boolean {
    return token === secret;
  }
  
  /**
   * Get supported event types
   */
  getSupportedEventTypes(): { github: string[]; gitlab: string[] } {
    return {
      github: ['push', 'pull_request'],
      gitlab: ['push', 'merge_request', 'tag_push']
    };
  }
  
  /**
   * Get webhook status and statistics
   */
  async getWebhookStatus(): Promise<{
    isConfigured: boolean;
    supportedEvents: { github: string[]; gitlab: string[] };
    recentProcessing: any[];
  }> {
    return {
      isConfigured: true,
      supportedEvents: this.getSupportedEventTypes(),
      recentProcessing: [] // TODO: Implement recent processing history
    };
  }
}