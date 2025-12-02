/**
 * Supabase Fix Router
 *
 * Routes issues to appropriate fixers using the Supabase tool registry.
 * Implements the Two-Tier Fix System:
 * - Tier 1: Tool fixer with ≥60% confidence
 * - Tier 2: AI fixer for <60% confidence (with tool context as prep work)
 *
 * Key difference from hardcoded fix-router.ts:
 * - Fetches fixer configurations from Supabase instead of hardcoded maps
 * - Passes tool context (suggestions, patterns) to AI fixer even for low confidence
 * - Supports dynamic tool updates via researcher agent
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'java' | 'typescript' | 'javascript' | 'python' | 'go' | 'rust';

export interface IssueToRoute {
  id: string;
  validatorToolId: string;
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;
  originalFix?: string;  // Tool's original fix suggestion
}

export interface RoutedIssue extends IssueToRoute {
  tier: 1 | 2;
  fixerToolId?: string;
  fixerName: string;
  fixCommand?: string;
  confidence: number;
  safeForAutoApply: boolean;
  toolContext?: ToolContext;
  reason: string;
}

export interface ToolContext {
  toolSuggestion?: string;
  ruleDescription?: string;
  recommendedPattern?: string;
  relatedRules?: string[];
  bestPractices?: string;
}

export interface FixBatch {
  tier: 1 | 2;
  fixerToolId?: string;
  fixerName: string;
  fixCommand?: string;
  issues: RoutedIssue[];
  files: string[];
  confidence: number;
  safeForAutoApply: boolean;
  executionSpeed: 'fast' | 'medium' | 'slow';
}

export interface RoutingResult {
  tier1Batches: FixBatch[];
  tier2Batch: FixBatch | null;
  summary: {
    total: number;
    tier1Count: number;
    tier2Count: number;
    safeForAutoApply: number;
    estimatedAiCost: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER1_CONFIDENCE_THRESHOLD = 60;
const AI_COST_PER_ISSUE = 0.02; // Estimated cost per AI fix

// ============================================================================
// SUPABASE FIX ROUTER
// ============================================================================

export class SupabaseFixRouter {
  private supabase: SupabaseClient;
  private cache: {
    fixerMappings: Map<string, FixerMappingResult>;
    fixerTools: Map<string, FixerToolResult>;
    ruleDescriptions: Map<string, RuleDescription>;
  };

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.cache = {
      fixerMappings: new Map(),
      fixerTools: new Map(),
      ruleDescriptions: new Map(),
    };
  }

  // ==========================================================================
  // MAIN ROUTING
  // ==========================================================================

  /**
   * Route a single issue to the appropriate fixer
   */
  async routeIssue(issue: IssueToRoute): Promise<RoutedIssue> {
    const cacheKey = `${issue.validatorToolId}:${issue.ruleId}`;

    // Check cache first
    let mapping = this.cache.fixerMappings.get(cacheKey);

    if (!mapping) {
      // Query Supabase for fixer mapping
      mapping = await this.getFixerMapping(issue.validatorToolId, issue.ruleId);
      if (mapping) {
        this.cache.fixerMappings.set(cacheKey, mapping);
      }
    }

    // Get tool context (even for Tier 2, as prep work for AI)
    const toolContext = await this.getToolContext(issue.validatorToolId, issue.ruleId);

    if (!mapping || mapping.confidence < TIER1_CONFIDENCE_THRESHOLD || !mapping.fixerToolId) {
      // Tier 2: AI Fixer (with tool context)
      return {
        ...issue,
        tier: 2,
        fixerName: 'AI Fixer',
        confidence: mapping?.confidence || 50,
        safeForAutoApply: false,
        toolContext,
        reason: mapping
          ? `Confidence ${mapping.confidence}% < ${TIER1_CONFIDENCE_THRESHOLD}% threshold, using AI fixer with tool context`
          : 'No fixer mapping found, using AI fixer',
      };
    }

    // Tier 1: Tool Fixer
    const fixerTool = await this.getFixerTool(mapping.fixerToolId);

    return {
      ...issue,
      tier: 1,
      fixerToolId: mapping.fixerToolId,
      fixerName: fixerTool?.name || mapping.fixerToolId,
      fixCommand: fixerTool?.fixCommand,
      confidence: mapping.confidence,
      safeForAutoApply: mapping.safeForAutoApply,
      toolContext, // Include even for Tier 1 (useful for debugging/logging)
      reason: `Tool fixer available with ${mapping.confidence}% confidence`,
    };
  }

  /**
   * Route multiple issues and create batches for execution
   */
  async routeAndBatch(issues: IssueToRoute[]): Promise<RoutingResult> {
    const tier1Groups = new Map<string, RoutedIssue[]>();
    const tier2Issues: RoutedIssue[] = [];

    // Route each issue
    for (const issue of issues) {
      const routed = await this.routeIssue(issue);

      if (routed.tier === 1 && routed.fixerToolId) {
        const group = tier1Groups.get(routed.fixerToolId) || [];
        group.push(routed);
        tier1Groups.set(routed.fixerToolId, group);
      } else {
        tier2Issues.push(routed);
      }
    }

    // Create Tier 1 batches
    const tier1Batches: FixBatch[] = [];
    for (const [fixerToolId, groupIssues] of tier1Groups) {
      const firstIssue = groupIssues[0];
      const fixerTool = await this.getFixerTool(fixerToolId);

      tier1Batches.push({
        tier: 1,
        fixerToolId,
        fixerName: firstIssue.fixerName,
        fixCommand: firstIssue.fixCommand,
        issues: groupIssues,
        files: [...new Set(groupIssues.map(i => i.file))],
        confidence: firstIssue.confidence,
        safeForAutoApply: firstIssue.safeForAutoApply,
        executionSpeed: fixerTool?.executionSpeed || 'medium',
      });
    }

    // Sort Tier 1 batches by speed (fast first)
    tier1Batches.sort((a, b) => {
      const order = { fast: 0, medium: 1, slow: 2 };
      return order[a.executionSpeed] - order[b.executionSpeed];
    });

    // Create Tier 2 batch (AI fixer)
    const tier2Batch: FixBatch | null = tier2Issues.length > 0 ? {
      tier: 2,
      fixerName: 'AI Fixer',
      issues: tier2Issues,
      files: [...new Set(tier2Issues.map(i => i.file))],
      confidence: Math.round(tier2Issues.reduce((sum, i) => sum + i.confidence, 0) / tier2Issues.length),
      safeForAutoApply: false,
      executionSpeed: 'slow',
    } : null;

    // Calculate summary
    const safeForAutoApply = tier1Batches
      .filter(b => b.safeForAutoApply)
      .reduce((sum, b) => sum + b.issues.length, 0);

    return {
      tier1Batches,
      tier2Batch,
      summary: {
        total: issues.length,
        tier1Count: issues.length - tier2Issues.length,
        tier2Count: tier2Issues.length,
        safeForAutoApply,
        estimatedAiCost: tier2Issues.length * AI_COST_PER_ISSUE,
      },
    };
  }

  // ==========================================================================
  // SUPABASE QUERIES
  // ==========================================================================

  /**
   * Get fixer mapping for a validator rule
   */
  private async getFixerMapping(
    validatorToolId: string,
    ruleId: string
  ): Promise<FixerMappingResult | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_fixer_for_rule', {
          p_validator_tool_id: validatorToolId,
          p_rule_id: ruleId,
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const row = data[0];
      return {
        fixerToolId: row.fixer_tool_id,
        fixerName: row.fixer_name,
        fixCommand: row.fix_command,
        confidence: row.confidence,
        safeForAutoApply: row.safe_for_auto_apply,
      };
    } catch (err) {
      console.warn(`Failed to get fixer mapping for ${validatorToolId}/${ruleId}:`, err);
      return null;
    }
  }

  /**
   * Get fixer tool details
   */
  private async getFixerTool(fixerToolId: string): Promise<FixerToolResult | null> {
    // Check cache
    if (this.cache.fixerTools.has(fixerToolId)) {
      return this.cache.fixerTools.get(fixerToolId)!;
    }

    try {
      const { data, error } = await this.supabase
        .from('fixer_tools')
        .select('*')
        .eq('tool_id', fixerToolId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      const result: FixerToolResult = {
        toolId: data.tool_id,
        name: data.name,
        fixCommand: data.fix_command,
        baseConfidence: data.base_confidence,
        safeForAutoApply: data.safe_for_auto_apply,
        executionSpeed: data.execution_speed as 'fast' | 'medium' | 'slow',
      };

      this.cache.fixerTools.set(fixerToolId, result);
      return result;
    } catch (err) {
      console.warn(`Failed to get fixer tool ${fixerToolId}:`, err);
      return null;
    }
  }

  /**
   * Get tool context for AI fixer prep work
   * This provides context even for <60% confidence issues
   */
  private async getToolContext(
    validatorToolId: string,
    ruleId: string
  ): Promise<ToolContext | undefined> {
    const cacheKey = `${validatorToolId}:${ruleId}`;

    // Check cache
    if (this.cache.ruleDescriptions.has(cacheKey)) {
      const desc = this.cache.ruleDescriptions.get(cacheKey)!;
      return {
        ruleDescription: desc.description,
        recommendedPattern: desc.recommendedPattern,
        bestPractices: desc.bestPractices,
        relatedRules: desc.relatedRules,
      };
    }

    // Query Supabase for rule description (from rule_to_fixer_mappings notes)
    try {
      const { data, error } = await this.supabase
        .from('rule_to_fixer_mappings')
        .select('notes, rule_pattern')
        .eq('validator_tool_id', validatorToolId)
        .eq('rule_id', ruleId)
        .single();

      if (!error && data) {
        const desc: RuleDescription = {
          description: data.notes || undefined,
          rulePattern: data.rule_pattern || undefined,
        };

        this.cache.ruleDescriptions.set(cacheKey, desc);

        return {
          ruleDescription: desc.description,
          toolSuggestion: desc.description, // Use notes as tool suggestion
        };
      }
    } catch {
      // Rule not found in DB
    }

    // Return basic context from the rule ID itself
    return {
      toolSuggestion: `Fix issue detected by ${validatorToolId}: ${ruleId}`,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear the cache (call after tool registry updates)
   */
  clearCache(): void {
    this.cache.fixerMappings.clear();
    this.cache.fixerTools.clear();
    this.cache.ruleDescriptions.clear();
  }

  /**
   * Get routing statistics for a language
   */
  async getLanguageStats(language: SupportedLanguage): Promise<{
    validators: number;
    fixers: number;
    tier1Rules: number;
    tier2Rules: number;
  }> {
    const [
      { count: validatorCount },
      { count: fixerCount },
      { count: tier1Count },
      { count: tier2Count },
    ] = await Promise.all([
      this.supabase
        .from('validator_tools')
        .select('*', { count: 'exact', head: true })
        .contains('languages', [language])
        .eq('is_active', true),
      this.supabase
        .from('fixer_tools')
        .select('*', { count: 'exact', head: true })
        .contains('languages', [language])
        .eq('is_active', true),
      this.supabase
        .from('rule_to_fixer_mappings')
        .select('*', { count: 'exact', head: true })
        .gte('confidence', TIER1_CONFIDENCE_THRESHOLD)
        .eq('is_active', true),
      this.supabase
        .from('rule_to_fixer_mappings')
        .select('*', { count: 'exact', head: true })
        .lt('confidence', TIER1_CONFIDENCE_THRESHOLD)
        .eq('is_active', true),
    ]);

    return {
      validators: validatorCount || 0,
      fixers: fixerCount || 0,
      tier1Rules: tier1Count || 0,
      tier2Rules: tier2Count || 0,
    };
  }

  /**
   * Print routing summary
   */
  async printSummary(): Promise<void> {
    console.log('\n📊 SUPABASE FIX ROUTER SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Tier 1 Threshold: ≥${TIER1_CONFIDENCE_THRESHOLD}% confidence`);
    console.log(`   Tier 2 (AI): <${TIER1_CONFIDENCE_THRESHOLD}% confidence or no mapping`);
    console.log('');

    const languages: SupportedLanguage[] = ['java', 'typescript', 'javascript', 'python', 'go', 'rust'];
    for (const lang of languages) {
      const stats = await this.getLanguageStats(lang);
      console.log(`   ${lang.toUpperCase()}:`);
      console.log(`     Validators: ${stats.validators}, Fixers: ${stats.fixers}`);
      console.log(`     Tier 1 Rules: ${stats.tier1Rules}, Tier 2 Rules: ${stats.tier2Rules}`);
    }
    console.log('='.repeat(60));
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface FixerMappingResult {
  fixerToolId: string | null;
  fixerName: string | null;
  fixCommand: string | null;
  confidence: number;
  safeForAutoApply: boolean;
}

interface FixerToolResult {
  toolId: string;
  name: string;
  fixCommand: string | null;
  baseConfidence: number;
  safeForAutoApply: boolean;
  executionSpeed: 'fast' | 'medium' | 'slow';
}

interface RuleDescription {
  description?: string;
  recommendedPattern?: string;
  bestPractices?: string;
  relatedRules?: string[];
  rulePattern?: string;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let instance: SupabaseFixRouter | null = null;

export function getSupabaseFixRouter(): SupabaseFixRouter {
  if (!instance) {
    instance = new SupabaseFixRouter();
  }
  return instance;
}
