/**
 * Model Update Scheduler Service
 * Runs every 3 months to refresh model configurations with latest AI models
 */

import * as cron from 'node-cron';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ModelUpdateScheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  
  /**
   * Start the scheduler
   * Runs on the 1st of every 3rd month at 2 AM UTC
   */
  start(): void {
    if (this.cronJob) {
      console.log('⚠️  Scheduler already running');
      return;
    }
    
    // Run every 3 months on the 1st at 2 AM UTC
    // Cron expression: "0 2 1 */3 *" means:
    // - 0 minutes
    // - 2 hours (2 AM)
    // - 1st day of month
    // - Every 3rd month
    // - Any day of week
    const cronExpression = '0 2 1 */3 *';
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.runModelUpdate();
    });
    
    // Start the cron job
    this.cronJob.start();
    
    console.log('✅ Model update scheduler started');
    console.log(`   Schedule: Every 3 months on the 1st at 2 AM UTC`);
    console.log(`   Next run: ${this.getNextRunDate()}`);
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Model update scheduler stopped');
    }
  }
  
  /**
   * Run model update immediately (for testing)
   */
  async runNow(): Promise<void> {
    console.log('🚀 Running model update immediately...');
    await this.runModelUpdate();
  }
  
  /**
   * Execute the model update process
   */
  private async runModelUpdate(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Model update already in progress, skipping...');
      return;
    }
    
    this.isRunning = true;
    const startTime = new Date();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Starting Quarterly Model Configuration Update');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Start time: ${startTime.toISOString()}`);
    
    try {
      // Step 1: Clear old configurations
      console.log('\n📦 Step 1: Clearing old configurations...');
      const scriptPath = path.join(__dirname, '..', 'scripts', 'clear-and-regenerate-configs.ts');
      
      // Step 2: Run the researcher to discover new models
      console.log('🔍 Step 2: Researching latest AI models...');
      // Note: In production, this would call the actual researcher agent
      // For now, we use the generate script which creates template configs
      
      // Step 3: Generate and store new configurations
      console.log('💾 Step 3: Generating and storing new configurations...');
      const { stdout, stderr } = await execAsync(
        `npx ts-node "${scriptPath}"`,
        { cwd: path.join(__dirname, '..', '..', '..') }
      );
      
      if (stderr && !stderr.includes('Warning')) {
        console.error('⚠️  Warnings during update:', stderr);
      }
      
      // Step 4: Log completion
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      
      console.log('\n✅ Model configuration update completed successfully');
      console.log(`   Duration: ${duration} seconds`);
      console.log(`   Next update: ${this.getNextRunDate()}`);
      console.log('═══════════════════════════════════════════════════════');
      
      // Step 5: Send notification (in production, this would send an email/slack)
      this.sendUpdateNotification(true, duration);
      
    } catch (error) {
      console.error('❌ Error during model update:', error);
      this.sendUpdateNotification(false, 0, error as Error);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Calculate next run date (3 months from now, on the 1st)
   */
  private getNextRunDate(): string {
    const now = new Date();
    const nextRun = new Date(now);
    
    // Move to next quarter
    const currentMonth = now.getMonth();
    const nextQuarterMonth = Math.floor((currentMonth + 3) / 3) * 3;
    
    if (nextQuarterMonth <= currentMonth) {
      nextRun.setMonth(nextQuarterMonth + 3);
    } else {
      nextRun.setMonth(nextQuarterMonth);
    }
    
    // Set to 1st of month at 2 AM UTC
    nextRun.setDate(1);
    nextRun.setUTCHours(2, 0, 0, 0);
    
    return nextRun.toISOString();
  }
  
  /**
   * Send notification about update status
   */
  private sendUpdateNotification(success: boolean, duration: number, error?: Error): void {
    const notification = {
      type: success ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      message: success 
        ? `Model configurations updated successfully in ${duration}s`
        : `Model configuration update failed: ${error?.message}`,
      nextRun: this.getNextRunDate()
    };
    
    // In production, this would send to:
    // - Slack webhook
    // - Email to administrators
    // - Monitoring dashboard
    console.log('\n📧 Notification:', notification);
  }
  
  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    isUpdating: boolean;
    nextRun: string;
  } {
    return {
      isRunning: this.cronJob !== null,
      isUpdating: this.isRunning,
      nextRun: this.getNextRunDate()
    };
  }
}

// Singleton instance
export const modelUpdateScheduler = new ModelUpdateScheduler();