/**
 * KB Fix Applicator
 *
 * SESSION 90: KB-First Fix Bypass for Cost Savings
 *
 * When KB has high-confidence patterns, skip AI fixer entirely to save costs.
 *
 * Bypass Conditions (either triggers bypass):
 * 1. KB success rate for rule ID >= 95%
 * 2. Pattern has toolValidated flag set to true
 *
 * Expected Outcome:
 * - First PR scan: AI fixer runs, patterns stored
 * - Second scan of same PR: 0 AI calls (all from KB)
 */

import {
  getFixGuidance,
  FixGuidance,
  fixPatternGuidance,
} from '../fix-pattern-registry/fix-pattern-guidance';
import { FreshContextIssue } from './fresh-context-fixer';

// ============================================================================
// Types
// ============================================================================

/**
 * Result from KB bypass check
 */
export interface KBBypassResult {
  /** Whether AI can be bypassed for this issue */
  canBypass: boolean;

  /** Reason for the bypass decision */
  reason: 'high_success_rate' | 'tool_validated' | 'no_pattern' | 'low_confidence' | 'no_example';

  /** The KB guidance/pattern if available */
  guidance?: FixGuidance;

  /** Confidence level (0-100) */
  confidence: number;

  /** The fix code if pattern can be applied directly */
  fixCode?: string;
}

/**
 * Metrics for KB bypass operations
 */
export interface KBBypassMetrics {
  /** Number of fixes applied from KB (no AI cost) */
  kbAppliedCount: number;

  /** Number of fixes requiring AI */
  aiAppliedCount: number;

  /** Estimated cost saved (based on average AI call cost) */
  kbBypassSavings: number;

  /** Rules that were bypassed */
  bypassedRules: Set<string>;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum success rate to allow bypass without validation */
const KB_BYPASS_THRESHOLD = 95;

/** Estimated cost per AI fix call */
const ESTIMATED_AI_CALL_COST = 0.01;

// ============================================================================
// Module State
// ============================================================================

let metrics: KBBypassMetrics = {
  kbAppliedCount: 0,
  aiAppliedCount: 0,
  kbBypassSavings: 0,
  bypassedRules: new Set(),
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if AI can be bypassed for this issue using KB patterns
 *
 * Bypass is allowed when:
 * 1. KB success rate >= 95%, OR
 * 2. Pattern has toolValidated flag set to true
 *
 * @param ruleId - The rule ID being fixed
 * @param language - Programming language
 * @param tool - Tool that detected the issue (e.g., 'pmd', 'semgrep')
 * @param codeContext - Optional code context for pattern matching
 */
export async function checkKBBypass(
  ruleId: string,
  language: string,
  tool: string,
  codeContext?: string
): Promise<KBBypassResult> {
  // Get guidance from KB
  const guidance = await getFixGuidance(ruleId, language, tool);

  // No pattern in KB
  if (!guidance) {
    return {
      canBypass: false,
      reason: 'no_pattern',
      confidence: 0,
    };
  }

  // Check for correct patterns with examples
  if (!guidance.correctPatterns || guidance.correctPatterns.length === 0) {
    return {
      canBypass: false,
      reason: 'no_example',
      guidance,
      confidence: guidance.successRate,
    };
  }

  const hasExample = guidance.correctPatterns.some(p => p.example && p.example.length > 0);
  if (!hasExample) {
    return {
      canBypass: false,
      reason: 'no_example',
      guidance,
      confidence: guidance.successRate,
    };
  }

  // Condition 1: High success rate (>= 95%)
  if (guidance.successRate >= KB_BYPASS_THRESHOLD) {
    const fixCode = findBestExample(guidance, codeContext);
    return {
      canBypass: true,
      reason: 'high_success_rate',
      guidance,
      confidence: guidance.successRate,
      fixCode,
    };
  }

  // Condition 2: Tool-validated pattern
  // Check if any correct pattern has been marked as tool validated
  // Note: toolValidated is not currently in FixGuidance type, but we check metadata
  const isToolValidated = checkToolValidated(guidance);
  if (isToolValidated) {
    const fixCode = findBestExample(guidance, codeContext);
    return {
      canBypass: true,
      reason: 'tool_validated',
      guidance,
      confidence: 100, // Tool validation means 100% confidence
      fixCode,
    };
  }

  // Confidence too low for bypass
  return {
    canBypass: false,
    reason: 'low_confidence',
    guidance,
    confidence: guidance.successRate,
  };
}

/**
 * Apply KB pattern template to an issue
 *
 * @param guidance - The KB guidance containing pattern
 * @param issue - The issue to fix
 * @param codeContext - Code context for pattern matching
 * @returns The fixed code if pattern can be applied
 */
export function applyPatternTemplate(
  guidance: FixGuidance,
  issue: FreshContextIssue,
  codeContext?: string
): string | null {
  if (!guidance.correctPatterns || guidance.correctPatterns.length === 0) {
    return null;
  }

  const bestExample = findBestExample(guidance, codeContext || issue.codeContext);
  if (!bestExample) {
    return null;
  }

  // For simple patterns, return the example directly
  // More sophisticated pattern application would use AST transformation
  return bestExample;
}

/**
 * Record a KB bypass event for metrics
 *
 * @param ruleId - The rule that was bypassed
 * @param wasAIUsed - Whether AI was used (false = KB bypass saved a call)
 */
export function recordKBBypass(ruleId: string, wasAIUsed: boolean): void {
  if (wasAIUsed) {
    metrics.aiAppliedCount++;
  } else {
    metrics.kbAppliedCount++;
    metrics.kbBypassSavings += ESTIMATED_AI_CALL_COST;
    metrics.bypassedRules.add(ruleId);
  }
}

/**
 * Record successful KB application to update success rate
 *
 * @param ruleId - The rule ID
 * @param language - Programming language
 * @param tool - Tool that detected the issue
 * @param success - Whether the fix was successful
 */
export async function recordKBApplication(
  ruleId: string,
  language: string,
  tool: string,
  success: boolean
): Promise<void> {
  await fixPatternGuidance.recordFixAttempt(ruleId, language, tool, success);
}

/**
 * Get current KB bypass metrics
 */
export function getKBBypassMetrics(): KBBypassMetrics {
  return {
    ...metrics,
    bypassedRules: new Set(metrics.bypassedRules),
  };
}

/**
 * Reset KB bypass metrics (for testing or new sessions)
 */
export function resetKBBypassMetrics(): void {
  metrics = {
    kbAppliedCount: 0,
    aiAppliedCount: 0,
    kbBypassSavings: 0,
    bypassedRules: new Set(),
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Find the best example from guidance that matches the code context
 */
function findBestExample(guidance: FixGuidance, codeContext?: string): string | null {
  if (!guidance.correctPatterns || guidance.correctPatterns.length === 0) {
    return null;
  }

  // If we have code context, try to find a matching example
  if (codeContext) {
    for (const pattern of guidance.correctPatterns) {
      if (pattern.example && isContextMatch(pattern.pattern, codeContext)) {
        return pattern.example;
      }
    }
  }

  // Fall back to first example with code
  const firstWithExample = guidance.correctPatterns.find(p => p.example && p.example.length > 0);
  return firstWithExample?.example || null;
}

/**
 * Check if pattern description matches the code context
 */
function isContextMatch(patternDescription: string, codeContext: string): boolean {
  // Simple keyword matching for now
  // Could be enhanced with more sophisticated matching
  const keywords = patternDescription.toLowerCase().split(/\s+/);
  const contextLower = codeContext.toLowerCase();

  // Check if any significant keyword is in the context
  return keywords.some(keyword => {
    if (keyword.length < 3) return false; // Skip short words
    return contextLower.includes(keyword);
  });
}

/**
 * Check if guidance has been marked as tool-validated
 *
 * Tool validation means the pattern was generated and validated by internal tools,
 * giving it 100% confidence for bypass.
 *
 * Currently checks:
 * - Usage count >= 10 with 100% success rate
 * - Future: explicit toolValidated flag in guidance metadata
 */
function checkToolValidated(guidance: FixGuidance): boolean {
  // A pattern with 10+ uses and 100% success rate is considered tool-validated
  if (guidance.usageCount >= 10 && guidance.successRate === 100) {
    return true;
  }

  // Future: check explicit toolValidated flag
  // if ((guidance as any).toolValidated === true) {
  //   return true;
  // }

  return false;
}
