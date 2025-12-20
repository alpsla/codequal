/**
 * Fix Collector
 *
 * Collects fixes from all sources (tiers) and normalizes them
 * into a common format for branch creation.
 *
 * @since Session 60
 */

import { Issue } from '../analyzers/v9-types';
import { RoutingResult, FixBatch } from '../fix-agent/fix-router';
import { GeneratedFix } from '../tools/cloud-api/base-api-tool';
import { CorgeaFix } from '../tools/cloud-api/corgea-fixer';
import {
  CategorizedFix,
  FixRecommendation,
  FixTier,
  FixConfidenceCategory,
  categorizeByConfidence,
  generateReviewNotes,
  getUnfixableReason
} from './fix-categorizer';

// ============================================================
// TYPES
// ============================================================

export type FixSource =
  | 'native_fix'        // eslint --fix output
  | 'dedicated_fixer'   // Sorald, pyupgrade output
  | 'cloud_api'         // Corgea response
  | 'pattern_registry'  // Supabase fix patterns
  | 'ai_generation';    // OpenRouter AI fixes

/**
 * Raw fix from any source
 */
export interface RawFix {
  source: FixSource;
  issueId: string;
  ruleId: string;
  tool: string;
  file: string;
  line: number;
  column?: number;
  originalCode: string;
  fixedCode: string;
  explanation?: string;
  confidence: number;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  diff?: string;
  syntaxVerified?: boolean;
  testVerified?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Collected fixes organized by category
 */
export interface CollectedFixes {
  /** Fixes that can be auto-applied */
  autoApply: CategorizedFix[];

  /** Fixes that need review before applying */
  reviewRequired: CategorizedFix[];

  /** Issues without fixes (recommendations only) */
  recommendations: FixRecommendation[];

  /** Summary statistics */
  summary: {
    totalIssues: number;
    totalFixes: number;
    autoApplyCount: number;
    reviewRequiredCount: number;
    recommendationCount: number;
    byTier: Record<FixTier, number>;
    byCategory: Record<string, number>;
  };
}

// ============================================================
// FIX COLLECTOR
// ============================================================

export class FixCollector {
  private rawFixes: RawFix[] = [];
  private unfixableIssues: Issue[] = [];

  /**
   * Add fixes from native --fix tools (Tier 1)
   */
  addNativeFixes(
    fixes: Array<{
      file: string;
      line: number;
      column?: number;
      originalCode: string;
      fixedCode: string;
      ruleId: string;
      tool: string;
      message?: string;
    }>,
    category = 'code_quality',
    severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): void {
    for (const fix of fixes) {
      this.rawFixes.push({
        source: 'native_fix',
        issueId: `native-${fix.tool}-${fix.file}-${fix.line}`,
        ruleId: fix.ruleId,
        tool: fix.tool,
        file: fix.file,
        line: fix.line,
        column: fix.column,
        originalCode: fix.originalCode,
        fixedCode: fix.fixedCode,
        explanation: fix.message || `Fixed by ${fix.tool} --fix`,
        confidence: 95, // Native fixes are highly reliable
        category,
        severity,
        syntaxVerified: true // Native tools verify syntax
      });
    }
  }

  /**
   * Add fixes from dedicated fixer tools (Tier 2)
   */
  addDedicatedFixes(
    fixes: Array<{
      file: string;
      line: number;
      column?: number;
      originalCode: string;
      fixedCode: string;
      ruleId: string;
      tool: string;
      fixerTool: string;
      message?: string;
      confidence?: number;
    }>,
    category = 'code_quality',
    severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): void {
    for (const fix of fixes) {
      this.rawFixes.push({
        source: 'dedicated_fixer',
        issueId: `fixer-${fix.fixerTool}-${fix.file}-${fix.line}`,
        ruleId: fix.ruleId,
        tool: fix.tool,
        file: fix.file,
        line: fix.line,
        column: fix.column,
        originalCode: fix.originalCode,
        fixedCode: fix.fixedCode,
        explanation: fix.message || `Fixed by ${fix.fixerTool}`,
        confidence: fix.confidence || 85,
        category,
        severity
      });
    }
  }

  /**
   * Add fixes from Cloud API (Tier 2.5 - Corgea)
   */
  addCloudFixes(fixes: CorgeaFix[] | GeneratedFix[]): void {
    for (const fix of fixes) {
      const corgeaFix = fix as CorgeaFix;
      this.rawFixes.push({
        source: 'cloud_api',
        issueId: corgeaFix.corgeaIssueId || fix.issueId,
        ruleId: fix.ruleId,
        tool: 'corgea',
        file: fix.file,
        line: fix.line,
        originalCode: fix.originalCode,
        fixedCode: fix.fixedCode,
        explanation: fix.explanation,
        confidence: fix.confidence,
        category: 'security', // Corgea focuses on security
        severity: 'high',
        diff: fix.diff,
        syntaxVerified: corgeaFix.syntaxVerified,
        testVerified: corgeaFix.testVerified
      });
    }
  }

  /**
   * Add fixes from pattern registry (Tier 3)
   */
  addPatternFixes(
    fixes: Array<{
      issueId: string;
      ruleId: string;
      tool: string;
      file: string;
      line: number;
      column?: number;
      originalCode: string;
      fixedCode: string;
      explanation: string;
      confidence: number;
      category: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      patternId?: string;
    }>
  ): void {
    for (const fix of fixes) {
      this.rawFixes.push({
        source: 'pattern_registry',
        issueId: fix.issueId,
        ruleId: fix.ruleId,
        tool: fix.tool,
        file: fix.file,
        line: fix.line,
        column: fix.column,
        originalCode: fix.originalCode,
        fixedCode: fix.fixedCode,
        explanation: fix.explanation,
        confidence: fix.confidence,
        category: fix.category,
        severity: fix.severity,
        metadata: { patternId: fix.patternId }
      });
    }
  }

  /**
   * Add AI-generated fixes (Tier 3)
   */
  addAIFixes(
    fixes: Array<{
      issueId: string;
      ruleId: string;
      tool: string;
      file: string;
      line: number;
      originalCode: string;
      fixedCode: string;
      explanation: string;
      confidence: number;
      category: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
    }>
  ): void {
    for (const fix of fixes) {
      this.rawFixes.push({
        source: 'ai_generation',
        issueId: fix.issueId,
        ruleId: fix.ruleId,
        tool: fix.tool,
        file: fix.file,
        line: fix.line,
        originalCode: fix.originalCode,
        fixedCode: fix.fixedCode,
        explanation: fix.explanation,
        confidence: fix.confidence,
        category: fix.category,
        severity: fix.severity
      });
    }
  }

  /**
   * Add issues that couldn't be fixed
   */
  addUnfixableIssues(issues: Issue[]): void {
    this.unfixableIssues.push(...issues);
  }

  /**
   * Process and categorize all collected fixes
   */
  collect(): CollectedFixes {
    const autoApply: CategorizedFix[] = [];
    const reviewRequired: CategorizedFix[] = [];
    const recommendations: FixRecommendation[] = [];

    const byTier: Record<FixTier, number> = {
      tier1_native: 0,
      tier2_dedicated: 0,
      tier2_5_cloud: 0,
      tier3_pattern: 0,
      tier3_ai: 0
    };

    const byCategory: Record<string, number> = {};

    // Process fixes
    for (const raw of this.rawFixes) {
      const tier = this.sourceToTier(raw.source);
      const confidenceCategory = categorizeByConfidence(
        raw.confidence,
        raw.category,
        tier
      );

      const categorizedFix: CategorizedFix = {
        id: raw.issueId,
        tier,
        tool: raw.tool,
        ruleId: raw.ruleId,
        file: raw.file,
        line: raw.line,
        column: raw.column,
        originalCode: raw.originalCode,
        fixedCode: raw.fixedCode,
        explanation: raw.explanation || '',
        confidence: raw.confidence,
        category: raw.category,
        severity: raw.severity,
        confidenceCategory,
        needsReview: confidenceCategory !== FixConfidenceCategory.AUTO_APPLY,
        reviewNotes: generateReviewNotes(raw.category, raw.confidence, tier),
        diff: raw.diff,
        syntaxVerified: raw.syntaxVerified,
        testVerified: raw.testVerified
      };

      // Categorize
      switch (confidenceCategory) {
        case FixConfidenceCategory.AUTO_APPLY:
          autoApply.push(categorizedFix);
          break;
        case FixConfidenceCategory.REVIEW_REQUIRED:
          reviewRequired.push(categorizedFix);
          break;
        case FixConfidenceCategory.RECOMMENDATION_ONLY:
          // Low confidence fixes become recommendations
          recommendations.push({
            id: raw.issueId,
            tool: raw.tool,
            ruleId: raw.ruleId,
            file: raw.file,
            line: raw.line,
            message: raw.explanation || '',
            category: raw.category,
            severity: raw.severity,
            whyNotFixable: `Low confidence (${raw.confidence}%) - suggested fix may not be reliable`,
            recommendation: `Review suggested fix: ${raw.fixedCode.substring(0, 100)}...`,
            estimatedEffort: 'minor'
          });
          break;
      }

      // Track stats
      byTier[tier]++;
      byCategory[raw.category] = (byCategory[raw.category] || 0) + 1;
    }

    // Add unfixable issues as recommendations
    for (const issue of this.unfixableIssues) {
      recommendations.push({
        id: issue.id,
        tool: issue.tool,
        ruleId: issue.rule || 'unknown',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        message: issue.description,
        category: issue.category || 'unknown',
        severity: (issue.severity as 'critical' | 'high' | 'medium' | 'low') || 'medium',
        whyNotFixable: getUnfixableReason(
          issue.category || 'unknown',
          issue.tool,
          issue.rule || 'unknown'
        ),
        recommendation: this.generateRecommendation(issue),
        documentationUrl: this.getDocumentationUrl(issue),
        estimatedEffort: this.estimateEffort(issue)
      });
    }

    return {
      autoApply,
      reviewRequired,
      recommendations,
      summary: {
        totalIssues: this.rawFixes.length + this.unfixableIssues.length,
        totalFixes: autoApply.length + reviewRequired.length,
        autoApplyCount: autoApply.length,
        reviewRequiredCount: reviewRequired.length,
        recommendationCount: recommendations.length,
        byTier,
        byCategory
      }
    };
  }

  /**
   * Clear all collected data
   */
  clear(): void {
    this.rawFixes = [];
    this.unfixableIssues = [];
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private sourceToTier(source: FixSource): FixTier {
    switch (source) {
      case 'native_fix':
        return 'tier1_native';
      case 'dedicated_fixer':
        return 'tier2_dedicated';
      case 'cloud_api':
        return 'tier2_5_cloud';
      case 'pattern_registry':
        return 'tier3_pattern';
      case 'ai_generation':
        return 'tier3_ai';
    }
  }

  private generateRecommendation(issue: Issue): string {
    const category = (issue.category || '').toLowerCase();

    if (category.includes('security')) {
      return `Review security implications and implement fix following OWASP guidelines.`;
    }
    if (category.includes('performance')) {
      return `Profile this code path and optimize based on actual performance metrics.`;
    }
    if (category.includes('architecture')) {
      return `Consider refactoring to improve maintainability. Discuss with team if significant changes needed.`;
    }

    return `Manual review and fix required. See documentation for ${issue.rule || 'this rule'}.`;
  }

  private getDocumentationUrl(issue: Issue): string | undefined {
    const tool = issue.tool?.toLowerCase();
    const ruleId = issue.rule;

    if (!ruleId) return undefined;

    // Generate documentation URLs based on tool
    switch (tool) {
      case 'eslint':
        return `https://eslint.org/docs/rules/${ruleId}`;
      case 'semgrep':
        return `https://semgrep.dev/r?q=${encodeURIComponent(ruleId)}`;
      case 'pmd':
        return `https://pmd.github.io/latest/pmd_rules_java.html`;
      case 'checkstyle':
        return `https://checkstyle.org/checks.html`;
      case 'bandit':
        return `https://bandit.readthedocs.io/en/latest/plugins/index.html`;
      default:
        return undefined;
    }
  }

  private estimateEffort(issue: Issue): 'trivial' | 'minor' | 'moderate' | 'significant' {
    const category = (issue.category || '').toLowerCase();
    const severity = (issue.severity || '').toLowerCase();

    // Architecture and design issues are significant
    if (category.includes('architecture') || category.includes('design')) {
      return 'significant';
    }

    // Security issues vary by severity
    if (category.includes('security')) {
      if (severity === 'critical' || severity === 'high') {
        return 'moderate';
      }
      return 'minor';
    }

    // Performance issues are moderate
    if (category.includes('performance')) {
      return 'moderate';
    }

    // Style and formatting are trivial
    if (category.includes('style') || category.includes('format')) {
      return 'trivial';
    }

    // Default based on severity
    switch (severity) {
      case 'critical':
        return 'significant';
      case 'high':
        return 'moderate';
      case 'medium':
        return 'minor';
      default:
        return 'trivial';
    }
  }
}

/**
 * Create a new fix collector
 */
export function createFixCollector(): FixCollector {
  return new FixCollector();
}
