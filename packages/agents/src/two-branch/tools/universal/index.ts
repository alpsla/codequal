/**
 * Universal Tools - Shared runners for multi-language support
 * 
 * Export all universal tool runners that work across multiple programming languages.
 */

export { UniversalToolBase, UniversalToolConfig } from './universal-tool-base';
export { UniversalSemgrepRunner, runSemgrep } from './semgrep-runner';
export { UniversalDependencyCheckRunner, runDependencyCheck } from './dependency-check-runner';

/**
 * Check if a tool name is universal (should use shared runners)
 */
export function isUniversalTool(toolName: string): boolean {
  const universalTools = ['semgrep', 'dependency-check'];
  return universalTools.includes(toolName.toLowerCase());
}

/**
 * Get the list of all universal tool names
 */
export function getUniversalToolNames(): string[] {
  return ['semgrep', 'dependency-check'];
}

