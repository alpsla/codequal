/**
 * Maintenance Scheduler for Dynamic Model Configuration Matrix
 * 
 * This scheduler runs weekly maintenance tasks to keep the matrix updated
 * with latest market intelligence, model releases, and pricing changes.
 */

import { MatrixFiller } from './MatrixFiller';
import { ResearchAgent } from './ResearchAgent';
import { ModelConfigurationMatrixService } from './ModelConfigurationMatrix';
import { Logger } from '../../utils/logger';

/**
 * Maintenance task configuration
 */
interface MaintenanceConfig {
  // Weekly research schedule
  weeklyResearchDay: number; // 0 = Sunday, 1 = Monday, etc.
  weeklyResearchHour: number; // 0-23
  
  // Emergency research triggers
  enableEmergencyResearch: boolean;
  emergencyTriggers: {
    newModelAlert: boolean;
    majorPricingChange: boolean; // >20% change
    qualityDegradation: boolean; // Success rate drops >10%
  };
  
  // Performance monitoring
  performanceChecks: {
    minSuccessRate: number; // Minimum acceptable success rate (%)
    maxResponseTime: number; // Maximum acceptable response time (ms)
    costEfficiencyThreshold: number; // Alert if cost increases >X%
  };
}

/**
 * Maintenance task result
 */
interface MaintenanceResult {
  taskType: 'weekly_research' | 'emergency_research' | 'performance_check';
  executedAt: Date;
  success: boolean;
  results: {
    configurationsUpdated?: number;
    newConfigurationsAdded?: number;
    modelsDeprecated?: number;
    performanceIssues?: Array<{
      configId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  duration: number; // milliseconds
  cost: number; // estimated cost in USD
  nextScheduledRun: Date;
}

/**
 * Performance metrics tracking
 */
interface PerformanceMetrics {
  configId: string;
  successRate: number;
  avgResponseTime: number;
  avgCost: number;
  usageCount: number;
  lastUsed: Date;
  trending: 'improving' | 'stable' | 'degrading';
}

/**
 * Maintenance Scheduler Service
 */
export class MaintenanceScheduler {
  private readonly CONFIG: MaintenanceConfig = {
    weeklyResearchDay: 1, // Monday
    weeklyResearchHour: 2, // 2 AM
    enableEmergencyResearch: true,
    emergencyTriggers: {
      newModelAlert: true,
      majorPricingChange: true,
      qualityDegradation: true
    },
    performanceChecks: {
      minSuccessRate: 85, // 85% minimum success rate
      maxResponseTime: 5000, // 5 seconds max
      costEfficiencyThreshold: 25 // Alert if cost increases >25%
    }
  };

  private isRunning = false;
  private scheduledTasks: NodeJS.Timeout[] = [];

  constructor(
    private matrixService: ModelConfigurationMatrixService,
    private researchAgent: ResearchAgent,
    private matrixFiller: MatrixFiller,
    private logger: Logger
  ) {}

  /**
   * Start the maintenance scheduler
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Maintenance scheduler already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting maintenance scheduler', {
      weeklySchedule: `${this.getDayName(this.CONFIG.weeklyResearchDay)} at ${this.CONFIG.weeklyResearchHour}:00`,
      emergencyResearchEnabled: this.CONFIG.enableEmergencyResearch
    });

    // Schedule weekly research
    this.scheduleWeeklyResearch();
    
    // Schedule performance monitoring (daily)
    this.schedulePerformanceMonitoring();

    // Schedule emergency research checks (hourly)
    if (this.CONFIG.enableEmergencyResearch) {
      this.scheduleEmergencyResearchChecks();
    }

    this.logger.info('Maintenance scheduler started successfully');
  }

  /**
   * Stop the maintenance scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Maintenance scheduler not running');
      return;
    }

    this.isRunning = false;

    // Clear all scheduled tasks
    this.scheduledTasks.forEach(task => clearTimeout(task));
    this.scheduledTasks = [];

    this.logger.info('Maintenance scheduler stopped');
  }

  /**
   * Execute weekly research manually
   */
  async executeWeeklyResearch(): Promise<MaintenanceResult> {
    const startTime = Date.now();
    this.logger.info('Executing weekly research maintenance');

    try {
      // Perform market research and update matrix
      const { updated, added } = await this.matrixFiller.updateWithMarketResearch();

      // Check for performance issues
      const performanceIssues = await this.checkPerformanceIssues();

      const duration = Date.now() - startTime;
      const estimatedCost = this.estimateMaintenanceCost('weekly_research');

      const result: MaintenanceResult = {
        taskType: 'weekly_research',
        executedAt: new Date(),
        success: true,
        results: {
          configurationsUpdated: updated,
          newConfigurationsAdded: added,
          performanceIssues
        },
        duration,
        cost: estimatedCost,
        nextScheduledRun: this.calculateNextWeeklyRun()
      };

      this.logger.info('Weekly research completed', {
        updated,
        added,
        performanceIssues: performanceIssues.length,
        duration,
        cost: estimatedCost
      });

      return result;
    } catch (error) {
      this.logger.error('Weekly research failed', { error });
      
      return {
        taskType: 'weekly_research',
        executedAt: new Date(),
        success: false,
        results: {},
        duration: Date.now() - startTime,
        cost: 0,
        nextScheduledRun: this.calculateNextWeeklyRun()
      };
    }
  }

  /**
   * Execute emergency research for specific triggers
   */
  async executeEmergencyResearch(trigger: string): Promise<MaintenanceResult> {
    const startTime = Date.now();
    this.logger.info('Executing emergency research', { trigger });

    try {
      // Emergency research is more focused than weekly research
      const { updated, added } = await this.matrixFiller.updateWithMarketResearch();

      const duration = Date.now() - startTime;
      const estimatedCost = this.estimateMaintenanceCost('emergency_research');

      const result: MaintenanceResult = {
        taskType: 'emergency_research',
        executedAt: new Date(),
        success: true,
        results: {
          configurationsUpdated: updated,
          newConfigurationsAdded: added
        },
        duration,
        cost: estimatedCost,
        nextScheduledRun: new Date(Date.now() + 60 * 60 * 1000) // Next emergency check in 1 hour
      };

      this.logger.info('Emergency research completed', {
        trigger,
        updated,
        added,
        duration,
        cost: estimatedCost
      });

      return result;
    } catch (error) {
      this.logger.error('Emergency research failed', { trigger, error });
      
      return {
        taskType: 'emergency_research',
        executedAt: new Date(),
        success: false,
        results: {},
        duration: Date.now() - startTime,
        cost: 0,
        nextScheduledRun: new Date(Date.now() + 60 * 60 * 1000)
      };
    }
  }

  /**
   * Schedule weekly research
   */
  private scheduleWeeklyResearch(): void {
    const nextRun = this.calculateNextWeeklyRun();
    const delay = nextRun.getTime() - Date.now();

    this.logger.info('Scheduling weekly research', {
      nextRun: nextRun.toISOString(),
      delayHours: Math.round(delay / (1000 * 60 * 60))
    });

    const task = setTimeout(async () => {
      await this.executeWeeklyResearch();
      // Reschedule for next week
      this.scheduleWeeklyResearch();
    }, delay);

    this.scheduledTasks.push(task);
  }

  /**
   * Schedule performance monitoring (daily)
   */
  private schedulePerformanceMonitoring(): void {
    const runDaily = () => {
      const task = setTimeout(async () => {
        await this.performanceMonitoringTask();
        runDaily(); // Reschedule for next day
      }, 24 * 60 * 60 * 1000); // 24 hours

      this.scheduledTasks.push(task);
    };

    runDaily();
    this.logger.info('Performance monitoring scheduled (daily)');
  }

  /**
   * Schedule emergency research checks (hourly)
   */
  private scheduleEmergencyResearchChecks(): void {
    const runHourly = () => {
      const task = setTimeout(async () => {
        await this.checkEmergencyTriggers();
        runHourly(); // Reschedule for next hour
      }, 60 * 60 * 1000); // 1 hour

      this.scheduledTasks.push(task);
    };

    runHourly();
    this.logger.info('Emergency research checks scheduled (hourly)');
  }

  /**
   * Calculate next weekly research run time
   */
  private calculateNextWeeklyRun(): Date {
    const now = new Date();
    const nextRun = new Date();
    
    // Set to configured day and hour
    nextRun.setDate(now.getDate() + ((this.CONFIG.weeklyResearchDay + 7 - now.getDay()) % 7));
    nextRun.setHours(this.CONFIG.weeklyResearchHour, 0, 0, 0);
    
    // If the time has passed this week, schedule for next week
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    }
    
    return nextRun;
  }

  /**
   * Check for emergency research triggers
   */
  private async checkEmergencyTriggers(): Promise<void> {
    try {
      // Check for quality degradation
      if (this.CONFIG.emergencyTriggers.qualityDegradation) {
        const performanceIssues = await this.checkPerformanceIssues();
        const criticalIssues = performanceIssues.filter(issue => issue.severity === 'high');
        
        if (criticalIssues.length > 0) {
          this.logger.warn('Critical performance issues detected, triggering emergency research', {
            criticalIssues: criticalIssues.length
          });
          await this.executeEmergencyResearch('quality_degradation');
        }
      }

      // Other emergency triggers would be implemented here
      // (new model alerts, major pricing changes, etc.)
      
    } catch (error) {
      this.logger.error('Error checking emergency triggers', { error });
    }
  }

  /**
   * Performance monitoring task
   */
  private async performanceMonitoringTask(): Promise<void> {
    try {
      this.logger.info('Running performance monitoring');

      const performanceIssues = await this.checkPerformanceIssues();
      
      if (performanceIssues.length > 0) {
        this.logger.warn('Performance issues detected', {
          totalIssues: performanceIssues.length,
          highSeverity: performanceIssues.filter(i => i.severity === 'high').length,
          mediumSeverity: performanceIssues.filter(i => i.severity === 'medium').length
        });

        // Log specific issues
        performanceIssues.forEach(issue => {
          this.logger.warn('Performance issue', {
            configId: issue.configId,
            issue: issue.issue,
            severity: issue.severity
          });
        });
      } else {
        this.logger.info('Performance monitoring: All configurations performing well');
      }

    } catch (error) {
      this.logger.error('Performance monitoring task failed', { error });
    }
  }

  /**
   * Check for performance issues in configurations
   */
  private async checkPerformanceIssues(): Promise<Array<{
    configId: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>> {
    const issues: Array<{configId: string; issue: string; severity: 'low' | 'medium' | 'high'}> = [];

    try {
      const stats = await this.matrixService.getMatrixStats();
      
      // Analyze most used configurations for performance issues
      for (const config of stats.mostUsedConfigurations) {
        if (config.usageCount > 10) { // Only check configurations with meaningful usage
          // This would fetch actual performance metrics from database
          // For now, we'll simulate the check
          
          // Mock performance check - in production, this would query actual metrics
          const mockSuccessRate = 85 + Math.random() * 15; // 85-100%
          const mockResponseTime = 1000 + Math.random() * 3000; // 1-4 seconds
          
          if (mockSuccessRate < this.CONFIG.performanceChecks.minSuccessRate) {
            issues.push({
              configId: config.configId,
              issue: `Success rate ${mockSuccessRate.toFixed(1)}% below minimum ${this.CONFIG.performanceChecks.minSuccessRate}%`,
              severity: mockSuccessRate < 70 ? 'high' : 'medium'
            });
          }
          
          if (mockResponseTime > this.CONFIG.performanceChecks.maxResponseTime) {
            issues.push({
              configId: config.configId,
              issue: `Response time ${mockResponseTime.toFixed(0)}ms above maximum ${this.CONFIG.performanceChecks.maxResponseTime}ms`,
              severity: mockResponseTime > 8000 ? 'high' : 'medium'
            });
          }
        }
      }

    } catch (error) {
      this.logger.error('Error checking performance issues', { error });
    }

    return issues;
  }

  /**
   * Estimate maintenance cost
   */
  private estimateMaintenanceCost(taskType: 'weekly_research' | 'emergency_research'): number {
    // Rough cost estimates based on research API usage
    switch (taskType) {
      case 'weekly_research':
        return 0.50; // $0.50 for comprehensive weekly research
      case 'emergency_research':
        return 0.10; // $0.10 for focused emergency research
      default:
        return 0.05;
    }
  }

  /**
   * Get day name from day number
   */
  private getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    nextWeeklyRun: Date;
    scheduledTasksCount: number;
    config: MaintenanceConfig;
  } {
    return {
      isRunning: this.isRunning,
      nextWeeklyRun: this.calculateNextWeeklyRun(),
      scheduledTasksCount: this.scheduledTasks.length,
      config: this.CONFIG
    };
  }
}