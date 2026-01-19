"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markFailureReviewed = exports.getFailuresNeedingReview = exports.trackFixFailure = exports.formatGuidanceForPrompt = exports.getPromptAdditions = exports.addFixGuidance = exports.getFixGuidance = exports.fixPatternGuidance = exports.FixPatternGuidanceService = exports.CWE_TO_CANONICAL = exports.RULE_EQUIVALENTS = exports.getRuleNormalizerStats = exports.registerRuleMapping = exports.getPatternLookupKeys = exports.areRulesEquivalent = exports.getEquivalentRules = exports.canonicalFromCwe = exports.normalizeRuleId = exports.extractContextKey = exports.resetSupabasePatternStore = exports.getSupabasePatternStore = exports.SupabasePatternStore = exports.AIFixerVerifier = exports.createAIFixerVerifier = exports.getFixSecurityValidator = exports.FixPatternRegistry = exports.AI_FIXER_USER_ID = exports.resetFixPatternRegistry = exports.getFixPatternRegistry = void 0;
// Core types
__exportStar(require("./types"), exports);
// Registry
__exportStar(require("./fix-pattern-registry"), exports);
var fix_pattern_registry_1 = require("./fix-pattern-registry");
Object.defineProperty(exports, "getFixPatternRegistry", { enumerable: true, get: function () { return fix_pattern_registry_1.getFixPatternRegistry; } });
Object.defineProperty(exports, "resetFixPatternRegistry", { enumerable: true, get: function () { return fix_pattern_registry_1.resetFixPatternRegistry; } });
Object.defineProperty(exports, "AI_FIXER_USER_ID", { enumerable: true, get: function () { return fix_pattern_registry_1.AI_FIXER_USER_ID; } });
Object.defineProperty(exports, "FixPatternRegistry", { enumerable: true, get: function () { return __importDefault(fix_pattern_registry_1).default; } });
// Pattern applicator (for LSP integration)
__exportStar(require("./fix-pattern-applicator"), exports);
// API handlers (for REST endpoints)
__exportStar(require("./fix-capture-api"), exports);
// Security validation
__exportStar(require("./fix-security-validator"), exports);
var fix_security_validator_1 = require("./fix-security-validator");
Object.defineProperty(exports, "getFixSecurityValidator", { enumerable: true, get: function () { return fix_security_validator_1.getFixSecurityValidator; } });
// AI Fixer Verifier (self-improvement loop)
__exportStar(require("./ai-fixer-verifier"), exports);
var ai_fixer_verifier_1 = require("./ai-fixer-verifier");
Object.defineProperty(exports, "createAIFixerVerifier", { enumerable: true, get: function () { return ai_fixer_verifier_1.createAIFixerVerifier; } });
Object.defineProperty(exports, "AIFixerVerifier", { enumerable: true, get: function () { return __importDefault(ai_fixer_verifier_1).default; } });
// Supabase Pattern Store (for persistence and pattern reuse)
var supabase_pattern_store_1 = require("./supabase-pattern-store");
Object.defineProperty(exports, "SupabasePatternStore", { enumerable: true, get: function () { return supabase_pattern_store_1.SupabasePatternStore; } });
Object.defineProperty(exports, "getSupabasePatternStore", { enumerable: true, get: function () { return supabase_pattern_store_1.getSupabasePatternStore; } });
Object.defineProperty(exports, "resetSupabasePatternStore", { enumerable: true, get: function () { return supabase_pattern_store_1.resetSupabasePatternStore; } });
Object.defineProperty(exports, "extractContextKey", { enumerable: true, get: function () { return supabase_pattern_store_1.extractContextKey; } });
// Rule Normalizer (for cross-tool pattern matching)
var rule_normalizer_1 = require("./rule-normalizer");
Object.defineProperty(exports, "normalizeRuleId", { enumerable: true, get: function () { return rule_normalizer_1.normalizeRuleId; } });
Object.defineProperty(exports, "canonicalFromCwe", { enumerable: true, get: function () { return rule_normalizer_1.canonicalFromCwe; } });
Object.defineProperty(exports, "getEquivalentRules", { enumerable: true, get: function () { return rule_normalizer_1.getEquivalentRules; } });
Object.defineProperty(exports, "areRulesEquivalent", { enumerable: true, get: function () { return rule_normalizer_1.areRulesEquivalent; } });
Object.defineProperty(exports, "getPatternLookupKeys", { enumerable: true, get: function () { return rule_normalizer_1.getPatternLookupKeys; } });
Object.defineProperty(exports, "registerRuleMapping", { enumerable: true, get: function () { return rule_normalizer_1.registerRuleMapping; } });
Object.defineProperty(exports, "getRuleNormalizerStats", { enumerable: true, get: function () { return rule_normalizer_1.getRuleNormalizerStats; } });
Object.defineProperty(exports, "RULE_EQUIVALENTS", { enumerable: true, get: function () { return rule_normalizer_1.RULE_EQUIVALENTS; } });
Object.defineProperty(exports, "CWE_TO_CANONICAL", { enumerable: true, get: function () { return rule_normalizer_1.CWE_TO_CANONICAL; } });
// SESSION 80: Fix Pattern Guidance (knowledge base for fix generation)
// SESSION 81: Added failure tracking for learning loop
var fix_pattern_guidance_1 = require("./fix-pattern-guidance");
Object.defineProperty(exports, "FixPatternGuidanceService", { enumerable: true, get: function () { return fix_pattern_guidance_1.FixPatternGuidanceService; } });
Object.defineProperty(exports, "fixPatternGuidance", { enumerable: true, get: function () { return fix_pattern_guidance_1.fixPatternGuidance; } });
Object.defineProperty(exports, "getFixGuidance", { enumerable: true, get: function () { return fix_pattern_guidance_1.getFixGuidance; } });
Object.defineProperty(exports, "addFixGuidance", { enumerable: true, get: function () { return fix_pattern_guidance_1.addFixGuidance; } });
Object.defineProperty(exports, "getPromptAdditions", { enumerable: true, get: function () { return fix_pattern_guidance_1.getPromptAdditions; } });
Object.defineProperty(exports, "formatGuidanceForPrompt", { enumerable: true, get: function () { return fix_pattern_guidance_1.formatGuidanceForPrompt; } });
// SESSION 81: Failure tracking
Object.defineProperty(exports, "trackFixFailure", { enumerable: true, get: function () { return fix_pattern_guidance_1.trackFixFailure; } });
Object.defineProperty(exports, "getFailuresNeedingReview", { enumerable: true, get: function () { return fix_pattern_guidance_1.getFailuresNeedingReview; } });
Object.defineProperty(exports, "markFailureReviewed", { enumerable: true, get: function () { return fix_pattern_guidance_1.markFailureReviewed; } });
