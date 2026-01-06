/**
 * Fix Pattern Registry
 *
 * A system for capturing, storing, and applying fix patterns.
 * Enables the transition from manual fixes to automated patterns.
 *
 * Components:
 * - types.ts: Type definitions
 * - fix-pattern-registry.ts: Core registry with storage and lookup
 * - fix-pattern-applicator.ts: Integration with LSP converter
 * - fix-capture-api.ts: REST API + Client SDK for IDE extension
 * - fix-security-validator.ts: Security validation for captured fixes
 * - ai-fixer-verifier.ts: Self-improvement loop for AI-generated fixes
 */

// Core types
export * from './types';

// Registry
export * from './fix-pattern-registry';
export {
  getFixPatternRegistry,
  resetFixPatternRegistry,
  AI_FIXER_USER_ID,
  default as FixPatternRegistry,
} from './fix-pattern-registry';

// Pattern applicator (for LSP integration)
export * from './fix-pattern-applicator';

// API handlers (for REST endpoints)
export * from './fix-capture-api';

// Security validation
export * from './fix-security-validator';
export { getFixSecurityValidator } from './fix-security-validator';

// AI Fixer Verifier (self-improvement loop)
export * from './ai-fixer-verifier';
export { createAIFixerVerifier, default as AIFixerVerifier } from './ai-fixer-verifier';

// Supabase Pattern Store (for persistence and pattern reuse)
export {
  SupabasePatternStore,
  getSupabasePatternStore,
  resetSupabasePatternStore,
  extractContextKey, // SESSION 77: Context-aware pattern matching
} from './supabase-pattern-store';

// Rule Normalizer (for cross-tool pattern matching)
export {
  normalizeRuleId,
  canonicalFromCwe,
  getEquivalentRules,
  areRulesEquivalent,
  getPatternLookupKeys,
  registerRuleMapping,
  getRuleNormalizerStats,
  RULE_EQUIVALENTS,
  CWE_TO_CANONICAL,
} from './rule-normalizer';
