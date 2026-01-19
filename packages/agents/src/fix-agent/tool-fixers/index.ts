/**
 * Tool Fixers Module - Three-Tier Fix System Executors
 *
 * This module exports all the tool executors for the Three-Tier Fix System:
 * - Tier 1: Native tool --fix commands (fastest, most reliable)
 * - Tier 2: Dedicated fixer tools (specialized, high confidence)
 * - Tier 3: AI-based fixes (fallback, handles complex cases)
 *
 * The Fix Orchestrator coordinates execution across all tiers.
 *
 * @module tool-fixers
 */

// Base classes and types
export {
  ToolExecutorBase,
  ToolExecutionResult,
  ToolExecutionOptions,
  ToolConfig,
} from './tool-executor-base';

// Tier 1 Executors - Native tool --fix commands
export {
  // Factory and helpers
  createTier1Executor,
  getTier1ToolNames,
  // Individual executors
  ESLintExecutor,
  PrettierExecutor,
  RuffExecutor,
  RuffFormatExecutor,
  GoFmtExecutor,
  GoImportsExecutor,
  GolangCILintExecutor,
  RustFmtExecutor,
  ClippyExecutor,
  RuboCopExecutor,
  PHPCBFExecutor,
  SwiftLintExecutor,
  KtlintExecutor,
} from './tier1-executor';

// Tier 2 Executors - Dedicated fixer tools
export {
  // Factory and helpers
  createTier2Executor,
  getTier2ToolNames,
  getRecommendedTier2Fixer,
  getInstallInstructions,
  checkTier2ToolAvailability,
  getAllTier2ToolsStatus,
  // Individual executors
  SoraldExecutor,
  OpenRewriteExecutor,
  AutoflakeExecutor,
  PyUpgradeExecutor,
  IsortExecutor,
  BlackExecutor,
  ClangTidyExecutor,
  ClangFormatExecutor,
  DotnetFormatExecutor,
  // SESSION 102: Native linter --fix executors
  ESLintExecutor as Tier2ESLintExecutor,
  RuffExecutor as Tier2RuffExecutor,
  GofmtExecutor,
  GoimportsExecutor,
  GoogleJavaFormatExecutor,
  GolangciLintExecutor,
} from './tier2-executor';

// Tier 3 Executor - AI-based fixing
export {
  // Factory and helpers
  createTier3Executor,
  getTier3ToolName,
  // Main executor class
  AIFixerExecutor,
  // Types
  type Tier3Issue,
  type Tier3ExecutionOptions,
} from './tier3-executor';

// Fix Orchestrator - Main entry point
export {
  FixOrchestrator,
  executeFixes,
  type FixIssue,
  type OrchestratorConfig,
  type OrchestratorResult,
  type ProgressUpdate,
} from './fix-orchestrator';

// Dependency Vulnerability Fixer (npm/Node.js)
export {
  DependencyFixerExecutor,
  createDependencyFixer,
  getDependencyFixer,
  isDependencyVulnerability,
  getKnownFixablePackages,
  hasKnownFix,
  type DependencyVulnerability,
  type DependencyFixResult,
} from './dependency-fixer';

// Python-Specific Fixers (SESSION 53)
export {
  // Executors
  PipAuditFixerExecutor,
  SemgrepAutoFixExecutor,
  // Factory functions
  createPipAuditFixer,
  createSemgrepAutoFixer,
  getPythonFixerToolNames,
  // Utility functions
  isPythonVulnerabilityAutoFixable,
  parsePythonVulnerabilityFromMessage,
  // Types
  type PipAuditVulnerability,
  type PipAuditFixResult,
  type SemgrepAutoFixResult,
} from './python-fixer';
