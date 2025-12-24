/**
 * Severity Mapping Utility for CodeQual V9
 *
 * Implements comprehensive severity mapping rules for static analysis tools.
 *
 * NOTE: PMD severity is now configured natively through custom rulesets!
 * - Default: pmd-codequal-default.xml with proper priority tuning
 * - Project-specific: Teams can provide customRuleset path in JavaToolConfig
 * - Fallback: Rule-specific overrides below (for backward compatibility)
 *
 * @see /packages/agents/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml
 * @see /packages/agents/docs/PMD_CONFIGURATION_GUIDE.md
 * @see /packages/agents/src/two-branch/docs/SEVERITY_MAPPING_RULES.md
 */

export type CodeQualSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Determine CodeQual severity from PMD tool output
 *
 * Follows canonical mapping rules:
 * - Security Priority 1-2 → CRITICAL
 * - Error Prone Priority 1 with runtime impact → CRITICAL
 * - Security Priority 3 → HIGH
 * - Error Prone Priority 2 → HIGH
 * - Critical concurrency bugs (deadlock, race condition) → HIGH
 * - Performance Priority 1-2 → MEDIUM (optimizations, not critical)
 * - Multithreading Priority 1-2 → MEDIUM (best practices, not critical)
 * - Best Practices Priority 1-3 → MEDIUM (maintainability)
 * - Design Priority 1-3 → MEDIUM (architecture)
 * - Priority 4-5 → LOW
 *
 * Rationale: HIGH severity should mean "causes crashes, data loss, or security issues"
 * Performance and best practice issues are important but don't break the app → MEDIUM
 */
export function determineCodeQualSeverity(
  toolName: string,
  toolPriority: number | string,
  category: string,
  ruleId: string,
  description?: string
): CodeQualSeverity {

  // Normalize inputs
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedRule = (ruleId || '').toLowerCase();
  const priority = typeof toolPriority === 'string'
    ? parseInt(toolPriority, 10)
    : toolPriority;

  // Special case: ConstructorCallsOverridableMethod ALWAYS MEDIUM
  // Rationale: Best Practices category, Priority 3, Maintainability impact (not crashes)
  if (normalizedRule.includes('constructorcallsoverridablemethod')) {
    return 'medium';
  }

  // PMD-specific mapping
  if (toolName.toLowerCase() === 'pmd') {
    return mapPMDSeverity(priority, normalizedCategory, normalizedRule, description);
  }

  // Semgrep-specific mapping
  if (toolName.toLowerCase() === 'semgrep') {
    return mapSemgrepSeverity(toolPriority as string, normalizedCategory);
  }

  // BUG FIX #45: SpotBugs-specific mapping
  if (toolName.toLowerCase() === 'spotbugs') {
    return mapSpotBugsSeverity(toolPriority as string, normalizedRule, description);
  }

  // ESLint-specific mapping
  if (toolName.toLowerCase() === 'eslint') {
    return mapESLintSeverity(toolPriority as string, normalizedCategory);
  }

  // Dependency-Check (CVSS scores)
  if (toolName.toLowerCase() === 'dependency-check') {
    return mapCVSSSeverity(toolPriority as number);
  }

  // Go tools
  if (toolName.toLowerCase() === 'golangci-lint') {
    return mapGolangciLintSeverity(toolPriority as string, normalizedCategory, normalizedRule);
  }
  if (toolName.toLowerCase() === 'staticcheck') {
    return mapStaticcheckSeverity(normalizedRule);
  }
  if (toolName.toLowerCase() === 'govulncheck') {
    return mapCVSSSeverity(toolPriority as number); // Uses CVSS
  }

  // Rust tools
  if (toolName.toLowerCase() === 'clippy') {
    return mapClippySeverity(toolPriority as string, normalizedRule);
  }
  if (toolName.toLowerCase() === 'cargo-audit' || toolName.toLowerCase() === 'cargo-deny') {
    return mapCVSSSeverity(toolPriority as number); // Uses CVSS
  }

  // C#/.NET tools
  if (toolName.toLowerCase() === 'dotnet-format') {
    return mapDotnetFormatSeverity(toolPriority as string);
  }
  if (toolName.toLowerCase() === 'security-code-scan') {
    return mapSecurityCodeScanSeverity(normalizedRule);
  }

  // Ruby tools
  if (toolName.toLowerCase() === 'rubocop') {
    return mapRubocopSeverity(toolPriority as string, normalizedCategory);
  }
  if (toolName.toLowerCase() === 'brakeman') {
    return mapBrakemanSeverity(toolPriority as string);
  }
  if (toolName.toLowerCase() === 'bundler-audit') {
    return mapCVSSSeverity(toolPriority as number); // Uses CVSS
  }

  // PHP tools
  if (toolName.toLowerCase() === 'phpstan') {
    return mapPHPStanSeverity(toolPriority as number);
  }
  if (toolName.toLowerCase() === 'psalm') {
    return mapPsalmSeverity(normalizedRule, normalizedCategory);
  }
  if (toolName.toLowerCase() === 'phpcs') {
    return mapPHPCSSeverity(toolPriority as string);
  }
  if (toolName.toLowerCase() === 'composer-audit') {
    return mapCVSSSeverity(toolPriority as number); // Uses CVSS
  }

  // Default fallback
  return 'medium';
}

/**
 * Map PMD priority + category to CodeQual severity
 *
 * NOTE: If using custom PMD rulesets (pmd-codequal-default.xml or project-specific),
 * the priorities from the ruleset are used FIRST, and these overrides serve as
 * a fallback for backward compatibility or when standard PMD rulesets are used.
 */
function mapPMDSeverity(
  priority: number,
  category: string,
  ruleId: string,
  description?: string
): CodeQualSeverity {

  // RULE-SPECIFIC OVERRIDES (takes precedence over category/priority)
  // These overrides are based on real-world analysis and user feedback
  // 
  // Users have TWO ways to customize severities:
  // 1. PMD-level: Use `customRuleset` in JavaToolConfig (already supported!)
  //    - Create custom PMD ruleset XML with adjusted priorities
  //    - Example: Set AvoidUsingVolatile priority to 3 instead of 2
  // 
  // 2. Application-level: Use `severityOverrides` in V9TemplateConfig
  //    - Override severity AFTER tool execution
  //    - Works for all tools (PMD, Semgrep, ESLint, etc.)
  //    - Future: Manageable via Settings UI or API
  // 
  // NOTE: These override the category-based logic below
  // Last updated: 2025-10-09 (User feedback: "doesn't look like high severity")
  const ruleOverrides: Record<string, CodeQualSeverity> = {
    // Multithreading Best Practices (was HIGH, now MEDIUM)
    'avoidusingvolatile': 'medium',               // 361 occurrences - best practice, not critical
    
    // Performance Optimizations (was HIGH, now MEDIUM)
    'avoidfilestream': 'medium',                  // 11 occurrences - NIO vs FileInputStream optimization
    
    // Design Patterns (was HIGH, now MEDIUM)
    'singletonclassreturningnewinstance': 'medium', // 4 occurrences - design pattern violation
    'singlemethodsingleton': 'medium',            // 2 occurrences - design pattern
    
    // Code Style / Best Practices (various)
    'morethanonelogger': 'medium',                // 6 occurrences - code organization
    'loggerisnotstaticfinal': 'medium',           // Logging style issue
    'returnemptycollectionratherthannull': 'medium', // Best practice
    'avoidbranchingstatementaslastinloop': 'medium', // Code style
    
    // Documentation (LOW severity)
    'uselocalewithtouppercase': 'low',            // Locale awareness
    'uselocalewithtolowercase': 'low',            // Locale awareness
    'guidanceontostring': 'low',                  // Documentation
    'commentsize': 'low',                         // Documentation style
    'commentrequired': 'low'                      // Documentation requirement
  };

  if (ruleOverrides[ruleId]) {
    return ruleOverrides[ruleId];
  }

  // CRITICAL: Security priority 1-2 or error prone priority 1 with runtime impact
  if (category.includes('security') && priority <= 2) {
    return 'critical';
  }

  if (category.includes('error prone') || category.includes('errorprone')) {
    if (priority === 1) {
      const hasRuntimeImpact = checkRuntimeImpact(description || '');
      return hasRuntimeImpact ? 'critical' : 'high';
    }
  }

  // HIGH: Security priority 3, error prone priority 2, CRITICAL concurrency bugs
  if (category.includes('security') && priority === 3) {
    return 'high';
  }

  if ((category.includes('error prone') || category.includes('errorprone')) && priority === 2) {
    return 'high';
  }

  // HIGH: Only CRITICAL multithreading issues (actual race conditions, deadlocks)
  // Most multithreading rules are best practices → MEDIUM
  if (category.includes('multithreading') && priority === 1) {
    // Check if it's a critical concurrency bug (race condition, deadlock)
    const criticalConcurrency = [
      'doublecheckedlocking',
      'unsynchronizedstaticformatter',
      'threadwithdefaultuncaughtexceptionhandler'
    ];
    if (criticalConcurrency.some(rule => ruleId.includes(rule))) {
      return 'high';
    }
    // Otherwise, multithreading best practices are MEDIUM
    return 'medium';
  }

  // Performance issues are optimizations, not critical bugs → MEDIUM
  if (category.includes('performance') && priority <= 2) {
    return 'medium';
  }

  // MEDIUM: Best practices, design, multithreading best practices
  if ((category.includes('best practices') || category.includes('bestpractices') || 
       category.includes('design') || category.includes('multithreading'))
      && priority <= 3) {
    return 'medium';
  }

  // LOW: Priority 4-5 or code style/documentation
  if (priority >= 4 || category.includes('code style') || category.includes('codestyle')
      || category.includes('documentation')) {
    return 'low';
  }

  // Default: MEDIUM (safety fallback)
  return 'medium';
}

/**
 * Map Semgrep severity to CodeQual severity
 */
function mapSemgrepSeverity(
  severity: string,
  category: string
): CodeQualSeverity {
  const normalizedSeverity = (severity || '').toUpperCase();

  if (normalizedSeverity === 'ERROR' && category.includes('security')) {
    return 'critical';
  }

  if (normalizedSeverity === 'WARNING' && category.includes('security')) {
    return 'high';
  }

  if (normalizedSeverity === 'WARNING') {
    return 'medium';
  }

  return 'low'; // INFO level
}

/**
 * Map ESLint level to CodeQual severity
 */
function mapESLintSeverity(
  level: string,
  category: string
): CodeQualSeverity {
  const normalizedLevel = (level || '').toLowerCase();

  if (normalizedLevel === 'error' && category.includes('security')) {
    return 'high';
  }

  if (normalizedLevel === 'error') {
    return 'medium';
  }

  return 'low'; // warn level
}

/**
 * Map CVSS score to CodeQual severity
 */
function mapCVSSSeverity(cvssScore: number): CodeQualSeverity {
  if (cvssScore >= 9.0) return 'critical';
  if (cvssScore >= 7.0) return 'high';
  if (cvssScore >= 4.0) return 'medium';
  return 'low';
}

/**
 * BUG FIX #45: Map SpotBugs priority + bug pattern to CodeQual severity
 * 
 * SpotBugs uses priority levels (High/Medium/Low) and bug pattern types:
 * - Correctness: Bugs that will likely cause incorrect behavior
 * - Bad Practice: Violations of recommended coding practices
 * - Performance: Code that may lead to inefficiencies
 * - Dodgy Code: Confusing, anomalous, or written in a way that leads to errors
 * - Security: Potential security vulnerabilities
 * - Multithreaded Correctness: Flaws with concurrent code
 * 
 * Approved mappings (User feedback 2025-10-18):
 * - DLS_DEAD_LOCAL_STORE → LOW (dead code, no impact)
 * - MS_MUTABLE_ARRAY → MEDIUM (mutability issue)
 * - RV_RETURN_VALUE_IGNORED_NO_SIDE_EFFECT → MEDIUM (code smell)
 * - NM_SAME_SIMPLE_NAME_AS_SUPERCLASS → LOW (naming only)
 * - STCAL_INVOKE_ON_STATIC_DATE_FORMAT_INSTANCE → HIGH (thread-safety)
 */
function mapSpotBugsSeverity(
  priority: string,
  ruleId: string,
  description?: string
): CodeQualSeverity {
  const normalizedPriority = (priority || '').toLowerCase();
  const normalizedRule = ruleId.toLowerCase();

  // RULE-SPECIFIC OVERRIDES (User-approved severity mappings)
  const ruleOverrides: Record<string, CodeQualSeverity> = {
    // LOW: Dead code, naming issues (no runtime impact)
    'dls_dead_local_store': 'low',                              // Dead local variable
    'dls_dead_store_of_class_literal': 'low',                  // Dead store of class literal
    'nm_same_simple_name_as_superclass': 'low',                // Name confusion
    'nm_same_simple_name_as_interface': 'low',                 // Name confusion
    'nm_confusing': 'low',                                     // Confusing naming
    
    // MEDIUM: Code smells, mutability issues, design patterns
    'ms_mutable_array': 'medium',                              // Mutable array field
    'ms_mutable_collection': 'medium',                         // Mutable collection field
    'ms_pkgprotect': 'medium',                                 // Mutable field should be package protected
    'rv_return_value_ignored_no_side_effect': 'medium',        // Return value ignored
    'rv_return_value_ignored': 'medium',                       // Return value ignored (general)
    'uc_useless_condition': 'medium',                          // Useless condition
    'uc_useless_object': 'medium',                             // Useless object created
    
    // HIGH: Thread-safety issues (can cause crashes in concurrent apps)
    'stcal_invoke_on_static_date_format_instance': 'high',     // SimpleDateFormat thread-safety
    'stcal_static_calendar_instance': 'high',                  // Calendar thread-safety
    'dc_doublecheck': 'high',                                  // Double-checked locking
    'ml_sync_on_updated_field': 'high',                        // Synchronization on updated field
    'wa_await_not_in_loop': 'high',                            // wait() not in loop
    'nn_naked_notify': 'high',                                 // Naked notify
    
    // CRITICAL: Security vulnerabilities, null pointer dereferences
    'sql_injection': 'critical',                                // SQL injection
    'command_injection': 'critical',                            // Command injection
    'path_traversal': 'critical',                               // Path traversal
    'xxe': 'critical',                                          // XML External Entity
    'np_null_on_some_path': 'critical',                        // Null pointer dereference (confirmed crash)
  };

  if (ruleOverrides[normalizedRule]) {
    return ruleOverrides[normalizedRule];
  }

  // CATEGORY-BASED FALLBACK (when specific rule not in overrides)
  
  // CRITICAL: Security vulnerabilities + High priority
  if (normalizedPriority === 'high' || normalizedPriority === '1') {
    // Security issues at high priority are critical
    if (description && (
      description.toLowerCase().includes('security') ||
      description.toLowerCase().includes('injection') ||
      description.toLowerCase().includes('exploit')
    )) {
      return 'critical';
    }
    
    // Null pointer dereferences are critical (confirmed crashes)
    if (normalizedRule.startsWith('np_') && description?.toLowerCase().includes('null')) {
      return 'critical';
    }
    
    // Other high-priority issues → HIGH (not critical unless proven)
    return 'high';
  }

  // MEDIUM: Medium priority or code quality issues
  if (normalizedPriority === 'medium' || normalizedPriority === '2') {
    return 'medium';
  }

  // LOW: Low priority or style/naming issues
  if (normalizedPriority === 'low' || normalizedPriority === '3') {
    return 'low';
  }

  // Default: MEDIUM (safety fallback)
  return 'medium';
}

/**
 * Check if issue description indicates runtime impact
 *
 * Runtime impact means the issue can cause:
 * - Crashes (null pointer, exceptions)
 * - Data loss
 * - Memory leaks
 * - Deadlocks/race conditions
 */
function checkRuntimeImpact(description: string): boolean {
  const runtimeKeywords = [
    'null pointer',
    'nullpointer',
    'crash',
    'exception',
    'data loss',
    'memory leak',
    'deadlock',
    'race condition'
  ];

  const lowerDescription = description.toLowerCase();
  return runtimeKeywords.some(keyword => lowerDescription.includes(keyword));
}

/**
 * Export for backward compatibility with existing code
 */
export function mapPMDPriority(priority: number): CodeQualSeverity {
  // Deprecated: Use determineCodeQualSeverity instead
  // This maintains backward compatibility but doesn't consider category
  switch (priority) {
    case 1:
      return 'critical';
    case 2:
      return 'high';
    case 3:
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Enhanced PMD mapping that considers both priority and category
 */
export function mapPMDSeverityEnhanced(
  priority: number,
  category: string,
  ruleId: string,
  description?: string
): CodeQualSeverity {
  return determineCodeQualSeverity('PMD', priority, category, ruleId, description);
}

// ============================================================
// GO SEVERITY MAPPERS
// ============================================================

/**
 * Map golangci-lint severity
 *
 * golangci-lint aggregates 50+ linters, each with different severity levels.
 * Key linters and their severity implications:
 * - gosec: Security issues (HIGH/CRITICAL)
 * - gocritic: Code quality (MEDIUM)
 * - errcheck: Error handling (MEDIUM/HIGH)
 * - staticcheck: Static analysis (MEDIUM/HIGH)
 * - ineffassign: Unused assignments (LOW)
 * - deadcode: Dead code (LOW)
 */
function mapGolangciLintSeverity(
  severity: string,
  category: string,
  ruleId: string
): CodeQualSeverity {
  const normalizedSeverity = (severity || '').toLowerCase();
  const linter = ruleId.split('/')[0] || '';

  // Security linters → HIGH/CRITICAL
  const securityLinters = ['gosec', 'gocritic'];
  if (securityLinters.includes(linter)) {
    return normalizedSeverity === 'error' ? 'critical' : 'high';
  }

  // Error handling → HIGH (unhandled errors cause issues)
  if (linter === 'errcheck') {
    return 'high';
  }

  // Static analysis issues → MEDIUM/HIGH based on severity
  if (linter === 'staticcheck') {
    return normalizedSeverity === 'error' ? 'high' : 'medium';
  }

  // Code quality linters → MEDIUM
  const qualityLinters = ['govet', 'revive', 'gofmt', 'goimports'];
  if (qualityLinters.includes(linter)) {
    return 'medium';
  }

  // Dead code and unused → LOW
  const lowLinters = ['deadcode', 'unused', 'ineffassign', 'varcheck', 'structcheck'];
  if (lowLinters.includes(linter)) {
    return 'low';
  }

  // Default based on severity level
  if (normalizedSeverity === 'error') return 'medium';
  if (normalizedSeverity === 'warning') return 'low';
  return 'low';
}

/**
 * Map staticcheck severity
 *
 * Staticcheck codes:
 * - SA* (staticanalysis): Bugs, correctness issues → MEDIUM/HIGH
 * - S* (simple): Simplification suggestions → LOW
 * - ST* (stylecheck): Style issues → LOW
 * - QF* (quickfix): Quick fixes available → LOW
 */
function mapStaticcheckSeverity(ruleId: string): CodeQualSeverity {
  const code = ruleId.toUpperCase();

  // SA codes are static analysis (bugs, correctness)
  if (code.startsWith('SA')) {
    // SA1xxx - Various issues (range by severity)
    if (code.startsWith('SA1')) return 'medium';
    // SA2xxx - Concurrency issues
    if (code.startsWith('SA2')) return 'high';
    // SA3xxx - Testing issues
    if (code.startsWith('SA3')) return 'medium';
    // SA4xxx - Useless code
    if (code.startsWith('SA4')) return 'low';
    // SA5xxx - Correctness issues
    if (code.startsWith('SA5')) return 'high';
    // SA6xxx - Performance issues
    if (code.startsWith('SA6')) return 'medium';
    // SA9xxx - Dubious constructs
    if (code.startsWith('SA9')) return 'medium';
    return 'medium';
  }

  // S codes are simplification suggestions
  if (code.startsWith('S1')) return 'low';

  // ST codes are style checks
  if (code.startsWith('ST')) return 'low';

  // QF codes are quickfixes
  if (code.startsWith('QF')) return 'low';

  return 'medium';
}

// ============================================================
// RUST SEVERITY MAPPERS
// ============================================================

/**
 * Map Clippy lint severity
 *
 * Clippy categories:
 * - clippy::correctness - Always MEDIUM/HIGH
 * - clippy::suspicious - MEDIUM/HIGH
 * - clippy::complexity - MEDIUM
 * - clippy::perf - MEDIUM
 * - clippy::style - LOW
 * - clippy::pedantic - LOW
 * - clippy::nursery - LOW
 */
function mapClippySeverity(severity: string, ruleId: string): CodeQualSeverity {
  const normalizedSeverity = (severity || '').toLowerCase();
  const rule = ruleId.toLowerCase();

  // Security-related rules
  if (rule.includes('unsafe') || rule.includes('security')) {
    return 'high';
  }

  // Correctness issues
  if (rule.includes('correctness') || rule.includes('suspicious')) {
    return normalizedSeverity === 'error' ? 'high' : 'medium';
  }

  // Performance issues
  if (rule.includes('perf')) {
    return 'medium';
  }

  // Complexity issues
  if (rule.includes('complexity')) {
    return 'medium';
  }

  // Style and pedantic issues
  if (rule.includes('style') || rule.includes('pedantic') || rule.includes('nursery')) {
    return 'low';
  }

  // Based on lint level
  if (normalizedSeverity === 'deny' || normalizedSeverity === 'error') return 'high';
  if (normalizedSeverity === 'warn' || normalizedSeverity === 'warning') return 'medium';
  return 'low';
}

// ============================================================
// C#/.NET SEVERITY MAPPERS
// ============================================================

/**
 * Map dotnet format severity
 */
function mapDotnetFormatSeverity(severity: string): CodeQualSeverity {
  const normalizedSeverity = (severity || '').toLowerCase();

  if (normalizedSeverity === 'error') return 'medium';
  if (normalizedSeverity === 'warning') return 'low';
  return 'low';
}

/**
 * Map Security Code Scan severity
 *
 * SCS codes are security-focused:
 * - SCS0001-SCS0002: SQL Injection → CRITICAL
 * - SCS0003, SCS0007: XXE → CRITICAL
 * - SCS0005-SCS0006, SCS0010, SCS0013: Weak Crypto → HIGH
 * - SCS0008-SCS0009, SCS0012, SCS0031: Command Injection → CRITICAL
 * - SCS0016: CSRF → HIGH
 * - SCS0017: Open Redirect → HIGH
 * - SCS0018: Path Traversal → CRITICAL
 * - SCS0019, SCS0027-SCS0028: Deserialization → CRITICAL
 * - SCS0023-SCS0024, SCS0029: XSS → HIGH
 */
function mapSecurityCodeScanSeverity(ruleId: string): CodeQualSeverity {
  const code = ruleId.toUpperCase();

  // Critical vulnerabilities
  const criticalCodes = [
    'SCS0001', 'SCS0002', 'SCS0003', 'SCS0007', // SQL Injection, XXE
    'SCS0008', 'SCS0009', 'SCS0012', 'SCS0031', // Command Injection
    'SCS0018', // Path Traversal
    'SCS0019', 'SCS0027', 'SCS0028', // Deserialization
    'SCS0020', // LDAP Injection
    'SCS0014', 'SCS0025', 'SCS0026', // More SQL Injection
  ];

  if (criticalCodes.some(c => code.includes(c))) {
    return 'critical';
  }

  // High severity vulnerabilities
  const highCodes = [
    'SCS0005', 'SCS0006', 'SCS0010', 'SCS0013', // Weak Crypto
    'SCS0016', // CSRF
    'SCS0017', // Open Redirect
    'SCS0021', 'SCS0022', // Certificate Validation
    'SCS0023', 'SCS0024', 'SCS0029', // XSS
  ];

  if (highCodes.some(c => code.includes(c))) {
    return 'high';
  }

  // Medium severity (secure cookies, weak random, etc.)
  const mediumCodes = [
    'SCS0032', 'SCS0033', 'SCS0034',
  ];

  if (mediumCodes.some(c => code.includes(c))) {
    return 'medium';
  }

  // Default for unknown SCS codes → HIGH (security-focused tool)
  return 'high';
}

// ============================================================
// RUBY SEVERITY MAPPERS
// ============================================================

/**
 * Map RuboCop severity
 *
 * RuboCop severities:
 * - fatal: CRITICAL
 * - error: HIGH
 * - warning: MEDIUM
 * - convention: LOW
 * - refactor: LOW
 */
function mapRubocopSeverity(severity: string, category: string): CodeQualSeverity {
  const normalizedSeverity = (severity || '').toLowerCase();

  // Security department → elevate severity
  if (category.includes('security')) {
    if (normalizedSeverity === 'fatal' || normalizedSeverity === 'error') {
      return 'critical';
    }
    return 'high';
  }

  // Rails-specific issues are generally MEDIUM
  if (category.includes('rails')) {
    if (normalizedSeverity === 'error') return 'high';
    return 'medium';
  }

  // Standard severity mapping
  if (normalizedSeverity === 'fatal') return 'critical';
  if (normalizedSeverity === 'error') return 'high';
  if (normalizedSeverity === 'warning') return 'medium';
  if (normalizedSeverity === 'convention') return 'low';
  if (normalizedSeverity === 'refactor') return 'low';

  return 'low';
}

/**
 * Map Brakeman severity
 *
 * Brakeman confidence levels:
 * - High confidence + High impact → CRITICAL
 * - High confidence → HIGH
 * - Medium confidence → MEDIUM
 * - Weak/Low confidence → LOW
 */
function mapBrakemanSeverity(confidence: string): CodeQualSeverity {
  const normalizedConfidence = (confidence || '').toLowerCase();

  if (normalizedConfidence === 'high') return 'critical';
  if (normalizedConfidence === 'medium') return 'high';
  if (normalizedConfidence === 'weak' || normalizedConfidence === 'low') return 'medium';

  return 'medium';
}

// ============================================================
// PHP SEVERITY MAPPERS
// ============================================================

/**
 * Map PHPStan severity by level
 *
 * PHPStan levels 0-9:
 * - Level 0-2: Basic issues → LOW
 * - Level 3-5: Medium issues → MEDIUM
 * - Level 6-7: Strict issues → MEDIUM/HIGH
 * - Level 8-9: Very strict → HIGH
 */
function mapPHPStanSeverity(level: number): CodeQualSeverity {
  if (level >= 8) return 'high';
  if (level >= 6) return 'medium';
  if (level >= 3) return 'medium';
  return 'low';
}

/**
 * Map Psalm severity
 *
 * Psalm issue types:
 * - TaintedX: Security issues → CRITICAL
 * - PossiblyNull/PossiblyUndefined: Type safety → MEDIUM
 * - UnusedX: Dead code → LOW
 * - DocblockX: Documentation → LOW
 */
function mapPsalmSeverity(issueType: string, category: string): CodeQualSeverity {
  const type = issueType.toLowerCase();

  // Taint analysis (security) → CRITICAL
  if (type.includes('tainted') || type.includes('sql') || type.includes('injection')) {
    return 'critical';
  }

  // Null/undefined safety → MEDIUM (can cause runtime errors)
  if (type.includes('null') || type.includes('undefined') || type.includes('invalid')) {
    return 'medium';
  }

  // Type errors → MEDIUM
  if (type.includes('type') || type.includes('argument') || type.includes('return')) {
    return 'medium';
  }

  // Unused/deprecated → LOW
  if (type.includes('unused') || type.includes('deprecated') || type.includes('docblock')) {
    return 'low';
  }

  return 'medium';
}

/**
 * Map PHP_CodeSniffer severity
 *
 * PHPCS types:
 * - ERROR: MEDIUM (code style errors)
 * - WARNING: LOW (code style warnings)
 */
function mapPHPCSSeverity(type: string): CodeQualSeverity {
  const normalizedType = (type || '').toLowerCase();

  if (normalizedType === 'error') return 'medium';
  return 'low';
}
