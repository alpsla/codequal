/**
 * Rust Tool Orchestrator - Export module
 *
 * Rust-specific analysis tools for V9 pipeline:
 * - clippy: Official Rust linter (700+ lint rules)
 * - cargo-audit: Security vulnerability scanner (RustSec database)
 * - cargo-deny: License, ban, and advisory checking
 * - Semgrep: Pattern-based security scanning (via universal runner)
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  RustToolOrchestrator,
  RustToolConfig,
  DEFAULT_RUST_CONFIG
} from './rust-tool-orchestrator';
