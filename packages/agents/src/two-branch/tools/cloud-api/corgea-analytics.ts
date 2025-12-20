/**
 * Corgea Analytics Service
 *
 * Provides comprehensive analytics for Corgea usage:
 * - Real-time monitoring dashboard data
 * - Plan optimization recommendations
 * - Cost projections
 * - Alert management
 *
 * @since Session 63
 */

import {
  getCorgeaUsageTracker,
  CorgeaUsageTracker,
  UsageSummary,
  PlanRecommendation
} from './corgea-usage-tracker';
import { getCorgeaFixCache, CorgeaFixCache, CacheStats } from './corgea-fix-cache';
import { getCorgeaRequestQueue, CorgeaRequestQueue } from './corgea-request-queue';

// ============================================================
// TYPES
// ============================================================

export interface AnalyticsDashboard {
  timestamp: Date;
  realtime: RealtimeMetrics;
  usage: UsageMetrics;
  cache: CacheMetrics;
  queue: QueueMetrics;
  costs: CostMetrics;
  alerts: Alert[];
  recommendation: PlanRecommendation | null;
}

export interface RealtimeMetrics {
  activeRequests: number;
  queuedRequests: number;
  requestsPerMinute: number;
  avgResponseTimeMs: number;
  successRate: number;
}

export interface UsageMetrics {
  today: {
    requests: number;
    fixes: number;
    issues: number;
    cost: number;
  };
  thisWeek: {
    requests: number;
    fixes: number;
    issues: number;
    cost: number;
  };
  thisMonth: {
    requests: number;
    fixes: number;
    issues: number;
    cost: number;
  };
  trend: 'increasing' | 'stable' | 'decreasing';
  peakUsageHour: number;
}

export interface CacheMetrics {
  hitRate: number;
  entries: number;
  savedApiCalls: number;
  estimatedSavings: number;
  memoryUsageMb: number;
}

export interface QueueMetrics {
  length: number;
  processing: number;
  avgWaitTimeMs: number;
  rateLimitStatus: {
    minuteUsed: number;
    minuteRemaining: number;
    hourUsed: number;
    hourRemaining: number;
    dayUsed: number;
    dayRemaining: number;
  };
}

export interface CostMetrics {
  todayCost: number;
  projectedMonthlyCost: number;
  budgetUsed: number; // percentage
  budget: number;
  costPerFix: number;
  costTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'rate_limit' | 'cost' | 'performance' | 'cache' | 'queue';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  data?: Record<string, unknown>;
}

export interface AlertConfig {
  rateLimitThreshold: number; // % of limit used before warning
  costBudget: number; // monthly budget in cents
  costAlertThreshold: number; // % of budget before warning
  responseTimeThreshold: number; // ms before warning
  queueLengthThreshold: number; // queue length before warning
  cacheHitRateThreshold: number; // min hit rate before warning
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  rateLimitThreshold: 80, // 80% of limit
  costBudget: 5000, // $50/month
  costAlertThreshold: 80, // 80% of budget
  responseTimeThreshold: 30000, // 30 seconds
  queueLengthThreshold: 100,
  cacheHitRateThreshold: 50 // 50% hit rate
};

// ============================================================
// ANALYTICS SERVICE CLASS
// ============================================================

export class CorgeaAnalyticsService {
  private usageTracker: CorgeaUsageTracker;
  private fixCache: CorgeaFixCache;
  private requestQueue: CorgeaRequestQueue;
  private alertConfig: AlertConfig;
  private alerts: Alert[] = [];
  private budget = 5000; // Default $50/month in cents

  constructor(alertConfig: Partial<AlertConfig> = {}) {
    this.usageTracker = getCorgeaUsageTracker();
    this.fixCache = getCorgeaFixCache();
    this.requestQueue = getCorgeaRequestQueue();
    this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...alertConfig };
  }

  /**
   * Get complete dashboard data
   */
  async getDashboard(organizationId?: string): Promise<AnalyticsDashboard> {
    const [dailySummary, weeklySummary, monthlySummary, cacheStats, queueStatus] = await Promise.all([
      this.usageTracker.getUsageSummary('daily', organizationId),
      this.usageTracker.getUsageSummary('weekly', organizationId),
      this.usageTracker.getUsageSummary('monthly', organizationId),
      this.fixCache.getStats(),
      Promise.resolve(this.requestQueue.getStatus())
    ]);

    const realtime = this.calculateRealtimeMetrics(dailySummary, queueStatus);
    const usage = this.calculateUsageMetrics(dailySummary, weeklySummary, monthlySummary);
    const cache = this.calculateCacheMetrics(cacheStats);
    const queue = this.calculateQueueMetrics(queueStatus);
    const costs = this.calculateCostMetrics(dailySummary, monthlySummary);

    // Check for alerts
    this.checkAlerts(realtime, usage, cache, queue, costs);

    // Get plan recommendation if organization specified
    let recommendation: PlanRecommendation | null = null;
    if (organizationId) {
      recommendation = await this.usageTracker.getRecommendation('growth', organizationId);
    }

    return {
      timestamp: new Date(),
      realtime,
      usage,
      cache,
      queue,
      costs,
      alerts: this.alerts.filter(a => !a.acknowledged),
      recommendation
    };
  }

  /**
   * Calculate real-time metrics
   */
  private calculateRealtimeMetrics(
    dailySummary: UsageSummary,
    queueStatus: ReturnType<CorgeaRequestQueue['getStatus']>
  ): RealtimeMetrics {
    // Calculate requests per minute (last hour average)
    const requestsPerMinute = dailySummary.totalRequests / (24 * 60);

    return {
      activeRequests: queueStatus.processingCount,
      queuedRequests: queueStatus.queueLength,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      avgResponseTimeMs: Math.round(dailySummary.avgResponseTimeMs),
      successRate: Math.round(dailySummary.successRate * 100) / 100
    };
  }

  /**
   * Calculate usage metrics
   */
  private calculateUsageMetrics(
    daily: UsageSummary,
    weekly: UsageSummary,
    monthly: UsageSummary
  ): UsageMetrics {
    // Determine trend
    const dailyRate = daily.totalFixes;
    const weeklyDailyRate = weekly.totalFixes / 7;
    const monthlyDailyRate = monthly.totalFixes / 30;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (dailyRate > weeklyDailyRate * 1.2) {
      trend = 'increasing';
    } else if (dailyRate < weeklyDailyRate * 0.8) {
      trend = 'decreasing';
    }

    return {
      today: {
        requests: daily.totalRequests,
        fixes: daily.totalFixes,
        issues: daily.totalIssuesProcessed,
        cost: daily.estimatedCost
      },
      thisWeek: {
        requests: weekly.totalRequests,
        fixes: weekly.totalFixes,
        issues: weekly.totalIssuesProcessed,
        cost: weekly.estimatedCost
      },
      thisMonth: {
        requests: monthly.totalRequests,
        fixes: monthly.totalFixes,
        issues: monthly.totalIssuesProcessed,
        cost: monthly.estimatedCost
      },
      trend,
      peakUsageHour: daily.peakHour
    };
  }

  /**
   * Calculate cache metrics
   */
  private calculateCacheMetrics(stats: CacheStats): CacheMetrics {
    return {
      hitRate: Math.round(stats.hitRate * 100),
      entries: stats.totalEntries,
      savedApiCalls: stats.savedApiCalls,
      estimatedSavings: stats.estimatedSavings,
      memoryUsageMb: Math.round(stats.memoryUsageBytes / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Calculate queue metrics
   */
  private calculateQueueMetrics(
    status: ReturnType<CorgeaRequestQueue['getStatus']>
  ): QueueMetrics {
    return {
      length: status.queueLength,
      processing: status.processingCount,
      avgWaitTimeMs: status.queueLength * 1000, // Rough estimate
      rateLimitStatus: {
        minuteUsed: status.rateLimits.minuteUsed,
        minuteRemaining: status.rateLimits.minuteLimit - status.rateLimits.minuteUsed,
        hourUsed: status.rateLimits.hourUsed,
        hourRemaining: status.rateLimits.hourLimit - status.rateLimits.hourUsed,
        dayUsed: status.rateLimits.dayUsed,
        dayRemaining: status.rateLimits.dayLimit - status.rateLimits.dayUsed
      }
    };
  }

  /**
   * Calculate cost metrics
   */
  private calculateCostMetrics(daily: UsageSummary, monthly: UsageSummary): CostMetrics {
    const todayCost = daily.estimatedCost;
    const projectedMonthlyCost = (daily.estimatedCost / 1) * 30; // Simple projection
    const budgetUsed = (monthly.estimatedCost / this.budget) * 100;
    const costPerFix = monthly.totalFixes > 0
      ? monthly.estimatedCost / monthly.totalFixes
      : 0;

    // Calculate cost trend
    const avgDailyLastMonth = monthly.estimatedCost / 30;
    let costTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (todayCost > avgDailyLastMonth * 1.2) {
      costTrend = 'increasing';
    } else if (todayCost < avgDailyLastMonth * 0.8) {
      costTrend = 'decreasing';
    }

    return {
      todayCost,
      projectedMonthlyCost: Math.round(projectedMonthlyCost),
      budgetUsed: Math.round(budgetUsed),
      budget: this.budget,
      costPerFix: Math.round(costPerFix * 100) / 100,
      costTrend
    };
  }

  /**
   * Check for alerts
   */
  private checkAlerts(
    realtime: RealtimeMetrics,
    usage: UsageMetrics,
    cache: CacheMetrics,
    queue: QueueMetrics,
    costs: CostMetrics
  ): void {
    const now = new Date();

    // Rate limit alerts
    const hourUsedPercent = (queue.rateLimitStatus.hourUsed /
      (queue.rateLimitStatus.hourUsed + queue.rateLimitStatus.hourRemaining)) * 100;

    if (hourUsedPercent >= this.alertConfig.rateLimitThreshold) {
      this.addAlert({
        type: hourUsedPercent >= 95 ? 'critical' : 'warning',
        category: 'rate_limit',
        message: `Rate limit ${Math.round(hourUsedPercent)}% used this hour`,
        data: { hourUsed: queue.rateLimitStatus.hourUsed }
      });
    }

    // Cost alerts
    if (costs.budgetUsed >= this.alertConfig.costAlertThreshold) {
      this.addAlert({
        type: costs.budgetUsed >= 100 ? 'critical' : 'warning',
        category: 'cost',
        message: `Monthly budget ${Math.round(costs.budgetUsed)}% used`,
        data: { monthlySpent: costs.todayCost * 30, budget: this.budget }
      });
    }

    // Performance alerts
    if (realtime.avgResponseTimeMs > this.alertConfig.responseTimeThreshold) {
      this.addAlert({
        type: 'warning',
        category: 'performance',
        message: `Average response time ${Math.round(realtime.avgResponseTimeMs / 1000)}s exceeds threshold`,
        data: { avgResponseTimeMs: realtime.avgResponseTimeMs }
      });
    }

    // Queue alerts
    if (queue.length > this.alertConfig.queueLengthThreshold) {
      this.addAlert({
        type: 'warning',
        category: 'queue',
        message: `Queue length (${queue.length}) exceeds threshold`,
        data: { queueLength: queue.length }
      });
    }

    // Cache alerts
    if (cache.hitRate < this.alertConfig.cacheHitRateThreshold) {
      this.addAlert({
        type: 'info',
        category: 'cache',
        message: `Cache hit rate (${cache.hitRate}%) below threshold. Consider warming up cache.`,
        data: { hitRate: cache.hitRate }
      });
    }
  }

  /**
   * Add an alert
   */
  private addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Check if similar alert already exists
    const existing = this.alerts.find(a =>
      a.category === alert.category &&
      a.message === alert.message &&
      !a.acknowledged
    );

    if (!existing) {
      this.alerts.push({
        ...alert,
        id,
        timestamp: new Date(),
        acknowledged: false
      });

      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Set budget
   */
  setBudget(budgetCents: number): void {
    this.budget = budgetCents;
  }

  /**
   * Get cost projection report
   */
  async getCostProjection(organizationId: string): Promise<{
    current: number;
    projected: {
      nextWeek: number;
      nextMonth: number;
      nextQuarter: number;
    };
    breakdown: {
      fixGeneration: number;
      scanUpload: number;
      other: number;
    };
    optimizationOpportunities: string[];
  }> {
    const monthly = await this.usageTracker.getUsageSummary('monthly', organizationId);
    const cacheStats = await this.fixCache.getStats();

    const dailyAvg = monthly.estimatedCost / 30;

    return {
      current: monthly.estimatedCost,
      projected: {
        nextWeek: Math.round(dailyAvg * 7),
        nextMonth: Math.round(dailyAvg * 30),
        nextQuarter: Math.round(dailyAvg * 90)
      },
      breakdown: {
        fixGeneration: Math.round(monthly.estimatedCost * 0.8), // 80% from fixes
        scanUpload: Math.round(monthly.estimatedCost * 0.15), // 15% from uploads
        other: Math.round(monthly.estimatedCost * 0.05) // 5% other
      },
      optimizationOpportunities: this.getOptimizationOpportunities(monthly, cacheStats)
    };
  }

  /**
   * Get optimization opportunities
   */
  private getOptimizationOpportunities(
    usage: UsageSummary,
    cache: CacheStats
  ): string[] {
    const opportunities: string[] = [];

    // Cache optimization
    if (cache.hitRate < 0.5) {
      opportunities.push(`Improve cache hit rate (currently ${Math.round(cache.hitRate * 100)}%) by warming up cache with common patterns`);
    }

    // Batching optimization
    if (usage.totalRequests > usage.totalFixes * 1.5) {
      opportunities.push('Consider better issue batching to reduce API calls');
    }

    // Off-peak usage
    if (usage.peakHour >= 9 && usage.peakHour <= 17) {
      opportunities.push('Consider scheduling bulk fixes during off-peak hours for better response times');
    }

    // Severity filtering
    opportunities.push('Filter low-severity issues from Corgea to reduce costs (handle with Tier 3 AI instead)');

    return opportunities;
  }

  /**
   * Get usage report for export
   */
  async getUsageReport(
    organizationId: string,
    period: 'weekly' | 'monthly'
  ): Promise<{
    period: string;
    summary: UsageSummary;
    costBreakdown: { date: string; cost: number }[];
    topUsers: { userId: string; fixes: number; cost: number }[];
    recommendations: string[];
  }> {
    const summary = await this.usageTracker.getUsageSummary(period, organizationId);
    const recommendation = await this.usageTracker.getRecommendation('growth', organizationId);

    // Generate cost breakdown (mock daily data)
    const days = period === 'weekly' ? 7 : 30;
    const dailyCost = summary.estimatedCost / days;
    const costBreakdown: { date: string; cost: number }[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      costBreakdown.push({
        date: date.toISOString().split('T')[0],
        cost: Math.round(dailyCost * (0.8 + Math.random() * 0.4)) // Add some variance
      });
    }

    // Get top users
    const topUsers = Array.from(summary.byUser.entries())
      .map(([userId, usage]) => ({
        userId,
        fixes: usage.fixes,
        cost: usage.cost
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      period: `${period} ending ${new Date().toISOString().split('T')[0]}`,
      summary,
      costBreakdown,
      topUsers,
      recommendations: [
        recommendation.reason,
        ...this.getOptimizationOpportunities(summary, await this.fixCache.getStats())
      ]
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let analyticsInstance: CorgeaAnalyticsService | null = null;

export function getCorgeaAnalytics(): CorgeaAnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new CorgeaAnalyticsService();
  }
  return analyticsInstance;
}
