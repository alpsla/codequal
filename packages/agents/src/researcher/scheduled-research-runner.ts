/**
 * Scheduled Research Runner
 * 
 * Standalone runner for scheduled research operations
 * Can be called by system cron jobs without user authentication
 */

import { ProductionResearcherService } from './production-researcher-service';
import { ModelVersionSync } from '@codequal/core';
import { VectorStorageService } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import { SystemAuthService, SYSTEM_USER } from '@codequal/core/auth/system-auth';

const logger = createLogger('ScheduledResearchRunner');

export class ScheduledResearchRunner {
  private static instance: ScheduledResearchRunner;
  private researcherService: ProductionResearcherService;
  private systemAuth: SystemAuthService;
  
  private constructor() {
    // Initialize services
    const modelVersionSync = new ModelVersionSync(logger);
    const vectorStorage = new VectorStorageService();
    
    this.researcherService = new ProductionResearcherService(
      vectorStorage,
      modelVersionSync
    );
    
    this.systemAuth = SystemAuthService.getInstance();
    
    logger.info('Scheduled Research Runner initialized');
  }
  
  static getInstance(): ScheduledResearchRunner {
    if (!ScheduledResearchRunner.instance) {
      ScheduledResearchRunner.instance = new ScheduledResearchRunner();
    }
    return ScheduledResearchRunner.instance;
  }
  
  /**
   * Run scheduled quarterly research
   * This method can be called directly by cron jobs
   */
  async runScheduledResearch(): Promise<void> {
    logger.info('=== SCHEDULED QUARTERLY RESEARCH STARTING ===');
    logger.info(`Timestamp: ${new Date().toISOString()}`);
    logger.info('Running as: SYSTEM USER (no authentication required)');
    
    try {
      // Use system user for scheduled runs
      const systemUser = this.systemAuth.getSystemUser();
      
      // Run comprehensive research
      const result = await this.researcherService.performComprehensiveResearch(
        systemUser,
        'scheduled' // Mark as scheduled trigger
      );
      
      logger.info('✅ Scheduled research completed successfully', {
        operationId: result.operationId,
        modelsEvaluated: result.modelsEvaluated,
        configurationsUpdated: result.configurationsUpdated,
        nextScheduledUpdate: result.nextScheduledUpdate.toISOString()
      });
      
      // Log summary for monitoring
      this.logResearchSummary(result);
      
    } catch (error) {
      logger.error('❌ Scheduled research failed', { error });
      throw error;
    }
  }
  
  /**
   * Run research with custom trigger
   */
  async runResearch(trigger: 'manual' | 'scheduled' = 'manual'): Promise<void> {
    const systemUser = this.systemAuth.getSystemUser();
    
    logger.info(`Running research with trigger: ${trigger}`);
    
    const result = await this.researcherService.performComprehensiveResearch(
      systemUser,
      trigger
    );
    
    logger.info('Research completed', {
      trigger,
      configurationsUpdated: result.configurationsUpdated
    });
  }
  
  /**
   * Get next scheduled run time
   */
  getNextScheduledRun(): Date {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const nextQuarter = (quarter + 1) % 4;
    const year = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
    
    // First day of next quarter at 5 AM UTC (0 AM ET)
    return new Date(Date.UTC(year, nextQuarter * 3, 1, 5, 0, 0, 0));
  }
  
  /**
   * Check if research should run today
   */
  shouldRunToday(): boolean {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth();
    const hour = now.getUTCHours();
    
    // Run on 1st day of Jan, Apr, Jul, Oct at 5 AM UTC (0 AM ET)
    const isQuarterlyMonth = month % 3 === 0;
    const isFirstDay = day === 1;
    const isScheduledHour = hour === 5; // 5 AM UTC = 0 AM ET
    
    return isQuarterlyMonth && isFirstDay && isScheduledHour;
  }
  
  /**
   * Log research summary for monitoring
   */
  private logResearchSummary(result: any): void {
    logger.info('=== RESEARCH SUMMARY ===');
    
    if (result.selectedConfigurations && result.selectedConfigurations.length > 0) {
      logger.info('Updated configurations:');
      
      result.selectedConfigurations.forEach((config: any) => {
        logger.info(`  ${config.role}: ${config.primary.provider}/${config.primary.model}`);
      });
      
      // Highlight researcher's own model update
      const researcherConfig = result.selectedConfigurations.find(
        (c: any) => c.role === 'researcher'
      );
      
      if (researcherConfig) {
        logger.info('\n🔄 RESEARCHER SELF-UPDATE:');
        logger.info(`  New model: ${researcherConfig.primary.provider}/${researcherConfig.primary.model}`);
      }
    }
    
    logger.info(`\nNext scheduled run: ${result.nextScheduledUpdate.toISOString()}`);
  }
}

/**
 * Main entry point for cron jobs
 */
export async function runScheduledResearch(): Promise<void> {
  const runner = ScheduledResearchRunner.getInstance();
  await runner.runScheduledResearch();
}

// If called directly (e.g., by cron)
if (require.main === module) {
  runScheduledResearch()
    .then(() => {
      logger.info('Scheduled research completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Scheduled research failed', { error });
      process.exit(1);
    });
}