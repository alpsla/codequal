/**
 * Universal Tools - Shared runners for multi-language support
 *
 * Export all universal tool runners that work across multiple programming languages.
 *
 * Tool Coverage:
 * - Semgrep: Pattern-based security scanning (all tiers)
 *   - Uses p/security-audit, p/owasp-top-ten rulesets
 *   - Plus CodeQual custom rules for incomplete escaping detection
 *
 * - CodeQL: Deep semantic analysis (PRO tier only)
 *   - Data flow analysis, taint tracking
 *   - Cross-function analysis
 *   - More thorough but slower
 *
 * - Dependency Check: Vulnerability scanning for dependencies (all tiers)
 */

export { UniversalToolBase, UniversalToolConfig } from './universal-tool-base';
export { UniversalSemgrepRunner, runSemgrep } from './semgrep-runner';
export { UniversalDependencyCheckRunner, runDependencyCheck } from './dependency-check-runner';
export {
  CodeQLRunner,
  CodeQLConfig,
  CODEQL_DEFAULTS,
  runCodeQL,
  runCodeQLFast,
  runCodeQLParallel,
  runCodeQLExtended,
  isCodeQLAvailable,
  clearCodeQLCache,
  getCodeQLCacheStats,
} from './codeql-runner';

/**
 * Check if a tool name is universal (should use shared runners)
 */
export function isUniversalTool(toolName: string): boolean {
  const universalTools = ['semgrep', 'dependency-check', 'codeql'];
  return universalTools.includes(toolName.toLowerCase());
}

/**
 * Get the list of all universal tool names
 */
export function getUniversalToolNames(): string[] {
  return ['semgrep', 'dependency-check', 'codeql'];
}

/**
 * Get tools available for a specific tier
 * @param tier - 'basic' | 'pro'
 */
export function getToolsForTier(tier: 'basic' | 'pro'): string[] {
  const basicTools = ['semgrep', 'dependency-check'];

  if (tier === 'pro') {
    return [...basicTools, 'codeql'];
  }

  return basicTools;
}

/**
 * Check if a tool requires PRO tier
 */
export function isProTierTool(toolName: string): boolean {
  const proOnlyTools = ['codeql'];
  return proOnlyTools.includes(toolName.toLowerCase());
}
