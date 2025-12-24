/**
 * PHP Tool Orchestrator - Export module
 *
 * PHP-specific analysis tools for V9 pipeline:
 * - PHPStan: Static analysis (levels 0-9)
 * - Psalm: Type inference and taint analysis
 * - PHP_CodeSniffer: Code style checker (PSR-12)
 * - composer audit: Package vulnerability scanner
 * - Semgrep: Pattern-based security scanning (via universal runner)
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  PHPToolOrchestrator,
  PHPToolConfig,
  DEFAULT_PHP_CONFIG
} from './php-tool-orchestrator';
