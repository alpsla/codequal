/**
 * TypeScript Tool Orchestrator - Export module
 *
 * TypeScript/JavaScript-specific analysis tools for V9 pipeline:
 * - ESLint: Code quality and best practices
 * - TypeScript Compiler (tsc): Type checking
 * - npm-audit: Dependency vulnerability scanning
 * - Semgrep: Pattern-based security scanning (via universal runner)
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  TypeScriptToolOrchestrator,
  TypeScriptToolConfig,
  DEFAULT_TYPESCRIPT_CONFIG
} from './typescript-tool-orchestrator';
