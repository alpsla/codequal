/**
 * Base Tool Orchestrator - Universal Foundation for All Languages
 * 
 * Abstract base class that provides common orchestration patterns for ANY programming language.
 * Language-specific orchestrators (Java, Python, Go, etc.) extend this class.
 * 
 * Common Patterns:
 * - Branch management and validation
 * - Parallel tool execution pipeline
 * - Result aggregation and error handling
 * - Analysis mode integration
 * - Docker container management
 * - Metadata calculation
 * 
 * Each language only needs to implement:
 * - Tool-specific execution methods
 * - Language-specific configuration
 * - Tool result parsing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';
import type { AnalysisMode } from '../config/analysis-modes';
import { UNIVERSAL_ANALYSIS_MODES } from '../config/analysis-modes';
import { isUniversalTool } from './universal';
import { UniversalSemgrepRunner } from './universal/semgrep-runner';
import { UniversalDependencyCheckRunner } from './universal/dependency-check-runner';
import { runCodeQL, CodeQLConfig } from './universal/codeql-runner';
import { Issue } from '../analyzers/v9-types';

const execAsync = promisify(exec);

// ============================================================
// UNIVERSAL TYPES (Language-Agnostic)
// ============================================================

/**
 * Tool execution result - same structure for all languages
 */
export interface ToolResult {
  tool: string;
  success: boolean;
  duration: number;
  issues: RawIssue[];
  rawOutput?: string;
  error?: string;
  metadata: {
    filesScanned: number;
    issuesFound: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    skipped?: boolean;
    skipReason?: string;
  };
}

/**
 * Raw issue from any tool - universal structure
 */
export interface RawIssue {
  tool: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  rule: string;
  category?: string;
  cwe?: string;
  autoFixable?: boolean;
}

/**
 * Tool performance metrics for reporting
 */
export interface ToolPerformanceMetrics {
  tool: string;
  filesScanned: number;
  issuesFound: number;
  duration: number;
}

/**
 * Agent performance metrics for reporting
 */
export interface AgentPerformanceMetrics {
  name: string;
  filesAnalyzed: number;
  issuesFound: number;
  duration: number;
  cost: number;
}

/**
 * Final orchestration result - same for all languages
 */
export interface OrchestrationResult {
  success: boolean;
  duration: number;
  toolResults: ToolResult[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    blockingIssues: number;
    toolsExecuted: number;
    toolsFailed: number;
  };
  // Performance metrics for metadata sections (BUG #8, #9, #10)
  toolPerformance: ToolPerformanceMetrics[];
  agentPerformance: AgentPerformanceMetrics[];
}

/**
 * Universal orchestration options
 */
export interface OrchestrationOptions {
  includeAllSeverities?: boolean;
  analysisMode?: AnalysisMode;
  changedFiles?: string[];
  semgrepJobs?: number;  // Override Semgrep --jobs flag (default: 2, can be 4 for full CPU usage)
  /**
   * SESSION 34 OPTIMIZATION: User subscription tier
   *
   * BASIC tier: Run Semgrep in Step 3, skip Step 5.5 (use cached data + AI for descriptions)
   * PRO tier: Skip Semgrep in Step 3, run scan+fix combined in Step 5.5
   */
  userTier?: 'basic' | 'pro';
}

// ============================================================
// BASE ORCHESTRATOR ABSTRACT CLASS
// ============================================================

/**
 * Abstract base class for all language-specific orchestrators
 * 
 * Provides common functionality:
 * - Branch management
 * - Parallel execution
 * - Result aggregation
 * - Error handling
 * - Analysis mode support
 * 
 * Language-specific orchestrators override:
 * - getLanguageName(): string
 * - getToolsToRun(): string[]
 * - executeTool(toolName): ToolResult
 */
export abstract class BaseToolOrchestrator {
  protected dockerImage: string;
  protected workspaceDir: string;

  constructor(dockerImage: string, workspaceDir = '/workspace') {
    this.dockerImage = dockerImage;
    this.workspaceDir = workspaceDir;
  }

  // ============================================================
  // ABSTRACT METHODS (Must be implemented by each language)
  // ============================================================

  /**
   * Get the language name (e.g., 'java', 'python', 'go')
   */
  protected abstract getLanguageName(): string;

  /**
   * Get list of tools to run based on analysis mode
   * Language-specific orchestrators use this to map mode to their tools
   *
   * SESSION 34 OPTIMIZATION: userTier parameter for Semgrep skip logic
   * - BASIC tier: Run Semgrep here (Step 3), skip in Step 5.5
   * - PRO tier: Skip Semgrep here, run scan+fix combined in Step 5.5
   */
  protected abstract getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[];

  /**
   * Execute a specific tool and return results
   * Each language implements their tool execution logic
   * 
   * NOTE: Language-specific orchestrators should check isUniversalTool()
   * and route to executeUniversalTool() for universal tools (semgrep, dependency-check)
   */
  protected abstract executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult>;

  // ============================================================
  // PERFORMANCE METRICS (Can be overridden by language-specific orchestrators)
  // ============================================================

  /**
   * Get agent to tool mapping for performance tracking
   * Language-specific orchestrators can override to provide custom mappings
   *
   * Default mapping covers common categories:
   * - Security: semgrep, dependency-check, snyk
   * - Code Quality: pmd, eslint, pylint, checkstyle
   * - Performance: performance-analyzer
   * - Architecture: arch-unit, dependency-analyzer
   * - Dependencies: dependency-check, npm-audit, pip-audit
   */
  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'dependency-check', 'snyk', 'bandit', 'gosec'],
      'Code Quality': ['pmd', 'checkstyle', 'eslint', 'pylint', 'golangci-lint', 'spotbugs'],
      'Performance': ['performance-analyzer'],
      'Architecture': ['arch-unit', 'dependency-analyzer'],
      'Dependencies': ['dependency-check', 'npm-audit', 'pip-audit']
    };
  }

  /**
   * Calculate performance metrics from tool results
   * Extracts both tool-level and agent-level performance data
   */
  protected calculatePerformanceMetrics(toolResults: ToolResult[]): {
    toolPerformance: ToolPerformanceMetrics[];
    agentPerformance: AgentPerformanceMetrics[];
  } {
    // Extract tool performance (straightforward mapping)
    const toolPerformance: ToolPerformanceMetrics[] = toolResults.map(result => ({
      tool: result.tool,
      filesScanned: result.metadata.filesScanned,
      issuesFound: result.metadata.issuesFound,
      duration: result.duration
    }));

    // Calculate agent performance (group tools by agent category)
    const agentCategories = this.getAgentToolCategories();
    const agentPerformance: AgentPerformanceMetrics[] = [];

    for (const [agentName, toolNames] of Object.entries(agentCategories)) {
      // Find all tools that belong to this agent
      const agentTools = toolResults.filter(r => toolNames.includes(r.tool));

      // Skip agents that didn't run any tools
      if (agentTools.length === 0) {
        continue;
      }

      // Aggregate metrics
      const totalIssues = agentTools.reduce((sum, t) => sum + t.metadata.issuesFound, 0);
      const totalDuration = agentTools.reduce((sum, t) => sum + t.duration, 0);
      const filesScanned = agentTools.reduce((sum, t) => sum + t.metadata.filesScanned, 0);

      agentPerformance.push({
        name: `${agentName} Agent`,
        filesAnalyzed: filesScanned,
        issuesFound: totalIssues,
        duration: totalDuration,
        cost: 0.00  // Cost will be calculated by ModelTokenTracker during AI analysis
      });
    }

    return { toolPerformance, agentPerformance };
  }

  // ============================================================
  // UNIVERSAL METHODS (Inherited by all languages)
  // ============================================================

  /**
   * Main orchestration method - called by all languages
   * 
   * Handles:
   * - Branch checkout
   * - Tool execution (parallel/sequential)
   * - Result aggregation
   * - Error handling
   */
  async orchestrate(
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const analysisMode = options.analysisMode || 'standard';
    const modeConfig = UNIVERSAL_ANALYSIS_MODES[analysisMode];

    logger.info(`🎯 Starting ${this.getLanguageName().toUpperCase()} Tool Orchestration (${branch} branch)`);
    logger.info(`📁 Repository: ${repoPath}`);
    logger.info(`📊 Analysis Mode: ${modeConfig.description} (${modeConfig.estimatedTime})`);

    try {
      // Step 1: Branch Management (Universal)
      await this.ensureCorrectBranch(repoPath, branch);

      // Step 2: Get tools to run (Language-specific)
      // SESSION 34: Pass userTier for Semgrep skip logic (PRO skips Semgrep here)
      const toolsToRun = this.getToolsToRun(analysisMode, branch, options.userTier);
      logger.info(`🔧 Tools to run: ${toolsToRun.join(', ')} (tier: ${options.userTier || 'basic'})`);

      // Step 3: Execute tools with CPU-aware strategy
      // Strategy: Run Semgrep (bottleneck) with all 4 CPUs first, then other tools in parallel
      const rawToolResults = await this.executeToolsWithCPUPriority(
        toolsToRun,
        repoPath,
        branch,
        options
      );

      // SESSION 25 FIX: Filter invalid issues from ALL tool results (universal for all languages)
      const toolResults = rawToolResults.map(result => ({
        ...result,
        issues: result.issues.filter(issue => {
          // Filter out issues with unknown file
          if (issue.file === 'unknown' || !issue.file) {
            return false;
          }
          // Filter out suspicious line 1 issues with very short filenames
          if (issue.line === 1 && issue.file.length < 5) {
            return false;
          }
          return true;
        })
      }));

      // Count filtered issues
      const totalRaw = rawToolResults.reduce((sum, r) => sum + r.issues.length, 0);
      const totalValid = toolResults.reduce((sum, r) => sum + r.issues.length, 0);
      if (totalRaw !== totalValid) {
        logger.info(`📊 Universal filter removed ${totalRaw - totalValid} invalid issues across all tools`);
      }

      // Step 4: Aggregate results (Universal)
      const summary = this.aggregateResults(toolResults);
      const duration = Date.now() - startTime;

      // Step 5: Calculate performance metrics (BUG #8, #9, #10)
      const { toolPerformance, agentPerformance } = this.calculatePerformanceMetrics(toolResults);

      logger.info(`✅ Orchestration complete in ${(duration / 1000).toFixed(1)}s`);
      logger.info(`📊 Total issues: ${summary.totalIssues} (${summary.blockingIssues} blocking)`);

      return {
        success: true,
        duration,
        toolResults,
        summary,
        toolPerformance,
        agentPerformance
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Orchestration failed: ${error.message}`);

      return {
        success: false,
        duration,
        toolResults: [],
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          blockingIssues: 0,
          toolsExecuted: 0,
          toolsFailed: 0
        },
        toolPerformance: [],
        agentPerformance: []
      };
    }
  }

  // ============================================================
  // BRANCH MANAGEMENT (Universal for all languages)
  // ============================================================

  /**
   * Ensure repository is on the correct branch
   * Universal pattern - works for any language
   */
  protected async ensureCorrectBranch(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<void> {
    // Get current branch
    const { stdout: currentBranch } = await execAsync(
      `git -C ${repoPath} branch --show-current`
    );
    const currentBranchName = currentBranch.trim();

    logger.info(`📍 Current branch: ${currentBranchName}`);

    // Determine target branch
    let targetBranch: string;
    if (branch === 'base') {
      // Detect default branch (main, master, trunk, etc.)
      const { detectDefaultBranch } = await import('../utils/git-utils');
      targetBranch = detectDefaultBranch(repoPath);
      logger.info(`🔍 Detected default branch: ${targetBranch}`);
    } else {
      // For PR, validate we're not on default branch
      const { detectDefaultBranch } = await import('../utils/git-utils');
      const defaultBranch = detectDefaultBranch(repoPath);

      if (currentBranchName === defaultBranch) {
        throw new Error(
          `Branch parameter is 'pr' but repository is on ${currentBranchName} (default branch). ` +
          `Please checkout PR branch before calling orchestrate()`
        );
      }
      targetBranch = currentBranchName;
    }

    // Checkout if needed
    if (currentBranchName !== targetBranch) {
      logger.info(`🔄 Checking out ${targetBranch}...`);
      await execAsync(`git -C ${repoPath} checkout ${targetBranch}`);
      logger.info(`✅ Checked out ${targetBranch}`);
    } else {
      logger.info(`✅ Already on ${targetBranch}`);
    }
  }

  // ============================================================
  // UNIVERSAL TOOLS (Semgrep, Dependency-Check)
  // ============================================================

  /**
   * Check if a tool should use universal runners
   * 
   * Universal tools work across multiple languages:
   * - Semgrep: Security scanning for ALL languages
   * - Dependency-Check: CVE scanning for 7 languages (with PostgreSQL backend)
   */
  protected isUniversalTool(toolName: string): boolean {
    return isUniversalTool(toolName);
  }

  /**
   * Map our internal language names to CodeQL language identifiers
   * CodeQL uses specific language names that may differ from ours
   */
  protected mapToCodeQLLanguage(language: string): string {
    const mapping: Record<string, string> = {
      'typescript': 'javascript',  // CodeQL uses 'javascript' for both TS and JS
      'javascript': 'javascript',
      'java': 'java',
      'python': 'python',
      'go': 'go',
      'csharp': 'csharp',
      'cpp': 'cpp',
      'c': 'cpp',
      'ruby': 'ruby',
      'swift': 'swift'
    };
    return mapping[language.toLowerCase()] || language.toLowerCase();
  }

  /**
   * Execute a universal tool (Semgrep, Dependency-Check, or CodeQL)
   *
   * These tools use shared runners that work across all languages.
   * Language-specific orchestrators should call this method for universal tools.
   *
   * @param toolName - 'semgrep', 'dependency-check', or 'codeql'
   * @param repoPath - Path to repository
   * @param branch - 'base' or 'pr'
   * @param options - Orchestration options
   *
   * Note: CodeQL is PRO tier only and requires explicit opt-in.
   * It adds significant time (5-30 min) but provides deep semantic analysis.
   */
  protected async executeUniversalTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const language = this.getLanguageName();

    try {
      logger.info(`📦 Executing Universal tool: ${toolName}`);

      let issues: Issue[] = [];

      // Route to appropriate universal runner
      switch (toolName.toLowerCase()) {
        case 'semgrep': {
          const semgrepJobs = options.semgrepJobs || 2;  // Default: 2, can be 4 for full CPU usage
          const semgrepRunner = new UniversalSemgrepRunner(repoPath, language, semgrepJobs);
          issues = await semgrepRunner.execute();
          break;
        }

        case 'dependency-check': {
          const depCheckRunner = new UniversalDependencyCheckRunner(repoPath, language);
          issues = await depCheckRunner.execute();
          break;
        }

        case 'codeql': {
          // CodeQL deep semantic analysis (PRO tier, opt-in only)
          // Uses Docker on ARM64 with x86_64 emulation via QEMU
          logger.info('🔬 Running CodeQL deep security analysis (this may take 5-30 minutes)...');

          // Get CodeQL-compatible language name
          const codeqlLanguage = this.mapToCodeQLLanguage(language);

          // Run CodeQL with default config (security query suite)
          // runCodeQL returns Issue[] directly from v9-types
          issues = await runCodeQL(repoPath, codeqlLanguage, {
            querySuite: 'security'  // Default to faster suite
          });

          logger.info(`🔬 CodeQL completed: ${issues.length} deep security issues found`);
          break;
        }

        default:
          throw new Error(`Unknown universal tool: ${toolName}`);
      }

      // Convert V9 Issue[] to RawIssue[] for BaseToolOrchestrator
      const rawIssues: RawIssue[] = issues.map(issue => ({
        tool: toolName,
        file: issue.file,
        line: issue.line,
        column: undefined, // v9-types Issue doesn't have column
        severity: issue.severity,
        message: issue.title || issue.description, // v9-types uses 'title' and 'description'
        rule: issue.rule || toolName, // SESSION 19 FIX: Use specific rule ID from issue
        category: issue.category,
        cwe: issue.cwe || issue.impact, // SESSION 19 FIX: Use cwe field if available
        autoFixable: false // Universal tools don't provide auto-fixes
      }));

      const duration = Date.now() - startTime;
      const metadata = this.calculateMetadata(rawIssues);

      logger.info(`✅ ${toolName} completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: toolName,
        success: true,
        duration,
        issues: rawIssues,
        metadata
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Universal tool ${toolName} failed: ${error.message}`);

      return this.createFailedResult(toolName, error.message);
    }
  }

  // ============================================================
  // PERFORMANCE & ARCHITECTURE TOOLS (Universal)
  // ============================================================

  /**
   * Execute performance analysis tools
   * 
   * Runs Lighthouse, Bundle Analyzer, and ESLint Performance plugin
   * Uses existing PerformanceAgent for AI enrichment
   */
  protected async executePerformanceTools(
    repoPath: string,
    branch: 'base' | 'pr',
    files: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🚀 Executing Performance tools...`);

      // Import runners and agent
      const { PerformanceRunner } = await import('./universal/performance-runner');
      const { PerformanceAgent } = await import('../agents/specialized-agents');

      const runner = new PerformanceRunner();
      const agent = new PerformanceAgent();
      const allIssues: any[] = [];

      // Run all performance tools
      const lighthouseIssues = await runner.runLighthouse(repoPath);
      const bundleIssues = await runner.runBundleAnalyzer(repoPath);
      const eslintPerfIssues = await runner.runESLintPerf(repoPath, files);

      allIssues.push(...lighthouseIssues, ...bundleIssues, ...eslintPerfIssues);

      // Convert to RawIssue format
      const rawIssues: RawIssue[] = allIssues.map(issue => ({
        tool: issue.tool,
        file: issue.file || 'performance-metrics',
        line: issue.line || 1,
        severity: issue.severity,
        message: issue.message,
        rule: issue.rule,
        category: 'performance',
        autoFixable: false
      }));

      const duration = Date.now() - startTime;
      const metadata = this.calculateMetadata(rawIssues);

      logger.info(`✅ Performance tools completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'performance',
        success: true,
        duration,
        issues: rawIssues,
        metadata
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Performance tools failed: ${error.message}`);
      return this.createFailedResult('performance', error.message);
    }
  }

  /**
   * Execute architecture analysis tools
   * 
   * Runs Madge, Dependency Cruiser, and ts-unused-exports
   * Uses existing ArchitectureAgent for AI enrichment
   */
  protected async executeArchitectureTools(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🏗️  Executing Architecture tools...`);

      // Import runners and agent
      const { ArchitectureRunner } = await import('./universal/architecture-runner');
      const { ArchitectureAgent } = await import('../agents/specialized-agents');

      const runner = new ArchitectureRunner();
      const agent = new ArchitectureAgent();
      const allIssues: any[] = [];

      // Run all architecture tools
      const madgeIssues = await runner.runMadge(repoPath);
      const depCruiserIssues = await runner.runDependencyCruiser(repoPath);
      const unusedExportsIssues = await runner.runUnusedExports(repoPath);

      allIssues.push(...madgeIssues, ...depCruiserIssues, ...unusedExportsIssues);

      // Convert to RawIssue format
      const rawIssues: RawIssue[] = allIssues.map(issue => ({
        tool: issue.tool,
        file: issue.file || 'architecture-analysis',
        line: issue.line || 1,
        severity: issue.severity,
        message: issue.message,
        rule: issue.rule,
        category: 'architecture',
        autoFixable: false
      }));

      const duration = Date.now() - startTime;
      const metadata = this.calculateMetadata(rawIssues);

      logger.info(`✅ Architecture tools completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'architecture',
        success: true,
        duration,
        issues: rawIssues,
        metadata
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Architecture tools failed: ${error.message}`);
      return this.createFailedResult('architecture', error.message);
    }
  }

  // ============================================================
  // PARALLEL EXECUTION (Universal pattern)
  // ============================================================

  /**
   * Execute multiple tools in parallel
   * Universal pattern - works for any language
   */
  /**
   * Execute tools with CPU-aware priority strategy
   * 
   * Strategy:
   * 1. If Semgrep is present (bottleneck), run it first with all 4 CPUs (--jobs=4)
   * 2. Then run other tools in parallel (max 4 concurrent)
   * 
   * This maximizes Semgrep performance while still parallelizing other tools.
   */
  protected async executeToolsWithCPUPriority(
    tools: string[],
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult[]> {
    const semgrepIndex = tools.indexOf('semgrep');
    const hasSemgrep = semgrepIndex !== -1;

    // PERF-OPT: Identify I/O-bound tools (network/disk, not CPU)
    // These can run alongside CPU-intensive tools without contention
    const IO_BOUND_TOOLS = ['pip-audit', 'safety', 'npm-audit', 'yarn-audit', 'bundler-audit', 'dependency-check'];
    const ioTools = tools.filter(t => IO_BOUND_TOOLS.includes(t));
    const cpuTools = tools.filter(t => !IO_BOUND_TOOLS.includes(t) && t !== 'semgrep');

    // Strategy: Run Semgrep (CPU-heavy) + I/O tools in parallel, then CPU tools
    if (hasSemgrep && tools.length > 1) {
      logger.info(`\n🚀 CPU-Aware Strategy: Optimized 3-phase execution...`);
      logger.info(`   📊 I/O-bound tools (can run with Semgrep): ${ioTools.length > 0 ? ioTools.join(', ') : 'none'}`);
      logger.info(`   📊 CPU-bound tools (run after Semgrep): ${cpuTools.length > 0 ? cpuTools.join(', ') : 'none'}`);

      const allResults: ToolResult[] = [];

      // Phase 1: Run Semgrep (4 CPUs) + I/O-bound tools in parallel
      // I/O tools don't compete for CPU, so they can run alongside Semgrep
      logger.info(`   📊 Phase 1: Running Semgrep (--jobs=4) ${ioTools.length > 0 ? `+ ${ioTools.length} I/O tools` : ''} in parallel...`);

      const phase1Promises: Promise<ToolResult>[] = [
        this.executeTool('semgrep', repoPath, branch, { ...options, semgrepJobs: 4 })
      ];

      // Add I/O-bound tools to run alongside Semgrep
      for (const ioTool of ioTools) {
        phase1Promises.push(this.executeTool(ioTool, repoPath, branch, options));
      }

      const phase1Results = await Promise.all(phase1Promises);
      allResults.push(...phase1Results);

      // Phase 2: Run remaining CPU-bound tools in parallel (after Semgrep releases CPUs)
      if (cpuTools.length > 0) {
        logger.info(`   📊 Phase 2: Running ${cpuTools.length} CPU-bound tools in parallel...`);
        const phase2Results = await this.executeToolsInParallel(cpuTools, repoPath, branch, options);
        allResults.push(...phase2Results);
      }

      // Ensure results are in original tool order
      const orderedResults = tools.map(toolName =>
        allResults.find(r => r.tool === toolName) || this.createFailedResult(toolName, 'Tool execution not found')
      );

      const successful = orderedResults.filter(r => r.success).length;
      const failed = orderedResults.filter(r => !r.success).length;
      logger.info(`✅ All tools complete: ${successful} succeeded, ${failed} failed`);

      return orderedResults;
    }

    // Fallback: No Semgrep or only Semgrep - use standard parallel execution
    return this.executeToolsInParallel(tools, repoPath, branch, options);
  }

  /**
   * Execute tools in parallel with CPU-aware concurrency limiting
   * 
   * Uses 4 CPU cores optimally:
   * - Runs up to 4 tools simultaneously
   * - For languages with >4 tools (e.g., Python with 5), batches them
   * - Automatically starts next tool when one completes
   * 
   * This ensures optimal CPU utilization without oversubscription.
   */
  protected async executeToolsInParallel(
    tools: string[],
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult[]> {
    const MAX_CONCURRENT_TOOLS = 4; // Match Oracle A1.Flex 4 OCPUs
    logger.info(`\n🚀 Executing ${tools.length} tools in parallel (max ${MAX_CONCURRENT_TOOLS} concurrent)...`);

    const results: ToolResult[] = [];
    const executing: Set<Promise<void>> = new Set();
    const toolQueue = [...tools];

    // Process tools with concurrency limit
    while (toolQueue.length > 0 || executing.size > 0) {
      // Start new executions up to concurrency limit
      while (executing.size < MAX_CONCURRENT_TOOLS && toolQueue.length > 0) {
        const toolName = toolQueue.shift()!;

        const executionPromise = this.executeTool(toolName, repoPath, branch, options)
          .then(result => {
            results.push(result);
            executing.delete(executionPromise);
          })
          .catch(error => {
            logger.error(`❌ Tool ${toolName} failed: ${error.message}`);
            const failedResult = this.createFailedResult(toolName, error.message);
            results.push(failedResult);
            executing.delete(executionPromise);
          });

        executing.add(executionPromise);
      }

      // Wait for at least one tool to complete before starting more
      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }

    // Ensure results are in the same order as input tools
    const orderedResults = tools.map(toolName =>
      results.find(r => r.tool === toolName) || this.createFailedResult(toolName, 'Tool execution not found')
    );

    // Log summary
    const successful = orderedResults.filter(r => r.success).length;
    const failed = orderedResults.filter(r => !r.success).length;
    logger.info(`✅ Tools complete: ${successful} succeeded, ${failed} failed`);

    return orderedResults;
  }

  // ============================================================
  // RESULT AGGREGATION (Universal)
  // ============================================================

  /**
   * Calculate metadata for a tool result
   * Universal pattern - same for all languages
   */
  protected calculateMetadata(issues: RawIssue[]) {
    const severity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    return {
      filesScanned: new Set(issues.map(i => i.file)).size,
      issuesFound: issues.length,
      severity
    };
  }

  /**
   * Aggregate results from all tools
   * Universal pattern - same for all languages
   * SESSION 25: Issues are already filtered in orchestrate() method
   */
  protected aggregateResults(results: ToolResult[]) {
    const allIssues = results.flatMap(r => r.issues);

    return {
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
      highIssues: allIssues.filter(i => i.severity === 'high').length,
      mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
      lowIssues: allIssues.filter(i => i.severity === 'low').length,
      blockingIssues: allIssues.filter(i =>
        i.severity === 'critical' || i.severity === 'high'
      ).length,
      toolsExecuted: results.filter(r => r.success).length,
      toolsFailed: results.filter(r => !r.success).length
    };
  }

  /**
   * Create a failed result for error handling
   */
  protected createFailedResult(toolName: string, errorMessage: string): ToolResult {
    return {
      tool: toolName,
      success: false,
      duration: 0,
      issues: [],
      error: errorMessage,
      metadata: {
        filesScanned: 0,
        issuesFound: 0,
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
        skipped: true,
        skipReason: `Failed: ${errorMessage}`
      }
    };
  }
}

