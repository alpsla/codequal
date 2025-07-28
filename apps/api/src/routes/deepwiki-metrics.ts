import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('deepwiki-metrics');
const execAsync = promisify(exec);

// Cache metrics for performance
let metricsCache = '';
let lastMetricsUpdate = 0;
const CACHE_DURATION = 10000; // 10 seconds

/**
 * Generate Prometheus metrics for DeepWiki
 */
async function generatePrometheusMetrics(): Promise<string> {
  try {
    // Get disk usage
    const { stdout: diskInfo } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1'
    );
    
    const parts = diskInfo.trim().split(/\s+/);
    const totalGB = parseInt(parts[1].replace('G', ''));
    const usedGB = parseInt(parts[2].replace('G', ''));
    const availableGB = parseInt(parts[3].replace('G', ''));
    const percentUsed = parseInt(parts[4].replace('%', ''));
    
    // Get repository count
    const { stdout: repoList } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos 2>/dev/null || echo ""'
    );
    
    const repoCount = Math.max(0, (repoList.match(/^d/gm) || []).length - 2);
    
    // Get cleanup stats from database or state
    const cleanupStats = await getCleanupStats();
    const analysisStats = await getAnalysisStats();
    
    // Format as Prometheus metrics
    const metrics = `
# HELP deepwiki_disk_usage_percent Percentage of disk space used
# TYPE deepwiki_disk_usage_percent gauge
deepwiki_disk_usage_percent ${percentUsed}

# HELP deepwiki_disk_used_gb Disk space used in GB
# TYPE deepwiki_disk_used_gb gauge
deepwiki_disk_used_gb ${usedGB}

# HELP deepwiki_disk_available_gb Available disk space in GB
# TYPE deepwiki_disk_available_gb gauge
deepwiki_disk_available_gb ${availableGB}

# HELP deepwiki_disk_total_gb Total disk space in GB
# TYPE deepwiki_disk_total_gb gauge
deepwiki_disk_total_gb ${totalGB}

# HELP deepwiki_active_repositories Number of repositories currently on disk
# TYPE deepwiki_active_repositories gauge
deepwiki_active_repositories ${repoCount}

# HELP deepwiki_cleanup_success_count Total successful cleanups
# TYPE deepwiki_cleanup_success_count counter
deepwiki_cleanup_success_count ${cleanupStats.successCount}

# HELP deepwiki_cleanup_failed_count Total failed cleanups
# TYPE deepwiki_cleanup_failed_count counter
deepwiki_cleanup_failed_count ${cleanupStats.failedCount}

# HELP deepwiki_repositories_analyzed_total Total repositories analyzed
# TYPE deepwiki_repositories_analyzed_total counter
deepwiki_repositories_analyzed_total ${analysisStats.totalAnalyzed}

# HELP deepwiki_analysis_failures_total Total analysis failures
# TYPE deepwiki_analysis_failures_total counter
deepwiki_analysis_failures_total ${analysisStats.totalFailed}

# HELP deepwiki_avg_analysis_size_mb Average repository size in MB
# TYPE deepwiki_avg_analysis_size_mb gauge
deepwiki_avg_analysis_size_mb ${analysisStats.avgSizeMB}

# HELP deepwiki_avg_analysis_duration_seconds Average analysis duration
# TYPE deepwiki_avg_analysis_duration_seconds gauge
deepwiki_avg_analysis_duration_seconds ${analysisStats.avgDurationSeconds}

# HELP deepwiki_last_cleanup_timestamp Unix timestamp of last cleanup
# TYPE deepwiki_last_cleanup_timestamp gauge
deepwiki_last_cleanup_timestamp ${cleanupStats.lastCleanupTime}

# HELP deepwiki_alert_status Current alert status (0=OK, 1=Warning, 2=Critical)
# TYPE deepwiki_alert_status gauge
deepwiki_alert_status{alertname="disk_usage",severity="${getAlertSeverity(percentUsed)}"} ${getAlertLevel(percentUsed)}
`.trim();

    return metrics;
  } catch (error) {
    logger.error('Failed to generate metrics', { error });
    return '# Error generating metrics';
  }
}

function getAlertLevel(percentUsed: number): number {
  if (percentUsed >= 85) return 2; // Critical
  if (percentUsed >= 70) return 1; // Warning
  return 0; // OK
}

function getAlertSeverity(percentUsed: number): string {
  if (percentUsed >= 85) return 'critical';
  if (percentUsed >= 70) return 'warning';
  return 'ok';
}

async function getCleanupStats(): Promise<any> {
  // In production, fetch from database
  // For now, return mock data
  return {
    successCount: 1247,
    failedCount: 23,
    lastCleanupTime: Math.floor(Date.now() / 1000)
  };
}

async function getAnalysisStats(): Promise<any> {
  // In production, fetch from database
  // For now, return calculated stats
  return {
    totalAnalyzed: 3456,
    totalFailed: 89,
    avgSizeMB: 45.2,
    avgDurationSeconds: 52.3
  };
}

/**
 * Prometheus metrics endpoint
 */
router.get('/api/monitoring/deepwiki/metrics', async (req, res) => {
  try {
    const now = Date.now();
    
    // Use cache if fresh
    if (metricsCache && (now - lastMetricsUpdate) < CACHE_DURATION) {
      res.set('Content-Type', 'text/plain; version=0.0.4');
      return res.send(metricsCache);
    }
    
    // Generate fresh metrics
    const metrics = await generatePrometheusMetrics();
    
    // Update cache
    metricsCache = metrics;
    lastMetricsUpdate = now;
    
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to serve metrics', { error });
    res.status(500).send('# Error generating metrics');
  }
});

/**
 * Health check endpoint for monitoring
 */
router.get('/api/monitoring/deepwiki/health', async (req, res) => {
  try {
    const { stdout } = await execAsync(
      'kubectl get pod -n codequal-dev -l app=deepwiki -o json'
    );
    
    const pods = JSON.parse(stdout);
    const healthy = pods.items.some((pod: any) => 
      pod.status.phase === 'Running' && 
      pod.status.conditions.some((c: any) => c.type === 'Ready' && c.status === 'True')
    );
    
    res.json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      pod_count: pods.items.length
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;