"use strict";
/**
 * Rule Normalizer - Cross-Tool Pattern Matching
 *
 * This module normalizes rule IDs across different security scanning tools,
 * enabling patterns captured from one tool (e.g., CodeQL) to be reused when
 * the same issue is detected by a different tool (e.g., Semgrep, Copilot).
 *
 * Why This Is Needed:
 * - Different tools use different rule ID formats for the same vulnerability
 * - CodeQL: "js/incomplete-string-escaping"
 * - Semgrep: "codequal-incomplete-double-quote-escaping"
 * - GitHub Copilot: "security/incomplete-escaping"
 * - All detect CWE-116 (Improper Encoding or Escaping of Output)
 *
 * Benefits:
 * - Patterns from Basic tier (Semgrep) can help PRO tier (CodeQL)
 * - Community patterns from any tool benefit all users
 * - Reduces duplicate pattern storage
 * - Enables cross-tool pattern reuse
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CWE_TO_CANONICAL = exports.RULE_EQUIVALENTS = void 0;
exports.normalizeRuleId = normalizeRuleId;
exports.canonicalFromCwe = canonicalFromCwe;
exports.getEquivalentRules = getEquivalentRules;
exports.areRulesEquivalent = areRulesEquivalent;
exports.getPatternLookupKeys = getPatternLookupKeys;
exports.registerRuleMapping = registerRuleMapping;
exports.getRuleNormalizerStats = getRuleNormalizerStats;
// =============================================================================
// Rule Equivalence Mappings
// =============================================================================
/**
 * Canonical rule categories with their tool-specific rule IDs
 * Format: canonical-name → [tool-specific-rule-ids]
 */
exports.RULE_EQUIVALENTS = {
    // =========================================================================
    // INJECTION VULNERABILITIES
    // =========================================================================
    // Incomplete String Escaping (CWE-116)
    'incomplete-string-escaping': [
        'js/incomplete-string-escaping', // CodeQL
        'codequal-incomplete-double-quote-escaping', // Semgrep custom
        'codequal-incomplete-backtick-escaping', // Semgrep custom
        'codequal-incomplete-dollar-escaping', // Semgrep custom
        'javascript.security.incomplete-escaping', // Semgrep community
        'security/incomplete-escaping', // Generic
        'taint/incomplete-sanitization', // Checkmarx
    ],
    // Command Injection (CWE-78)
    'command-injection': [
        'js/command-line-injection', // CodeQL
        'py/command-line-injection', // CodeQL Python
        'java/command-line-injection', // CodeQL Java
        'codequal-unsafe-exec-template', // Semgrep custom
        'codequal-shell-injection-from-path', // Semgrep custom
        'javascript.lang.security.detect-child-process', // Semgrep community
        'python.lang.security.audit.subprocess-shell-true', // Semgrep community
        'java.lang.security.audit.command-injection', // Semgrep community
        'command-injection', // Generic
        'shell-injection', // Generic
        'CWE-78', // Direct CWE reference
    ],
    // SQL Injection (CWE-89)
    'sql-injection': [
        'js/sql-injection', // CodeQL
        'py/sql-injection', // CodeQL Python
        'java/sql-injection', // CodeQL Java
        'javascript.express.security.express-mysql-injection', // Semgrep
        'python.sqlalchemy.security.sqlalchemy-execute-raw-query', // Semgrep
        'java.lang.security.audit.sqli', // Semgrep
        'sql-injection', // Generic
        'CWE-89', // Direct CWE reference
    ],
    // XSS - Cross-Site Scripting (CWE-79)
    'xss': [
        'js/xss', // CodeQL
        'js/xss-through-dom', // CodeQL
        'javascript.express.security.xss', // Semgrep
        'javascript.browser.security.innerHTML', // Semgrep
        'react.security.audit.react-dangerouslysetinnerhtml', // Semgrep
        'xss', // Generic
        'cross-site-scripting', // Generic
        'CWE-79', // Direct CWE reference
    ],
    // CORS Misconfiguration (CWE-942)
    'cors-misconfiguration': [
        'js/cors-misconfiguration', // CodeQL
        'javascript.express.security.cors-misconfiguration', // Semgrep
        'cors-misconfiguration', // Generic
        'CWE-942', // Direct CWE reference
    ],
    // =========================================================================
    // AUTHENTICATION & AUTHORIZATION
    // =========================================================================
    // Hardcoded Credentials (CWE-798)
    'hardcoded-credentials': [
        'js/hardcoded-credentials', // CodeQL
        'py/hardcoded-credentials', // CodeQL Python
        'java/hardcoded-credentials', // CodeQL Java
        'generic.secrets.security.detected-hardcoded-secret', // Semgrep
        'javascript.lang.security.audit.hardcoded-password', // Semgrep
        'python.lang.security.audit.hardcoded-password', // Semgrep
        'hardcoded-password', // Generic
        'hardcoded-secret', // Generic
        'CWE-798', // Direct CWE reference
    ],
    // Insufficient Authentication (CWE-287)
    'insecure-authentication': [
        'js/insecure-authentication', // CodeQL
        'java/insecure-authentication', // CodeQL Java
        'javascript.jwt.security.jwt-hardcoded', // Semgrep
        'insecure-authentication', // Generic
        'CWE-287', // Direct CWE reference
    ],
    // =========================================================================
    // CRYPTOGRAPHY ISSUES
    // =========================================================================
    // Weak Cryptography (CWE-327)
    'weak-cryptography': [
        'js/weak-cryptographic-algorithm', // CodeQL
        'py/weak-cryptographic-algorithm', // CodeQL Python
        'java/weak-cryptographic-algorithm', // CodeQL Java
        'javascript.lang.security.audit.weak-crypto', // Semgrep
        'python.cryptography.security.audit.weak-hash', // Semgrep
        'java.lang.security.audit.weak-crypto', // Semgrep
        'weak-crypto', // Generic
        'insecure-hash', // Generic
        'CWE-327', // Direct CWE reference
    ],
    // Insecure Random (CWE-330)
    'insecure-random': [
        'js/insecure-randomness', // CodeQL
        'py/insecure-randomness', // CodeQL Python
        'java/insecure-randomness', // CodeQL Java
        'javascript.lang.security.audit.math-random', // Semgrep
        'python.lang.security.audit.random', // Semgrep
        'insecure-random', // Generic
        'CWE-330', // Direct CWE reference
    ],
    // =========================================================================
    // PATH TRAVERSAL & FILE ISSUES
    // =========================================================================
    // Path Traversal (CWE-22)
    'path-traversal': [
        'js/path-injection', // CodeQL
        'py/path-injection', // CodeQL Python
        'java/path-injection', // CodeQL Java
        'javascript.lang.security.audit.path-traversal', // Semgrep
        'python.lang.security.audit.path-traversal', // Semgrep
        'java.lang.security.audit.path-traversal', // Semgrep
        'path-traversal', // Generic
        'directory-traversal', // Generic
        'CWE-22', // Direct CWE reference
    ],
    // =========================================================================
    // DEPENDENCY VULNERABILITIES
    // =========================================================================
    // Vulnerable Dependency (CWE-1035)
    'dependency-vulnerability': [
        'dependency-check', // OWASP Dependency Check
        'npm-audit', // npm audit
        'snyk', // Snyk
        'trivy', // Trivy
        'dependabot', // GitHub Dependabot
        'pip-audit', // pip-audit
        'cargo-audit', // cargo-audit
        'bundler-audit', // bundler-audit
        'CWE-1035', // Direct CWE reference
    ],
    // =========================================================================
    // GITHUB ACTIONS SECURITY
    // =========================================================================
    // Shell Injection in GitHub Actions (CWE-78)
    'gh-actions-shell-injection': [
        'yaml.github-actions.security.run-shell-injection', // Semgrep
        'github-actions/shell-injection', // CodeQL
        'gh-actions-shell-injection', // Generic
    ],
    // =========================================================================
    // DOCKER & KUBERNETES SECURITY
    // =========================================================================
    // Dockerfile User Issues
    'dockerfile-user': [
        'dockerfile.security.last-user-is-root', // Semgrep
        'dockerfile.security.missing-user', // Semgrep
        'dockerfile.security.missing-user-entrypoint', // Semgrep
        'dockerfile-security/last-user-is-root', // Generic
    ],
    // Kubernetes Security Context
    'k8s-security-context': [
        'yaml.kubernetes.security.allow-privilege-escalation', // Semgrep
        'yaml.kubernetes.security.allow-privilege-escalation-no-securitycontext', // Semgrep
        'kubernetes/privilege-escalation', // Generic
    ],
    // Kubernetes Secrets in Config
    'k8s-secrets-in-config': [
        'yaml.kubernetes.security.secrets-in-config-file', // Semgrep
        'kubernetes/secrets-in-config', // Generic
    ],
};
/**
 * CWE to canonical rule mapping
 * Used for secondary lookup when tool-specific rule ID is unknown
 */
exports.CWE_TO_CANONICAL = {
    'CWE-78': 'command-injection',
    'CWE-79': 'xss',
    'CWE-89': 'sql-injection',
    'CWE-116': 'incomplete-string-escaping',
    'CWE-22': 'path-traversal',
    'CWE-287': 'insecure-authentication',
    'CWE-327': 'weak-cryptography',
    'CWE-330': 'insecure-random',
    'CWE-798': 'hardcoded-credentials',
    'CWE-942': 'cors-misconfiguration',
    'CWE-1035': 'dependency-vulnerability',
};
// =============================================================================
// Normalization Functions
// =============================================================================
/**
 * Normalize a tool-specific rule ID to its canonical form
 *
 * @param toolRuleId - The tool-specific rule ID (e.g., "js/incomplete-string-escaping")
 * @returns The canonical rule ID (e.g., "incomplete-string-escaping")
 *
 * @example
 * normalizeRuleId('js/incomplete-string-escaping') // → 'incomplete-string-escaping'
 * normalizeRuleId('codequal-incomplete-double-quote-escaping') // → 'incomplete-string-escaping'
 * normalizeRuleId('unknown-rule') // → 'unknown-rule' (fallback to original)
 */
function normalizeRuleId(toolRuleId) {
    // Check exact match in any variant list
    for (const [canonical, variants] of Object.entries(exports.RULE_EQUIVALENTS)) {
        if (variants.includes(toolRuleId)) {
            return canonical;
        }
    }
    // Check partial matches (for rules with tool prefixes)
    const normalizedInput = toolRuleId.toLowerCase();
    for (const [canonical, variants] of Object.entries(exports.RULE_EQUIVALENTS)) {
        for (const variant of variants) {
            if (normalizedInput.includes(variant.toLowerCase()) ||
                variant.toLowerCase().includes(normalizedInput)) {
                return canonical;
            }
        }
    }
    // Fallback to original rule ID
    return toolRuleId;
}
/**
 * Get canonical rule ID from a CWE
 *
 * @param cweId - The CWE ID (e.g., "CWE-78" or "78")
 * @returns The canonical rule ID or undefined
 */
function canonicalFromCwe(cweId) {
    // Normalize CWE format
    const normalizedCwe = cweId.toUpperCase().startsWith('CWE-')
        ? cweId.toUpperCase()
        : `CWE-${cweId}`;
    return exports.CWE_TO_CANONICAL[normalizedCwe];
}
/**
 * Get all equivalent rule IDs for a given rule
 *
 * @param ruleId - Any rule ID (tool-specific or canonical)
 * @returns Array of all equivalent rule IDs
 *
 * @example
 * getEquivalentRules('js/incomplete-string-escaping')
 * // → ['js/incomplete-string-escaping', 'codequal-incomplete-double-quote-escaping', ...]
 */
function getEquivalentRules(ruleId) {
    // First normalize to canonical
    const canonical = normalizeRuleId(ruleId);
    // Return all variants if canonical exists
    if (exports.RULE_EQUIVALENTS[canonical]) {
        return exports.RULE_EQUIVALENTS[canonical];
    }
    // Return just the original if no mapping found
    return [ruleId];
}
/**
 * Check if two rule IDs are equivalent (same vulnerability type)
 *
 * @param ruleId1 - First rule ID
 * @param ruleId2 - Second rule ID
 * @returns True if rules are equivalent
 */
function areRulesEquivalent(ruleId1, ruleId2) {
    return normalizeRuleId(ruleId1) === normalizeRuleId(ruleId2);
}
/**
 * Get the canonical rule ID and all lookup keys for pattern matching
 *
 * @param ruleId - The tool-specific rule ID
 * @param cweId - Optional CWE ID for secondary lookup
 * @returns Object with canonical ID and all lookup keys
 */
function getPatternLookupKeys(ruleId, cweId) {
    const canonical = normalizeRuleId(ruleId);
    const equivalents = getEquivalentRules(ruleId);
    // Add CWE-based lookup if provided
    if (cweId) {
        const cweCanonical = canonicalFromCwe(cweId);
        if (cweCanonical && cweCanonical !== canonical) {
            // CWE maps to a different canonical - include both
            equivalents.push(...getEquivalentRules(cweCanonical));
        }
    }
    // Deduplicate using Array.from for TypeScript compatibility
    const lookupKeys = Array.from(new Set([canonical, ...equivalents]));
    return { canonical, lookupKeys };
}
/**
 * Register a new rule mapping (for dynamic updates)
 *
 * @param canonical - The canonical rule ID
 * @param toolRuleId - The tool-specific rule ID to add
 */
function registerRuleMapping(canonical, toolRuleId) {
    if (!exports.RULE_EQUIVALENTS[canonical]) {
        exports.RULE_EQUIVALENTS[canonical] = [];
    }
    if (!exports.RULE_EQUIVALENTS[canonical].includes(toolRuleId)) {
        exports.RULE_EQUIVALENTS[canonical].push(toolRuleId);
    }
}
/**
 * Get statistics about rule mappings
 */
function getRuleNormalizerStats() {
    const categoryCounts = {};
    for (const [canonical, variants] of Object.entries(exports.RULE_EQUIVALENTS)) {
        categoryCounts[canonical] = variants.length;
    }
    return {
        totalCanonical: Object.keys(exports.RULE_EQUIVALENTS).length,
        totalMappings: Object.values(exports.RULE_EQUIVALENTS).flat().length,
        categoryCounts,
    };
}
