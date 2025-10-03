/**
 * Severity Mapping Utility for CodeQual V9
 *
 * Implements comprehensive severity mapping rules for static analysis tools.
 *
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
 * - Best Practices Priority 1-3 → MEDIUM (maintainability)
 * - Priority 4-5 → LOW
 *
 * Special case: ConstructorCallsOverridableMethod → ALWAYS MEDIUM
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
 */
function mapPMDSeverity(
  priority: number,
  category: string,
  ruleId: string,
  description?: string
): CodeQualSeverity {

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

  // HIGH: Security priority 3, error prone priority 2, performance/threading priority 1-2
  if (category.includes('security') && priority === 3) {
    return 'high';
  }

  if ((category.includes('error prone') || category.includes('errorprone')) && priority === 2) {
    return 'high';
  }

  if ((category.includes('performance') || category.includes('multithreading')) && priority <= 2) {
    return 'high';
  }

  // MEDIUM: Best practices priority 1-3, design priority 1-3
  if ((category.includes('best practices') || category.includes('bestpractices') || category.includes('design'))
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
