/**
 * Fix Agent - Universal Batch Fix System for CodeQual
 *
 * This module provides IDE-agnostic batch fixing of code quality issues.
 * It works with any environment that has API access - no IDE dependency.
 *
 * Architecture:
 * 1. UniversalFixExecutor - Executes fixes using Claude API directly
 * 2. FixManifestGenerator - Creates easy 1-click fix commands
 * 3. BatchFixGenerator - Generates fix artifacts (Markdown, Shell, Aider)
 * 4. CLI - Command-line interface for batch fixing
 *
 * Three-Tier Fix System (NEW):
 * - Tier 1: Native tool fixes (eslint --fix, ruff --fix, etc.)
 * - Tier 2: Dedicated fixer tools (Sorald, autoflake, OpenRewrite)
 * - Tier 3: AI-generated fixes (fallback for unsupported issues)
 *
 * Usage:
 *   # From CLI
 *   npx codequal-fix --lsp-actions codequal-lsp-actions.json --all
 *
 *   # From code
 *   import { UniversalFixExecutor } from '@codequal/agents/fix-agent';
 *   const executor = new UniversalFixExecutor({ apiKey, workspaceRoot });
 *   await executor.executeAll(issues);
 *
 * @module fix-agent
 */

// Universal Fix Executor - Main execution engine
export {
  UniversalFixExecutor,
  executeFixesFromEnv,
  type FixRequest,
  type ExecutorConfig,
  type ProgressUpdate,
  type ExecutionResult,
  type BatchExecutionSummary
} from './universal-fix-executor';

// Fix Manifest Generator - Creates 1-click fix commands
export {
  FixManifestGenerator,
  generateManifestFromLSP,
  type ManifestMetadata,
  type SeverityGroup,
  type FixManifest
} from './fix-manifest-generator';

// Batch Fix Generator - Creates fix artifacts (Markdown, Shell, Aider)
export {
  BatchFixGenerator,
  generateBatchFixes,
  type FixIssue,
  type FileFixGroup,
  type BatchFixConfig,
  type Manifest,
  type ManifestFile
} from './batch-fix-generator';

// Fix Package Generator - Creates downloadable fix packages for AI tools
// This is the core of the $5 "Analyze" tier
export {
  FixPackageGenerator,
  generateFixPackageFromLSP,
  type FixPackageConfig,
  type FixPackageResult
} from './fix-package-generator';

// ================================================================================
// THREE-TIER FIX SYSTEM (NEW - P0 Priority)
// ================================================================================

// Issue Classification - Maps rule IDs to issue types deterministically
export {
  type IssueType,
  type ClassifiedIssue,
  classifyIssue,
  classifyIssues,
  getClassificationStats,
  ESLINT_RULES,
  RUFF_RULES,
  SEMGREP_RULES,
  PMD_RULES,
  CHECKSTYLE_RULES,
} from './issue-classifier';

// Fix Routing - Routes issues to appropriate fixers
export {
  type FixRoute,
  type EnrichedIssue,
  type RoutedIssue,
  routeToFixer,
  routeAndGroupIssues,
  getRouteSummary,
  canFixerHandleRule,
  getFixersForLanguage,
  getFixerConfig,
  TIER1_FIXERS,
  TIER2_FIXERS,
  LANGUAGE_FIXERS,
  TOOL_LANGUAGES,
} from './fix-router';

// Fix Scheduling - Performance-based parallel scheduling
export {
  type PerformanceCategory,
  type FixerPerformance,
  type FixBatch,
  type ScheduledExecution,
  type FixExecutionContext,
  type FixResult,
  getFixerPerformance,
  createSchedule,
  getScheduleSummary,
  executeSchedule,
  FIXER_PERFORMANCE,
} from './fix-scheduler';

// ================================================================================
// COMPREHENSIVE RULE DEFINITIONS
// ================================================================================

// ESLint Rules (200+ rules)
export * from './rules/eslint-rules';

// TypeScript-ESLint Rules (130+ rules)
export * from './rules/typescript-eslint-rules';

// Unified Rule Lookup
export * from './rules/index';

// ================================================================================
// TOOL DATABASE SCHEMAS
// ================================================================================

// Comprehensive tool database (45+ tools across 12 languages)
export * from './schemas/tool-database-schema';

// Tool matrix bridge (backward compatibility with V9)
export * from './schemas/tool-matrix-bridge';

// ================================================================================
// INFRASTRUCTURE - DATABASE CLIENTS
// ================================================================================

// Supabase database client for fetching tools, rules, and mappings
export {
  ToolDatabaseClient,
  ToolDatabaseConfig,
  getToolDatabaseClient,
  fetchTools,
  fetchToolsForLanguage,
  fetchFixerForIssue,
  updateToolVersion,
  // Supabase Fix Router - Two-Tier Fix System with tool context
  SupabaseFixRouter,
  getSupabaseFixRouter,
  type SupportedLanguage as SupabaseLanguage,
  type IssueToRoute,
  type RoutedIssue as SupabaseRoutedIssue,
  type ToolContext,
  type FixBatch as SupabaseFixBatch,
  type RoutingResult as SupabaseRoutingResult,
} from './infrastructure/supabase';

// ================================================================================
// TOOL FIXERS - THREE-TIER EXECUTION SYSTEM
// ================================================================================

// Tool Fixers - Tier 1, 2, 3 Executors and Orchestrator
export {
  // Base classes and types
  ToolExecutorBase,
  ToolExecutionResult,
  ToolExecutionOptions,
  ToolConfig,
  // Tier 1 - Native tool --fix commands
  createTier1Executor,
  getTier1ToolNames,
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
  // Tier 2 - Dedicated fixer tools
  createTier2Executor,
  getTier2ToolNames,
  SoraldExecutor,
  OpenRewriteExecutor,
  AutoflakeExecutor,
  PyUpgradeExecutor,
  IsortExecutor,
  BlackExecutor,
  ClangTidyExecutor,
  ClangFormatExecutor,
  DotnetFormatExecutor,
  // Tier 3 - AI-based fixing
  createTier3Executor,
  getTier3ToolName,
  AIFixerExecutor,
  type Tier3Issue,
  type Tier3ExecutionOptions,
  // Orchestrator
  FixOrchestrator,
  executeFixes as executeFixesWithOrchestrator,
  type FixIssue as OrchestratorFixIssue,
  type OrchestratorConfig,
  type OrchestratorResult,
  type ProgressUpdate as OrchestratorProgressUpdate,
} from './tool-fixers';

// ================================================================================
// CONVENIENCE FUNCTIONS
// ================================================================================

/**
 * Get fix tier for a single issue (1, 2, or 3)
 *
 * @example
 * getFixTier('no-unused-vars', 'eslint');  // 1 (native eslint --fix)
 * getFixTier('S2095', 'pmd');              // 2 (Sorald can fix)
 * getFixTier('complex-sql-injection', 'semgrep');  // 3 (needs AI)
 */
export function getFixTier(ruleId: string, tool: string): 1 | 2 | 3 {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { classifyIssue } = require('./issue-classifier');
  const classification = classifyIssue(ruleId, tool);
  return classification.fixTier;
}

/**
 * Check if an issue can be auto-fixed (Tier 1 or 2)
 *
 * @example
 * canAutoFix('indent', 'eslint');         // true (Tier 1)
 * canAutoFix('UnusedImports', 'pmd');     // true (Tier 2)
 * canAutoFix('sql-injection', 'semgrep'); // false (Tier 3, manual review)
 */
export function canAutoFix(ruleId: string, tool: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { classifyIssue } = require('./issue-classifier');
  const classification = classifyIssue(ruleId, tool);
  return classification.fixTier <= 2;
}

/**
 * Version information
 */
export const FIX_AGENT_VERSION = '2.1.0';

// All 45+ supported tools (see tool-database-schema.ts for full list)
export const SUPPORTED_TOOLS = [
  // JavaScript/TypeScript
  'eslint', 'typescript-eslint', 'prettier', 'biome', 'npm-audit', 'tsc',
  // Python
  'ruff', 'bandit', 'pylint', 'mypy', 'black', 'isort', 'autoflake', 'pyupgrade', 'safety', 'pip-audit',
  // Java
  'pmd', 'checkstyle', 'spotbugs', 'error-prone', 'sorald', 'openrewrite',
  // Go
  'golangci-lint', 'gosec', 'gofmt', 'goimports',
  // Rust
  'clippy', 'rustfmt', 'cargo-audit',
  // Ruby
  'rubocop', 'brakeman', 'bundler-audit',
  // PHP
  'phpcs', 'phpcbf', 'phpstan', 'psalm',
  // C#
  'dotnet-format', 'roslyn-analyzers',
  // C/C++
  'cppcheck', 'clang-tidy', 'clang-format',
  // Swift
  'swiftlint', 'swift-format',
  // Kotlin
  'detekt', 'ktlint',
  // Cross-language
  'semgrep', 'gitleaks', 'trivy', 'snyk', 'dependency-check',
];

// All 13 supported languages
export const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java',
  'go', 'rust', 'ruby', 'php', 'csharp',
  'c', 'cpp', 'swift', 'kotlin',
];

// ================================================================================
// TWO-TIER FIX SYSTEM (NEW - Confidence-Based Routing)
// ================================================================================

// AI-Fixer Agent - Handles Tier 2 issues (<60% confidence)
export {
  AIFixerAgent,
  getAIFixerAgent,
  processIssuesWithAIFixer,
  type AIFixerIssue,
  type AIFixRecommendation,
  type EnrichedIssue as AIEnrichedIssue,
  type AIFixerBatchResult,
} from './agents';

// Two-Tier Fix Pipeline - Orchestrates the complete fix flow
export {
  TwoTierFixPipeline,
  getTwoTierFixPipeline,
  processIssuesThroughPipeline,
  type SupportedLanguage as PipelineLanguage,
  type ValidatorIssue,
  type RoleAgentIssue,
  type PipelineResult,
  type PipelineConfig,
} from './pipelines';

// ================================================================================
// REPORT OUTPUT SERVICE (Dual Output: Files + URLs)
// ================================================================================

// Report Output Service - Generates dual output (files + URLs)
export {
  ReportOutputService,
  getReportOutputService,
  generateReportOutputs,
  type OutputFormat,
  type DualOutput,
  type ReportOutputConfig,
  type ReportOutputResult,
  type GitLabCodeQualityIssue,
} from './report-output';

// ================================================================================
// REPORT API ENDPOINTS (REST API for Report Access)
// ================================================================================

// API Endpoints - REST API for accessing analysis reports
export {
  ReportAPIService,
  getReportAPIService,
  expressHandlers,
  setupReportRoutes,
  type ReportMetadata,
  type OutputInfo,
  type APIResponse,
} from './api';

// ================================================================================
// SCAN-TIME FIX EXECUTOR (Fix During Scan Mode)
// ================================================================================

// Scan-Time Fix Executor - Applies fixes during analysis scan
export {
  ScanFixExecutor,
  executeScanFixes,
  executeScanFixesWithPatch,
  type ScanFixConfig,
  type ScanFixProgress,
  type ScanFixResult,
  type DetectedIssue,
} from './scan-fix-executor';
