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

// Fallback costs (used when Supabase data unavailable)
// Real costs are fetched from Supabase: fix_cost_comparison view
const FALLBACK_COSTS: Record<FixSource, number> = {
  corgea: 10,           // 10 cents per fix (fallback estimate)
  ai_fixer: 2,          // 2 cents per fix (fallback estimate)
  pattern_registry: 0,  // Free (local patterns)
  native: 0             // Free (eslint --fix, etc.)
};

// Cost comparison result from Supabase
export interface SupabaseCostComparison {
  corgeaPlan: string;
  corgeaMonthlyCents: number;
  corgeaFixesUsed: number;
  corgeaCostPerFixCents: number;
  aiFixerCostPerFixCents: number;
  recommendedSource: FixSource;
  costDifferenceCents: number;
  // Routing mode (Session 63)
  routingMode: 'manual' | 'automatic';
  manualPreferredSource?: FixSource;
}

// Routing configuration
export type RoutingMode = 'manual' | 'automatic';

export interface RoutingConfig {
  routingMode: RoutingMode;
  manualPreferredSource: FixSource;
  manualReason?: string;
  dataCollectionTargetFixes: number;
  decisionsSinceCollectionStart: number;
  autoPreferCorgeaForSecurity: boolean;
  autoFallbackOnRateLimit: boolean;
}

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
  private avgCosts: Record<FixSource, number> = { ...FALLBACK_COSTS };
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
  // SUPABASE COST QUERIES
  // ============================================================

  /**
   * Fetch real-time cost comparison from Supabase
   * Uses the fix_cost_comparison view which compares:
   * - Corgea effective cost (subscription / fixes used)
   * - AI-fixer avg cost (from ai_fixer_research table)
   */
  async getSupabaseCostComparison(): Promise<SupabaseCostComparison | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('fix_cost_comparison')
        .select('*')
        .single();

      if (error || !data) {
        console.warn('[FixCostManager] Failed to fetch cost comparison:', error);
        return null;
      }

      return {
        corgeaPlan: data.corgea_plan,
        corgeaMonthlyCents: data.corgea_monthly_cents,
        corgeaFixesUsed: data.corgea_fixes_used,
        corgeaCostPerFixCents: parseFloat(data.corgea_cost_per_fix_cents) || 0,
        aiFixerCostPerFixCents: parseFloat(data.ai_fixer_cost_per_fix_cents) || 2,
        recommendedSource: data.recommended_source as FixSource,
        costDifferenceCents: parseFloat(data.cost_difference_cents) || 0,
        routingMode: data.routing_mode || 'manual',
        manualPreferredSource: data.manual_preferred_source as FixSource
      };
    } catch (error) {
      console.warn('[FixCostManager] Error querying cost comparison:', error);
      return null;
    }
  }

  /**
   * Log Corgea usage to update effective cost calculation
   */
  async logCorgeaUsage(params: {
    userId?: string;
    organizationId?: string;
    repositoryUrl?: string;
    prNumber?: number;
    issueCount: number;
    fixesGenerated: number;
    fixesApplied?: number;
    responseTimeMs?: number;
    fromCache?: boolean;
    success?: boolean;
    errorMessage?: string;
    rateLimited?: boolean;
  }): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get current effective cost for estimation
      const comparison = await this.getSupabaseCostComparison();
      const estimatedCostCents = comparison
        ? params.fixesGenerated * comparison.corgeaCostPerFixCents
        : params.fixesGenerated * FALLBACK_COSTS.corgea;

      await this.supabase.from('corgea_usage_log').insert({
        user_id: params.userId,
        organization_id: params.organizationId,
        repository_url: params.repositoryUrl,
        pr_number: params.prNumber,
        issue_count: params.issueCount,
        fixes_generated: params.fixesGenerated,
        fixes_applied: params.fixesApplied || 0,
        estimated_cost_cents: estimatedCostCents,
        response_time_ms: params.responseTimeMs,
        from_cache: params.fromCache || false,
        success: params.success ?? true,
        error_message: params.errorMessage,
        rate_limited: params.rateLimited || false
      });

      // Trigger in Supabase will auto-update corgea_subscription effective cost
    } catch (error) {
      console.warn('[FixCostManager] Failed to log Corgea usage:', error);
    }
  }

  /**
   * Get which source is currently cheaper based on Supabase data
   * Falls back to hardcoded estimates if Supabase unavailable
   */
  async getCheaperSource(): Promise<{
    source: FixSource;
    costCents: number;
    reason: string;
  }> {
    const comparison = await this.getSupabaseCostComparison();

    if (comparison) {
      // Use real data from Supabase
      if (comparison.corgeaCostPerFixCents <= 0) {
        // No Corgea usage yet - use AI-fixer
        return {
          source: 'ai_fixer',
          costCents: comparison.aiFixerCostPerFixCents,
          reason: 'No Corgea usage data yet, using AI-fixer'
        };
      }

      if (comparison.corgeaCostPerFixCents < comparison.aiFixerCostPerFixCents) {
        return {
          source: 'corgea',
          costCents: comparison.corgeaCostPerFixCents,
          reason: `Corgea cheaper: ${comparison.corgeaCostPerFixCents.toFixed(1)}¢ vs AI-fixer ${comparison.aiFixerCostPerFixCents.toFixed(1)}¢`
        };
      } else {
        return {
          source: 'ai_fixer',
          costCents: comparison.aiFixerCostPerFixCents,
          reason: `AI-fixer cheaper: ${comparison.aiFixerCostPerFixCents.toFixed(1)}¢ vs Corgea ${comparison.corgeaCostPerFixCents.toFixed(1)}¢`
        };
      }
    }

    // Fallback to estimates
    if (FALLBACK_COSTS.ai_fixer < FALLBACK_COSTS.corgea) {
      return {
        source: 'ai_fixer',
        costCents: FALLBACK_COSTS.ai_fixer,
        reason: 'Using fallback estimates - AI-fixer cheaper'
      };
    } else {
      return {
        source: 'corgea',
        costCents: FALLBACK_COSTS.corgea,
        reason: 'Using fallback estimates - Corgea cheaper'
      };
    }
  }

  // ============================================================
  // ROUTING MODE MANAGEMENT (Session 63)
  // ============================================================

  /**
   * Get current routing configuration
   */
  async getRoutingConfig(): Promise<RoutingConfig | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('fix_routing_config')
        .select('*')
        .eq('id', 'current')
        .single();

      if (error || !data) {
        console.warn('[FixCostManager] Failed to fetch routing config:', error);
        return null;
      }

      return {
        routingMode: data.routing_mode as RoutingMode,
        manualPreferredSource: data.manual_preferred_source as FixSource,
        manualReason: data.manual_reason,
        dataCollectionTargetFixes: data.data_collection_target_fixes || 100,
        decisionsSinceCollectionStart: 0, // Will be calculated from view
        autoPreferCorgeaForSecurity: data.auto_prefer_corgea_for_security ?? true,
        autoFallbackOnRateLimit: data.auto_fallback_on_rate_limit ?? true
      };
    } catch (error) {
      console.warn('[FixCostManager] Error fetching routing config:', error);
      return null;
    }
  }

  /**
   * Switch routing mode between manual and automatic
   *
   * @param mode - 'manual' for data collection phase, 'automatic' for cost-optimized routing
   * @param preferredSource - When manual, which source to use (default: current preference)
   * @param reason - Documentation for why the switch was made
   */
  async setRoutingMode(
    mode: RoutingMode,
    preferredSource?: FixSource,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.supabase) {
      return { success: false, message: 'Supabase not available' };
    }

    try {
      // Use the switch_routing_mode function if available, otherwise direct update
      const { data, error } = await this.supabase.rpc('switch_routing_mode', {
        new_mode: mode,
        preferred_source: preferredSource || null,
        change_reason: reason || null,
        changed_by: 'fix-cost-manager'
      });

      if (error) {
        // Fallback to direct update if function doesn't exist
        const { error: updateError } = await this.supabase
          .from('fix_routing_config')
          .update({
            routing_mode: mode,
            manual_preferred_source: preferredSource,
            manual_reason: reason,
            last_mode_change_at: new Date().toISOString(),
            last_mode_change_by: 'fix-cost-manager',
            updated_at: new Date().toISOString()
          })
          .eq('id', 'current');

        if (updateError) {
          return { success: false, message: updateError.message };
        }
      }

      const modeDescription = mode === 'manual'
        ? `Manual mode: Using ${preferredSource || 'ai_fixer'} for data collection`
        : 'Automatic mode: Cost-optimized source selection';

      console.log(`[FixCostManager] ${modeDescription}`);
      return { success: true, message: modeDescription };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Set the preferred source for manual mode
   * Convenience method for quick switching between Corgea and AI-fixer
   */
  async setManualSource(
    source: 'corgea' | 'ai_fixer',
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.setRoutingMode('manual', source, reason);
  }

  /**
   * Enable automatic routing (cost-optimized)
   * Should be called after sufficient data collection
   */
  async enableAutomaticRouting(
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.setRoutingMode(
      'automatic',
      undefined,
      reason || 'Switching to automatic routing after data collection'
    );
  }

  /**
   * Log a routing decision for analysis
   */
  async logRoutingDecision(params: {
    routingMode: RoutingMode;
    selectedSource: FixSource;
    decisionReason: string;
    wasFallback?: boolean;
    fallbackReason?: string;
    corgeaCostCents?: number;
    aiFixerCostCents?: number;
    issueSeverity?: string;
    issueCategory?: string;
    language?: string;
    ruleId?: string;
    userId?: string;
    organizationId?: string;
  }): Promise<void> {
    if (!this.supabase) return;

    try {
      const costSavings = params.corgeaCostCents && params.aiFixerCostCents
        ? Math.abs(params.corgeaCostCents - params.aiFixerCostCents)
        : null;

      await this.supabase.from('fix_routing_decisions').insert({
        routing_mode: params.routingMode,
        selected_source: params.selectedSource,
        decision_reason: params.decisionReason,
        was_fallback: params.wasFallback || false,
        fallback_reason: params.fallbackReason,
        corgea_cost_cents: params.corgeaCostCents,
        ai_fixer_cost_cents: params.aiFixerCostCents,
        cost_savings_cents: costSavings,
        issue_severity: params.issueSeverity,
        issue_category: params.issueCategory,
        language: params.language,
        rule_id: params.ruleId,
        user_id: params.userId,
        organization_id: params.organizationId
      });
    } catch (error) {
      console.warn('[FixCostManager] Failed to log routing decision:', error);
    }
  }

  /**
   * Get routing statistics for analysis
   */
  async getRoutingStats(): Promise<{
    mode: RoutingMode;
    preferredSource?: FixSource;
    totalDecisions: number;
    corgeaDecisions: number;
    aiFixerDecisions: number;
    fallbackCount: number;
    avgCostSavings: number;
  } | null> {
    if (!this.supabase) return null;

    try {
      // Get config
      const config = await this.getRoutingConfig();
      if (!config) return null;

      // Get decision stats
      const { data: stats, error } = await this.supabase
        .from('fix_routing_decisions')
        .select('selected_source, was_fallback, cost_savings_cents');

      if (error || !stats) {
        return {
          mode: config.routingMode,
          preferredSource: config.manualPreferredSource,
          totalDecisions: 0,
          corgeaDecisions: 0,
          aiFixerDecisions: 0,
          fallbackCount: 0,
          avgCostSavings: 0
        };
      }

      const corgeaDecisions = stats.filter(s => s.selected_source === 'corgea').length;
      const aiFixerDecisions = stats.filter(s => s.selected_source === 'ai_fixer').length;
      const fallbackCount = stats.filter(s => s.was_fallback).length;
      const savingsValues = stats
        .filter(s => s.cost_savings_cents !== null)
        .map(s => parseFloat(s.cost_savings_cents) || 0);
      const avgCostSavings = savingsValues.length > 0
        ? savingsValues.reduce((a, b) => a + b, 0) / savingsValues.length
        : 0;

      return {
        mode: config.routingMode,
        preferredSource: config.manualPreferredSource,
        totalDecisions: stats.length,
        corgeaDecisions,
        aiFixerDecisions,
        fallbackCount,
        avgCostSavings
      };
    } catch (error) {
      console.warn('[FixCostManager] Error fetching routing stats:', error);
      return null;
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
   *
   * Respects routing mode:
   * - 'manual': Uses the manually selected preferred source (for data collection)
   * - 'automatic': Uses cost-optimized source selection
   */
  async decideSource(
    severity: string,
    category: string,
    language: string
  ): Promise<RoutingDecision> {
    this.resetCountersIfNeeded();

    // Get routing configuration
    const routingConfig = await this.getRoutingConfig();
    const comparison = await this.getSupabaseCostComparison();

    // Check Corgea rate limit
    const corgeaTracker = getCorgeaUsageTracker();
    const rateLimitStatus = corgeaTracker.getRateLimitStatus();

    // Check cost ceilings
    const remainingDailyBudget = this.ceilings.maxDailyCost - this.dailyCost;
    const remainingMonthlyBudget = this.ceilings.maxMonthlyCost - this.monthlyCost;

    // Get costs
    const corgeaCost = comparison?.corgeaCostPerFixCents || this.avgCosts.corgea;
    const aiFixerCost = comparison?.aiFixerCostPerFixCents || this.avgCosts.ai_fixer;

    // Priority 1: Native fixes (free, highest confidence) - always use if available
    if (this.canUseNative(category)) {
      await this.logRoutingDecision({
        routingMode: routingConfig?.routingMode || 'manual',
        selectedSource: 'native',
        decisionReason: 'Native fix available (free, highest confidence)',
        corgeaCostCents: corgeaCost,
        aiFixerCostCents: aiFixerCost,
        issueSeverity: severity,
        issueCategory: category,
        language
      });

      return {
        source: 'native',
        reason: 'Native fix available (free, highest confidence)',
        estimatedCost: 0,
        confidence: SOURCE_CONFIDENCE.native,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };
    }

    // Priority 2: Pattern registry (free, high confidence) - always use if available
    if (this.hasPattern(severity, category)) {
      await this.logRoutingDecision({
        routingMode: routingConfig?.routingMode || 'manual',
        selectedSource: 'pattern_registry',
        decisionReason: 'Known pattern available (free, proven fix)',
        corgeaCostCents: corgeaCost,
        aiFixerCostCents: aiFixerCost,
        issueSeverity: severity,
        issueCategory: category,
        language
      });

      return {
        source: 'pattern_registry',
        reason: 'Known pattern available (free, proven fix)',
        estimatedCost: 0,
        confidence: SOURCE_CONFIDENCE.pattern_registry,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };
    }

    // Priority 3: Check rate limits and budget - these override manual mode
    if (rateLimitStatus.isThrottled) {
      const decision: RoutingDecision = {
        source: 'ai_fixer',
        reason: `Corgea rate limited (${rateLimitStatus.throttleReason}), using AI-fixer`,
        estimatedCost: aiFixerCost,
        confidence: SOURCE_CONFIDENCE.ai_fixer,
        fallbackAvailable: false
      };

      await this.logRoutingDecision({
        routingMode: routingConfig?.routingMode || 'manual',
        selectedSource: 'ai_fixer',
        decisionReason: decision.reason,
        wasFallback: true,
        fallbackReason: 'Corgea rate limited',
        corgeaCostCents: corgeaCost,
        aiFixerCostCents: aiFixerCost,
        issueSeverity: severity,
        issueCategory: category,
        language
      });

      return decision;
    }

    // ============================================================
    // MANUAL MODE: Use preferred source for data collection
    // ============================================================
    if (routingConfig?.routingMode === 'manual') {
      const preferredSource = routingConfig.manualPreferredSource || 'ai_fixer';
      const estimatedCost = preferredSource === 'corgea' ? corgeaCost : aiFixerCost;
      const reason = `Manual mode: Using ${preferredSource} for data collection`;

      await this.logRoutingDecision({
        routingMode: 'manual',
        selectedSource: preferredSource,
        decisionReason: reason,
        corgeaCostCents: corgeaCost,
        aiFixerCostCents: aiFixerCost,
        issueSeverity: severity,
        issueCategory: category,
        language
      });

      return {
        source: preferredSource,
        reason,
        estimatedCost,
        confidence: SOURCE_CONFIDENCE[preferredSource],
        fallbackAvailable: true,
        fallbackSource: preferredSource === 'corgea' ? 'ai_fixer' : 'corgea'
      };
    }

    // ============================================================
    // AUTOMATIC MODE: Cost-optimized source selection
    // ============================================================

    // Check budget constraints
    if (corgeaCost > remainingDailyBudget || corgeaCost > remainingMonthlyBudget) {
      const decision: RoutingDecision = {
        source: 'ai_fixer',
        reason: 'Budget constraint - using AI-fixer',
        estimatedCost: aiFixerCost,
        confidence: SOURCE_CONFIDENCE.ai_fixer,
        fallbackAvailable: false
      };

      await this.logRoutingDecision({
        routingMode: 'automatic',
        selectedSource: 'ai_fixer',
        decisionReason: decision.reason,
        corgeaCostCents: corgeaCost,
        aiFixerCostCents: aiFixerCost,
        issueSeverity: severity,
        issueCategory: category,
        language
      });

      return decision;
    }

    // Security issues: prefer Corgea (better verification) in automatic mode
    if (routingConfig?.autoPreferCorgeaForSecurity && category === 'security' && severity !== 'low') {
      const decision: RoutingDecision = {
        source: 'corgea',
        reason: 'Automatic mode: Security issue - using Corgea for verified fix',
        estimatedCost: corgeaCost,
        confidence: SOURCE_CONFIDENCE.corgea,
        fallbackAvailable: true,
        fallbackSource: 'ai_fixer'
      };

      await this.logRoutingDecision({
        routingMode: 'automatic',
        selectedSource: 'corgea',
        decisionReason: decision.reason,
        corgeaCostCents: corgeaCost,
        aiFixerCostCents: aiFixerCost,
        issueSeverity: severity,
        issueCategory: category,
        language
      });

      return decision;
    }

    // Cost-based decision using real Supabase data
    const cheaperSource = await this.getCheaperSource();

    await this.logRoutingDecision({
      routingMode: 'automatic',
      selectedSource: cheaperSource.source,
      decisionReason: cheaperSource.reason,
      corgeaCostCents: corgeaCost,
      aiFixerCostCents: aiFixerCost,
      issueSeverity: severity,
      issueCategory: category,
      language
    });

    return {
      source: cheaperSource.source,
      reason: `Automatic mode: ${cheaperSource.reason}`,
      estimatedCost: cheaperSource.costCents,
      confidence: SOURCE_CONFIDENCE[cheaperSource.source],
      fallbackAvailable: true,
      fallbackSource: cheaperSource.source === 'corgea' ? 'ai_fixer' : 'corgea'
    };
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
    ceilingStatus: {
      dailyUsed: number;
      dailyRemaining: number;
      monthlyUsed: number;
      monthlyRemaining: number;
      warnings: string[];
      blocked: boolean;
    };
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
