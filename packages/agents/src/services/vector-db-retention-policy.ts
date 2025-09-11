/**
 * Vector DB Retention Policy Service
 * Manages data lifecycle and prevents exponential growth
 */

import { createLogger } from '@codequal/core/utils';
import { CronJob } from 'cron';

export interface RetentionPolicyConfig {
  // Tool results retention
  toolResults: {
    maxAgeInDays: number;           // Delete after X days
    maxRecordsPerRepo: number;      // Max records per repository
    keepCriticalFindings: boolean;  // Always keep critical security findings
    aggregateBeforeDelete: boolean; // Create aggregated summaries before deletion
  };
  
  // Analysis results retention
  analysisResults: {
    maxAgeInDays: number;
    maxAnalysesPerRepo: number;
    keepFailedAnalyses: boolean;
  };
  
  // Embeddings optimization
  embeddings: {
    compactionEnabled: boolean;     // Compact similar embeddings
    similarityThreshold: number;    // Threshold for considering embeddings similar
    maxEmbeddingsPerCategory: number;
  };
  
  // Storage limits
  storage: {
    maxTotalRecords: number;        // Global limit
    warningThreshold: number;       // Percentage to trigger warnings (e.g., 80)
    criticalThreshold: number;      // Percentage to trigger aggressive cleanup (e.g., 95)
  };
}

export interface RetentionStats {
  totalRecords: number;
  recordsByAge: Record<string, number>;
  recordsByType: Record<string, number>;
  storageUsagePercent: number;
  lastCleanup: Date;
  nextScheduledCleanup: Date;
}

export class VectorDBRetentionPolicy {
  private readonly logger = createLogger('VectorDBRetentionPolicy');
  private cronJob?: CronJob;
  private isRunning = false;
  
  private readonly defaultConfig: RetentionPolicyConfig = {
    toolResults: {
      maxAgeInDays: 90,              // Keep for 3 months
      maxRecordsPerRepo: 10000,      // Max 10k records per repo
      keepCriticalFindings: true,    // Always keep critical security issues
      aggregateBeforeDelete: true    // Create summaries before deletion
    },
    analysisResults: {
      maxAgeInDays: 180,             // Keep for 6 months
      maxAnalysesPerRepo: 1000,      // Max 1k analyses per repo
      keepFailedAnalyses: false      // Don't keep failed analyses long-term
    },
    embeddings: {
      compactionEnabled: true,
      similarityThreshold: 0.95,     // Very similar embeddings
      maxEmbeddingsPerCategory: 5000
    },
    storage: {
      maxTotalRecords: 1000000,      // 1M records total
      warningThreshold: 80,
      criticalThreshold: 95
    }
  };
  
  constructor(
    private readonly supabase: any,
    private readonly config: Partial<RetentionPolicyConfig> = {}
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }
  
  /**
   * Start the retention policy cron job
   */
  startRetentionPolicy(schedule = '0 2 * * *'): void { // Default: 2 AM daily
    if (this.cronJob) {
      this.logger.warn('Retention policy already running');
      return;
    }
    
    this.cronJob = new CronJob(schedule, async () => {
      await this.executeRetentionPolicy();
    });
    
    this.cronJob.start();
    this.logger.info('Retention policy started', { schedule });
  }
  
  /**
   * Stop the retention policy
   */
  stopRetentionPolicy(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = undefined;
      this.logger.info('Retention policy stopped');
    }
  }
  
  /**
   * Execute retention policy
   */
  async executeRetentionPolicy(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Retention policy already executing, skipping');
      return;
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting retention policy execution');
      
      // Get current stats
      const stats = await this.getRetentionStats();
      this.logger.info('Current storage stats', { ...stats } as Record<string, unknown>);
      
      // Check if we need aggressive cleanup
      const isAggressive = stats.storageUsagePercent >= this.config.storage!.criticalThreshold!;
      
      // Execute cleanup tasks
      const results = await Promise.allSettled([
        this.cleanupOldToolResults(isAggressive),
        this.cleanupOldAnalysisResults(isAggressive),
        this.compactEmbeddings(),
        this.enforcePerRepositoryLimits(),
        this.createAggregatedSummaries()
      ]);
      
      // Log results
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.error('Some retention tasks failed', {
          failures: failures.map(f => (f as any).reason)
        });
      }
      
      // Get updated stats
      const newStats = await this.getRetentionStats();
      
      this.logger.info('Retention policy execution completed', {
        duration: Date.now() - startTime,
        oldUsage: stats.storageUsagePercent,
        newUsage: newStats.storageUsagePercent,
        recordsDeleted: stats.totalRecords - newStats.totalRecords
      });
      
    } catch (error) {
      this.logger.error('Retention policy execution failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Clean up old tool results
   */
  private async cleanupOldToolResults(aggressive = false): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.toolResults!.maxAgeInDays!);
      
      // Build query
      let query = this.supabase
        .from('tool_results_vectors')
        .delete()
        .lt('metadata->>created_at', cutoffDate.toISOString());
      
      // Keep critical findings unless aggressive cleanup
      if (this.config.toolResults!.keepCriticalFindings && !aggressive) {
        query = query.not('metadata->>severity', 'eq', 'critical');
      }
      
      const { data, error } = await query.select('id');
      
      if (error) throw error;
      
      this.logger.info('Cleaned up old tool results', {
        deletedCount: data?.length || 0,
        cutoffDate: cutoffDate.toISOString(),
        aggressive
      });
      
    } catch (error) {
      this.logger.error('Failed to cleanup tool results', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Clean up old analysis results
   */
  private async cleanupOldAnalysisResults(aggressive = false): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.analysisResults!.maxAgeInDays!);
      
      // Delete old analysis vectors
      const { data, error } = await this.supabase
        .from('analysis_vectors')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');
      
      if (error) throw error;
      
      this.logger.info('Cleaned up old analysis results', {
        deletedCount: data?.length || 0,
        cutoffDate: cutoffDate.toISOString()
      });
      
    } catch (error) {
      this.logger.error('Failed to cleanup analysis results', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Compact similar embeddings to save space
   */
  private async compactEmbeddings(): Promise<void> {
    if (!this.config.embeddings!.compactionEnabled) {
      return;
    }
    
    try {
      // This would typically be done via a stored procedure
      // that finds and merges very similar embeddings
      const { data, error } = await this.supabase.rpc('compact_similar_embeddings', {
        similarity_threshold: this.config.embeddings!.similarityThreshold,
        batch_size: 100
      });
      
      if (error) throw error;
      
      this.logger.info('Compacted similar embeddings', {
        compactedCount: data?.compacted_count || 0
      });
      
    } catch (error) {
      this.logger.warn('Embedding compaction not implemented or failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Enforce per-repository limits
   */
  private async enforcePerRepositoryLimits(): Promise<void> {
    try {
      // Get repositories with too many records
      const { data: repos, error: repoError } = await this.supabase
        .from('tool_results_vectors')
        .select('metadata->>repository_id', { count: 'exact' })
        .order('created_at', { ascending: true });
      
      if (repoError) throw repoError;
      
      // Count records per repository
      const repoCounts = new Map<string, number>();
      for (const record of repos || []) {
        const repoId = record['metadata->>repository_id'];
        repoCounts.set(repoId, (repoCounts.get(repoId) || 0) + 1);
      }
      
      // Delete excess records for each repository
      for (const [repoId, count] of repoCounts.entries()) {
        if (count > this.config.toolResults!.maxRecordsPerRepo!) {
          const excessCount = count - this.config.toolResults!.maxRecordsPerRepo!;
          
          // Delete oldest records
          const { error } = await this.supabase
            .from('tool_results_vectors')
            .delete()
            .eq('metadata->>repository_id', repoId)
            .order('metadata->>created_at', { ascending: true })
            .limit(excessCount);
          
          if (error) {
            this.logger.error('Failed to enforce repository limit', {
              repoId,
              error: error.message
            });
          } else {
            this.logger.info('Enforced repository limit', {
              repoId,
              deletedCount: excessCount
            });
          }
        }
      }
      
    } catch (error) {
      this.logger.error('Failed to enforce repository limits', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create aggregated summaries before deletion
   */
  private async createAggregatedSummaries(): Promise<void> {
    if (!this.config.toolResults!.aggregateBeforeDelete) {
      return;
    }
    
    try {
      // Get data that will be deleted soon
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() - (this.config.toolResults!.maxAgeInDays! - 7));
      
      const { data: oldRecords, error } = await this.supabase
        .from('tool_results_vectors')
        .select('*')
        .lt('metadata->>created_at', warningDate.toISOString())
        .not('metadata->>finding_type', 'eq', 'summary');
      
      if (error) throw error;
      
      // Group by repository and tool
      const aggregations = new Map<string, any[]>();
      for (const record of oldRecords || []) {
        const key = `${record.metadata.repository_id}:${record.metadata.tool_id}`;
        if (!aggregations.has(key)) {
          aggregations.set(key, []);
        }
        aggregations.get(key)!.push(record);
      }
      
      // Create summaries
      const summaries = [];
      for (const [key, records] of aggregations.entries()) {
        const [repoId, toolId] = key.split(':');
        
        const summary = {
          id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: this.createAggregatedContent(records),
          metadata: {
            repository_id: repoId,
            tool_id: toolId,
            finding_type: 'aggregated_summary',
            severity: 'info',
            category: 'historical_summary',
            created_at: new Date().toISOString(),
            aggregated_count: records.length,
            date_range: {
              start: Math.min(...records.map(r => new Date(r.metadata.created_at).getTime())),
              end: Math.max(...records.map(r => new Date(r.metadata.created_at).getTime()))
            }
          }
        };
        
        summaries.push(summary);
      }
      
      if (summaries.length > 0) {
        const { error: insertError } = await this.supabase
          .from('tool_results_vectors')
          .insert(summaries);
        
        if (insertError) throw insertError;
        
        this.logger.info('Created aggregated summaries', {
          summaryCount: summaries.length
        });
      }
      
    } catch (error) {
      this.logger.error('Failed to create aggregated summaries', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Create aggregated content from records
   */
  private createAggregatedContent(records: any[]): string {
    const stats = {
      totalFindings: records.length,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      commonIssues: [] as string[]
    };
    
    // Aggregate statistics
    for (const record of records) {
      const severity = record.metadata.severity || 'unknown';
      const category = record.metadata.category || 'unknown';
      
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }
    
    // Find common issues (simplified)
    const issueFrequency = new Map<string, number>();
    for (const record of records) {
      const message = record.content.split('\n').find((line: string) => line.startsWith('Message:'))?.replace('Message: ', '') || '';
      if (message) {
        issueFrequency.set(message, (issueFrequency.get(message) || 0) + 1);
      }
    }
    
    stats.commonIssues = Array.from(issueFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue, count]) => `${issue} (${count} occurrences)`);
    
    return `Historical Summary - ${records[0]?.metadata.tool_id || 'Unknown Tool'}
    
Total Findings: ${stats.totalFindings}
Date Range: ${new Date(Math.min(...records.map(r => new Date(r.metadata.created_at).getTime()))).toLocaleDateString()} - ${new Date(Math.max(...records.map(r => new Date(r.metadata.created_at).getTime()))).toLocaleDateString()}

Severity Distribution:
${Object.entries(stats.bySeverity).map(([sev, count]) => `  ${sev}: ${count}`).join('\n')}

Category Distribution:
${Object.entries(stats.byCategory).map(([cat, count]) => `  ${cat}: ${count}`).join('\n')}

Common Issues:
${stats.commonIssues.map(issue => `  - ${issue}`).join('\n')}

This is an aggregated summary of historical findings that have been archived.`;
  }
  
  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<RetentionStats> {
    try {
      // Get total records
      const { count: toolResultsCount } = await this.supabase
        .from('tool_results_vectors')
        .select('*', { count: 'exact', head: true });
      
      const { count: analysisCount } = await this.supabase
        .from('analysis_vectors')
        .select('*', { count: 'exact', head: true });
      
      const totalRecords = (toolResultsCount || 0) + (analysisCount || 0);
      
      // Get records by age
      const now = new Date();
      const ageRanges = [7, 30, 90, 180]; // days
      const recordsByAge: Record<string, number> = {};
      
      for (const days of ageRanges) {
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);
        
        const { count } = await this.supabase
          .from('tool_results_vectors')
          .select('*', { count: 'exact', head: true })
          .gte('metadata->>created_at', cutoff.toISOString());
        
        recordsByAge[`${days}days`] = count || 0;
      }
      
      // Calculate storage usage percentage
      const storageUsagePercent = (totalRecords / this.config.storage!.maxTotalRecords!) * 100;
      
      return {
        totalRecords,
        recordsByAge,
        recordsByType: {
          toolResults: toolResultsCount || 0,
          analysisResults: analysisCount || 0
        },
        storageUsagePercent,
        lastCleanup: new Date(), // Would be tracked in DB
        nextScheduledCleanup: this.cronJob?.nextDate()?.toJSDate() || new Date()
      };
      
    } catch (error) {
      this.logger.error('Failed to get retention stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Manually trigger cleanup if needed
   */
  async triggerEmergencyCleanup(): Promise<void> {
    this.logger.warn('Emergency cleanup triggered');
    await this.executeRetentionPolicy();
  }
}

// Singleton instance
let retentionPolicy: VectorDBRetentionPolicy | null = null;

/**
 * Get or create retention policy instance
 */
export function getVectorDBRetentionPolicy(
  supabase: any,
  config?: Partial<RetentionPolicyConfig>
): VectorDBRetentionPolicy {
  if (!retentionPolicy) {
    retentionPolicy = new VectorDBRetentionPolicy(supabase, config);
  }
  return retentionPolicy;
}