/**
 * V9 Tool Orchestrators - Master Export Module
 *
 * Unified export for all language-specific tool orchestrators.
 * Each orchestrator extends BaseToolOrchestrator and provides:
 * - Language-specific tool configuration
 * - Parallel tool execution on both branches
 * - Result aggregation for comparative analysis
 *
 * Supported Languages:
 * - Java: PMD, Checkstyle, SpotBugs, Dependency-Check, jdepend (architecture)
 * - TypeScript/JavaScript: ESLint, TSC, npm-audit
 * - Python: Ruff, Bandit, mypy, pip-audit, pydeps (architecture)
 * - Go: golangci-lint, staticcheck, govulncheck
 * - Rust: clippy, cargo-audit, cargo-deny
 * - C#/.NET: dotnet format, Security Code Scan, dotnet-outdated
 * - Ruby: RuboCop, Brakeman, bundler-audit
 * - PHP: PHPStan, Psalm, PHPCS, composer-audit
 *
 * Universal Tools (all languages):
 * - Semgrep: Pattern-based security scanning
 * - CodeQL: Deep semantic analysis (PRO tier)
 * - Dependency-Check: Vulnerability scanning
 *
 * Architecture Tools (Session 59 P2):
 * - Java: jdepend for package metrics, circular dependency detection
 * - Python: pydeps for dependency graphs, import-linter for layer validation
 */

// Production-ready languages (with integration tests and calibration)
export * from './java';
export * from './typescript';
export * from './python';

// Newly implemented languages (orchestrators complete, testing pending)
export * from './go';
export * from './rust';
export * from './dotnet';
export * from './ruby';
export * from './php';

// Universal tools (work across all languages)
export * from './universal';

// Base orchestrator for custom implementations
export {
  BaseToolOrchestrator,
  ToolResult,
  RawIssue,
  OrchestrationOptions,
  OrchestrationResult
} from './base-tool-orchestrator';
