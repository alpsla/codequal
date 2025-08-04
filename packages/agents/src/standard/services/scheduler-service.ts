/**
 * Scheduler Service
 * 
 * Manages scheduled tasks like quarterly model evaluations.
 * Can be integrated with cron jobs, AWS EventBridge, or other scheduling systems.
 */

import { ModelSelectionService } from './model-selection-service';

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // Cron expression
  lastRun?: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'completed';
  handler: () => Promise<void>;
}

export interface ISchedulerService {
  /**
   * Register a scheduled task
   */
  registerTask(task: ScheduledTask): void;
  
  /**
   * Run due tasks
   */
  runDueTasks(): Promise<void>;
  
  /**
   * Get all scheduled tasks
   */
  getTasks(): ScheduledTask[];
  
  /**
   * Manually trigger a task
   */
  triggerTask(taskId: string): Promise<void>;
}

export class SchedulerService implements ISchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  
  constructor(
    private modelSelectionService: ModelSelectionService,
    private logger?: any
  ) {
    // Register default tasks
    this.registerDefaultTasks();
  }
  
  registerTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    this.log('info', `Registered task: ${task.name}`, {
      schedule: task.schedule,
      nextRun: task.nextRun
    });
  }
  
  async runDueTasks(): Promise<void> {
    const now = new Date();
    const dueTasks = Array.from(this.tasks.values()).filter(
      task => task.status === 'active' && task.nextRun <= now
    );
    
    this.log('info', `Found ${dueTasks.length} due tasks`);
    
    for (const task of dueTasks) {
      try {
        this.log('info', `Running task: ${task.name}`);
        await task.handler();
        
        // Update task
        task.lastRun = now;
        task.nextRun = this.calculateNextRun(task.schedule, now);
        
        this.log('info', `Task completed: ${task.name}`, {
          nextRun: task.nextRun
        });
      } catch (error) {
        this.log('error', `Task failed: ${task.name}`, error);
      }
    }
  }
  
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }
  
  async triggerTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    this.log('info', `Manually triggering task: ${task.name}`);
    await task.handler();
    
    task.lastRun = new Date();
    task.nextRun = this.calculateNextRun(task.schedule, task.lastRun);
  }
  
  private registerDefaultTasks(): void {
    // Quarterly model evaluation task
    this.registerTask({
      id: 'quarterly-model-evaluation',
      name: 'Quarterly Model Evaluation',
      schedule: '0 0 1 */3 *', // First day of every 3rd month at midnight
      nextRun: this.calculateNextQuarterlyRun(),
      status: 'active',
      handler: async () => {
        await this.modelSelectionService.runQuarterlyEvaluation();
      }
    });
    
    // Weekly model performance check (lightweight)
    this.registerTask({
      id: 'weekly-model-check',
      name: 'Weekly Model Performance Check',
      schedule: '0 0 * * 0', // Every Sunday at midnight
      nextRun: this.calculateNextWeeklyRun(),
      status: 'active',
      handler: async () => {
        // Check if models are performing as expected
        // This could trigger an early evaluation if issues are detected
        this.log('info', 'Running weekly model performance check');
        // Implementation would go here
      }
    });
  }
  
  private calculateNextRun(cronExpression: string, fromDate: Date): Date {
    // In a real implementation, use a cron parser library
    // For now, simple logic based on the expression
    
    if (cronExpression === '0 0 1 */3 *') {
      // Quarterly - first day of every 3rd month
      return this.calculateNextQuarterlyRun(fromDate);
    } else if (cronExpression === '0 0 * * 0') {
      // Weekly - every Sunday
      return this.calculateNextWeeklyRun(fromDate);
    }
    
    // Default to tomorrow
    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  private calculateNextQuarterlyRun(fromDate: Date = new Date()): Date {
    const date = new Date(fromDate);
    const currentMonth = date.getMonth();
    
    // Quarterly months: 0 (Jan), 3 (Apr), 6 (Jul), 9 (Oct)
    const quarterlyMonths = [0, 3, 6, 9];
    
    // Find next quarterly month
    let nextMonth = quarterlyMonths.find(m => m > currentMonth);
    if (nextMonth === undefined) {
      // Next quarter is in the next year
      nextMonth = 0;
      date.setFullYear(date.getFullYear() + 1);
    }
    
    date.setMonth(nextMonth);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    
    return date;
  }
  
  private calculateNextWeeklyRun(fromDate: Date = new Date()): Date {
    const date = new Date(fromDate);
    const dayOfWeek = date.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    
    date.setDate(date.getDate() + daysUntilSunday);
    date.setHours(0, 0, 0, 0);
    
    return date;
  }
  
  private log(level: string, message: string, data?: any) {
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console.log(`[SchedulerService] ${level}: ${message}`, data || '');
    }
  }
}

/**
 * Example integration with AWS EventBridge or cron job
 * 
 * This function would be called by your scheduling system
 */
export async function runScheduledTasks(
  modelSelectionService: ModelSelectionService,
  logger?: any
): Promise<void> {
  const scheduler = new SchedulerService(modelSelectionService, logger);
  await scheduler.runDueTasks();
}