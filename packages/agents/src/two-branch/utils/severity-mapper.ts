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

  // ESLint-specific mapping
  if (toolName.toLowerCase() === 'eslint') {
    return mapESLintSeverity(toolPriority as string, normalizedCategory);
  }

  // Dependency-Check (CVSS scores)
  if (toolName.toLowerCase() === 'dependency-check') {
    return mapCVSSSeverity(toolPriority as number);
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
