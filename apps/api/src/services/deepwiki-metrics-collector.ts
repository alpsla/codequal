import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';
import { getSupabase } from '@codequal/database/supabase/client';

const logger = createLogger('deepwiki-metrics-collector');
const execAsync = promisify(exec);

export class DeepWikiMetricsCollector {
  private readonly NAMESPACE = 'codequal-dev';
  private readonly POD_NAME = 'deepwiki';
  private collectionInterval: NodeJS.Timeout | null = null;

  /**
   * Start collecting metrics at regular intervals
   */
  startCollection(intervalMs = 60000): void {
    logger.info('Starting DeepWiki metrics collection', { intervalMs });
    
    // Collect immediately
    this.collectMetrics();
    
    // Then collect at intervals
    this.collectionInterval = setInterval(() => {
      this.collectMetrics().catch(err => 
        logger.error('Failed to collect metrics', { error: err })
      );
    }, intervalMs);
  }

  /**
   * Stop collecting metrics
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.info('Stopped DeepWiki metrics collection');
    }
  }

  /**
   * Collect metrics from DeepWiki pod and store in Supabase
   */
  async collectMetrics(): Promise<void> {
    try {
      logger.info('Collecting DeepWiki metrics');
      
      // Get disk usage from pod
      const { stdout: diskInfo } = await execAsync(
        `kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- df -BG /root/.adalflow | tail -1`
      );
      
      const parts = diskInfo.trim().split(/\s+/);
      const totalGB = parseInt(parts[1].replace('G', ''));
      const usedGB = parseInt(parts[2].replace('G', ''));
      const availableGB = parseInt(parts[3].replace('G', ''));
      const percentUsed = parseInt(parts[4].replace('%', ''));
      
      // Get repository count
      const { stdout: repoList } = await execAsync(
        `kubectl exec -n ${this.NAMESPACE} deployment/${this.POD_NAME} -- ls -la /root/.adalflow/repos 2>/dev/null || echo ""`
      );
      
      const repoCount = Math.max(0, (repoList.match(/^d/gm) || []).length - 2);
      
      // Store in Supabase
      const { error } = await getSupabase()
        .from('deepwiki_metrics')
        .insert({
          disk_total_gb: totalGB,
          disk_used_gb: usedGB,
          disk_available_gb: availableGB,
          disk_usage_percent: percentUsed,
          active_repositories: repoCount,
          metadata: {
            pod_name: this.POD_NAME,
            namespace: this.NAMESPACE,
            collection_time: new Date().toISOString()
          }
        });
      
      if (error) {
        logger.error('Failed to store metrics in Supabase', { error });
      } else {
        logger.info('Successfully stored metrics', {
          percentUsed,
          repoCount,
          usedGB,
          availableGB
        });
      }
      
      // Check if cleanup is needed (> 70% usage)
      if (percentUsed > 70) {
        logger.warn('Disk usage above 70%, cleanup may be needed', { percentUsed });
      }
      
    } catch (error) {
      logger.error('Failed to collect DeepWiki metrics', { error });
    }
  }

  /**
   * Record analysis start
   */
  async recordAnalysisStart(repositoryUrl: string): Promise<number | null> {
    try {
      const repoName = repositoryUrl.split('/').pop()?.replace('.git', '') || '';
      
      const { data, error } = await getSupabase()
        .from('analysis_history')
        .insert({
          repository_url: repositoryUrl,
          repository_name: repoName,
          status: 'started'
        })
        .select('id')
        .single();
      
      if (error) {
        logger.error('Failed to record analysis start', { error });
        return null;
      }
      
      return data?.id as number;
    } catch (error) {
      logger.error('Failed to record analysis start', { error });
      return null;
    }
  }

  /**
   * Record analysis completion
   */
  async recordAnalysisComplete(
    analysisId: number,
    success: boolean,
    diskUsageMb?: number,
    durationSeconds?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('analysis_history')
        .update({
          status: success ? 'completed' : 'failed',
          disk_usage_mb: diskUsageMb,
          analysis_duration_seconds: durationSeconds,
          error_message: errorMessage
        })
        .eq('id', analysisId);
      
      if (error) {
        logger.error('Failed to record analysis completion', { error });
      }
    } catch (error) {
      logger.error('Failed to record analysis completion', { error });
    }
  }

  /**
   * Record cleanup operation
   */
  async recordCleanup(
    success: boolean,
    repositoriesCleaned: number,
    diskFreedMb: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('deepwiki_cleanups')
        .insert({
          cleanup_time: new Date().toISOString(),
          cleanup_status: success ? 'success' : 'failed',
          repositories_cleaned: repositoriesCleaned,
          disk_freed_mb: diskFreedMb,
          error_message: errorMessage
        });
      
      if (error) {
        logger.error('Failed to record cleanup', { error });
      }
    } catch (error) {
      logger.error('Failed to record cleanup', { error });
    }
  }
}

// Export singleton instance
export const metricsCollector = new DeepWikiMetricsCollector();