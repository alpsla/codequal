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
}

/**
 * Universal orchestration options
 */
export interface OrchestrationOptions {
  includeAllSeverities?: boolean;
  analysisMode?: AnalysisMode;
  changedFiles?: string[];
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
   */
  protected abstract getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr'
  ): string[];

  /**
   * Execute a specific tool and return results
   * Each language implements their tool execution logic
   */
  protected abstract executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult>;

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
      const toolsToRun = this.getToolsToRun(analysisMode, branch);
      logger.info(`🔧 Tools to run: ${toolsToRun.join(', ')}`);

      // Step 3: Execute tools in parallel (Universal pattern)
      const toolResults = await this.executeToolsInParallel(
        toolsToRun,
        repoPath,
        branch,
        options
      );

      // Step 4: Aggregate results (Universal)
      const summary = this.aggregateResults(toolResults);
      const duration = Date.now() - startTime;

      logger.info(`✅ Orchestration complete in ${(duration / 1000).toFixed(1)}s`);
      logger.info(`📊 Total issues: ${summary.totalIssues} (${summary.blockingIssues} blocking)`);

      return {
        success: true,
        duration,
        toolResults,
        summary
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
        }
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
  // PARALLEL EXECUTION (Universal pattern)
  // ============================================================

  /**
   * Execute multiple tools in parallel
   * Universal pattern - works for any language
   */
  protected async executeToolsInParallel(
    tools: string[],
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult[]> {
    logger.info(`\n🚀 Executing ${tools.length} tools in parallel...`);

    const promises = tools.map(toolName =>
      this.executeTool(toolName, repoPath, branch, options).catch(error => {
        logger.error(`❌ Tool ${toolName} failed: ${error.message}`);
        return this.createFailedResult(toolName, error.message);
      })
    );

    const results = await Promise.all(promises);

    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    logger.info(`✅ Tools complete: ${successful} succeeded, ${failed} failed`);

    return results;
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

