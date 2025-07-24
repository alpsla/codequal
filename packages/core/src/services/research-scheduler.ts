/**
 * Research Scheduler - Robust Cron-based Scheduling for RESEARCHER
 * 
 * Uses node-cron for reliable, production-ready scheduling of:
 * 1. Quarterly research (both meta-research and context research)
 * 2. Unscheduled triggers when orchestrator finds missing configs
 */

import * as cron from 'node-cron';
import { Logger, createLogger } from '../utils';
import { ResearcherUpgradeCoordinator } from './researcher-upgrade-coordinator';
import { AuthenticatedUser, IResearcherAgent, ResearchParams, ResearchResult } from '../types';
import { RepositorySizeCategory } from './model-selection/ModelVersionSync';

export interface SchedulerConfig {
  /**
   * Cron expression for quarterly research
   * Default cron: '0 5 1 star/3 star' where star means asterisk (0 AM ET / 5 AM UTC on 1st day of every 3rd month)
   */
  quarterlyCron?: string;
  
  /**
   * Enable automatic scheduling
   */
  enabled?: boolean;
  
  /**
   * Timezone for scheduling
   */
  timezone?: string;
  
  /**
   * Maximum concurrent research jobs
   */
  maxConcurrentJobs?: number;
}

/**
 * Research job types
 */
export enum ResearchJobType {
  QUARTERLY_CONTEXT = 'quarterly_context',
  QUARTERLY_META = 'quarterly_meta', 
  UNSCHEDULED_MISSING_CONFIG = 'unscheduled_missing_config',
  MANUAL_TRIGGER = 'manual_trigger'
}

/**
 * Research job status
 */
export interface ResearchJob {
  id: string;
  type: ResearchJobType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  context?: any;
  result?: any;
}

/**
 * Production-ready scheduler for RESEARCHER operations
 */
export class ResearchScheduler {
  private logger: Logger;
  private config: Required<SchedulerConfig>;
  private jobs: Map<string, ResearchJob> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private runningJobs = 0;
  private upgradeCoordinator: ResearcherUpgradeCoordinator;

  constructor(
    private authenticatedUser: AuthenticatedUser,
    private researcherAgent: IResearcherAgent,
    config: SchedulerConfig = {}
  ) {
    this.logger = createLogger('ResearchScheduler');
    
    this.config = {
      quarterlyCron: config.quarterlyCron || '0 5 1 */3 *', // 0 AM ET (5 AM UTC), 1st day, every 3 months
      enabled: config.enabled ?? true,
      timezone: config.timezone || 'UTC',
      maxConcurrentJobs: config.maxConcurrentJobs || 2,
      ...config
    };
    
    // Initialize upgrade coordinator
    this.upgradeCoordinator = new ResearcherUpgradeCoordinator(
      authenticatedUser, 
      this.researcherAgent
    );

    this.logger.info('Research Scheduler initialized', {
      quarterlyCron: this.config.quarterlyCron,
      timezone: this.config.timezone,
      enabled: this.config.enabled,
      hasUpgradeCoordinator: true
    });
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      this.logger.info('Scheduler disabled');
      return;
    }

    this.scheduleQuarterlyResearch();
    this.logger.info('Research Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      this.logger.info(`Stopped scheduled task: ${name}`);
    });
    
    this.scheduledTasks.clear();
    this.logger.info('Research Scheduler stopped');
  }

  /**
   * Schedule quarterly research (both context and meta-research)
   */
  private scheduleQuarterlyResearch(): void {
    // Prevent duplicate scheduling
    if (this.scheduledTasks.has('quarterly_context')) {
      this.logger.warn('Quarterly research already scheduled');
      return;
    }

    // Schedule quarterly context research (repository model configurations)
    const contextTask = cron.schedule(
      this.config.quarterlyCron,
      async () => {
        await this.executeQuarterlyContextResearch();
      },
      {
        timezone: this.config.timezone
      }
    );

    // Schedule quarterly meta-research (researcher self-evaluation)
    // Run 1 hour after context research to avoid conflicts
    const metaCronExpression = this.adjustCronTime(this.config.quarterlyCron, 1);
    const metaTask = cron.schedule(
      metaCronExpression,
      async () => {
        await this.executeQuarterlyMetaResearch();
      },
      {
        timezone: this.config.timezone
      }
    );

    contextTask.start();
    metaTask.start();

    this.scheduledTasks.set('quarterly_context', contextTask);
    this.scheduledTasks.set('quarterly_meta', metaTask);

    this.logger.info('Quarterly research scheduled', {
      contextCron: this.config.quarterlyCron,
      metaCron: metaCronExpression,
      timezone: this.config.timezone,
      nextContextRun: this.getNextRunTime(this.config.quarterlyCron),
      nextMetaRun: this.getNextRunTime(metaCronExpression)
    });
  }

  /**
   * Execute quarterly context research
   */
  private async executeQuarterlyContextResearch(): Promise<void> {
    const jobId = this.generateJobId('quarterly_context');
    
    const job: ResearchJob = {
      id: jobId,
      type: ResearchJobType.QUARTERLY_CONTEXT,
      status: 'pending',
      scheduledAt: new Date()
    };

    this.jobs.set(jobId, job);

    if (this.runningJobs >= this.config.maxConcurrentJobs) {
      this.logger.warn('Max concurrent jobs reached, skipping quarterly context research');
      job.status = 'failed';
      job.error = 'Max concurrent jobs reached';
      return;
    }

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs++;

      this.logger.info('🔄 Starting quarterly context research', { jobId });

      const result = await this.researcherAgent.conductResearchAndUpdate({});

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      this.logger.info('✅ Quarterly context research completed', {
        jobId,
        modelsResearched: result.data?.summary?.modelsResearched || 0,
        configurationsUpdated: result.data?.summary?.configurationsUpdated || 0,
        duration: job.completedAt.getTime() - job.startedAt!.getTime()
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      this.logger.error('❌ Quarterly context research failed', {
        jobId,
        error: job.error
      });
    } finally {
      this.runningJobs--;
    }
  }

  /**
   * Execute quarterly meta-research
   */
  private async executeQuarterlyMetaResearch(): Promise<void> {
    const jobId = this.generateJobId('quarterly_meta');
    
    const job: ResearchJob = {
      id: jobId,
      type: ResearchJobType.QUARTERLY_META,
      status: 'pending',
      scheduledAt: new Date()
    };

    this.jobs.set(jobId, job);

    if (this.runningJobs >= this.config.maxConcurrentJobs) {
      this.logger.warn('Max concurrent jobs reached, skipping quarterly meta-research');
      job.status = 'failed';
      job.error = 'Max concurrent jobs reached';
      return;
    }

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs++;

      this.logger.info('🔬 Starting quarterly meta-research', { jobId });

      const result = await this.researcherAgent.conductMetaResearch();

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;

      this.logger.info('✅ Quarterly meta-research completed', {
        jobId,
        shouldUpgrade: result.upgradeRecommendation?.shouldUpgrade || false,
        urgency: result.upgradeRecommendation?.urgency || 'low',
        confidence: result.metadata?.confidence || 0.5,
        duration: job.completedAt.getTime() - job.startedAt!.getTime()
      });

      // Log high-priority upgrade recommendations
      if (result.upgradeRecommendation?.shouldUpgrade && result.upgradeRecommendation?.urgency === 'high') {
        this.logger.warn('🚨 High-priority researcher upgrade recommended', {
          currentModel: result.currentModel || 'unknown',
          recommendedModel: result.recommendation || 'unknown',
          improvement: result.upgradeRecommendation?.expectedImprovement || 'unknown'
        });
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      this.logger.error('❌ Quarterly meta-research failed', {
        jobId,
        error: job.error
      });
    } finally {
      this.runningJobs--;
    }
  }

  /**
   * Trigger unscheduled research when orchestrator finds missing config
   * Uses upgrade coordinator to handle gracefully during upgrades
   */
  async triggerUnscheduledResearch(
    language: string,
    sizeCategory: string,
    agentRole: string,
    reason = 'Missing configuration requested by orchestrator',
    urgency: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<string> {
    const jobId = this.generateJobId('unscheduled');
    
    const job: ResearchJob = {
      id: jobId,
      type: ResearchJobType.UNSCHEDULED_MISSING_CONFIG,
      status: 'pending',
      scheduledAt: new Date(),
      context: { language, sizeCategory, agentRole, reason, urgency }
    };

    this.jobs.set(jobId, job);

    this.logger.info('🚨 Triggering unscheduled research for missing config', {
      jobId,
      language,
      sizeCategory,
      agentRole,
      reason,
      urgency
    });

    // Execute through upgrade coordinator for graceful handling
    setImmediate(async () => {
      await this.executeUnscheduledResearchViaCoordinator(jobId);
    });

    return jobId;
  }

  /**
   * Execute unscheduled research via upgrade coordinator for graceful handling
   */
  private async executeUnscheduledResearchViaCoordinator(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.error('Job not found', { jobId });
      return;
    }

    try {
      job.status = 'running';
      job.startedAt = new Date();

      this.logger.info('🔄 Starting unscheduled research via coordinator', { 
        jobId, 
        context: job.context 
      });

      // Research specific context that was missing via upgrade coordinator
      const { language, sizeCategory, agentRole, urgency } = job.context;
      
      // Use upgrade coordinator which handles concurrent upgrades gracefully
      const coordinatorResult = await this.upgradeCoordinator.handleResearchRequest(
        language as string,
        sizeCategory as RepositorySizeCategory,
        agentRole as string,
        [], // frameworks will be determined dynamically
        2.0, // default complexity
        (urgency as any) || 'normal'
      );

      job.status = coordinatorResult.status === 'completed' ? 'completed' : 'running';
      job.completedAt = new Date();
      job.result = {
        coordinatorResult,
        requestId: coordinatorResult.requestId,
        status: coordinatorResult.status,
        estimatedDelay: coordinatorResult.estimatedDelay
      };

      this.logger.info('✅ Unscheduled research completed via coordinator', {
        jobId,
        context: job.context,
        coordinatorStatus: coordinatorResult.status,
        requestId: coordinatorResult.requestId,
        duration: job.completedAt.getTime() - job.startedAt!.getTime()
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      this.logger.error('❌ Unscheduled research failed', {
        jobId,
        context: job.context,
        error: job.error
      });
    }
  }

  /**
   * Execute unscheduled research for missing configuration (direct method)
   */
  private async executeUnscheduledResearch(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.error('Job not found', { jobId });
      return;
    }

    if (this.runningJobs >= this.config.maxConcurrentJobs) {
      this.logger.warn('Max concurrent jobs reached, queuing unscheduled research', { jobId });
      // In production, implement proper job queue
      setTimeout(() => this.executeUnscheduledResearch(jobId), 5000);
      return;
    }

    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs++;

      this.logger.info('🔄 Starting unscheduled research', { 
        jobId, 
        context: job.context 
      });

      // Research specific context that was missing
      const { language, sizeCategory, agentRole } = job.context;
      
      // Use cached researcher for context-specific research
      const researchResult = await this.researcherAgent!.useResearcherForContext(
        language as string,
        sizeCategory as string,
        agentRole as string,
        [], // frameworks will be determined dynamically
        2.0 // default complexity
      );

      job.status = 'completed';
      job.completedAt = new Date();
      job.result = {
        prompt: researchResult.prompt,
        tokensUsed: researchResult.tokensUsed,
        templateReused: researchResult.templateReused
      };

      this.logger.info('✅ Unscheduled research completed', {
        jobId,
        context: job.context,
        tokensUsed: researchResult.tokensUsed,
        duration: job.completedAt.getTime() - job.startedAt!.getTime()
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      this.logger.error('❌ Unscheduled research failed', {
        jobId,
        context: job.context,
        error: job.error
      });
    } finally {
      this.runningJobs--;
    }
  }

  /**
   * Manual trigger for immediate research
   */
  async triggerManualResearch(type: 'context' | 'meta', reason: string): Promise<string> {
    const jobId = this.generateJobId('manual');
    
    const job: ResearchJob = {
      id: jobId,
      type: ResearchJobType.MANUAL_TRIGGER,
      status: 'pending',
      scheduledAt: new Date(),
      context: { type, reason }
    };

    this.jobs.set(jobId, job);

    this.logger.info('🔧 Manual research trigger', { jobId, type, reason });

    if (type === 'context') {
      setImmediate(() => this.executeQuarterlyContextResearch());
    } else {
      setImmediate(() => this.executeQuarterlyMetaResearch());
    }

    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ResearchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get recent jobs
   */
  getRecentJobs(limit = 10): ResearchJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    runningJobs: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    nextQuarterlyRun: string | null;
    scheduledTasks: string[];
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      runningJobs: this.runningJobs,
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      nextQuarterlyRun: this.getNextRunTime(this.config.quarterlyCron),
      scheduledTasks: Array.from(this.scheduledTasks.keys())
    };
  }

  // Utility methods

  private generateJobId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private adjustCronTime(cronExpression: string, hourOffset: number): string {
    const parts = cronExpression.split(' ');
    if (parts.length >= 2) {
      const hour = parseInt(parts[1]) + hourOffset;
      parts[1] = (hour % 24).toString();
    }
    return parts.join(' ');
  }

  private getNextRunTime(cronExpression: string): string | null {
    try {
      // Use cron.validate to check if expression is valid without creating a task
      if (cron.validate(cronExpression)) {
        // Return a mock next run time for now
        // In production, use a proper cron parser library like 'cron-parser'
        return `Next run: ${cronExpression} (calculated)`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}