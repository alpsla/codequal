import * as cron from 'node-cron';
import { getSupabaseClient } from '../supabase/supabase-client.factory';
import { WebhookHandlerService } from '../deepwiki-tools/webhook-handler.service';
import { createLogger } from '../../utils/logger';

export interface ScheduleConfig {
  id?: string;
  repositoryUrl: string;
  cronExpression: string;
  frequency: 'every-6-hours' | 'daily' | 'weekly' | 'monthly' | 'on-demand';
  enabledTools: string[];
  notificationChannels: string[];
  priority: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  reason: string;
  canBeDisabled: boolean;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RepositoryMetrics {
  activityMetrics: {
    commitsLastWeek: number;
    commitsLastMonth: number;
    activeDevelopers: number;
    openPullRequests: number;
    mergeFrequency: number;
    lastCommitDate: Date;
    isArchived: boolean;
  };
  qualityMetrics: {
    criticalFindings: number;
    totalFindings: number;
    securityScore: number;
    technicalDebtScore: number;
    dependencyRisk: number;
  };
  repositoryInfo: {
    size: 'small' | 'medium' | 'large';
    language: string;
    framework: string;
    isProductionRepo: boolean;
    hasCI: boolean;
  };
}

export interface AnalysisResult {
  repository: {
    url: string;
    name: string;
  };
  status: 'complete' | 'failed' | 'partial';
  metrics: {
    totalFindings: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  findings: unknown[];
}

interface ScheduledAnalysisResult {
  success: boolean;
  toolResults?: unknown[];
  error?: string;
}

interface ScheduleRunRecord {
  status: 'success' | 'failed' | 'error';
  findingsCount?: number;
  criticalFindings?: number;
  executionTimeMs?: number;
  error?: string;
}

interface DatabaseScheduleRecord {
  id: string;
  repository_url: string;
  cron_expression: string;
  frequency: ScheduleConfig['frequency'];
  enabled_tools: string[];
  notification_channels: string[];
  priority: ScheduleConfig['priority'];
  reason: string;
  can_be_disabled: boolean;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export class RepositorySchedulerService {
  private static instance: RepositorySchedulerService;
  private schedules: Map<string, cron.ScheduledTask> = new Map();
  private webhookHandler: WebhookHandlerService;
  private supabase = getSupabaseClient();
  private logger = createLogger('RepositorySchedulerService');

  private constructor() {
    // TODO: Inject proper dependencies for WebhookHandlerService
    // For now, create a minimal instance for scheduled scans
    // TODO: Replace with proper dependency injection
    const mockVectorStorage = {} as unknown;
    const mockEmbeddingService = {} as unknown;
    const mockLogger = createLogger('WebhookHandler');
    this.webhookHandler = new WebhookHandlerService(
      mockVectorStorage as any,
      mockEmbeddingService as any,
      mockLogger
    );
    this.loadActiveSchedules();
  }

  static getInstance(): RepositorySchedulerService {
    if (!RepositorySchedulerService.instance) {
      RepositorySchedulerService.instance = new RepositorySchedulerService();
    }
    return RepositorySchedulerService.instance;
  }

  /**
   * Initialize automatic schedule after first analysis
   */
  async initializeAutomaticSchedule(
    repositoryUrl: string,
    analysisResult: AnalysisResult
  ): Promise<ScheduleConfig> {
    this.logger.info(`Initializing automatic schedule for ${repositoryUrl}`);

    // Check if schedule already exists
    const existingSchedule = await this.getSchedule(repositoryUrl);
    if (existingSchedule) {
      this.logger.info(`Schedule already exists for ${repositoryUrl}`);
      return existingSchedule;
    }

    // Gather repository metrics (simplified for now)
    const repoMetrics = await this.gatherRepositoryMetrics(repositoryUrl);

    // Calculate optimal schedule
    const schedule = this.calculateOptimalSchedule({
      analysisResult,
      repoMetrics,
      isFirstAnalysis: true
    });

    // Create and persist schedule
    const createdSchedule = await this.createSchedule(schedule);

    // Start cron job
    this.startCronJob(createdSchedule);

    return createdSchedule;
  }

  /**
   * Calculate optimal schedule based on analysis results and metrics
   */
  private calculateOptimalSchedule(context: {
    analysisResult: AnalysisResult;
    repoMetrics: RepositoryMetrics;
    isFirstAnalysis: boolean;
  }): Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt'> {
    const { analysisResult, repoMetrics } = context;
    const criticalCount = analysisResult.metrics.severity.critical;

    // Priority 1: Critical security issues
    if (criticalCount > 0) {
      return {
        repositoryUrl: analysisResult.repository.url,
        frequency: 'every-6-hours',
        cronExpression: '0 */6 * * *',
        priority: 'critical',
        reason: `${criticalCount} critical security issues require immediate monitoring`,
        canBeDisabled: false,
        enabledTools: ['npm-audit', 'license-checker'],
        notificationChannels: ['email', 'in-app'],
        isActive: true
      };
    }

    // Priority 2: Production repositories
    if (repoMetrics.repositoryInfo.isProductionRepo) {
      return {
        repositoryUrl: analysisResult.repository.url,
        frequency: 'daily',
        cronExpression: '0 2 * * *', // 2 AM UTC
        priority: 'high',
        reason: 'Production repository requires daily security and quality checks',
        canBeDisabled: true,
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser'],
        notificationChannels: ['email'],
        isActive: true
      };
    }

    // Priority 3: Activity-based scheduling
    const activityScore = this.calculateActivityScore(repoMetrics.activityMetrics);

    if (activityScore > 80) {
      return {
        repositoryUrl: analysisResult.repository.url,
        frequency: 'daily',
        cronExpression: '0 3 * * *', // 3 AM UTC
        priority: 'high',
        reason: `High development activity (${activityScore} score) benefits from daily analysis`,
        canBeDisabled: true,
        enabledTools: ['npm-audit', 'license-checker', 'madge'],
        notificationChannels: ['in-app'],
        isActive: true
      };
    } else if (activityScore > 40) {
      return {
        repositoryUrl: analysisResult.repository.url,
        frequency: 'weekly',
        cronExpression: '0 3 * * 1', // Monday 3 AM UTC
        priority: 'medium',
        reason: `Moderate activity (${activityScore} score) warrants weekly checks`,
        canBeDisabled: true,
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
        notificationChannels: ['in-app'],
        isActive: true
      };
    } else if (activityScore > 10) {
      return {
        repositoryUrl: analysisResult.repository.url,
        frequency: 'monthly',
        cronExpression: '0 3 1 * *', // 1st of month
        priority: 'low',
        reason: `Low activity (${activityScore} score) suggests monthly reviews`,
        canBeDisabled: true,
        enabledTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
        notificationChannels: ['in-app'],
        isActive: true
      };
    }

    // Default: On-demand only
    return {
      repositoryUrl: analysisResult.repository.url,
      frequency: 'on-demand',
      cronExpression: '',
      priority: 'minimal',
      reason: 'Minimal activity detected - analysis on demand only',
      canBeDisabled: true,
      enabledTools: [],
      notificationChannels: [],
      isActive: false
    };
  }

  /**
   * Calculate activity score from metrics
   */
  private calculateActivityScore(metrics: RepositoryMetrics['activityMetrics']): number {
    return (
      metrics.commitsLastWeek * 4 +
      metrics.commitsLastMonth * 1 +
      metrics.activeDevelopers * 10 +
      metrics.openPullRequests * 5 +
      metrics.mergeFrequency * 3
    );
  }

  /**
   * Gather repository metrics (simplified implementation)
   */
  private async gatherRepositoryMetrics(repositoryUrl: string): Promise<RepositoryMetrics> {
    // TODO: Implement actual GitHub/GitLab API calls
    // For now, return mock data
    return {
      activityMetrics: {
        commitsLastWeek: 15,
        commitsLastMonth: 45,
        activeDevelopers: 3,
        openPullRequests: 2,
        mergeFrequency: 4,
        lastCommitDate: new Date(),
        isArchived: false
      },
      qualityMetrics: {
        criticalFindings: 0,
        totalFindings: 12,
        securityScore: 85,
        technicalDebtScore: 72,
        dependencyRisk: 0.2
      },
      repositoryInfo: {
        size: 'medium',
        language: 'TypeScript',
        framework: 'React',
        isProductionRepo: false,
        hasCI: true
      }
    };
  }

  /**
   * Create and persist schedule
   */
  private async createSchedule(schedule: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleConfig> {
    const { data, error } = await this.supabase
      .from('repository_schedules')
      .insert({
        repository_url: schedule.repositoryUrl,
        cron_expression: schedule.cronExpression,
        frequency: schedule.frequency,
        enabled_tools: schedule.enabledTools,
        notification_channels: schedule.notificationChannels,
        priority: schedule.priority,
        reason: schedule.reason,
        can_be_disabled: schedule.canBeDisabled,
        is_active: schedule.isActive,
        next_run_at: this.calculateNextRunTime(schedule.cronExpression)
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create schedule:', error);
      throw error;
    }

    return this.mapDbToScheduleConfig(data);
  }

  /**
   * Get schedule for repository
   */
  async getSchedule(repositoryUrl: string): Promise<ScheduleConfig | null> {
    const { data, error } = await this.supabase
      .from('repository_schedules')
      .select('*')
      .eq('repository_url', repositoryUrl)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      this.logger.error('Failed to get schedule:', error);
      throw error;
    }

    return this.mapDbToScheduleConfig(data);
  }

  /**
   * Update existing schedule
   */
  async updateSchedule(repositoryUrl: string, updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const { data, error } = await this.supabase
      .from('repository_schedules')
      .update({
        cron_expression: updates.cronExpression,
        frequency: updates.frequency,
        enabled_tools: updates.enabledTools,
        notification_channels: updates.notificationChannels,
        priority: updates.priority,
        reason: updates.reason,
        is_active: updates.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('repository_url', repositoryUrl)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update schedule:', error);
      throw error;
    }

    const updatedSchedule = this.mapDbToScheduleConfig(data);

    // Update cron job
    if (updatedSchedule.isActive) {
      this.updateCronJob(updatedSchedule);
    } else {
      this.stopCronJob(repositoryUrl);
    }

    return updatedSchedule;
  }

  /**
   * Start cron job for schedule
   */
  private startCronJob(schedule: ScheduleConfig): void {
    if (!schedule.isActive || !schedule.cronExpression) {
      return;
    }

    // Stop existing job if any
    this.stopCronJob(schedule.repositoryUrl);

    const task = cron.schedule(
      schedule.cronExpression,
      async () => {
        await this.runScheduledAnalysis(schedule);
      },
      {
        timezone: 'UTC'
      }
    );

    this.schedules.set(schedule.repositoryUrl, task);
    this.logger.info(`Started cron job for ${schedule.repositoryUrl} with schedule ${schedule.cronExpression}`);
  }

  /**
   * Stop cron job for repository
   */
  private stopCronJob(repositoryUrl: string): void {
    const task = this.schedules.get(repositoryUrl);
    if (task) {
      task.stop();
      this.schedules.delete(repositoryUrl);
      this.logger.info(`Stopped cron job for ${repositoryUrl}`);
    }
  }

  /**
   * Update existing cron job
   */
  private updateCronJob(schedule: ScheduleConfig): void {
    this.stopCronJob(schedule.repositoryUrl);
    this.startCronJob(schedule);
  }

  /**
   * Run scheduled analysis
   */
  private async runScheduledAnalysis(schedule: ScheduleConfig): Promise<void> {
    this.logger.info(`Running scheduled analysis for ${schedule.repositoryUrl}`);
    const startTime = Date.now();

    try {
      // Update last run time
      await this.supabase
        .from('repository_schedules')
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: this.calculateNextRunTime(schedule.cronExpression)
        })
        .eq('repository_url', schedule.repositoryUrl);

      // Trigger analysis via webhook handler
      const result = await this.webhookHandler.handleScheduledScan(
        schedule.repositoryUrl,
        {
          enabledTools: schedule.enabledTools,
          branch: 'main' // TODO: Get default branch
        }
      );

      if (result.success) {
        this.logger.info(`Scheduled analysis completed for ${schedule.repositoryUrl}`);
        
        // Record successful run
        await this.recordScheduleRun(schedule.id!, {
          status: 'success',
          findingsCount: 0, // TODO: Extract from result.toolResults
          criticalFindings: 0, // TODO: Extract from result.toolResults
          executionTimeMs: Date.now() - startTime
        });

        // Check if schedule needs adjustment
        await this.evaluateScheduleAdjustment(schedule.repositoryUrl, result);
      } else {
        this.logger.error(`Scheduled analysis failed for ${schedule.repositoryUrl}`);
        
        // Record failed run
        await this.recordScheduleRun(schedule.id!, {
          status: 'failed',
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error(`Scheduled analysis error for ${schedule.repositoryUrl}:`, error instanceof Error ? error.message : String(error));
      
      // Record error
      await this.recordScheduleRun(schedule.id!, {
        status: 'error',
        error: String(error)
      });
    }
  }

  /**
   * Evaluate if schedule needs adjustment based on results
   */
  private async evaluateScheduleAdjustment(repositoryUrl: string, result: ScheduledAnalysisResult): Promise<void> {
    // TODO: Implement schedule adjustment logic based on:
    // - New critical findings
    // - Significant changes in findings
    // - Repository activity changes
    this.logger.info(`Evaluating schedule adjustment for ${repositoryUrl}`);
  }

  /**
   * Record schedule run history
   */
  private async recordScheduleRun(scheduleId: string, run: ScheduleRunRecord): Promise<void> {
    await this.supabase
      .from('schedule_runs')
      .insert({
        schedule_id: scheduleId,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: run.status,
        findings_count: run.findingsCount,
        critical_findings: run.criticalFindings,
        execution_time_ms: run.executionTimeMs,
        error: run.error
      });
  }

  /**
   * Load active schedules on startup
   */
  private async loadActiveSchedules(): Promise<void> {
    const { data, error } = await this.supabase
      .from('repository_schedules')
      .select('*')
      .eq('is_active', true);

    if (error) {
      this.logger.error('Failed to load active schedules:', error);
      return;
    }

    for (const schedule of data || []) {
      const config = this.mapDbToScheduleConfig(schedule);
      this.startCronJob(config);
    }

    this.logger.info(`Loaded ${data?.length || 0} active schedules`);
  }

  /**
   * Calculate next run time for cron expression
   */
  private calculateNextRunTime(cronExpression: string): string | null {
    if (!cronExpression) return null;

    // TODO: Install and use cron-parser package for accurate next run calculation
    // For now, return a simple estimate based on frequency
    const now = new Date();
    const nextRun = new Date(now);

    // Simple estimation based on cron patterns
    if (cronExpression.includes('*/6')) {
      // Every 6 hours
      nextRun.setHours(nextRun.getHours() + 6);
    } else if (cronExpression === '0 2 * * *' || cronExpression === '0 3 * * *') {
      // Daily at 2 or 3 AM
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(cronExpression.includes('2') ? 2 : 3, 0, 0, 0);
    } else if (cronExpression.includes('* * 1')) {
      // Weekly on Monday
      const daysUntilMonday = (8 - nextRun.getDay()) % 7 || 7;
      nextRun.setDate(nextRun.getDate() + daysUntilMonday);
      nextRun.setHours(3, 0, 0, 0);
    } else if (cronExpression.includes('1 * *')) {
      // Monthly on 1st
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(1);
      nextRun.setHours(3, 0, 0, 0);
    }

    return nextRun.toISOString();
  }

  /**
   * Get analysis mode from schedule frequency
   */
  private getAnalysisModeFromFrequency(frequency: ScheduleConfig['frequency']): 'quick' | 'comprehensive' | 'deep' {
    switch (frequency) {
      case 'every-6-hours':
        return 'quick';
      case 'daily':
        return 'comprehensive';
      case 'weekly':
      case 'monthly':
        return 'deep';
      default:
        return 'comprehensive';
    }
  }

  /**
   * Map database record to ScheduleConfig
   */
  private mapDbToScheduleConfig(data: DatabaseScheduleRecord): ScheduleConfig {
    return {
      id: data.id,
      repositoryUrl: data.repository_url,
      cronExpression: data.cron_expression,
      frequency: data.frequency,
      enabledTools: data.enabled_tools,
      notificationChannels: data.notification_channels,
      priority: data.priority,
      reason: data.reason,
      canBeDisabled: data.can_be_disabled,
      isActive: data.is_active,
      lastRunAt: data.last_run_at ? new Date(data.last_run_at) : undefined,
      nextRunAt: data.next_run_at ? new Date(data.next_run_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Get all schedules
   */
  async getAllSchedules(): Promise<ScheduleConfig[]> {
    const { data, error } = await this.supabase
      .from('repository_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to get all schedules:', error);
      throw error;
    }

    return (data || []).map(this.mapDbToScheduleConfig);
  }

  /**
   * Pause schedule
   */
  async pauseSchedule(repositoryUrl: string): Promise<void> {
    await this.updateSchedule(repositoryUrl, { isActive: false });
  }

  /**
   * Resume schedule
   */
  async resumeSchedule(repositoryUrl: string): Promise<void> {
    const schedule = await this.getSchedule(repositoryUrl);
    if (schedule) {
      await this.updateSchedule(repositoryUrl, { isActive: true });
    }
  }
}
