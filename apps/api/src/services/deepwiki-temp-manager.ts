import { createLogger } from '@codequal/core/utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { deepWikiMetricsProxy } from './deepwiki-metrics-proxy';

const execAsync = promisify(exec);
const logger = createLogger('deepwiki-temp-manager');

/**
 * DeepWiki temp manager for remote pod monitoring
 */
class DeepWikiTempManager {
  public activeAnalyses: Map<string, any>;
  private remoteApiUrl: string;
  private remoteApiKey: string;
  private lastMetricsCache: any = null;
  private lastMetricsTime = 0;
  private cacheTimeout = 5000; // Cache for 5 seconds

  constructor() {
    // Initialize activeAnalyses map to fix the error in routes
    this.activeAnalyses = new Map();
    
    // Remote DeepWiki pod API configuration
    this.remoteApiUrl = process.env.DEEPWIKI_REMOTE_API_URL || '';
    this.remoteApiKey = process.env.DEEPWIKI_REMOTE_API_KEY || '';
    
    if (this.remoteApiUrl) {
      logger.info(`DeepWiki temp manager initialized for remote monitoring: ${this.remoteApiUrl}`);
    } else {
      logger.info('DeepWiki temp manager initialized in stub mode (no remote API configured)');
    }
  }

  private async fetchRemoteMetrics(): Promise<any> {
    if (!this.remoteApiUrl) {
      throw new Error('Remote API URL not configured');
    }

    try {
      // Make HTTP request to remote DeepWiki pod
      const response = await fetch(`${this.remoteApiUrl}/api/metrics/disk`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.remoteApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Remote API returned ${response.status}`);
      }

      const data = await response.json();
      
      // Expected response format from remote pod:
      // {
      //   totalGB: 30,
      //   usedGB: 6,
      //   availableGB: 24,
      //   percentUsed: 20,
      //   tempDirectoryGB: 1.2,
      //   activeAnalyses: 2
      // }
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch remote metrics:', error as Error);
      throw error;
    }
  }

  private getStubMetrics() {
    // Stub metrics when no remote API is configured
    const totalGB = parseInt(process.env.DEEPWIKI_POD_STORAGE_GB || '30', 10);
    
    // Simulate dynamic usage based on active analyses
    const baseUsageGB = 6; // Base OS and system usage
    const perAnalysisGB = 4; // Each analysis uses ~4GB
    const activeCount = this.activeAnalyses.size;
    
    // Calculate dynamic usage
    const usedGB = Math.min(totalGB * 0.9, baseUsageGB + (activeCount * perAnalysisGB));
    const availableGB = totalGB - usedGB;
    const percentUsed = (usedGB / totalGB) * 100;
    
    // Determine status based on usage
    let status = 'healthy';
    if (percentUsed > 85) status = 'critical';
    else if (percentUsed > 70) status = 'warning';
    
    return {
      totalGB,
      usedGB: parseFloat(usedGB.toFixed(2)),
      availableGB: parseFloat(availableGB.toFixed(2)),
      percentUsed: parseFloat(percentUsed.toFixed(1)),
      maxConcurrentCapacity: Math.floor(availableGB / perAnalysisGB),
      activeAnalyses: activeCount,
      avgAnalysisSizeMB: activeCount > 0 ? (perAnalysisGB * 1024) : 0,
      cleanupSuccessCount: 0,
      cleanupFailedCount: 0,
      autoscaleSuccessCount: 0,
      autoscaleFailureCount: 0,
      isStub: true,
      status
    };
  }

  async getMetrics() {
    // Use cache if available and fresh
    const now = Date.now();
    if (this.lastMetricsCache && (now - this.lastMetricsTime) < this.cacheTimeout) {
      return this.lastMetricsCache;
    }

    try {
      // Use kubectl-based metrics proxy
      const podMetrics = await deepWikiMetricsProxy.getMetrics();
      
      const metrics = {
        totalGB: podMetrics.totalGB,
        usedGB: podMetrics.usedGB,
        availableGB: podMetrics.availableGB,
        percentUsed: podMetrics.percentUsed,
        maxConcurrentCapacity: Math.floor(podMetrics.availableGB / 4),
        activeAnalyses: podMetrics.activeAnalyses,
        avgAnalysisSizeMB: podMetrics.avgAnalysisSizeMB,
        cleanupSuccessCount: podMetrics.cleanupSuccessCount,
        cleanupFailedCount: podMetrics.cleanupFailedCount,
        autoscaleSuccessCount: 0,
        autoscaleFailureCount: 0,
        tempDirectorySizeGB: podMetrics.tempDirectoryGB,
        source: 'kubectl-proxy',
        podInfo: podMetrics.podInfo,
        lastCleanupTime: podMetrics.lastCleanupTime
      };
      
      logger.info('Pod metrics via kubectl:', {
        totalGB: metrics.totalGB,
        usedGB: metrics.usedGB,
        availableGB: metrics.availableGB,
        percentUsed: metrics.percentUsed.toFixed(1) + '%',
        activeAnalyses: metrics.activeAnalyses,
        source: 'kubectl exec'
      });
      
      // Cache the metrics
      this.lastMetricsCache = metrics;
      this.lastMetricsTime = now;
      
      return metrics;
      
    } catch (error) {
      logger.error('Failed to get pod metrics, using stub:', error as Error);
      
      // Return stub metrics on error
      const stubMetrics = this.getStubMetrics();
      
      // Cache even stub metrics
      this.lastMetricsCache = stubMetrics;
      this.lastMetricsTime = now;
      
      return stubMetrics;
    }
  }

  async createAnalysis(analysisId: string, data: Record<string, unknown>) {
    logger.info(`Creating analysis: ${analysisId}`);
    
    // Add to active analyses for tracking
    this.activeAnalyses.set(analysisId, {
      analysisId,
      repositoryUrl: (data as any).repositoryUrl || 'unknown',
      type: (data as any).type || 'full',
      startTime: Date.now(),
      status: 'active'
    });
    
    return {
      id: analysisId,
      status: 'active',
      sizeMB: 0,
      createdAt: new Date().toISOString()
    };
  }

  async updateAnalysis(analysisId: string, data: Record<string, unknown>) {
    logger.warn('DeepWikiTempManager.updateAnalysis() - stub implementation');
    return {
      id: analysisId,
      status: 'active',
      sizeMB: 0,
      updatedAt: new Date().toISOString()
    };
  }

  async completeAnalysis(analysisId: string, data: Record<string, unknown>) {
    logger.info(`Completing analysis: ${analysisId}`);
    
    // Remove from active analyses
    this.activeAnalyses.delete(analysisId);
    
    return {
      id: analysisId,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
  }

  async getAnalysis(analysisId: string) {
    logger.warn('DeepWikiTempManager.getAnalysis() - stub implementation');
    return null;
  }

  async listAnalyses(filters?: Record<string, unknown>) {
    logger.warn('DeepWikiTempManager.listAnalyses() - stub implementation');
    return [];
  }

  async cleanupStaleAnalyses() {
    logger.warn('DeepWikiTempManager.cleanupStaleAnalyses() - stub implementation');
    return { cleaned: 0 };
  }

  async getActiveAnalyses() {
    logger.warn('DeepWikiTempManager.getActiveAnalyses() - stub implementation');
    return [];
  }

  async estimateRequiredSpace(analysisData: Record<string, unknown> | number) {
    logger.warn('DeepWikiTempManager.estimateRequiredSpace() - stub implementation');
    return {
      estimatedSizeMB: 100,
      requiredSpaceGB: 1,
      confidence: 0.8
    };
  }

  async cleanupOrphaned() {
    logger.warn('DeepWikiTempManager.cleanupOrphaned() - stub implementation');
    return {
      orphaned: 0,
      cleaned: 0,
      freedSpaceGB: 0
    };
  }

  async scalePVC(sizeGB: number) {
    logger.warn('DeepWikiTempManager.scalePVC() - stub implementation');
    return {
      success: true,
      newSizeGB: sizeGB,
      message: 'Stub implementation - no actual scaling performed'
    };
  }
}

export const deepWikiTempManager = new DeepWikiTempManager();