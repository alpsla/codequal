import { Request, Response, NextFunction } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';

const execAsync = promisify(exec);
const logger = createLogger('deepwiki-metrics-proxy');

interface DiskMetrics {
  totalGB: number;
  usedGB: number;
  availableGB: number;
  percentUsed: number;
  tempDirectoryGB: number;
  activeAnalyses: number;
  avgAnalysisSizeMB: number;
  cleanupSuccessCount: number;
  cleanupFailedCount: number;
  lastCleanupTime?: string;
  podInfo: {
    namespace: string;
    deployment: string;
    mountPath: string;
  };
}

export class DeepWikiMetricsProxy {
  private namespace: string;
  private deployment: string;
  private mountPath: string;
  private cleanupStats = {
    successCount: 0,
    failedCount: 0,
    lastCleanupTime: null as Date | null
  };

  constructor() {
    this.namespace = process.env.DEEPWIKI_NAMESPACE || 'codequal-dev';
    this.deployment = process.env.DEEPWIKI_POD_SELECTOR || 'deepwiki';
    this.mountPath = '/root/.adalflow';
  }

  /**
   * Get disk metrics from the DeepWiki pod using kubectl
   */
  async getMetrics(): Promise<DiskMetrics> {
    try {
      // Get disk usage
      const dfCommand = `kubectl exec -n ${this.namespace} deployment/${this.deployment} -- df -BG ${this.mountPath} | tail -1`;
      const { stdout: dfOutput } = await execAsync(dfCommand);
      
      // Parse df output
      const dfParts = dfOutput.trim().split(/\s+/);
      const totalGB = parseInt(dfParts[1].replace('G', ''));
      const usedGB = parseInt(dfParts[2].replace('G', ''));
      const availableGB = parseInt(dfParts[3].replace('G', ''));
      const percentUsed = parseInt(dfParts[4].replace('%', ''));

      // Count analysis directories
      const lsCommand = `kubectl exec -n ${this.namespace} deployment/${this.deployment} -- find ${this.mountPath} -maxdepth 1 -type d | wc -l`;
      const { stdout: lsOutput } = await execAsync(lsCommand);
      const activeAnalyses = Math.max(0, parseInt(lsOutput.trim()) - 1); // Subtract 1 for the root directory

      // Get total size of temp directory in MB
      const duCommand = `kubectl exec -n ${this.namespace} deployment/${this.deployment} -- du -sm ${this.mountPath} | cut -f1`;
      const { stdout: duOutput } = await execAsync(duCommand);
      const tempDirectoryMB = parseInt(duOutput.trim());
      const tempDirectoryGB = tempDirectoryMB / 1024;

      // Calculate average analysis size
      const avgAnalysisSizeMB = activeAnalyses > 0 ? Math.round(tempDirectoryMB / activeAnalyses) : 0;

      // Log critical disk space issues
      if (percentUsed > 90) {
        logger.error(`CRITICAL: DeepWiki disk usage at ${percentUsed}% - immediate cleanup required!`);
      } else if (percentUsed > 80) {
        logger.warn(`WARNING: DeepWiki disk usage at ${percentUsed}% - cleanup recommended`);
      }

      const metrics: DiskMetrics = {
        totalGB,
        usedGB,
        availableGB,
        percentUsed,
        tempDirectoryGB,
        activeAnalyses,
        avgAnalysisSizeMB,
        cleanupSuccessCount: this.cleanupStats.successCount,
        cleanupFailedCount: this.cleanupStats.failedCount,
        lastCleanupTime: this.cleanupStats.lastCleanupTime?.toISOString(),
        podInfo: {
          namespace: this.namespace,
          deployment: this.deployment,
          mountPath: this.mountPath
        }
      };

      logger.info('DeepWiki pod metrics fetched', {
        percentUsed: `${percentUsed}%`,
        availableGB,
        activeAnalyses
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to fetch DeepWiki pod metrics', error as Error);
      throw new Error(`Failed to fetch metrics: ${(error as Error).message}`);
    }
  }

  // Cleanup methods removed - using existing cleanup logic from the system

  /**
   * Express middleware for metrics endpoint
   */
  metricsHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.getMetrics();
      
      // Log alert if cleanup is needed
      if (metrics.percentUsed > 90) {
        logger.error('Emergency cleanup needed - disk usage critical!');
        // Cleanup handled by existing system logic
      }
      
      res.json(metrics);
    } catch (error) {
      logger.error('Metrics handler error:', error as Error);
      res.status(500).json({ 
        error: 'Failed to fetch metrics',
        message: (error as Error).message 
      });
    }
  };

}

export const deepWikiMetricsProxy = new DeepWikiMetricsProxy();