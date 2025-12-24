/**
 * Fix Categorizer
 *
 * Categorizes fixes by confidence level and criticality.
 * Determines which fixes can be auto-applied vs need review.
 *
 * @since Session 60
 */

// ============================================================
// TYPES
// ============================================================

/**
 * Fix confidence categories
 */
export enum FixConfidenceCategory {
  /** High confidence (≥80%) - can be auto-applied */
  AUTO_APPLY = 'auto_apply',

  /** Medium confidence (50-80%) OR critical category - needs review */
  REVIEW_REQUIRED = 'review_required',

  /** Low confidence (<50%) OR unfixable - recommendation only */
  RECOMMENDATION_ONLY = 'recommendation_only'
}

/**
 * Source tier for fixes
 */
export type FixTier =
  | 'tier1_native'      // eslint --fix, prettier, etc.
  | 'tier2_dedicated'   // sorald, pyupgrade, etc.
  | 'tier2_5_cloud'     // Corgea, etc.
  | 'tier3_pattern'     // Pattern-based from Supabase
  | 'tier3_ai';         // AI-generated

/**
 * A fix that can be applied
 */
export interface CategorizedFix {
  /** Unique identifier */
  id: string;

  /** Source tier */
  tier: FixTier;

  /** Tool that identified the issue */
  tool: string;

  /** Rule/pattern that was violated */
  ruleId: string;

  /** File path */
  file: string;

  /** Line number */
  line: number;

  /** Column number */
  column?: number;

  /** Original code snippet */
  originalCode: string;

  /** Fixed code */
  fixedCode: string;

  /** Explanation of the fix */
  explanation: string;

  /** Confidence score (0-100) */
  confidence: number;

  /** Issue category */
  category: string;

  /** Issue severity */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Categorization result */
  confidenceCategory: FixConfidenceCategory;

  /** Whether this fix needs review */
  needsReview: boolean;

  /** Review notes (why review is needed) */
  reviewNotes?: string;

  /** Diff/patch format */
  diff?: string;

  /** Whether syntax was verified */
  syntaxVerified?: boolean;

  /** Whether tests passed after fix */
  testVerified?: boolean;
}

/**
 * Recommendation for unfixable issues
 */
export interface FixRecommendation {
  /** Unique identifier */
  id: string;

  /** Tool that identified the issue */
  tool: string;

  /** Rule/pattern that was violated */
  ruleId: string;

  /** File path */
  file: string;

  /** Line number */
  line: number;

  /** Issue message */
  message: string;

  /** Issue category */
  category: string;

  /** Issue severity */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Why we can't auto-fix this */
  whyNotFixable: string;

  /** Recommended action */
  recommendation: string;

  /** Documentation link */
  documentationUrl?: string;

  /** Estimated effort to fix manually */
  estimatedEffort?: 'trivial' | 'minor' | 'moderate' | 'significant';
}

// ============================================================
// CRITICAL CATEGORIES
// ============================================================

/**
 * Categories that ALWAYS require review, regardless of confidence
 */
export const CRITICAL_CATEGORIES = [
  'performance',
  'architecture',
  'security',
  'concurrency',
  'memory',
  'resource_management',
  'database',
  'authentication',
  'authorization',
  'cryptography',
  'injection',
  'data_integrity'
] as const;

/**
 * Categories where fixes are generally safe to auto-apply
 */
export const SAFE_CATEGORIES = [
  'formatting',
  'style',
  'naming',
  'whitespace',
  'import_order',
  'unused_imports',
  'trailing_whitespace'
] as const;

// ============================================================
// CATEGORIZATION LOGIC
// ============================================================

/**
 * Determine the confidence category for a fix
 */
export function categorizeByConfidence(
  confidence: number,
  category: string,
  tier: FixTier
): FixConfidenceCategory {
  const normalizedCategory = category.toLowerCase().replace(/[^a-z_]/g, '_');

  // Critical categories ALWAYS need review
  if (CRITICAL_CATEGORIES.some(c => normalizedCategory.includes(c))) {
    return FixConfidenceCategory.REVIEW_REQUIRED;
  }

  // Cloud API fixes always need review (external AI)
  if (tier === 'tier2_5_cloud') {
    return confidence >= 80
      ? FixConfidenceCategory.REVIEW_REQUIRED  // Still needs review even at high confidence
      : FixConfidenceCategory.RECOMMENDATION_ONLY;
  }

  // AI-generated fixes are recommendation only (lowest trust)
  if (tier === 'tier3_ai') {
    return FixConfidenceCategory.RECOMMENDATION_ONLY;
  }

  // Pattern-based fixes depend on confidence
  if (tier === 'tier3_pattern') {
    if (confidence >= 80) return FixConfidenceCategory.AUTO_APPLY;
    if (confidence >= 50) return FixConfidenceCategory.REVIEW_REQUIRED;
    return FixConfidenceCategory.RECOMMENDATION_ONLY;
  }

  // Tier 1 and Tier 2 fixes are generally safe
  if (tier === 'tier1_native' || tier === 'tier2_dedicated') {
    // Safe categories can auto-apply even at medium confidence
    if (SAFE_CATEGORIES.some(c => normalizedCategory.includes(c))) {
      return confidence >= 60
        ? FixConfidenceCategory.AUTO_APPLY
        : FixConfidenceCategory.REVIEW_REQUIRED;
    }

    // Other categories need higher confidence
    if (confidence >= 80) return FixConfidenceCategory.AUTO_APPLY;
    if (confidence >= 50) return FixConfidenceCategory.REVIEW_REQUIRED;
    return FixConfidenceCategory.RECOMMENDATION_ONLY;
  }

  // Default: need review
  return FixConfidenceCategory.REVIEW_REQUIRED;
}

/**
 * Check if a fix requires review
 */
export function isReviewRequired(
  category: string,
  confidence: number,
  tier: FixTier
): boolean {
  const confidenceCategory = categorizeByConfidence(confidence, category, tier);
  return confidenceCategory === FixConfidenceCategory.REVIEW_REQUIRED;
}

/**
 * Generate review notes explaining why review is needed
 */
export function generateReviewNotes(
  category: string,
  confidence: number,
  tier: FixTier
): string | undefined {
  const normalizedCategory = category.toLowerCase();

  // Critical category
  if (CRITICAL_CATEGORIES.some(c => normalizedCategory.includes(c))) {
    return `⚠️ CRITICAL CATEGORY: ${category} - This fix affects ${category} and requires careful review before applying.`;
  }

  // Cloud API fix
  if (tier === 'tier2_5_cloud') {
    return `☁️ CLOUD AI FIX: Generated by external AI service (Corgea). Verify the fix is appropriate for your codebase.`;
  }

  // AI-generated
  if (tier === 'tier3_ai') {
    return `🤖 AI-GENERATED: This fix was generated by AI and should be reviewed for correctness and style consistency.`;
  }

  // Medium confidence
  if (confidence < 80 && confidence >= 50) {
    return `📊 MEDIUM CONFIDENCE (${confidence}%): Review recommended due to lower confidence score.`;
  }

  // Low confidence
  if (confidence < 50) {
    return `⚡ LOW CONFIDENCE (${confidence}%): This is a suggestion only. Manual implementation recommended.`;
  }

  return undefined;
}

/**
 * Get the emoji indicator for a confidence category
 */
export function getCategoryEmoji(category: FixConfidenceCategory): string {
  switch (category) {
    case FixConfidenceCategory.AUTO_APPLY:
      return '✅';
    case FixConfidenceCategory.REVIEW_REQUIRED:
      return '⚠️';
    case FixConfidenceCategory.RECOMMENDATION_ONLY:
      return '📋';
  }
}

/**
 * Get explanation for why an issue is not fixable
 */
export function getUnfixableReason(
  category: string,
  tool: string,
  ruleId: string
): string {
  const normalizedCategory = category.toLowerCase();

  // Architecture issues
  if (normalizedCategory.includes('architecture') || normalizedCategory.includes('design')) {
    return 'Architecture decisions require human judgment and understanding of business requirements.';
  }

  // Performance issues
  if (normalizedCategory.includes('performance')) {
    return 'Performance optimizations often involve trade-offs that require understanding of your specific use case.';
  }

  // Database issues
  if (normalizedCategory.includes('database') || normalizedCategory.includes('sql')) {
    return 'Database changes require careful consideration of data integrity and migration strategies.';
  }

  // Concurrency issues
  if (normalizedCategory.includes('concurrency') || normalizedCategory.includes('thread')) {
    return 'Concurrency fixes require understanding of your application\'s threading model.';
  }

  // Security issues without clear fix
  if (normalizedCategory.includes('security')) {
    return 'Security fixes often require understanding of your authentication/authorization model.';
  }

  // Default
  return `No automated fix available for ${ruleId}. Manual review and implementation required.`;
}
