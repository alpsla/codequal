import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';
import { deepwikiStorageMonitor, StorageMetrics } from './deepwiki-storage-monitor';
import AWS from 'aws-sdk';

const execAsync = promisify(exec);
const logger = createLogger('deepwiki-storage-optimizer');

export interface UsagePattern {
  averageUsagePercent: number;
  peakUsagePercent: number;
  troughUsagePercent: number;
  weekendFactor: number; // Usage on weekends vs weekdays
  seasonalTrend: 'increasing' | 'stable' | 'decreasing';
  lowPeriods: Period[];
  highPeriods: Period[];
}

export interface Period {
  start: Date;
  end: Date;
  averageUsage: number;
  type: 'weekend' | 'holiday' | 'off-hours' | 'seasonal';
}

export interface OptimizationRecommendation {
  action: 'contract' | 'maintain' | 'expand' | 'archive';
  currentSizeGB: number;
  recommendedSizeGB: number;
  potentialMonthlySavings: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  reasoning: string[];
  prerequisites: string[];
}

export interface ArchiveCandidate {
  repositoryName: string;
  path: string;
  sizeMB: number;
  lastAccessedDays: number;
  accessCount: number;
}

export class DeepWikiStorageOptimizer {
  private readonly NAMESPACE = process.env.DEEPWIKI_NAMESPACE || 'codequal-dev';
  private readonly COST_PER_GB_MONTH = 0.10;
  private readonly S3_COST_PER_GB_MONTH = 0.023; // S3 Standard-IA
  private readonly MINIMUM_SAVINGS_THRESHOLD = 10; // $10/month minimum
  private readonly CONTRACTION_SAFETY_MARGIN = 1.25; // 25% buffer
  
  private s3Client: AWS.S3;
  
  constructor() {
    this.s3Client = new AWS.S3({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Analyze usage patterns over time
   */
  async analyzeUsagePatterns(days: number = 30): Promise<UsagePattern> {
    const metrics = await this.getHistoricalMetrics(days);
    
    if (metrics.length < 7) {
      throw new Error('Insufficient historical data for pattern analysis');
    }

    // Calculate basic statistics
    const usages = metrics.map(m => m.percentageUsed);
    const averageUsage = this.average(usages);
    const peakUsage = Math.max(...usages);
    const troughUsage = Math.min(...usages);

    // Analyze weekend patterns
    const weekendFactor = this.calculateWeekendFactor(metrics);

    // Detect trend
    const trend = this.detectTrend(metrics);

    // Identify low and high periods
    const { lowPeriods, highPeriods } = this.identifyPeriods(metrics);

    return {
      averageUsagePercent: averageUsage,
      peakUsagePercent: peakUsage,
      troughUsagePercent: troughUsage,
      weekendFactor,
      seasonalTrend: trend,
      lowPeriods,
      highPeriods
    };
  }

  /**
   * Get storage optimization recommendation
   */
  async getOptimizationRecommendation(): Promise<OptimizationRecommendation> {
    const currentMetrics = await deepwikiStorageMonitor.getStorageMetrics();
    const pattern = await this.analyzeUsagePatterns();
    const archiveCandidates = await this.identifyArchiveCandidates();

    // Calculate space that could be freed by archiving
    const archivableSpaceGB = archiveCandidates.reduce(
      (sum, candidate) => sum + (candidate.sizeMB / 1024), 
      0
    );

    // Calculate optimal size
    const optimalSizeGB = this.calculateOptimalSize(
      currentMetrics,
      pattern,
      archivableSpaceGB
    );

    // Determine action
    let action: 'contract' | 'maintain' | 'expand' | 'archive';
    let recommendedSizeGB = currentMetrics.totalGB;
    const reasoning: string[] = [];

    if (pattern.averageUsagePercent < 40 && pattern.seasonalTrend !== 'increasing') {
      if (archivableSpaceGB > 5) {
        action = 'archive';
        recommendedSizeGB = optimalSizeGB;
        reasoning.push(`${archivableSpaceGB.toFixed(1)}GB can be archived`);
        reasoning.push('Low average usage with stable/decreasing trend');
      } else {
        action = 'contract';
        recommendedSizeGB = optimalSizeGB;
        reasoning.push(`Average usage only ${pattern.averageUsagePercent.toFixed(1)}%`);
        reasoning.push('Trend is not increasing');
      }
    } else if (pattern.averageUsagePercent > 70) {
      if (pattern.peakUsagePercent > 85) {
        action = 'expand';
        recommendedSizeGB = Math.ceil(currentMetrics.totalGB * 1.5);
        reasoning.push('High average and peak usage');
        reasoning.push('Risk of running out of space');
      } else {
        action = 'maintain';
        reasoning.push('Usage is healthy');
      }
    } else {
      action = 'maintain';
      reasoning.push('Usage is in acceptable range');
    }

    // Calculate savings
    const potentialMonthlySavings = this.calculateSavings(
      currentMetrics.totalGB,
      recommendedSizeGB,
      archivableSpaceGB
    );

    // Assess risk
    const riskLevel = this.assessRisk(pattern, action, currentMetrics);

    // Calculate confidence
    const confidence = this.calculateConfidence(pattern, metrics.length);

    // Define prerequisites
    const prerequisites = this.getPrerequisites(action, archiveCandidates);

    return {
      action,
      currentSizeGB: currentMetrics.totalGB,
      recommendedSizeGB,
      potentialMonthlySavings,
      riskLevel,
      confidence,
      reasoning,
      prerequisites
    };
  }

  /**
   * Identify repositories that can be archived
   */
  async identifyArchiveCandidates(
    inactivityThresholdDays: number = 30
  ): Promise<ArchiveCandidate[]> {
    try {
      const podName = await this.getDeepWikiPod();
      
      // Get all repositories with their access times
      const { stdout } = await execAsync(
        `kubectl exec -n ${this.NAMESPACE} ${podName} -- bash -c "
          find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -printf '%p|%A@|%s\\n' | 
          while IFS='|' read path atime size; do
            name=\\$(basename \\$path)
            days_old=\\$(echo \\"scale=0; (\\$(date +%s) - \\$atime) / 86400\\" | bc)
            size_mb=\\$(echo \\"scale=2; \\$size / 1048576\\" | bc)
            echo \\"\\$name|\\$path|\\$size_mb|\\$days_old\\"
          done
        "`
      );

      const candidates: ArchiveCandidate[] = [];
      const lines = stdout.trim().split('\n').filter(line => line);

      for (const line of lines) {
        const [name, path, sizeMB, daysOld] = line.split('|');
        const lastAccessedDays = parseInt(daysOld);
        
        if (lastAccessedDays >= inactivityThresholdDays) {
          candidates.push({
            repositoryName: name,
            path,
            sizeMB: parseFloat(sizeMB),
            lastAccessedDays,
            accessCount: 0 // Would need to track this separately
          });
        }
      }

      // Sort by size (largest first) for maximum space recovery
      return candidates.sort((a, b) => b.sizeMB - a.sizeMB);

    } catch (error) {
      logger.error('Failed to identify archive candidates:', error as Error);
      return [];
    }
  }

  /**
   * Archive repositories to S3
   */
  async archiveRepositories(
    candidates: ArchiveCandidate[]
  ): Promise<{ archived: number; freedSpaceGB: number; errors: string[] }> {
    const results = {
      archived: 0,
      freedSpaceGB: 0,
      errors: [] as string[]
    };

    const podName = await this.getDeepWikiPod();

    for (const candidate of candidates) {
      try {
        logger.info(`Archiving repository: ${candidate.repositoryName}`);

        // Create tarball
        const tarFile = `/tmp/${candidate.repositoryName}-${Date.now()}.tar.gz`;
        await execAsync(
          `kubectl exec -n ${this.NAMESPACE} ${podName} -- tar -czf ${tarFile} -C /root/.adalflow/repos ${candidate.repositoryName}`
        );

        // Copy tarball from pod
        const localTarFile = `/tmp/${candidate.repositoryName}.tar.gz`;
        await execAsync(
          `kubectl cp ${this.NAMESPACE}/${podName}:${tarFile} ${localTarFile}`
        );

        // Upload to S3
        const s3Key = `deepwiki-archives/${new Date().getFullYear()}/${candidate.repositoryName}/${Date.now()}.tar.gz`;
        await this.s3Client.upload({
          Bucket: process.env.DEEPWIKI_ARCHIVE_BUCKET || 'codequal-deepwiki-archives',
          Key: s3Key,
          Body: require('fs').createReadStream(localTarFile),
          StorageClass: 'STANDARD_IA',
          Metadata: {
            'repository-name': candidate.repositoryName,
            'original-size-mb': candidate.sizeMB.toString(),
            'last-accessed-days': candidate.lastAccessedDays.toString(),
            'archived-date': new Date().toISOString()
          }
        }).promise();

        // Delete from pod
        await execAsync(
          `kubectl exec -n ${this.NAMESPACE} ${podName} -- rm -rf ${candidate.path}`
        );

        // Clean up temp files
        await execAsync(`rm -f ${localTarFile}`);
        await execAsync(
          `kubectl exec -n ${this.NAMESPACE} ${podName} -- rm -f ${tarFile}`
        );

        results.archived++;
        results.freedSpaceGB += candidate.sizeMB / 1024;

        logger.info(`Successfully archived ${candidate.repositoryName}`);

      } catch (error) {
        const errorMsg = `Failed to archive ${candidate.repositoryName}: ${error}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    return results;
  }

  /**
   * Calculate optimal storage size
   */
  private calculateOptimalSize(
    current: StorageMetrics,
    pattern: UsagePattern,
    archivableSpaceGB: number
  ): number {
    // Start with peak usage
    let optimalSize = (pattern.peakUsagePercent / 100) * current.totalGB;

    // Subtract archivable space
    optimalSize -= archivableSpaceGB;

    // Add safety margin
    optimalSize *= this.CONTRACTION_SAFETY_MARGIN;

    // Round up to nearest 10GB
    return Math.ceil(optimalSize / 10) * 10;
  }

  /**
   * Calculate potential savings
   */
  private calculateSavings(
    currentGB: number,
    recommendedGB: number,
    archivableGB: number
  ): number {
    const storageSavings = (currentGB - recommendedGB) * this.COST_PER_GB_MONTH;
    const archiveCost = archivableGB * this.S3_COST_PER_GB_MONTH;
    
    return Math.max(0, storageSavings - archiveCost);
  }

  /**
   * Assess risk level of optimization
   */
  private assessRisk(
    pattern: UsagePattern,
    action: string,
    current: StorageMetrics
  ): 'low' | 'medium' | 'high' {
    if (action === 'maintain') return 'low';
    
    if (action === 'contract' || action === 'archive') {
      // High risk if trend is increasing
      if (pattern.seasonalTrend === 'increasing') return 'high';
      
      // High risk if peak is much higher than average
      const peakToAvgRatio = pattern.peakUsagePercent / pattern.averageUsagePercent;
      if (peakToAvgRatio > 2) return 'high';
      
      // Medium risk if growth rate is positive
      if (current.growthRateGBPerDay > 0) return 'medium';
      
      return 'low';
    }
    
    return 'low';
  }

  /**
   * Calculate confidence in recommendation
   */
  private calculateConfidence(pattern: UsagePattern, dataPoints: number): number {
    let confidence = 50;

    // More data points = higher confidence
    confidence += Math.min(30, dataPoints);

    // Stable pattern = higher confidence
    if (pattern.seasonalTrend === 'stable') confidence += 10;

    // Low variance = higher confidence
    const variance = pattern.peakUsagePercent - pattern.troughUsagePercent;
    if (variance < 20) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Get prerequisites for optimization action
   */
  private getPrerequisites(
    action: string,
    archiveCandidates: ArchiveCandidate[]
  ): string[] {
    const prerequisites: string[] = [];

    if (action === 'contract') {
      prerequisites.push('Create backup of current data');
      prerequisites.push('Schedule maintenance window');
      prerequisites.push('Prepare rollback plan');
    }

    if (action === 'archive' && archiveCandidates.length > 0) {
      prerequisites.push(`Archive ${archiveCandidates.length} inactive repositories`);
      prerequisites.push('Verify S3 bucket accessibility');
      prerequisites.push('Test restore procedure');
    }

    if (action === 'expand') {
      prerequisites.push('Verify storage class supports expansion');
      prerequisites.push('Check budget approval if >$50/month increase');
    }

    return prerequisites;
  }

  // Helper methods
  private async getHistoricalMetrics(days: number): Promise<StorageMetrics[]> {
    // In production, this would query from a metrics database
    // For now, return mock data
    const metrics: StorageMetrics[] = [];
    const now = Date.now();
    
    for (let i = 0; i < days; i++) {
      metrics.push({
        usedGB: 30 + Math.random() * 20,
        totalGB: 100,
        percentageUsed: 30 + Math.random() * 20,
        availableGB: 70 - Math.random() * 20,
        repositoryCount: 50 + Math.floor(Math.random() * 20),
        averageRepoSizeMB: 500 + Math.random() * 200,
        growthRateGBPerDay: -0.5 + Math.random()
      });
    }
    
    return metrics;
  }

  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateWeekendFactor(metrics: StorageMetrics[]): number {
    // In production, would analyze actual weekend vs weekday usage
    return 0.7; // 30% less usage on weekends
  }

  private detectTrend(metrics: StorageMetrics[]): 'increasing' | 'stable' | 'decreasing' {
    // Simple linear regression would go here
    const firstHalf = this.average(metrics.slice(0, metrics.length / 2).map(m => m.percentageUsed));
    const secondHalf = this.average(metrics.slice(metrics.length / 2).map(m => m.percentageUsed));
    
    const diff = secondHalf - firstHalf;
    if (diff > 5) return 'increasing';
    if (diff < -5) return 'decreasing';
    return 'stable';
  }

  private identifyPeriods(metrics: StorageMetrics[]): { lowPeriods: Period[]; highPeriods: Period[] } {
    // In production, would use more sophisticated period detection
    return {
      lowPeriods: [{
        start: new Date('2024-12-23'),
        end: new Date('2025-01-02'),
        averageUsage: 25,
        type: 'holiday'
      }],
      highPeriods: [{
        start: new Date('2024-11-25'),
        end: new Date('2024-11-29'),
        averageUsage: 85,
        type: 'seasonal'
      }]
    };
  }

  private async getDeepWikiPod(): Promise<string> {
    const { stdout } = await execAsync(
      `kubectl get pods -n ${this.NAMESPACE} -l app=deepwiki -o jsonpath='{.items[0].metadata.name}'`
    );
    
    const podName = stdout.trim();
    if (!podName) {
      throw new Error('No DeepWiki pod found');
    }
    
    return podName;
  }
}

// Export singleton instance
export const deepwikiStorageOptimizer = new DeepWikiStorageOptimizer();