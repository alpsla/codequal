/**
 * Researcher Upgrade Coordinator
 * 
 * Handles graceful coordination of researcher upgrades with concurrent requests.
 * Ensures zero downtime and no data loss during researcher model transitions.
 */

import { Logger, createLogger } from '../utils';
import { AuthenticatedUser, IResearcherAgent } from '../types';
import { RepositorySizeCategory } from './model-selection/ModelVersionSync';

export interface ResearchRequest {
  id: string;
  context: {
    language: string;
    sizeCategory: RepositorySizeCategory;
    agentRole: string;
    frameworks?: string[];
    complexity?: number;
  };
  urgency: 'normal' | 'high' | 'critical';
  timestamp: Date;
  status: 'received' | 'queued' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export interface UpgradeOperation {
  id: string;
  newProvider: string;
  newModel: string;
  newVersion: string;
  reason: string;
  status: 'pending' | 'waiting_requests' | 'updating_db' | 'invalidating_cache' | 'processing_queue' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  phase: string | null;
  error?: string;
  oldModel?: string;
  finalModel?: string;
  queuedRequestsProcessed?: number;
}

/**
 * Coordinates researcher upgrades with graceful handling of concurrent requests
 */
export class ResearcherUpgradeCoordinator {
  private logger: Logger;
  private researcherAgent: IResearcherAgent;
  
  // State management
  private upgradeInProgress = false;
  private currentUpgrade: UpgradeOperation | null = null;
  private activeRequests = new Map<string, ResearchRequest>();
  private queuedRequests: ResearchRequest[] = [];
  private requestCounter = 0;
  private upgradeCounter = 0;
  
  // Configuration
  private readonly maxConcurrentRequests = 10;
  private readonly maxWaitTimeForRequests = 30000; // 30 seconds
  private readonly criticalRequestTimeout = 5000; // 5 seconds for critical requests

  constructor(
    authenticatedUser: AuthenticatedUser,
    researcherAgent: IResearcherAgent
  ) {
    this.logger = createLogger('ResearcherUpgradeCoordinator');
    this.researcherAgent = researcherAgent;
    
    this.logger.info('Researcher Upgrade Coordinator initialized', {
      maxConcurrentRequests: this.maxConcurrentRequests,
      maxWaitTime: this.maxWaitTimeForRequests
    });
  }

  /**
   * Main entry point for all research requests
   */
  async handleResearchRequest(
    language: string,
    sizeCategory: RepositorySizeCategory,
    agentRole: string,
    frameworks: string[] = [],
    complexity = 2.0,
    urgency: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<{
    requestId: string;
    status: string;
    message?: string;
    estimatedDelay?: number;
    result?: any;
  }> {
    const requestId = this.generateRequestId();
    const request: ResearchRequest = {
      id: requestId,
      context: { language, sizeCategory, agentRole, frameworks, complexity },
      urgency,
      timestamp: new Date(),
      status: 'received'
    };

    this.logger.info('Research request received', {
      requestId,
      context: `${language}/${sizeCategory}/${agentRole}`,
      urgency,
      upgradeInProgress: this.upgradeInProgress
    });

    // Route based on current system state
    if (this.upgradeInProgress) {
      return await this.handleRequestDuringUpgrade(request);
    } else {
      return await this.processRequestNormally(request);
    }
  }

  /**
   * Handle requests when upgrade is in progress
   */
  private async handleRequestDuringUpgrade(request: ResearchRequest): Promise<{
    requestId: string;
    status: string;
    message?: string;
    estimatedDelay?: number;
  }> {
    this.logger.info('Request during upgrade', {
      requestId: request.id,
      urgency: request.urgency,
      upgradePhase: this.currentUpgrade?.phase
    });

    // Critical requests can interrupt certain phases
    if (request.urgency === 'critical' && this.canInterruptForCritical()) {
      this.logger.warn('Critical request interrupting upgrade', {
        requestId: request.id,
        upgradePhase: this.currentUpgrade?.phase
      });
      return await this.handleCriticalInterrupt(request);
    }

    // Queue non-critical requests
    request.status = 'queued';
    this.queuedRequests.push(request);
    
    this.logger.info('Request queued during upgrade', {
      requestId: request.id,
      queueLength: this.queuedRequests.length,
      estimatedDelay: this.estimateQueueDelay()
    });

    return {
      requestId: request.id,
      status: 'queued',
      message: 'Request queued during researcher upgrade',
      estimatedDelay: this.estimateQueueDelay()
    };
  }

  /**
   * Process request normally (no upgrade in progress)
   */
  private async processRequestNormally(request: ResearchRequest): Promise<{
    requestId: string;
    status: string;
    message?: string;
    result?: any;
  }> {
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      // Queue if too many active requests
      request.status = 'queued';
      this.queuedRequests.push(request);
      
      return {
        requestId: request.id,
        status: 'queued',
        message: 'Request queued due to capacity limits'
      };
    }

    request.status = 'processing';
    request.startedAt = new Date();
    this.activeRequests.set(request.id, request);

    this.logger.info('Processing research request', {
      requestId: request.id,
      context: request.context,
      activeRequests: this.activeRequests.size
    });

    try {
      // Use researcher agent for actual research
      const result = await this.researcherAgent.useResearcherForContext(
        request.context.language,
        request.context.sizeCategory,
        request.context.agentRole,
        request.context.frameworks || [],
        request.context.complexity || 2.0
      );

      // Complete request
      request.status = 'completed';
      request.completedAt = new Date();
      request.result = result;
      this.activeRequests.delete(request.id);

      this.logger.info('Research request completed', {
        requestId: request.id,
        duration: request.completedAt.getTime() - request.startedAt!.getTime(),
        tokensUsed: result.tokensUsed
      });

      return {
        requestId: request.id,
        status: 'completed',
        result
      };

    } catch (error) {
      request.status = 'failed';
      request.completedAt = new Date();
      request.error = error instanceof Error ? error.message : String(error);
      this.activeRequests.delete(request.id);

      this.logger.error('Research request failed', {
        requestId: request.id,
        error: request.error
      });

      return {
        requestId: request.id,
        status: 'failed',
        message: request.error
      };
    }
  }

  /**
   * Main upgrade orchestration
   */
  async upgradeResearcher(
    newProvider: string,
    newModel: string,
    newVersion: string,
    reason: string
  ): Promise<{
    success: boolean;
    upgradeId: string;
    message: string;
    oldModel?: string;
    newModel?: string;
    queuedRequestsProcessed?: number;
  }> {
    if (this.upgradeInProgress) {
      return {
        success: false,
        upgradeId: '',
        message: 'Upgrade already in progress'
      };
    }

    const upgradeId = this.generateUpgradeId();
    const upgrade: UpgradeOperation = {
      id: upgradeId,
      newProvider,
      newModel,
      newVersion,
      reason,
      status: 'pending',
      startedAt: new Date(),
      phase: null
    };

    this.currentUpgrade = upgrade;
    this.upgradeInProgress = true;

    this.logger.info('Researcher upgrade started', {
      upgradeId,
      newModel: `${newProvider}/${newModel}`,
      version: newVersion,
      reason,
      activeRequests: this.activeRequests.size,
      queuedRequests: this.queuedRequests.length
    });

    try {
      // Phase 1: Wait for active requests to complete
      await this.waitForActiveRequestsPhase(upgrade);
      
      // Phase 2: Perform upgrade via researcher agent
      await this.performUpgradePhase(upgrade);
      
      // Phase 3: Process queued requests
      await this.processQueuedRequestsPhase(upgrade);
      
      upgrade.status = 'completed';
      upgrade.completedAt = new Date();

      this.logger.info('Researcher upgrade completed successfully', {
        upgradeId,
        duration: upgrade.completedAt.getTime() - upgrade.startedAt.getTime(),
        queuedRequestsProcessed: upgrade.queuedRequestsProcessed || 0
      });

      return {
        success: true,
        upgradeId,
        message: 'Upgrade completed successfully',
        oldModel: upgrade.oldModel,
        newModel: upgrade.finalModel,
        queuedRequestsProcessed: upgrade.queuedRequestsProcessed
      };

    } catch (error) {
      upgrade.status = 'failed';
      upgrade.completedAt = new Date();
      upgrade.error = error instanceof Error ? error.message : String(error);

      this.logger.error('Researcher upgrade failed', {
        upgradeId,
        error: upgrade.error,
        phase: upgrade.phase
      });

      return {
        success: false,
        upgradeId,
        message: `Upgrade failed: ${upgrade.error}`
      };

    } finally {
      this.upgradeInProgress = false;
      this.currentUpgrade = null;
    }
  }

  /**
   * Phase 1: Wait for active requests to complete
   */
  private async waitForActiveRequestsPhase(upgrade: UpgradeOperation): Promise<void> {
    upgrade.status = 'waiting_requests';
    upgrade.phase = 'waiting_for_active_requests';

    this.logger.info('Upgrade phase: Waiting for active requests', {
      upgradeId: upgrade.id,
      activeRequests: this.activeRequests.size
    });

    const startTime = Date.now();

    while (this.activeRequests.size > 0) {
      if (Date.now() - startTime > this.maxWaitTimeForRequests) {
        throw new Error(`Timeout waiting for active requests to complete (${this.activeRequests.size} still active)`);
      }

      this.logger.debug('Waiting for active requests', {
        upgradeId: upgrade.id,
        activeRequests: this.activeRequests.size,
        waitTime: Date.now() - startTime
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.logger.info('All active requests completed', {
      upgradeId: upgrade.id,
      waitTime: Date.now() - startTime
    });
  }

  /**
   * Phase 2: Perform the actual upgrade via researcher agent
   */
  private async performUpgradePhase(upgrade: UpgradeOperation): Promise<void> {
    upgrade.status = 'updating_db';
    upgrade.phase = 'performing_upgrade';

    this.logger.info('Upgrade phase: Performing upgrade', {
      upgradeId: upgrade.id,
      newModel: `${upgrade.newProvider}/${upgrade.newModel}`
    });

    // Get current researcher stats before upgrade
    const oldStats = this.researcherAgent.getCacheStats();
    upgrade.oldModel = oldStats.model;

    // Perform upgrade via researcher agent
    const upgradeResult = await this.researcherAgent.upgradeResearcher(
      upgrade.newProvider,
      upgrade.newModel,
      upgrade.newVersion,
      upgrade.reason
    );

    if (!upgradeResult.success) {
      throw new Error(`Researcher agent upgrade failed: ${upgradeResult.oldModel} -> ${upgradeResult.newModel}`);
    }

    upgrade.finalModel = upgradeResult.newModel;

    this.logger.info('Researcher agent upgrade completed', {
      upgradeId: upgrade.id,
      oldModel: upgradeResult.oldModel,
      newModel: upgradeResult.newModel
    });
  }

  /**
   * Phase 3: Process queued requests with new researcher
   */
  private async processQueuedRequestsPhase(upgrade: UpgradeOperation): Promise<void> {
    upgrade.status = 'processing_queue';
    upgrade.phase = 'processing_queued_requests';

    const queuedCount = this.queuedRequests.length;
    upgrade.queuedRequestsProcessed = 0;

    this.logger.info('Upgrade phase: Processing queued requests', {
      upgradeId: upgrade.id,
      queuedRequests: queuedCount
    });

    if (queuedCount === 0) {
      this.logger.info('No queued requests to process', { upgradeId: upgrade.id });
      return;
    }

    // Process all queued requests with new researcher
    const queuedRequests = [...this.queuedRequests];
    this.queuedRequests = [];

    for (const request of queuedRequests) {
      try {
        this.logger.info('Processing queued request with new researcher', {
          upgradeId: upgrade.id,
          requestId: request.id,
          context: request.context
        });

        await this.processRequestNormally(request);
        upgrade.queuedRequestsProcessed!++;

      } catch (error) {
        this.logger.error('Failed to process queued request', {
          upgradeId: upgrade.id,
          requestId: request.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('Queued requests processing completed', {
      upgradeId: upgrade.id,
      processed: upgrade.queuedRequestsProcessed,
      total: queuedCount
    });
  }

  /**
   * Handle critical request that needs to interrupt upgrade
   */
  private async handleCriticalInterrupt(request: ResearchRequest): Promise<{
    requestId: string;
    status: string;
    message?: string;
    result?: any;
  }> {
    this.logger.warn('Handling critical interrupt', {
      requestId: request.id,
      upgradePhase: this.currentUpgrade?.phase
    });

    // Pause current upgrade phase
    const pausedPhase = this.currentUpgrade?.phase;
    if (this.currentUpgrade) {
      this.currentUpgrade.phase = 'paused_for_critical';
    }

    try {
      // Process critical request with current researcher
      const result = await this.processRequestNormally(request);

      // Resume upgrade phase
      if (this.currentUpgrade) {
        this.currentUpgrade.phase = pausedPhase || 'context-validation';
      }

      this.logger.info('Critical request completed, resuming upgrade', {
        requestId: request.id,
        resumingPhase: pausedPhase
      });

      return result;

    } catch (error) {
      // Resume upgrade even if critical request failed
      if (this.currentUpgrade) {
        this.currentUpgrade.phase = pausedPhase || 'context-validation';
      }

      this.logger.error('Critical request failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        requestId: request.id,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if upgrade can be interrupted for critical requests
   */
  private canInterruptForCritical(): boolean {
    if (!this.currentUpgrade) return false;
    
    // Can interrupt during waiting phase, but not during actual update
    const interruptiblePhases = ['waiting_for_active_requests', 'processing_queued_requests'];
    return interruptiblePhases.includes(this.currentUpgrade.phase || '');
  }

  /**
   * Estimate delay for queued requests
   */
  private estimateQueueDelay(): number {
    const activeRequestsTime = this.activeRequests.size * 3000; // 3s average per request
    const upgradeTime = this.upgradeInProgress ? 10000 : 0; // 10s for upgrade process
    const queuedRequestsTime = this.queuedRequests.length * 3000;
    
    return activeRequestsTime + upgradeTime + queuedRequestsTime;
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    upgradeInProgress: boolean;
    currentUpgrade: UpgradeOperation | null;
    activeRequests: number;
    queuedRequests: number;
    researcherStats: any;
  } {
    return {
      upgradeInProgress: this.upgradeInProgress,
      currentUpgrade: this.currentUpgrade,
      activeRequests: this.activeRequests.size,
      queuedRequests: this.queuedRequests.length,
      researcherStats: this.researcherAgent.getCacheStats()
    };
  }

  /**
   * Get detailed request information
   */
  getRequestInfo(requestId: string): ResearchRequest | null {
    return this.activeRequests.get(requestId) || 
           this.queuedRequests.find(r => r.id === requestId) || 
           null;
  }

  /**
   * Get all queued requests
   */
  getQueuedRequests(): ResearchRequest[] {
    return [...this.queuedRequests];
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  private generateUpgradeId(): string {
    return `upgrade_${++this.upgradeCounter}_${Date.now()}`;
  }
}