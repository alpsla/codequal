/**
 * Corgea Usage Tracker
 *
 * Tracks API usage per user/organization for:
 * - Rate limit management
 * - Cost allocation
 * - Plan optimization recommendations
 *
 * @since Session 63
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface CorgeaUsageRecord {
  id?: string;
  userId: string;
  organizationId: string;
  timestamp: Date;
  endpoint: string;
  requestType: 'health_check' | 'scan_upload' | 'fix_generation' | 'issue_retrieval';
  issueCount: number;
  fixesGenerated: number;
  responseTimeMs: number;
  success: boolean;
  errorCode?: string;
  costEstimate: number; // Estimated cost in cents
}

export interface UsageSummary {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalRequests: number;
  totalFixes: number;
  totalIssuesProcessed: number;
  avgResponseTimeMs: number;
  successRate: number;
  estimatedCost: number;
  byUser: Map<string, UserUsage>;
  byOrganization: Map<string, OrgUsage>;
  peakHour: number; // 0-23
  peakDay: string; // Day of week
}

export interface UserUsage {
  userId: string;
  requests: number;
  fixes: number;
  issues: number;
  cost: number;
}

export interface OrgUsage {
  organizationId: string;
  users: number;
  requests: number;
  fixes: number;
  issues: number;
  cost: number;
}

export interface RateLimitStatus {
  currentHour: number;
  currentDay: number;
  hourlyLimit: number;
  dailyLimit: number;
  hourlyRemaining: number;
  dailyRemaining: number;
  resetAt: Date;
  isThrottled: boolean;
  throttleReason?: string;
}

export interface PlanRecommendation {
  currentPlan: string;
  recommendedPlan: string;
  reason: string;
  projectedMonthlyCost: number;
  projectedSavings: number;
  usageMetrics: {
    avgDailyRequests: number;
    avgDailyFixes: number;
    peakHourlyRequests: number;
    growthRate: number; // % per month
  };
}

// ============================================================
// COST ESTIMATION
// ============================================================

const COST_PER_REQUEST = {
  health_check: 0, // Free
  scan_upload: 5, // 5 cents per scan
  fix_generation: 10, // 10 cents per fix
  issue_retrieval: 1 // 1 cent per retrieval
};

const PLAN_LIMITS = {
  starter: { monthlyFixes: 100, hourlyRequests: 50, monthlyCost: 1400 }, // $14
  growth: { monthlyFixes: 500, hourlyRequests: 100, monthlyCost: 2900 }, // $29
  scale: { monthlyFixes: 2000, hourlyRequests: 200, monthlyCost: 4900 }, // $49
  enterprise: { monthlyFixes: Infinity, hourlyRequests: 1000, monthlyCost: 0 } // Custom
};

// ============================================================
// USAGE TRACKER CLASS
// ============================================================

export class CorgeaUsageTracker {
  private supabase: SupabaseClient | null = null;
  private memoryCache: CorgeaUsageRecord[] = [];
  private hourlyCounter = new Map<string, number>(); // key: YYYY-MM-DD-HH
  private dailyCounter = new Map<string, number>(); // key: YYYY-MM-DD

  // Configurable limits (can be updated based on plan)
  private hourlyLimit = 100;
  private dailyLimit = 1000;

  constructor() {
    this.initSupabase();
  }

  private initSupabase(): void {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  /**
   * Record an API call
   */
  async recordUsage(record: Omit<CorgeaUsageRecord, 'id' | 'costEstimate'>): Promise<void> {
    const costEstimate = COST_PER_REQUEST[record.requestType] *
      (record.requestType === 'fix_generation' ? record.fixesGenerated : 1);

    const fullRecord: CorgeaUsageRecord = {
      ...record,
      costEstimate
    };

    // Update in-memory counters
    const hourKey = this.getHourKey(record.timestamp);
    const dayKey = this.getDayKey(record.timestamp);

    this.hourlyCounter.set(hourKey, (this.hourlyCounter.get(hourKey) || 0) + 1);
    this.dailyCounter.set(dayKey, (this.dailyCounter.get(dayKey) || 0) + 1);

    // Store in memory cache
    this.memoryCache.push(fullRecord);

    // Persist to Supabase if available
    if (this.supabase) {
      try {
        await this.supabase.from('corgea_usage').insert({
          user_id: record.userId,
          organization_id: record.organizationId,
          timestamp: record.timestamp.toISOString(),
          endpoint: record.endpoint,
          request_type: record.requestType,
          issue_count: record.issueCount,
          fixes_generated: record.fixesGenerated,
          response_time_ms: record.responseTimeMs,
          success: record.success,
          error_code: record.errorCode,
          cost_estimate: costEstimate
        });
      } catch (error) {
        console.warn('[CorgeaUsageTracker] Failed to persist to Supabase:', error);
      }
    }

    // Trim memory cache to last 1000 records
    if (this.memoryCache.length > 1000) {
      this.memoryCache = this.memoryCache.slice(-1000);
    }
  }

  /**
   * Check if we should throttle requests
   */
  getRateLimitStatus(): RateLimitStatus {
    const now = new Date();
    const hourKey = this.getHourKey(now);
    const dayKey = this.getDayKey(now);

    const currentHour = this.hourlyCounter.get(hourKey) || 0;
    const currentDay = this.dailyCounter.get(dayKey) || 0;

    const hourlyRemaining = Math.max(0, this.hourlyLimit - currentHour);
    const dailyRemaining = Math.max(0, this.dailyLimit - currentDay);

    const isThrottled = hourlyRemaining === 0 || dailyRemaining === 0;
    let throttleReason: string | undefined;

    if (hourlyRemaining === 0) {
      throttleReason = 'Hourly limit reached';
    } else if (dailyRemaining === 0) {
      throttleReason = 'Daily limit reached';
    }

    // Calculate reset time (next hour)
    const resetAt = new Date(now);
    resetAt.setMinutes(0, 0, 0);
    resetAt.setHours(resetAt.getHours() + 1);

    return {
      currentHour,
      currentDay,
      hourlyLimit: this.hourlyLimit,
      dailyLimit: this.dailyLimit,
      hourlyRemaining,
      dailyRemaining,
      resetAt,
      isThrottled,
      throttleReason
    };
  }

  /**
   * Update limits based on plan
   */
  updateLimits(plan: keyof typeof PLAN_LIMITS): void {
    const limits = PLAN_LIMITS[plan];
    this.hourlyLimit = limits.hourlyRequests;
    this.dailyLimit = limits.hourlyRequests * 24; // Approximate daily
  }

  /**
   * Get usage summary for a period
   */
  async getUsageSummary(
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    organizationId?: string
  ): Promise<UsageSummary> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'hourly':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Filter records
    let records = this.memoryCache.filter(r =>
      r.timestamp >= startDate &&
      (!organizationId || r.organizationId === organizationId)
    );

    // If Supabase is available and we need more data, fetch from DB
    if (this.supabase && period !== 'hourly') {
      try {
        let query = this.supabase
          .from('corgea_usage')
          .select('*')
          .gte('timestamp', startDate.toISOString());

        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data } = await query;
        if (data) {
          records = data.map(d => ({
            userId: d.user_id,
            organizationId: d.organization_id,
            timestamp: new Date(d.timestamp),
            endpoint: d.endpoint,
            requestType: d.request_type,
            issueCount: d.issue_count,
            fixesGenerated: d.fixes_generated,
            responseTimeMs: d.response_time_ms,
            success: d.success,
            errorCode: d.error_code,
            costEstimate: d.cost_estimate
          }));
        }
      } catch (error) {
        console.warn('[CorgeaUsageTracker] Failed to fetch from Supabase:', error);
      }
    }

    // Calculate summary
    const byUser = new Map<string, UserUsage>();
    const byOrganization = new Map<string, OrgUsage>();
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<string, number>();

    let totalRequests = 0;
    let totalFixes = 0;
    let totalIssues = 0;
    let totalResponseTime = 0;
    let successCount = 0;
    let totalCost = 0;

    for (const record of records) {
      totalRequests++;
      totalFixes += record.fixesGenerated;
      totalIssues += record.issueCount;
      totalResponseTime += record.responseTimeMs;
      if (record.success) successCount++;
      totalCost += record.costEstimate;

      // By user
      const userUsage = byUser.get(record.userId) || {
        userId: record.userId,
        requests: 0,
        fixes: 0,
        issues: 0,
        cost: 0
      };
      userUsage.requests++;
      userUsage.fixes += record.fixesGenerated;
      userUsage.issues += record.issueCount;
      userUsage.cost += record.costEstimate;
      byUser.set(record.userId, userUsage);

      // By organization
      const orgUsage = byOrganization.get(record.organizationId) || {
        organizationId: record.organizationId,
        users: 0,
        requests: 0,
        fixes: 0,
        issues: 0,
        cost: 0
      };
      orgUsage.requests++;
      orgUsage.fixes += record.fixesGenerated;
      orgUsage.issues += record.issueCount;
      orgUsage.cost += record.costEstimate;
      byOrganization.set(record.organizationId, orgUsage);

      // Hour distribution
      const hour = record.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

      // Day distribution
      const day = record.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    // Update org user counts
    for (const [orgId, orgUsage] of byOrganization) {
      const orgUsers = new Set(
        records.filter(r => r.organizationId === orgId).map(r => r.userId)
      );
      orgUsage.users = orgUsers.size;
    }

    // Find peak hour and day
    let peakHour = 0;
    let peakHourCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > peakHourCount) {
        peakHour = hour;
        peakHourCount = count;
      }
    }

    let peakDay = 'Monday';
    let peakDayCount = 0;
    for (const [day, count] of dayCounts) {
      if (count > peakDayCount) {
        peakDay = day;
        peakDayCount = count;
      }
    }

    return {
      period,
      startDate,
      endDate: now,
      totalRequests,
      totalFixes,
      totalIssuesProcessed: totalIssues,
      avgResponseTimeMs: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      successRate: totalRequests > 0 ? successCount / totalRequests : 0,
      estimatedCost: totalCost,
      byUser,
      byOrganization,
      peakHour,
      peakDay
    };
  }

  /**
   * Generate plan recommendation based on usage
   */
  async getRecommendation(
    currentPlan: keyof typeof PLAN_LIMITS,
    organizationId: string
  ): Promise<PlanRecommendation> {
    const monthlySummary = await this.getUsageSummary('monthly', organizationId);
    const weeklySummary = await this.getUsageSummary('weekly', organizationId);

    // Calculate metrics
    const avgDailyRequests = monthlySummary.totalRequests / 30;
    const avgDailyFixes = monthlySummary.totalFixes / 30;
    const peakHourlyRequests = Math.max(
      ...Array.from({ length: 24 }, (_, i) =>
        this.memoryCache.filter(r =>
          r.organizationId === organizationId &&
          r.timestamp.getHours() === i
        ).length
      )
    );

    // Calculate growth rate (weekly to monthly comparison)
    const weeklyRate = weeklySummary.totalFixes / 7;
    const monthlyRate = monthlySummary.totalFixes / 30;
    const growthRate = monthlyRate > 0 ? ((weeklyRate - monthlyRate) / monthlyRate) * 100 : 0;

    // Determine recommended plan
    const currentLimits = PLAN_LIMITS[currentPlan];
    const projectedMonthlyFixes = avgDailyFixes * 30 * (1 + growthRate / 100);

    let recommendedPlan: keyof typeof PLAN_LIMITS = currentPlan;
    let reason = 'Current plan is appropriate for your usage';

    if (projectedMonthlyFixes > currentLimits.monthlyFixes * 0.8) {
      // Need to upgrade
      if (currentPlan === 'starter') {
        recommendedPlan = 'growth';
        reason = 'Usage approaching starter plan limits. Upgrade to Growth for more capacity.';
      } else if (currentPlan === 'growth') {
        recommendedPlan = 'scale';
        reason = 'Usage approaching growth plan limits. Upgrade to Scale for more capacity.';
      } else if (currentPlan === 'scale') {
        recommendedPlan = 'enterprise';
        reason = 'Usage exceeds Scale plan. Contact sales for Enterprise pricing.';
      }
    } else if (projectedMonthlyFixes < currentLimits.monthlyFixes * 0.3 && currentPlan !== 'starter') {
      // Can downgrade
      if (currentPlan === 'scale') {
        recommendedPlan = 'growth';
        reason = 'Usage is low for current plan. Consider downgrading to save costs.';
      } else if (currentPlan === 'growth') {
        recommendedPlan = 'starter';
        reason = 'Usage is low for current plan. Consider downgrading to Starter.';
      }
    }

    const recommendedLimits = PLAN_LIMITS[recommendedPlan];
    const projectedMonthlyCost = recommendedLimits.monthlyCost;
    const projectedSavings = currentLimits.monthlyCost - recommendedLimits.monthlyCost;

    return {
      currentPlan,
      recommendedPlan,
      reason,
      projectedMonthlyCost,
      projectedSavings,
      usageMetrics: {
        avgDailyRequests,
        avgDailyFixes,
        peakHourlyRequests,
        growthRate
      }
    };
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(): {
    rateLimitStatus: RateLimitStatus;
    last24Hours: { hour: number; requests: number; fixes: number }[];
    topUsers: { userId: string; requests: number }[];
  } {
    const rateLimitStatus = this.getRateLimitStatus();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Last 24 hours by hour
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const hour = (now.getHours() - 23 + i + 24) % 24;
      const hourRecords = this.memoryCache.filter(r => {
        const recordHour = r.timestamp.getHours();
        const isRecent = r.timestamp >= yesterday;
        return recordHour === hour && isRecent;
      });

      return {
        hour,
        requests: hourRecords.length,
        fixes: hourRecords.reduce((sum, r) => sum + r.fixesGenerated, 0)
      };
    });

    // Top users
    const userCounts = new Map<string, number>();
    for (const record of this.memoryCache.filter(r => r.timestamp >= yesterday)) {
      userCounts.set(record.userId, (userCounts.get(record.userId) || 0) + 1);
    }

    const topUsers = Array.from(userCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, requests]) => ({ userId, requests }));

    return {
      rateLimitStatus,
      last24Hours,
      topUsers
    };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private getHourKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
  }

  private getDayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Clean up old counter data
   */
  cleanup(): void {
    const now = new Date();
    const hourKey = this.getHourKey(now);
    const dayKey = this.getDayKey(now);

    // Keep only current hour and day
    for (const key of this.hourlyCounter.keys()) {
      if (key < hourKey) {
        this.hourlyCounter.delete(key);
      }
    }

    for (const key of this.dailyCounter.keys()) {
      if (key < dayKey) {
        this.dailyCounter.delete(key);
      }
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let trackerInstance: CorgeaUsageTracker | null = null;

export function getCorgeaUsageTracker(): CorgeaUsageTracker {
  if (!trackerInstance) {
    trackerInstance = new CorgeaUsageTracker();
  }
  return trackerInstance;
}
