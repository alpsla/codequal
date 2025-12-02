/**
 * Tool Registry Service
 *
 * Queries the Supabase tool registry to find:
 * 1. Validators for a language
 * 2. Fixers for specific rules with confidence levels
 * 3. Routes issues to either Tier 1 (tool fixer) or Tier 2 (AI fixer)
 *
 * Two-Tier Fix System:
 * - Tier 1: Tool fixer with ≥60% confidence
 * - Tier 2: AI fixer for <60% confidence or no tool support
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'java' | 'typescript' | 'javascript' | 'python' | 'go' | 'rust';

export interface ValidatorTool {
  toolId: string;
  name: string;
  description?: string;
  languages: string[];
  registry: string;
  packageName: string;
  currentVersion: string;
  categories: string[];
  commandTemplate?: string;
  outputFormat?: string;
}

export interface FixerTool {
  toolId: string;
  name: string;
  description?: string;
  languages: string[];
  registry: string;
  packageName: string;
  currentVersion: string;
  fixType: 'native' | 'dedicated' | 'ai';
  fixCommand?: string;
  baseConfidence: number;
  safeForAutoApply: boolean;
  requiresReview: boolean;
  categories: string[];
  executionSpeed: 'fast' | 'medium' | 'slow';
}

export interface RuleToFixerMapping {
  validatorToolId: string;
  ruleId: string;
  rulePattern?: string;
  fixerToolId?: string;
  confidence: number;
  issueType: string;
  safeForAutoApply: boolean;
  notes?: string;
}

export interface FixerRecommendation {
  // Source
  validatorToolId: string;
  ruleId: string;

  // Recommendation
  tier: 1 | 2;  // 1 = tool fixer executes directly, 2 = AI fixer (with tool context)
  fixerToolId?: string;
  fixerName?: string;
  fixCommand?: string;
  confidence: number;
  safeForAutoApply: boolean;

  // Tool context for AI (used even in Tier 2)
  toolContext?: {
    toolSuggestion?: string;      // Tool's fix suggestion/hint
    ruleDescription?: string;     // Rule's description from tool
    recommendedPattern?: string;  // Best practice pattern
    relatedRules?: string[];      // Related rules that might help
  };

  // Reason
  reason: string;
}

export interface IssueForFix {
  id: string;
  validatorToolId: string;
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;
}

export interface FixBatch {
  tier: 1 | 2;
  fixerToolId?: string;
  fixerName: string;
  fixCommand?: string;
  issues: IssueForFix[];
  files: string[];
  confidence: number;
  safeForAutoApply: boolean;
  executionSpeed: 'fast' | 'medium' | 'slow';
}

export interface RoutingResult {
  tier1Batches: FixBatch[];
  tier2Batch: FixBatch | null;  // AI fixer batch
  summary: {
    total: number;
    tier1Count: number;
    tier2Count: number;
    safeForAutoApply: number;
  };
}

// ============================================================================
// CONFIDENCE THRESHOLD
// ============================================================================

const TIER1_CONFIDENCE_THRESHOLD = 60;  // ≥60% uses tool fixer

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ToolRegistryService {
  private supabase: SupabaseClient;
  private cache: {
    validators: Map<string, ValidatorTool[]>;
    fixers: Map<string, FixerTool[]>;
    mappings: Map<string, RuleToFixerMapping>;
  };

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.cache = {
      validators: new Map(),
      fixers: new Map(),
      mappings: new Map(),
    };
  }

  // ==========================================================================
  // VALIDATOR QUERIES
  // ==========================================================================

  /**
   * Get all validators for a language
   */
  async getValidatorsForLanguage(language: SupportedLanguage): Promise<ValidatorTool[]> {
    // Check cache
    if (this.cache.validators.has(language)) {
      return this.cache.validators.get(language)!;
    }

    const { data, error } = await this.supabase
      .from('validator_tools')
      .select('*')
      .contains('languages', [language])
      .eq('is_active', true);

    if (error) {
      console.error(`Error fetching validators for ${language}:`, error);
      return [];
    }

    const validators: ValidatorTool[] = (data || []).map(row => ({
      toolId: row.tool_id,
      name: row.name,
      description: row.description,
      languages: row.languages,
      registry: row.registry,
      packageName: row.package_name,
      currentVersion: row.current_version,
      categories: row.categories,
      commandTemplate: row.command_template,
      outputFormat: row.output_format,
    }));

    // Cache result
    this.cache.validators.set(language, validators);

    return validators;
  }

  // ==========================================================================
  // FIXER QUERIES
  // ==========================================================================

  /**
   * Get all fixers for a language
   */
  async getFixersForLanguage(language: SupportedLanguage): Promise<FixerTool[]> {
    // Check cache
    if (this.cache.fixers.has(language)) {
      return this.cache.fixers.get(language)!;
    }

    const { data, error } = await this.supabase
      .from('fixer_tools')
      .select('*')
      .contains('languages', [language])
      .eq('is_active', true)
      .order('base_confidence', { ascending: false });

    if (error) {
      console.error(`Error fetching fixers for ${language}:`, error);
      return [];
    }

    const fixers: FixerTool[] = (data || []).map(row => ({
      toolId: row.tool_id,
      name: row.name,
      description: row.description,
      languages: row.languages,
      registry: row.registry,
      packageName: row.package_name,
      currentVersion: row.current_version,
      fixType: row.fix_type,
      fixCommand: row.fix_command,
      baseConfidence: row.base_confidence,
      safeForAutoApply: row.safe_for_auto_apply,
      requiresReview: row.requires_review,
      categories: row.categories,
      executionSpeed: row.execution_speed,
    }));

    // Cache result
    this.cache.fixers.set(language, fixers);

    return fixers;
  }

  // ==========================================================================
  // FIXER RECOMMENDATION
  // ==========================================================================

  /**
   * Get fixer recommendation for a specific rule
   * Returns Tier 1 (tool fixer) if confidence ≥60%, else Tier 2 (AI fixer)
   */
  async getFixerForRule(
    validatorToolId: string,
    ruleId: string
  ): Promise<FixerRecommendation> {
    // Check cache
    const cacheKey = `${validatorToolId}:${ruleId}`;
    if (this.cache.mappings.has(cacheKey)) {
      const mapping = this.cache.mappings.get(cacheKey)!;
      return this.createRecommendation(mapping);
    }

    // Query Supabase using the function
    const { data, error } = await this.supabase
      .rpc('get_fixer_for_rule', {
        p_validator_tool_id: validatorToolId,
        p_rule_id: ruleId,
      });

    if (error || !data || data.length === 0) {
      // No mapping found - default to AI fixer
      return {
        validatorToolId,
        ruleId,
        tier: 2,
        confidence: 50, // Default AI confidence
        safeForAutoApply: false,
        reason: `No specific fixer mapping found for ${validatorToolId}/${ruleId}`,
      };
    }

    const row = data[0];
    const mapping: RuleToFixerMapping = {
      validatorToolId,
      ruleId,
      fixerToolId: row.fixer_tool_id,
      confidence: row.confidence,
      issueType: 'unknown',
      safeForAutoApply: row.safe_for_auto_apply,
    };

    // Cache result
    this.cache.mappings.set(cacheKey, mapping);

    return this.createRecommendation(mapping, row.fixer_name, row.fix_command);
  }

  /**
   * Create a FixerRecommendation from a mapping
   */
  private createRecommendation(
    mapping: RuleToFixerMapping,
    fixerName?: string,
    fixCommand?: string
  ): FixerRecommendation {
    const useAiFixer = mapping.confidence < TIER1_CONFIDENCE_THRESHOLD || !mapping.fixerToolId;

    return {
      validatorToolId: mapping.validatorToolId,
      ruleId: mapping.ruleId,
      tier: useAiFixer ? 2 : 1,
      fixerToolId: useAiFixer ? undefined : mapping.fixerToolId,
      fixerName: useAiFixer ? 'AI Fixer' : fixerName,
      fixCommand: useAiFixer ? undefined : fixCommand,
      confidence: mapping.confidence,
      safeForAutoApply: mapping.safeForAutoApply,
      reason: useAiFixer
        ? `Confidence ${mapping.confidence}% < ${TIER1_CONFIDENCE_THRESHOLD}% threshold, using AI fixer`
        : `Tool fixer available with ${mapping.confidence}% confidence`,
    };
  }

  // ==========================================================================
  // ISSUE ROUTING
  // ==========================================================================

  /**
   * Route multiple issues to appropriate fixers
   * Groups into Tier 1 batches (by tool) and Tier 2 batch (AI)
   */
  async routeIssues(issues: IssueForFix[]): Promise<RoutingResult> {
    const tier1Groups = new Map<string, IssueForFix[]>();
    const tier2Issues: IssueForFix[] = [];
    const recommendations = new Map<string, FixerRecommendation>();

    // Get fixer recommendation for each issue
    for (const issue of issues) {
      const rec = await this.getFixerForRule(issue.validatorToolId, issue.ruleId);
      recommendations.set(issue.id, rec);

      if (rec.tier === 1 && rec.fixerToolId) {
        // Tier 1: Group by fixer tool
        const group = tier1Groups.get(rec.fixerToolId) || [];
        group.push(issue);
        tier1Groups.set(rec.fixerToolId, group);
      } else {
        // Tier 2: AI fixer
        tier2Issues.push(issue);
      }
    }

    // Create Tier 1 batches
    const tier1Batches: FixBatch[] = [];
    for (const [fixerToolId, groupIssues] of tier1Groups) {
      const firstIssue = groupIssues[0];
      const rec = recommendations.get(firstIssue.id)!;

      tier1Batches.push({
        tier: 1,
        fixerToolId,
        fixerName: rec.fixerName || fixerToolId,
        fixCommand: rec.fixCommand,
        issues: groupIssues,
        files: [...new Set(groupIssues.map(i => i.file))],
        confidence: rec.confidence,
        safeForAutoApply: rec.safeForAutoApply,
        executionSpeed: await this.getFixerSpeed(fixerToolId),
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
      confidence: 55, // Average AI confidence
      safeForAutoApply: false,
      executionSpeed: 'slow',
    } : null;

    // Calculate summary
    const safeForAutoApply = [
      ...tier1Batches.filter(b => b.safeForAutoApply).flatMap(b => b.issues),
    ].length;

    return {
      tier1Batches,
      tier2Batch,
      summary: {
        total: issues.length,
        tier1Count: issues.length - tier2Issues.length,
        tier2Count: tier2Issues.length,
        safeForAutoApply,
      },
    };
  }

  /**
   * Get execution speed for a fixer tool
   */
  private async getFixerSpeed(fixerToolId: string): Promise<'fast' | 'medium' | 'slow'> {
    const { data, error } = await this.supabase
      .from('fixer_tools')
      .select('execution_speed')
      .eq('tool_id', fixerToolId)
      .single();

    if (error || !data) {
      return 'medium';
    }

    return data.execution_speed as 'fast' | 'medium' | 'slow';
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear the cache (call after schema updates)
   */
  clearCache(): void {
    this.cache.validators.clear();
    this.cache.fixers.clear();
    this.cache.mappings.clear();
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<{
    validators: number;
    fixers: number;
    mappings: number;
    byLanguage: Record<string, { validators: number; fixers: number }>;
  }> {
    const [
      { count: validatorCount },
      { count: fixerCount },
      { count: mappingCount },
      { data: validatorsByLang },
      { data: fixersByLang },
    ] = await Promise.all([
      this.supabase.from('validator_tools').select('*', { count: 'exact', head: true }),
      this.supabase.from('fixer_tools').select('*', { count: 'exact', head: true }),
      this.supabase.from('rule_to_fixer_mappings').select('*', { count: 'exact', head: true }),
      this.supabase.from('tools_by_language').select('language, tool_type').eq('tool_type', 'validator'),
      this.supabase.from('tools_by_language').select('language, tool_type').eq('tool_type', 'fixer'),
    ]);

    const byLanguage: Record<string, { validators: number; fixers: number }> = {};

    (validatorsByLang || []).forEach((row: { language: string }) => {
      if (!byLanguage[row.language]) {
        byLanguage[row.language] = { validators: 0, fixers: 0 };
      }
      byLanguage[row.language].validators++;
    });

    (fixersByLang || []).forEach((row: { language: string }) => {
      if (!byLanguage[row.language]) {
        byLanguage[row.language] = { validators: 0, fixers: 0 };
      }
      byLanguage[row.language].fixers++;
    });

    return {
      validators: validatorCount || 0,
      fixers: fixerCount || 0,
      mappings: mappingCount || 0,
      byLanguage,
    };
  }

  /**
   * Print a human-readable summary
   */
  async printSummary(): Promise<void> {
    const summary = await this.getSummary();

    console.log('\n📊 TOOL REGISTRY SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Validators: ${summary.validators}`);
    console.log(`   Fixers: ${summary.fixers}`);
    console.log(`   Rule Mappings: ${summary.mappings}`);
    console.log('');
    console.log('   By Language:');
    for (const [lang, counts] of Object.entries(summary.byLanguage)) {
      console.log(`     ${lang}: ${counts.validators} validators, ${counts.fixers} fixers`);
    }
    console.log('='.repeat(60));
  }
}

// Export singleton instance
export const toolRegistryService = new ToolRegistryService();
