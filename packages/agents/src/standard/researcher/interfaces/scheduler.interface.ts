export interface ScheduleConfig {
  id: string;
  name: string;
  cronExpression?: string;
  intervalMs?: number;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  metadata?: Record<string, any>;
}

export interface ScheduleResult {
  scheduleId: string;
  startTime: Date;
  endTime: Date;
  status: 'success' | 'failure' | 'partial';
  itemsProcessed: number;
  errors?: string[];
  results?: any;
}

export interface RescanTask {
  configId: string;
  repoType: string;
  language: string;
  lastScanned: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface IScheduler {
  /**
   * Schedule a recurring task
   */
  schedule(config: ScheduleConfig, task: () => Promise<void>): Promise<string>;
  
  /**
   * Cancel a scheduled task
   */
  cancel(scheduleId: string): Promise<void>;
  
  /**
   * Pause a scheduled task
   */
  pause(scheduleId: string): Promise<void>;
  
  /**
   * Resume a paused task
   */
  resume(scheduleId: string): Promise<void>;
  
  /**
   * Get schedule status
   */
  getStatus(scheduleId: string): Promise<ScheduleConfig>;
  
  /**
   * Get all schedules
   */
  getAllSchedules(): Promise<ScheduleConfig[]>;
  
  /**
   * Run task immediately
   */
  runNow(scheduleId: string): Promise<ScheduleResult>;
  
  /**
   * Get execution history
   */
  getHistory(scheduleId: string, limit?: number): Promise<ScheduleResult[]>;
}

export interface IResearchScheduler extends IScheduler {
  /**
   * Schedule quarterly configuration rescan
   */
  scheduleQuarterlyRescan(): Promise<string>;
  
  /**
   * Schedule model performance evaluation
   */
  scheduleModelEvaluation(frequency: 'daily' | 'weekly' | 'monthly'): Promise<string>;
  
  /**
   * Get pending rescan tasks
   */
  getPendingRescans(): Promise<RescanTask[]>;
  
  /**
   * Mark rescan as completed
   */
  completeRescan(configId: string, result: ScheduleResult): Promise<void>;
}