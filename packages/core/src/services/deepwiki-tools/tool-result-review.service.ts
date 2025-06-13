/**
 * Tool Result Review Service
 * Provides functionality to review and approve tool results before they're used by agents
 */

import { ToolExecutionResult } from './tool-runner.service';
import type { VectorStorageService } from '@codequal/database';
import { Logger } from '../../utils/logger';

export interface ToolReviewStatus {
  toolId: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  reviewedBy?: string;
  reviewedAt?: Date;
  comments?: string;
  autoApprovalReason?: string;
}

export interface ToolReviewConfiguration {
  requireReview: boolean;
  autoApproveThresholds?: {
    npmAudit?: {
      maxCritical: number;
      maxHigh: number;
    };
    licenseChecker?: {
      maxRiskyLicenses: number;
    };
    madge?: {
      maxCircularDependencies: number;
    };
    dependencyCruiser?: {
      maxViolations: number;
    };
    npmOutdated?: {
      maxMajorUpdates: number;
    };
  };
  reviewTimeoutHours?: number;
}

export class ToolResultReviewService {
  private readonly DEFAULT_REVIEW_TIMEOUT_HOURS = 24;
  
  constructor(
    private vectorStorage: VectorStorageService,
    private logger: Logger,
    private configuration: ToolReviewConfiguration = { requireReview: false }
  ) {}

  /**
   * Process tool results with optional review requirement
   */
  async processToolResults(
    repositoryId: string,
    toolResults: Record<string, ToolExecutionResult>,
    options: {
      userId?: string;
      prNumber?: number;
      skipReview?: boolean;
    } = {}
  ): Promise<{
    results: Record<string, ToolExecutionResult>;
    reviewStatus: Record<string, ToolReviewStatus>;
    requiresManualReview: boolean;
  }> {
    const reviewStatus: Record<string, ToolReviewStatus> = {};
    let requiresManualReview = false;

    // Skip review if configured or explicitly requested
    if (!this.configuration.requireReview || options.skipReview) {
      this.logger.info('Tool review skipped - all results auto-approved');
      
      // Auto-approve all results
      for (const toolId of Object.keys(toolResults)) {
        reviewStatus[toolId] = {
          toolId,
          status: 'auto-approved',
          autoApprovalReason: 'Review not required',
          reviewedAt: new Date()
        };
      }
      
      return { results: toolResults, reviewStatus, requiresManualReview: false };
    }

    // Process each tool result
    for (const [toolId, result] of Object.entries(toolResults)) {
      if (!result.success) {
        // Failed tools are auto-rejected
        reviewStatus[toolId] = {
          toolId,
          status: 'rejected',
          autoApprovalReason: 'Tool execution failed',
          reviewedAt: new Date()
        };
        continue;
      }

      // Check if result meets auto-approval criteria
      const autoApproval = this.checkAutoApproval(toolId, result);
      
      if (autoApproval.approved) {
        reviewStatus[toolId] = {
          toolId,
          status: 'auto-approved',
          autoApprovalReason: autoApproval.reason,
          reviewedAt: new Date()
        };
      } else {
        reviewStatus[toolId] = {
          toolId,
          status: 'pending',
          comments: autoApproval.reason
        };
        requiresManualReview = true;
      }
    }

    // Store review status
    await this.storeReviewStatus(repositoryId, reviewStatus, options);

    // If manual review required, create review request
    if (requiresManualReview) {
      await this.createReviewRequest(repositoryId, toolResults, reviewStatus, options);
    }

    return { results: toolResults, reviewStatus, requiresManualReview };
  }

  /**
   * Check if tool results meet auto-approval criteria
   */
  private checkAutoApproval(
    toolId: string,
    result: ToolExecutionResult
  ): { approved: boolean; reason: string } {
    const thresholds = this.configuration.autoApproveThresholds;
    
    if (!thresholds) {
      return { approved: false, reason: 'No auto-approval thresholds configured' };
    }

    switch (toolId) {
      case 'npm-audit':
        if (thresholds.npmAudit && result.metadata) {
          const vulns = result.metadata.vulnerabilities || {};
          if ((vulns.critical || 0) <= thresholds.npmAudit.maxCritical &&
              (vulns.high || 0) <= thresholds.npmAudit.maxHigh) {
            return { 
              approved: true, 
              reason: `Within threshold: ${vulns.critical || 0} critical, ${vulns.high || 0} high` 
            };
          }
          return { 
            approved: false, 
            reason: `Exceeds threshold: ${vulns.critical || 0} critical, ${vulns.high || 0} high vulnerabilities` 
          };
        }
        break;

      case 'license-checker':
        if (thresholds.licenseChecker && result.metadata) {
          const risky = result.metadata.riskyLicenses || 0;
          if (risky <= thresholds.licenseChecker.maxRiskyLicenses) {
            return { 
              approved: true, 
              reason: `Within threshold: ${risky} risky licenses` 
            };
          }
          return { 
            approved: false, 
            reason: `Exceeds threshold: ${risky} risky licenses found` 
          };
        }
        break;

      case 'madge':
        if (thresholds.madge && result.metadata) {
          const circular = result.metadata.circularDependencies || 0;
          if (circular <= thresholds.madge.maxCircularDependencies) {
            return { 
              approved: true, 
              reason: `Within threshold: ${circular} circular dependencies` 
            };
          }
          return { 
            approved: false, 
            reason: `Exceeds threshold: ${circular} circular dependencies found` 
          };
        }
        break;

      case 'dependency-cruiser':
        if (thresholds.dependencyCruiser && result.metadata) {
          const violations = result.metadata.violations || 0;
          if (violations <= thresholds.dependencyCruiser.maxViolations) {
            return { 
              approved: true, 
              reason: `Within threshold: ${violations} violations` 
            };
          }
          return { 
            approved: false, 
            reason: `Exceeds threshold: ${violations} dependency violations found` 
          };
        }
        break;

      case 'npm-outdated':
        if (thresholds.npmOutdated && result.metadata) {
          const major = result.metadata.majorUpdates || 0;
          if (major <= thresholds.npmOutdated.maxMajorUpdates) {
            return { 
              approved: true, 
              reason: `Within threshold: ${major} major updates` 
            };
          }
          return { 
            approved: false, 
            reason: `Exceeds threshold: ${major} major version updates available` 
          };
        }
        break;
    }

    return { approved: false, reason: 'No auto-approval criteria for this tool' };
  }

  /**
   * Create a review request for manual approval
   */
  private async createReviewRequest(
    repositoryId: string,
    toolResults: Record<string, ToolExecutionResult>,
    reviewStatus: Record<string, ToolReviewStatus>,
    options: any
  ): Promise<void> {
    const reviewRequest = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      repositoryId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (this.configuration.reviewTimeoutHours || this.DEFAULT_REVIEW_TIMEOUT_HOURS) * 60 * 60 * 1000),
      requestedBy: options.userId,
      prNumber: options.prNumber,
      toolsRequiringReview: Object.entries(reviewStatus)
        .filter(([_, status]) => status.status === 'pending')
        .map(([toolId, status]) => ({
          toolId,
          reason: status.comments,
          result: toolResults[toolId]
        }))
    };

    // In a real implementation, this would:
    // 1. Store in database
    // 2. Send notification to reviewers
    // 3. Create UI for review
    
    this.logger.info('Review request created', {
      requestId: reviewRequest.id,
      toolsRequiringReview: reviewRequest.toolsRequiringReview.length
    });

    // For now, log the review URL
    console.log(`\n🔍 Manual Review Required`);
    console.log(`Review URL: https://codequal.app/reviews/${reviewRequest.id}`);
    console.log(`Tools requiring review:`);
    reviewRequest.toolsRequiringReview.forEach(tool => {
      console.log(`  - ${tool.toolId}: ${tool.reason}`);
    });
    console.log(`\nReview expires at: ${reviewRequest.expiresAt}`);
  }

  /**
   * Store review status in Vector DB
   */
  private async storeReviewStatus(
    repositoryId: string,
    reviewStatus: Record<string, ToolReviewStatus>,
    options: any
  ): Promise<void> {
    // Store as metadata with tool results
    const reviewMetadata = {
      review_required: this.configuration.requireReview,
      review_status: reviewStatus,
      reviewed_at: new Date().toISOString(),
      pr_number: options.prNumber
    };

    this.logger.info('Review status stored', {
      repositoryId,
      reviewStatus: Object.keys(reviewStatus).map(k => `${k}: ${reviewStatus[k].status}`)
    });
  }

  /**
   * Get review status for a repository
   */
  async getReviewStatus(repositoryId: string): Promise<Record<string, ToolReviewStatus>> {
    // In real implementation, retrieve from database
    // For now, return mock data
    return {};
  }

  /**
   * Approve tool results manually
   */
  async approveToolResults(
    repositoryId: string,
    toolIds: string[],
    reviewer: string,
    comments?: string
  ): Promise<void> {
    this.logger.info('Tool results approved', {
      repositoryId,
      toolIds,
      reviewer,
      comments
    });

    // Update review status in database
    // Trigger continuation of analysis flow
  }

  /**
   * Reject tool results
   */
  async rejectToolResults(
    repositoryId: string,
    toolIds: string[],
    reviewer: string,
    reason: string
  ): Promise<void> {
    this.logger.info('Tool results rejected', {
      repositoryId,
      toolIds,
      reviewer,
      reason
    });

    // Update review status
    // Notify relevant parties
  }

  /**
   * Generate review summary for UI
   */
  generateReviewSummary(
    toolResults: Record<string, ToolExecutionResult>,
    reviewStatus: Record<string, ToolReviewStatus>
  ): any {
    const summary = {
      totalTools: Object.keys(toolResults).length,
      successfulTools: Object.values(toolResults).filter(r => r.success).length,
      pendingReview: Object.values(reviewStatus).filter(s => s.status === 'pending').length,
      autoApproved: Object.values(reviewStatus).filter(s => s.status === 'auto-approved').length,
      rejected: Object.values(reviewStatus).filter(s => s.status === 'rejected').length,
      
      details: Object.entries(toolResults).map(([toolId, result]) => ({
        toolId,
        success: result.success,
        reviewStatus: reviewStatus[toolId]?.status,
        metrics: result.metadata,
        requiresAttention: this.requiresAttention(toolId, result)
      }))
    };

    return summary;
  }

  /**
   * Check if tool result requires attention
   */
  private requiresAttention(toolId: string, result: ToolExecutionResult): boolean {
    if (!result.success) return true;

    const metadata = result.metadata || {};
    
    switch (toolId) {
      case 'npm-audit':
        return (metadata.vulnerabilities?.critical || 0) > 0 || 
               (metadata.vulnerabilities?.high || 0) > 0;
      
      case 'license-checker':
        return (metadata.riskyLicenses || 0) > 0;
      
      case 'madge':
        return (metadata.circularDependencies || 0) > 0;
      
      case 'dependency-cruiser':
        return (metadata.violations || 0) > 0;
      
      case 'npm-outdated':
        return (metadata.majorUpdates || 0) > 5;
      
      default:
        return false;
    }
  }
}
