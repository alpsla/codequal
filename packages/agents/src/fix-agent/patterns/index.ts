/**
 * Fix Patterns Index
 *
 * Central registry for all framework-specific fix patterns.
 * These patterns are used by the pattern flywheel to reduce AI costs.
 *
 * Pattern Flywheel Economics:
 * - Week 1: ~$0.60/1000 issues (all AI)
 * - Month 6+: ~$0.006/1000 issues (99.8% pattern reuse)
 */

import type { FrameworkPattern, Framework } from '../types/framework-issue-types';
import { NESTJS_PATTERNS, getNestJSPattern, hasNestJSPattern } from './nestjs-patterns';
import { NESTJS_EXTENDED_PATTERNS } from './nestjs-patterns-extended';

// =============================================================================
// PATTERN REGISTRY
// =============================================================================

/**
 * All patterns organized by framework
 * Combines base patterns with extended patterns
 */
export const FRAMEWORK_PATTERNS: Record<string, FrameworkPattern[]> = {
  nestjs: [...NESTJS_PATTERNS, ...NESTJS_EXTENDED_PATTERNS],
  // Add more frameworks as patterns are created:
  // express: EXPRESS_PATTERNS,
  // react: REACT_PATTERNS,
  // 'spring-boot': SPRING_BOOT_PATTERNS,
};

/**
 * Flat list of all patterns
 */
export const ALL_PATTERNS: FrameworkPattern[] = Object.values(FRAMEWORK_PATTERNS).flat();

// =============================================================================
// PATTERN LOOKUP
// =============================================================================

/**
 * Find a pattern for a specific rule and framework
 */
export function findPattern(
  ruleId: string,
  framework: Framework
): FrameworkPattern | undefined {
  const frameworkPatterns = FRAMEWORK_PATTERNS[framework];
  if (!frameworkPatterns) return undefined;

  // First try exact match
  const exactMatch = frameworkPatterns.find(p => p.ruleId === ruleId);
  if (exactMatch) return exactMatch;

  // Then try regex match on codePattern
  return frameworkPatterns.find(p => {
    if (p.codePattern) {
      try {
        const regex = new RegExp(p.codePattern);
        return regex.test(ruleId);
      } catch {
        return false;
      }
    }
    return false;
  });
}

/**
 * Find all patterns matching a rule (across all frameworks)
 */
export function findPatternsForRule(ruleId: string): FrameworkPattern[] {
  return ALL_PATTERNS.filter(p => {
    if (p.ruleId === ruleId) return true;
    if (p.codePattern) {
      try {
        return new RegExp(p.codePattern).test(ruleId);
      } catch {
        return false;
      }
    }
    return false;
  });
}

/**
 * Check if a pattern exists for a rule+framework combination
 */
export function hasPattern(ruleId: string, framework: Framework): boolean {
  return findPattern(ruleId, framework) !== undefined;
}

/**
 * Get patterns for a framework
 */
export function getPatternsForFramework(framework: Framework): FrameworkPattern[] {
  return FRAMEWORK_PATTERNS[framework] || [];
}

// =============================================================================
// PATTERN STATISTICS
// =============================================================================

/**
 * Get statistics about the pattern registry
 */
export function getPatternStats(): {
  totalPatterns: number;
  byFramework: Record<string, number>;
  byTool: Record<string, number>;
  avgConfidence: number;
} {
  const byFramework: Record<string, number> = {};
  const byTool: Record<string, number> = {};
  let totalConfidence = 0;

  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    byFramework[framework] = patterns.length;
    for (const pattern of patterns) {
      byTool[pattern.tool] = (byTool[pattern.tool] || 0) + 1;
      totalConfidence += pattern.fixConfidence;
    }
  }

  return {
    totalPatterns: ALL_PATTERNS.length,
    byFramework,
    byTool,
    avgConfidence: ALL_PATTERNS.length > 0 ? totalConfidence / ALL_PATTERNS.length : 0,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export NestJS patterns
export {
  NESTJS_PATTERNS,
  getNestJSPattern,
  hasNestJSPattern,
} from './nestjs-patterns';

// Re-export extended patterns
export { NESTJS_EXTENDED_PATTERNS } from './nestjs-patterns-extended';

// Types
export type { FrameworkPattern };
