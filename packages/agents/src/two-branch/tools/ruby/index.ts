/**
 * Ruby Tool Orchestrator - Export module
 *
 * Ruby-specific analysis tools for V9 pipeline:
 * - RuboCop: Ruby linter and code analyzer (with Rails support)
 * - Brakeman: Security vulnerability scanner for Rails
 * - bundler-audit: Gem vulnerability scanner
 * - Semgrep: Pattern-based security scanning (via universal runner)
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  RubyToolOrchestrator,
  RubyToolConfig,
  DEFAULT_RUBY_CONFIG
} from './ruby-tool-orchestrator';
