"use strict";
/**
 * Comprehensive Rule Definitions Index
 *
 * Aggregates all tool-specific rule definitions into a unified interface.
 * This module provides:
 * - Comprehensive rule coverage for all supported tools
 * - Unified lookup interface
 * - Statistics and reporting
 *
 * Coverage:
 * - ESLint: 200+ core rules
 * - TypeScript-ESLint: 130+ rules
 * - Ruff: 180+ Python rules (in main classifier)
 * - PMD: 130+ Java rules (in main classifier)
 * - Checkstyle: 100+ Java rules (in main classifier)
 * - Semgrep: Security-focused rules (in main classifier)
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseRule = void 0;
exports.lookupESLintRule = lookupESLintRule;
exports.getRuleCoverageStats = getRuleCoverageStats;
exports.isRuleFixable = isRuleFixable;
exports.getRuleType = getRuleType;
exports.isRuleDeprecated = isRuleDeprecated;
exports.getDeprecatedReplacement = getDeprecatedReplacement;
exports.requiresTypeInfo = requiresTypeInfo;
exports.getRulesByType = getRulesByType;
const eslint_rules_1 = require("./eslint-rules");
const typescript_eslint_rules_1 = require("./typescript-eslint-rules");
Object.defineProperty(exports, "getBaseRule", { enumerable: true, get: function () { return typescript_eslint_rules_1.getBaseRule; } });
// Re-export all rule sets
__exportStar(require("./eslint-rules"), exports);
__exportStar(require("./typescript-eslint-rules"), exports);
/**
 * Combined lookup for ESLint-ecosystem rules
 */
function lookupESLintRule(ruleId) {
    // Check ESLint core rules first (without prefix)
    if (eslint_rules_1.ALL_ESLINT_RULES[ruleId]) {
        const rule = eslint_rules_1.ALL_ESLINT_RULES[ruleId];
        return {
            type: rule.type,
            fixable: rule.fixable,
            deprecated: rule.deprecated,
            replacedBy: rule.replacedBy,
            description: rule.description,
        };
    }
    // Check TypeScript-ESLint rules (with prefix)
    if (typescript_eslint_rules_1.ALL_TYPESCRIPT_ESLINT_RULES[ruleId]) {
        const rule = typescript_eslint_rules_1.ALL_TYPESCRIPT_ESLINT_RULES[ruleId];
        return {
            type: rule.type,
            fixable: rule.fixable,
            requiresTypeInfo: rule.requiresTypeInfo,
            extendsBase: rule.extendsBase,
            description: rule.description,
        };
    }
    // Check if it's a TypeScript-ESLint rule without prefix
    const withPrefix = `@typescript-eslint/${ruleId}`;
    if (typescript_eslint_rules_1.ALL_TYPESCRIPT_ESLINT_RULES[withPrefix]) {
        const rule = typescript_eslint_rules_1.ALL_TYPESCRIPT_ESLINT_RULES[withPrefix];
        return {
            type: rule.type,
            fixable: rule.fixable,
            requiresTypeInfo: rule.requiresTypeInfo,
            extendsBase: rule.extendsBase,
            description: rule.description,
        };
    }
    // Check if rule has a / prefix (plugin rules)
    if (ruleId.includes('/')) {
        const [prefix, name] = ruleId.split('/');
        // TypeScript-ESLint
        if (prefix === '@typescript-eslint') {
            const tsRule = typescript_eslint_rules_1.ALL_TYPESCRIPT_ESLINT_RULES[ruleId];
            if (tsRule) {
                return {
                    type: tsRule.type,
                    fixable: tsRule.fixable,
                    requiresTypeInfo: tsRule.requiresTypeInfo,
                    extendsBase: tsRule.extendsBase,
                    description: tsRule.description,
                };
            }
        }
        // Try looking up the unprefixed version in ESLint core
        const coreRule = eslint_rules_1.ALL_ESLINT_RULES[name];
        if (coreRule) {
            return {
                type: coreRule.type,
                fixable: coreRule.fixable,
                deprecated: coreRule.deprecated,
                replacedBy: coreRule.replacedBy,
                description: coreRule.description,
            };
        }
    }
    return null;
}
/**
 * Get comprehensive statistics about rule coverage
 */
function getRuleCoverageStats() {
    const eslintStats = (0, eslint_rules_1.getESLintRuleStats)();
    const tsStats = (0, typescript_eslint_rules_1.getTypeScriptESLintRuleStats)();
    return {
        eslint: eslintStats,
        typescriptEslint: tsStats,
        total: {
            rules: eslintStats.total + tsStats.total,
            fixable: eslintStats.fixable + tsStats.fixable,
            coverage: 100, // We have comprehensive coverage for these tools
        },
    };
}
/**
 * Check if a rule is fixable
 */
function isRuleFixable(ruleId) {
    var _a;
    const rule = lookupESLintRule(ruleId);
    return (_a = rule === null || rule === void 0 ? void 0 : rule.fixable) !== null && _a !== void 0 ? _a : false;
}
/**
 * Get the issue type for a rule
 */
function getRuleType(ruleId) {
    var _a;
    const rule = lookupESLintRule(ruleId);
    return (_a = rule === null || rule === void 0 ? void 0 : rule.type) !== null && _a !== void 0 ? _a : null;
}
/**
 * Check if a rule is deprecated
 */
function isRuleDeprecated(ruleId) {
    var _a;
    const rule = lookupESLintRule(ruleId);
    return (_a = rule === null || rule === void 0 ? void 0 : rule.deprecated) !== null && _a !== void 0 ? _a : false;
}
/**
 * Get the replacement for a deprecated rule
 */
function getDeprecatedReplacement(ruleId) {
    var _a;
    const rule = lookupESLintRule(ruleId);
    return (_a = rule === null || rule === void 0 ? void 0 : rule.replacedBy) !== null && _a !== void 0 ? _a : null;
}
/**
 * Check if a TypeScript-ESLint rule requires type information
 */
function requiresTypeInfo(ruleId) {
    var _a;
    const rule = lookupESLintRule(ruleId);
    return (_a = rule === null || rule === void 0 ? void 0 : rule.requiresTypeInfo) !== null && _a !== void 0 ? _a : false;
}
/**
 * Get all rule IDs for a specific issue type
 */
function getRulesByType(type) {
    const rules = [];
    for (const [ruleId, rule] of Object.entries(eslint_rules_1.ALL_ESLINT_RULES)) {
        if (rule.type === type) {
            rules.push(ruleId);
        }
    }
    for (const [ruleId, rule] of Object.entries(typescript_eslint_rules_1.ALL_TYPESCRIPT_ESLINT_RULES)) {
        if (rule.type === type) {
            rules.push(ruleId);
        }
    }
    return rules;
}
