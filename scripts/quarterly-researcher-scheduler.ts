#!/usr/bin/env node

/**
 * 🗓️ Quarterly Researcher Scheduler
 * 
 * Runs comprehensive researcher operations every 3 months:
 * 1. Dynamic researcher discovery (finds best researcher model)
 * 2. Comprehensive configuration population (all 2,079 context combinations)
 * 
 * Schedule: 9 AM UTC on the 5th day of every 3rd month (Sep 5, Dec 5, Mar 5, Jun 5)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as cron from 'node-cron';
import { createLogger } from 'winston';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

interface SchedulerConfig {
  /**
   * Cron expression for quarterly research
   * Default: '0 9 5 */3 *' = 9 AM UTC on 5th day of every 3rd month (Sep 5, Dec 5, Mar 5, Jun 5)
   */
  quarterlyCron: string;
  
  /**
   * Enable automatic scheduling
   */
  enabled: boolean;
  
  /**
   * Timezone for scheduling
   */
  timezone: string;
  
  /**
   * Project root directory
   */
  projectRoot: string;
}

interface QuarterlyJob {
  id: string;
  type: 'dynamic_researcher' | 'comprehensive_population';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  output?: string;
}

class QuarterlyResearcherScheduler {
  private logger: any;
  private config: SchedulerConfig;
  private scheduledTask?: cron.ScheduledTask;
  private jobHistory: QuarterlyJob[] = [];

  constructor(config: Partial<SchedulerConfig> = {}) {
    // Create logger
    this.logger = createLogger({
      level: 'info',
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] [QUARTERLY-SCHEDULER] [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      ),
      transports: [
        new (require('winston').transports.Console)(),
        new (require('winston').transports.File)({ 
          filename: resolve(__dirname, '../logs/quarterly-researcher.log') 
        })
      ]
    });

    this.config = {
      quarterlyCron: config.quarterlyCron || '0 9 5 */3 *', // 9 AM UTC, 5th day, every 3 months (Sep 5, Dec 5, Mar 5, Jun 5)
      enabled: config.enabled ?? true,
      timezone: config.timezone || 'UTC',
      projectRoot: config.projectRoot || resolve(__dirname, '..')
    };

    this.logger.info('Quarterly Researcher Scheduler initialized', {
      quarterlyCron: this.config.quarterlyCron,
      timezone: this.config.timezone,
      enabled: this.config.enabled,
      projectRoot: this.config.projectRoot
    });
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      this.logger.info('Scheduler disabled by configuration');
      return;
    }

    if (this.scheduledTask) {
      this.logger.warn('Scheduler already running');
      return;
    }

    this.logger.info('Starting quarterly researcher scheduler...', {
      schedule: this.config.quarterlyCron,
      timezone: this.config.timezone,
      nextRuns: this.getNextQuarterlyRuns(4)
    });

    this.scheduledTask = cron.schedule(
      this.config.quarterlyCron,
      async () => {
        await this.executeQuarterlyResearch();
      },
      {
        timezone: this.config.timezone,
        scheduled: true
      }
    );

    this.logger.info('✅ Quarterly researcher scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = undefined;
      this.logger.info('Quarterly researcher scheduler stopped');
    }
  }

  /**
   * Execute quarterly research (both scripts)
   */
  private async executeQuarterlyResearch(): Promise<void> {
    const operationId = `quarterly_${Date.now()}`;
    
    this.logger.info('🚀 Starting quarterly researcher operation', {
      operationId,
      timestamp: new Date().toISOString(),
      quarter: this.getCurrentQuarter()
    });

    try {
      // Step 1: Run dynamic researcher discovery
      await this.runDynamicResearcher(operationId);
      
      // Step 2: Wait 10 minutes for researcher to fully complete
      this.logger.info('⏳ Waiting 10 minutes between researcher discovery and population...');
      await this.sleep(10 * 60 * 1000);
      
      // Step 3: Run comprehensive configuration population
      await this.runComprehensivePopulation(operationId);
      
      this.logger.info('🎉 Quarterly researcher operation completed successfully', {
        operationId,
        totalDuration: this.getTotalDuration(operationId),
        quarter: this.getCurrentQuarter()
      });

    } catch (error) {
      this.logger.error('❌ Quarterly researcher operation failed', {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        quarter: this.getCurrentQuarter()
      });
    }
  }

  /**
   * Run dynamic researcher discovery script
   */
  private async runDynamicResearcher(operationId: string): Promise<void> {
    const job: QuarterlyJob = {
      id: `${operationId}_dynamic_researcher`,
      type: 'dynamic_researcher',
      status: 'pending',
      startedAt: new Date()
    };

    this.jobHistory.push(job);

    try {
      job.status = 'running';
      this.logger.info('🔬 Running dynamic researcher discovery...', { jobId: job.id });

      const command = 'npx ts-node scripts/run-dynamic-researcher.ts';
      const options: ExecOptions = {
        cwd: this.config.projectRoot,
        timeout: 30 * 60 * 1000, // 30 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
      };

      const { stdout, stderr } = await execAsync(command, options);

      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
      job.output = stdout;

      this.logger.info('✅ Dynamic researcher discovery completed', {
        jobId: job.id,
        duration: `${Math.round(job.duration / 1000)}s`,
        outputLines: stdout.split('\n').length
      });

      if (stderr) {
        this.logger.warn('Dynamic researcher stderr output', { stderr });
      }

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
      job.error = error instanceof Error ? error.message : String(error);

      this.logger.error('❌ Dynamic researcher discovery failed', {
        jobId: job.id,
        error: job.error,
        duration: `${Math.round(job.duration / 1000)}s`
      });

      throw error;
    }
  }

  /**
   * Run comprehensive configuration population script
   */
  private async runComprehensivePopulation(operationId: string): Promise<void> {
    const job: QuarterlyJob = {
      id: `${operationId}_comprehensive_population`,
      type: 'comprehensive_population',
      status: 'pending',
      startedAt: new Date()
    };

    this.jobHistory.push(job);

    try {
      job.status = 'running';
      this.logger.info('🗺️ Running comprehensive configuration population...', { jobId: job.id });

      const command = 'node scripts/run-comprehensive-population.js';
      const options: ExecOptions = {
        cwd: this.config.projectRoot,
        timeout: 60 * 60 * 1000, // 60 minute timeout for comprehensive population
        maxBuffer: 20 * 1024 * 1024 // 20MB buffer for large outputs
      };

      const { stdout, stderr } = await execAsync(command, options);

      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
      job.output = stdout;

      this.logger.info('✅ Comprehensive configuration population completed', {
        jobId: job.id,
        duration: `${Math.round(job.duration / 1000)}s`,
        outputLines: stdout.split('\n').length
      });

      if (stderr) {
        this.logger.warn('Comprehensive population stderr output', { stderr });
      }

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
      job.error = error instanceof Error ? error.message : String(error);

      this.logger.error('❌ Comprehensive configuration population failed', {
        jobId: job.id,
        error: job.error,
        duration: `${Math.round(job.duration / 1000)}s`
      });

      throw error;
    }
  }

  /**
   * Manual trigger for immediate execution
   */
  async triggerManual(reason: string = 'Manual trigger'): Promise<void> {
    this.logger.info('🔧 Manual quarterly research trigger', { reason });
    await this.executeQuarterlyResearch();
  }

  /**
   * Get scheduler status and statistics
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    schedule: string;
    timezone: string;
    nextRuns: string[];
    recentJobs: QuarterlyJob[];
    stats: {
      totalJobs: number;
      completedJobs: number;
      failedJobs: number;
      avgDuration: number;
    };
  } {
    const recentJobs = this.jobHistory.slice(-10).reverse();
    const completedJobs = this.jobHistory.filter(j => j.status === 'completed');
    const avgDuration = completedJobs.length > 0 
      ? completedJobs.reduce((sum, job) => sum + (job.duration || 0), 0) / completedJobs.length
      : 0;

    return {
      enabled: this.config.enabled,
      running: !!this.scheduledTask,
      schedule: this.config.quarterlyCron,
      timezone: this.config.timezone,
      nextRuns: this.getNextQuarterlyRuns(4),
      recentJobs,
      stats: {
        totalJobs: this.jobHistory.length,
        completedJobs: completedJobs.length,
        failedJobs: this.jobHistory.filter(j => j.status === 'failed').length,
        avgDuration: Math.round(avgDuration / 1000) // Convert to seconds
      }
    };
  }

  // Utility methods
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCurrentQuarter(): string {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() returns 0-11
    const year = now.getFullYear();
    
    if (month <= 3) return `Q1 ${year}`;
    if (month <= 6) return `Q2 ${year}`;
    if (month <= 9) return `Q3 ${year}`;
    return `Q4 ${year}`;
  }

  private getNextQuarterlyRuns(count: number): string[] {
    // Calculate next quarterly runs every 3 months from current cycle (Sep 5, Dec 5, Mar 5, Jun 5)
    const quarterDays = ['Sep 5', 'Dec 5', 'Mar 5', 'Jun 5'];
    const currentYear = new Date().getFullYear();
    const nextRuns: string[] = [];
    
    for (let year = currentYear; year <= currentYear + 2 && nextRuns.length < count; year++) {
      for (const quarter of quarterDays) {
        if (nextRuns.length >= count) break;
        const date = new Date(`${quarter} ${year} 09:00:00 UTC`);
        if (date > new Date()) {
          nextRuns.push(date.toISOString());
        }
      }
    }
    
    return nextRuns;
  }

  private getTotalDuration(operationId: string): number {
    const relatedJobs = this.jobHistory.filter(job => job.id.startsWith(operationId));
    return relatedJobs.reduce((total, job) => total + (job.duration || 0), 0);
  }
}

// Create and start scheduler if run directly
if (require.main === module) {
  const scheduler = new QuarterlyResearcherScheduler({
    enabled: process.env.QUARTERLY_SCHEDULER_ENABLED !== 'false',
    timezone: process.env.QUARTERLY_SCHEDULER_TIMEZONE || 'UTC'
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping quarterly researcher scheduler...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n⏹️  Quarterly researcher scheduler terminated');
    scheduler.stop();
    process.exit(0);
  });

  // Check if manual trigger requested
  if (process.argv.includes('--manual')) {
    const reason = process.argv[process.argv.indexOf('--manual') + 1] || 'Manual CLI trigger';
    scheduler.triggerManual(reason).then(() => {
      console.log('Manual quarterly research completed');
      process.exit(0);
    }).catch(error => {
      console.error('Manual quarterly research failed:', error);
      process.exit(1);
    });
  } else {
    // Start the scheduler
    scheduler.start();
    
    // Keep the process running
    console.log('Quarterly Researcher Scheduler is running... Press Ctrl+C to stop');
    
    // Show status every hour
    setInterval(() => {
      const status = scheduler.getStatus();
      console.log(`[${new Date().toISOString()}] Scheduler Status: ${status.running ? 'RUNNING' : 'STOPPED'} | Next runs: ${status.nextRuns.slice(0, 2).join(', ')}`);
    }, 60 * 60 * 1000);
  }
}

export { QuarterlyResearcherScheduler };