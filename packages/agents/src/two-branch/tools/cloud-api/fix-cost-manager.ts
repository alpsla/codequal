/**
 * Fix Cost Manager
 *
 * Manages costs between Corgea and AI-fixer (OpenRouter):
 * - Tracks real costs per fix from each source
 * - Dynamically routes to cheapest option
 * - Falls back to AI-fixer when Corgea rate limited
 * - Enforces cost ceilings for profitability
 *
 * Key Principle: We charge customers per PR analysis or per fix.
 * Our cost must stay below our price to remain profitable.
 *
 * @since Session 63
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getCorgeaUsageTracker, RateLimitStatus } from './corgea-usage-tracker';

// ============================================================
// TYPES
// ============================================================

export type FixSource = 'corgea' | 'ai_fixer' | 'pattern_registry' | 'native';

export interface FixCostRecord {
  id?: string;
  timestamp: Date;
  source: FixSource;
  issueId: string;
  ruleId: string;
  language: string;
  severity: string;

  // Cost tracking
  inputTokens?: number;
  outputTokens?: number;
  apiCostCents: number;

  // Quality tracking
  confidence: number;
  wasApplied: boolean;
  wasReverted: boolean;
  userRating?: number; // 1-5

  // Context
  userId: string;
  organizationId: string;
}

export interface CostComparison {
  period: 'daily' | 'weekly' | 'monthly';

  corgea: {
    fixes: number;
    totalCost: number;
    avgCostPerFix: number;
    avgConfidence: number;
    successRate: number;
  };

  aiFixer: {
    fixes: number;
    totalCost: number;
    avgCostPerFix: number;
    avgConfidence: number;
    successRate: number;
  };

  winner: FixSource;
  costDifference: number;
  recommendation: string;
}

export interface ProfitabilityAnalysis {
  // Our costs
  totalFixCost: number;
  avgCostPerFix: number;

  // Our pricing (what we charge)
  pricePerFix: number;
  pricePerPR: number;
  avgFixesPerPR: number;

  // Margins
  marginPerFix: number;
  marginPerPR: number;
  marginPercent: number;

  // Sustainability
  breakEvenFixesPerMonth: number;
  currentFixesPerMonth: number;
  isProfitable: boolean;

  // Recommendations
  recommendations: string[];
}

export interface CostCeiling {
  maxCostPerFix: number;      // Max we'll spend on a single fix
  maxCostPerPR: number;       // Max we'll spend on a single PR
  maxDailyCost: number;       // Max daily spend
  maxMonthlyCost: number;     // Max monthly spend
  warningThreshold: number;   // % of ceiling before warning (e.g., 80)
}

export interface RoutingDecision {
  source: FixSource;
  reason: string;
  estimatedCost: number;
  confidence: number;
  fallbackAvailable: boolean;
  fallbackSource?: FixSource;
}

// ============================================================
// DEFAULT CONFIGURATIONS
// ============================================================

// Estimated costs (will be updated with real data)
const ESTIMATED_COSTS: Record<FixSource, number> = {
  corgea: 10,           // 10 cents per fix (Corgea API)
  ai_fixer: 2,          // 2 cents per fix (OpenRouter average)
  pattern_registry: 0,  // Free (local patterns)
  native: 0             // Free (eslint --fix, etc.)
};

// Confidence scores by source
const SOURCE_CONFIDENCE: Record<FixSource, number> = {
  corgea: 85,           // High - security verified
  ai_fixer: 70,         // Medium - AI generated
  pattern_registry: 90, // High - proven patterns
  native: 95            // Highest - tool native
};

// Default pricing (what we charge customers)
const DEFAULT_PRICING = {
  pricePerFix: 15,      // 15 cents per fix to customer
  pricePerPR: 500,      // $5 per PR analysis
  proPlanMonthly: 4900, // $49/month PRO plan
  fixesIncluded: 500    // Fixes included in PRO plan
};

// Default cost ceilings
const DEFAULT_CEILINGS: CostCeiling = {
  maxCostPerFix: 25,        // Max 25 cents per fix
  maxCostPerPR: 1000,       // Max $10 per PR
  maxDailyCost: 5000,       // Max $50 per day
  maxMonthlyCost: 100000,   // Max $1000 per month
  warningThreshold: 80      // Warn at 80%
};

// ============================================================
// FIX COST MANAGER CLASS
// ============================================================

export class FixCostManager {
  private supabase: SupabaseClient | null = null;
  private records: FixCostRecord[] = [];
  private ceilings: CostCeiling;
  private pricing = DEFAULT_PRICING;

  // Real-time cost tracking
  private dailyCost = 0;
  private monthlyCost = 0;
  private lastDayReset = new Date();
  private lastMonthReset = new Date();

  // Rolling averages (updated with real data)
  private avgCosts: Record<FixSource, number> = { ...ESTIMATED_COSTS };
  private successRates: Record<FixSource, number> = {
    corgea: 0.9,
    ai_fixer: 0.75,
    pattern_registry: 0.95,
    native: 0.99
  };

  constructor(ceilings: Partial<CostCeiling> = {}) {
    this.ceilings = { ...DEFAULT_CEILINGS, ...ceilings };
    this.initSupabase();
    this.resetCountersIfNeeded();
  }

  private initSupabase(): void {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  // ============================================================
  // COST RECORDING
  // ============================================================

  /**
   * Record a fix cost
   */
  async recordCost(record: Omit<FixCostRecord, 'id'>): Promise<void> {
    this.records.push(record);

    // Update running totals
    this.dailyCost += record.apiCostCents;
    this.monthlyCost += record.apiCostCents;

    // Update rolling averages
    this.updateRollingAverages(record);

    // Persist to Supabase
    if (this.supabase) {
      try {
        await this.supabase.from('fix_costs').insert({
          timestamp: record.timestamp.toISOString(),
          source: record.source,
          issue_id: record.issueId,
          rule_id: record.ruleId,
          language: record.language,
          severity: record.severity,
          input_tokens: record.inputTokens,
          output_tokens: record.outputTokens,
          api_cost_cents: record.apiCostCents,
          confidence: record.confidence,
          was_applied: record.wasApplied,
          was_reverted: record.wasReverted,
          user_rating: record.userRating,
          user_id: record.userId,
          organization_id: record.organizationId
        });
      } catch (error) {
        console.warn('[FixCostManager] Failed to persist:', error);
      }
    }

    // Check ceilings
    this.checkCeilings();

    // Trim memory
    if (this.records.length > 10000) {
      this.records = this.records.slice(-10000);
    }
  }

  /**
   * Update rolling averages with new data
   */
  private updateRollingAverages(record: FixCostRecord): void {
    const source = record.source;
    const recentRecords = this.records
      .filter(r => r.source === source)
      .slice(-100); // Last 100 records

    if (recentRecords.length > 0) {
      // Update average cost
      const totalCost = recentRecords.reduce((sum, r) => sum + r.apiCostCents, 0);
      this.avgCosts[source] = totalCost / recentRecords.length;

      // Update success rate
      const applied = recentRecords.filter(r => r.wasApplied && !r.wasReverted).length;
      this.successRates[source] = applied / recentRecords.length;
    }
  }

  // ============================================================
  // ROUTING DECISIONS
  // ============================================================

  /**
   * Decide which source to use for a fix
   */
  async decideSource(
    severity: string,
    category: string,
    language: string
  ): Promise<RoutingDecision> {
    this.resetCountersIfNeeded();

    // Check Corgea rate limit
    const corgeaTracker = getCorgeaUsageTracker();
    const rateLimitStatus = corgeaTracker.getRateLimitStatus();

    // Check cost ceilings
    const remainingDailyBudget = this.ceilings.maxDailyCost - this.dailyCost;
    const remainingMonthlyBudget = this.ceilings.maxMonthlyCost - this.monthlyCost;

    // Priority 1: Native fixes (free, highest confidence)
    if (this.canUseNative(category)) {
      return {
        source: 'native',
        reason: 'Native fix available (free, highest confidence)',
        estimatedCost: 0,
        confidence: SOURCE_CONFIDENCE.native,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };
    }

    // Priority 2: Pattern registry (free, high confidence)
    if (this.hasPattern(severity, category)) {
      return {
        source: 'pattern_registry',
        reason: 'Known pattern available (free, proven fix)',
        estimatedCost: 0,
        confidence: SOURCE_CONFIDENCE.pattern_registry,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };
    }

    // Priority 3: Choose between Corgea and AI-fixer
    const corgeaCost = this.avgCosts.corgea;
    const aiFixerCost = this.avgCosts.ai_fixer;

    // Check if Corgea is rate limited
    if (rateLimitStatus.isThrottled) {
      return {
        source: 'ai_fixer',
        reason: `Corgea rate limited (${rateLimitStatus.throttleReason}), using AI-fixer`,
        estimatedCost: aiFixerCost,
        confidence: SOURCE_CONFIDENCE.ai_fixer,
        fallbackAvailable: false
      };
    }

    // Check budget constraints
    if (corgeaCost > remainingDailyBudget || corgeaCost > remainingMonthlyBudget) {
      return {
        source: 'ai_fixer',
        reason: 'Budget constraint - using cheaper AI-fixer',
        estimatedCost: aiFixerCost,
        confidence: SOURCE_CONFIDENCE.ai_fixer,
        fallbackAvailable: false
      };
    }

    // Security issues: prefer Corgea (better verification)
    if (category === 'security' && severity !== 'low') {
      return {
        source: 'corgea',
        reason: 'Security issue - using Corgea for verified fix',
        estimatedCost: corgeaCost,
        confidence: SOURCE_CONFIDENCE.corgea,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };
    }

    // Cost-based decision
    const corgeaValue = this.calculateValue('corgea');
    const aiFixerValue = this.calculateValue('ai_fixer');

    if (corgeaValue >= aiFixerValue) {
      return {
        source: 'corgea',
        reason: `Better value (confidence: ${SOURCE_CONFIDENCE.corgea}%, cost: ${corgeaCost}¢)`,
        estimatedCost: corgeaCost,
        confidence: SOURCE_CONFIDENCE.corgea,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };
    } else {
      return {
        source: 'ai_fixer',
        reason: `Better value (confidence: ${SOURCE_CONFIDENCE.ai_fixer}%, cost: ${aiFixerCost}¢)`,
        estimatedCost: aiFixerCost,
        confidence: SOURCE_CONFIDENCE.ai_fixer,
        fallbackAvailable: true,
        fallbackSource: 'corgea'
      };
    }
  }

  /**
   * Calculate value score (confidence per cent)
   */
  private calculateValue(source: FixSource): number {
    const cost = this.avgCosts[source];
    const confidence = SOURCE_CONFIDENCE[source];
    const successRate = this.successRates[source];

    if (cost === 0) return Infinity; // Free is best

    // Value = (confidence * success_rate) / cost
    return (confidence * successRate) / cost;
  }

  /**
   * Check if native fix available
   */
  private canUseNative(category: string): boolean {
    // Native fixes available for formatting, simple lint issues
    const nativeCategories = ['style', 'formatting', 'import-order'];
    return nativeCategories.includes(category.toLowerCase());
  }

  /**
   * Check if pattern exists
   */
  private hasPattern(severity: string, category: string): boolean {
    // TODO: Check pattern registry
    // For now, assume patterns exist for common issues
    return false;
  }

  // ============================================================
  // COST COMPARISON
  // ============================================================

  /**
   * Compare costs between Corgea and AI-fixer
   */
  async getCostComparison(
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<CostComparison> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
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

    const recentRecords = this.records.filter(r => r.timestamp >= startDate);

    const corgeaRecords = recentRecords.filter(r => r.source === 'corgea');
    const aiFixerRecords = recentRecords.filter(r => r.source === 'ai_fixer');

    const corgea = this.calculateSourceStats(corgeaRecords);
    const aiFixer = this.calculateSourceStats(aiFixerRecords);

    // Determine winner based on value (confidence per cost)
    const corgeaValue = corgea.avgConfidence / (corgea.avgCostPerFix || 1);
    const aiFixerValue = aiFixer.avgConfidence / (aiFixer.avgCostPerFix || 1);

    const winner: FixSource = corgeaValue >= aiFixerValue ? 'corgea' : 'ai_fixer';
    const costDifference = Math.abs(corgea.totalCost - aiFixer.totalCost);

    let recommendation: string;
    if (corgea.fixes === 0 || aiFixer.fixes === 0) {
      recommendation = 'Insufficient data - continue collecting metrics from both sources';
    } else if (corgeaValue > aiFixerValue * 1.2) {
      recommendation = 'Corgea provides significantly better value - prioritize for security issues';
    } else if (aiFixerValue > corgeaValue * 1.2) {
      recommendation = 'AI-fixer is more cost-effective - consider using for non-security issues';
    } else {
      recommendation = 'Both sources provide similar value - use availability-based routing';
    }

    return {
      period,
      corgea,
      aiFixer,
      winner,
      costDifference,
      recommendation
    };
  }

  private calculateSourceStats(records: FixCostRecord[]): {
    fixes: number;
    totalCost: number;
    avgCostPerFix: number;
    avgConfidence: number;
    successRate: number;
  } {
    if (records.length === 0) {
      return {
        fixes: 0,
        totalCost: 0,
        avgCostPerFix: 0,
        avgConfidence: 0,
        successRate: 0
      };
    }

    const totalCost = records.reduce((sum, r) => sum + r.apiCostCents, 0);
    const totalConfidence = records.reduce((sum, r) => sum + r.confidence, 0);
    const successCount = records.filter(r => r.wasApplied && !r.wasReverted).length;

    return {
      fixes: records.length,
      totalCost,
      avgCostPerFix: totalCost / records.length,
      avgConfidence: totalConfidence / records.length,
      successRate: successCount / records.length
    };
  }

  // ============================================================
  // PROFITABILITY ANALYSIS
  // ============================================================

  /**
   * Analyze profitability
   */
  async analyzeProfitability(): Promise<ProfitabilityAnalysis> {
    const monthlyRecords = this.records.filter(r =>
      r.timestamp >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const totalFixCost = monthlyRecords.reduce((sum, r) => sum + r.apiCostCents, 0);
    const avgCostPerFix = monthlyRecords.length > 0
      ? totalFixCost / monthlyRecords.length
      : (this.avgCosts.corgea + this.avgCosts.ai_fixer) / 2;

    const pricePerFix = this.pricing.pricePerFix;
    const pricePerPR = this.pricing.pricePerPR;
    const avgFixesPerPR = 10; // Estimate

    const marginPerFix = pricePerFix - avgCostPerFix;
    const marginPerPR = pricePerPR - (avgCostPerFix * avgFixesPerPR);
    const marginPercent = pricePerFix > 0 ? (marginPerFix / pricePerFix) * 100 : 0;

    // Break-even calculation (for PRO plan)
    const proRevenue = this.pricing.proPlanMonthly;
    const breakEvenFixesPerMonth = proRevenue / avgCostPerFix;
    const currentFixesPerMonth = monthlyRecords.length;

    const isProfitable = marginPerFix > 0 && marginPerPR > 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (marginPercent < 30) {
      recommendations.push('Margin below 30% - consider increasing prices or optimizing costs');
    }

    if (this.avgCosts.corgea > this.avgCosts.ai_fixer * 2) {
      recommendations.push('Corgea 2x more expensive than AI-fixer - reserve for security issues only');
    }

    if (this.successRates.ai_fixer < 0.7) {
      recommendations.push('AI-fixer success rate below 70% - improve prompts or fallback more');
    }

    if (currentFixesPerMonth > breakEvenFixesPerMonth * 0.8) {
      recommendations.push('Approaching break-even point - consider upgrading Corgea plan');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cost structure is healthy - continue monitoring');
    }

    return {
      totalFixCost,
      avgCostPerFix,
      pricePerFix,
      pricePerPR,
      avgFixesPerPR,
      marginPerFix,
      marginPerPR,
      marginPercent,
      breakEvenFixesPerMonth,
      currentFixesPerMonth,
      isProfitable,
      recommendations
    };
  }

  // ============================================================
  // CEILING MANAGEMENT
  // ============================================================

  /**
   * Check and enforce cost ceilings
   */
  private checkCeilings(): {
    dailyUsed: number;
    dailyRemaining: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    warnings: string[];
    blocked: boolean;
  } {
    this.resetCountersIfNeeded();

    const dailyUsedPercent = (this.dailyCost / this.ceilings.maxDailyCost) * 100;
    const monthlyUsedPercent = (this.monthlyCost / this.ceilings.maxMonthlyCost) * 100;

    const warnings: string[] = [];
    let blocked = false;

    if (dailyUsedPercent >= this.ceilings.warningThreshold) {
      warnings.push(`Daily budget ${dailyUsedPercent.toFixed(1)}% used`);
    }

    if (monthlyUsedPercent >= this.ceilings.warningThreshold) {
      warnings.push(`Monthly budget ${monthlyUsedPercent.toFixed(1)}% used`);
    }

    if (dailyUsedPercent >= 100 || monthlyUsedPercent >= 100) {
      blocked = true;
      warnings.push('BLOCKED: Cost ceiling reached - only free sources available');
    }

    return {
      dailyUsed: this.dailyCost,
      dailyRemaining: this.ceilings.maxDailyCost - this.dailyCost,
      monthlyUsed: this.monthlyCost,
      monthlyRemaining: this.ceilings.maxMonthlyCost - this.monthlyCost,
      warnings,
      blocked
    };
  }

  /**
   * Update cost ceilings
   */
  setCeilings(ceilings: Partial<CostCeiling>): void {
    this.ceilings = { ...this.ceilings, ...ceilings };
  }

  /**
   * Update pricing
   */
  setPricing(pricing: Partial<typeof DEFAULT_PRICING>): void {
    this.pricing = { ...this.pricing, ...pricing };
  }

  /**
   * Get current ceiling status
   */
  getCeilingStatus(): ReturnType<typeof this.checkCeilings> {
    return this.checkCeilings();
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private resetCountersIfNeeded(): void {
    const now = new Date();

    // Reset daily counter
    if (now.getDate() !== this.lastDayReset.getDate()) {
      this.dailyCost = 0;
      this.lastDayReset = now;
    }

    // Reset monthly counter
    if (now.getMonth() !== this.lastMonthReset.getMonth()) {
      this.monthlyCost = 0;
      this.lastMonthReset = now;
    }
  }

  /**
   * Get dashboard summary
   */
  getDashboard(): {
    avgCosts: Record<FixSource, number>;
    successRates: Record<FixSource, number>;
    ceilingStatus: ReturnType<typeof this.checkCeilings>;
    recordCount: number;
  } {
    return {
      avgCosts: { ...this.avgCosts },
      successRates: { ...this.successRates },
      ceilingStatus: this.checkCeilings(),
      recordCount: this.records.length
    };
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let managerInstance: FixCostManager | null = null;

export function getFixCostManager(): FixCostManager {
  if (!managerInstance) {
    managerInstance = new FixCostManager();
  }
  return managerInstance;
}
