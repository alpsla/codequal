/**
 * Java Tool Orchestrator - Export module
 *
 * Java-specific analysis tools for V9 pipeline:
 * - PMD: Code quality and best practices
 * - Checkstyle: Code style and formatting
 * - SpotBugs: Bug detection (requires compilation)
 * - Dependency-Check: OWASP vulnerability scanner
 * - Semgrep: Pattern-based security scanning (via universal runner)
 * - Performance: Static performance analysis (PMD perf, memory patterns)
 * - Architecture: Package dependency analysis (jdepend, package analysis)
 *
 * Session 58 Updates:
 * - Added JavaPerformanceRunner for static performance analysis
 *
 * Session 59 Updates:
 * - Added JavaArchitectureRunner for architecture analysis (P2 tools)
 *
 * All tools run in parallel on both main and PR branches.
 * Results are aggregated for comparative analysis.
 */

export {
  JavaToolOrchestrator,
  JavaToolConfig,
  DEFAULT_JAVA_CONFIG
} from './java-tool-orchestrator';

export {
  JavaPerformanceRunner,
  JavaPerformanceIssue
} from './performance-runner';

export {
  JavaPerformanceFixer,
  PerformanceFixResult as JavaPerformanceFixResult
} from './performance-fixer';

export {
  JavaArchitectureRunner,
  JavaArchitectureIssue,
  JavaArchitectureScanResult,
  runJavaArchitectureAnalysis,
  javaArchitectureRunner
} from './architecture-runner';
