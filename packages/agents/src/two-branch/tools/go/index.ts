/**
 * Go Tool Orchestrator - Export module
 *
 * Go-specific analysis tools for V9 pipeline:
 * - golangci-lint: Meta-linter (50+ linters in parallel)
 * - staticcheck: Advanced static analysis for Go
 * - govulncheck: Official Go vulnerability scanner
 * - Semgrep: Pattern-based security scanning (via universal runner)
 * - Performance: Static performance analysis (staticcheck perf, golangci perf, memory patterns)
 *
 * Session 58 Updates:
 * - Added GoPerformanceRunner for static performance analysis
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  GoToolOrchestrator,
  GoToolConfig,
  DEFAULT_GO_CONFIG
} from './go-tool-orchestrator';

export {
  GoPerformanceRunner,
  GoPerformanceIssue
} from './performance-runner';

export {
  GoPerformanceFixer,
  PerformanceFixResult as GoPerformanceFixResult
} from './performance-fixer';
