/**
 * Python Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution!
 *
 * This orchestrator contains Python-specific logic:
 * - Ruff code quality checking (SESSION 51: Replaced Pylint - 10-100x faster)
 * - Bandit security vulnerability scanning
 * - mypy type checking
 * - pip-audit dependency vulnerability scanning (SESSION 51: Replaced Safety - more reliable)
 * - Semgrep security analysis
 *
 * All universal orchestration logic (branch management, parallel execution,
 * result aggregation) is inherited from BaseToolOrchestrator.
 *
 * Performance: 50-65% faster than sequential execution via parallel tool runs
 *
 * SESSION 51 CHANGES:
 * - Replaced Pylint with Ruff (10-100x faster, includes security rules)
 * - Replaced Safety with pip-audit (PyPA maintained, no auth required)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '../../utils/logger';

// Import base orchestrator
import { 
  BaseToolOrchestrator, 
  ToolResult, 
  RawIssue,
  OrchestrationOptions 
} from '../base-tool-orchestrator';

// Import existing Python parser
import { PythonToolParser, PythonIssue } from '../../parsers/python-tool-parser';

// Import universal analysis modes
import type { AnalysisMode } from '../../config/analysis-modes';
import { 
  UNIVERSAL_ANALYSIS_MODES, 
  ToolCategory
} from '../../config/analysis-modes';

const execAsync = promisify(exec);

// ============================================================
// PYTHON-SPECIFIC TYPES
// ============================================================

export interface PythonToolConfig {
  // SESSION 51: Ruff replaces Pylint (10-100x faster, includes security rules)
  ruff: {
    enabled: boolean;
    configFile?: string;
  };
  bandit: {
    enabled: boolean;
    configFile?: string;
  };
  mypy: {
    enabled: boolean;
    strict: boolean;
  };
  // SESSION 51: pip-audit replaces Safety (PyPA maintained, no auth required)
  pipAudit: {
    enabled: boolean;
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  docker: {
    mountPath: string;
    pythonVersion: string;
    memory: string;
  };
  // Legacy tools (kept for backward compatibility, disabled by default)
  pylint?: {
    enabled: boolean;
    rcfile?: string;
  };
  safety?: {
    enabled: boolean;
    level: string;
  };
}

export const DEFAULT_PYTHON_CONFIG: PythonToolConfig = {
  // SESSION 51: New default tools
  ruff: { enabled: true },
  bandit: { enabled: true },
  mypy: { enabled: true, strict: true },
  pipAudit: { enabled: true },
  semgrep: { enabled: true, config: 'auto' },
  docker: {
    mountPath: '/workspace',
    pythonVersion: '3.12',
    memory: '2g'
  },
  // Legacy tools disabled by default
  pylint: { enabled: false },
  safety: { enabled: false, level: 'moderate' }
};

// SESSION 51: Updated tool categories with new tools
const PYTHON_TOOL_CATEGORIES = {
  // New default tools (SESSION 51)
  ruff: ToolCategory.CODE_QUALITY,
  bandit: ToolCategory.SECURITY,
  mypy: ToolCategory.CODE_QUALITY,
  'pip-audit': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY,
  // Legacy tools (for backward compatibility)
  pylint: ToolCategory.CODE_QUALITY,
  safety: ToolCategory.DEPENDENCY_SCAN
};

function shouldPythonToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = PYTHON_TOOL_CATEGORIES[toolName as keyof typeof PYTHON_TOOL_CATEGORIES];
  if (!category) return false;

  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];
  
  switch (category) {
    case ToolCategory.CODE_QUALITY:
      return modeConfig.toolCategories.codeQuality;
    case ToolCategory.SECURITY:
      return modeConfig.toolCategories.security;
    case ToolCategory.DEPENDENCY_SCAN:
      return modeConfig.toolCategories.dependencyScan;
    default:
      return false;
  }
}

// ============================================================
// PYTHON TOOL ORCHESTRATOR
// ============================================================

export class PythonToolOrchestrator extends BaseToolOrchestrator {
  private config: PythonToolConfig;
  private parser: PythonToolParser;

  constructor(
    config: Partial<PythonToolConfig> = {},
    dockerImage = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v4.1-arm'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_PYTHON_CONFIG, ...config };
    this.parser = new PythonToolParser();
  }

  protected getLanguageName(): string {
    return 'python';
  }

  /**
   * Get tools to run based on analysis mode (required by base)
   *
   * SESSION 34 OPTIMIZATION: userTier parameter for Semgrep skip logic
   * - BASIC tier: Run Semgrep here (Step 3), Lite Security Agent groups issues
   * - PRO tier: Skip Semgrep here, run scan+fix combined in Step 5.5
   *
   * SESSION 51: Updated to use Ruff and pip-audit by default
   * - Ruff replaces Pylint (10-100x faster)
   * - pip-audit replaces Safety (PyPA maintained, no auth required)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // SESSION 51: Ruff replaces Pylint (10-100x faster, includes security rules)
    if (this.config.ruff.enabled && shouldPythonToolRun('ruff', mode)) {
      tools.push('ruff');
    }
    // Legacy Pylint support (disabled by default)
    if (this.config.pylint?.enabled && shouldPythonToolRun('pylint', mode)) {
      tools.push('pylint');
    }

    if (this.config.bandit.enabled && shouldPythonToolRun('bandit', mode)) {
      tools.push('bandit');
    }

    if (this.config.mypy.enabled && shouldPythonToolRun('mypy', mode)) {
      tools.push('mypy');
    }

    // SESSION 51: pip-audit replaces Safety (PyPA maintained, no auth required)
    if (this.config.pipAudit.enabled && shouldPythonToolRun('pip-audit', mode)) {
      tools.push('pip-audit');
    }
    // Legacy Safety support (disabled by default)
    if (this.config.safety?.enabled && shouldPythonToolRun('safety', mode)) {
      tools.push('safety');
    }

    // Semgrep - Security analysis
    // SESSION 34 OPTIMIZATION:
    // - BASIC tier (default): Run Semgrep here (Step 3), skip Step 5.5
    // - PRO tier: Skip Semgrep here, run scan+fix combined in Step 5.5
    if (this.config.semgrep.enabled && shouldPythonToolRun('semgrep', mode)) {
      if (userTier !== 'pro') {
        tools.push('semgrep');
      }
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      // SESSION 51: Updated to include new tools
      'Security': ['bandit', 'semgrep', 'pip-audit', 'ruff'],  // Ruff has S* security rules
      'Code Quality': ['ruff', 'mypy', 'pylint'],  // Ruff is primary, pylint for legacy
      'Dependencies': ['pip-audit', 'safety']  // pip-audit is primary, safety for legacy
    };
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing Python tool: ${toolName}`);

    // UNIVERSAL TOOLS: Route to shared runners
    // This ensures same Semgrep behavior across Java, TypeScript, Python, etc.
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // LANGUAGE-SPECIFIC TOOLS: Use Python-specific implementations
    // SESSION 51: Added ruff and pip-audit
    switch (toolName) {
      case 'ruff':
        return this.runRuff(repoPath, branch, options.changedFiles);
      case 'pylint':
        return this.runPylint(repoPath, branch, options.changedFiles);
      case 'bandit':
        return this.runBandit(repoPath, branch);
      case 'mypy':
        return this.runMypy(repoPath, branch);
      case 'pip-audit':
        return this.runPipAudit(repoPath, branch);
      case 'safety':
        return this.runSafety(repoPath, branch);
      default:
        throw new Error(`Unknown Python tool: ${toolName}`);
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  private async runPylint(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Pylint on ${branch} branch...`);
      const result = await this.parser.runPylint(repoPath, changedFiles);
      const rawIssues: RawIssue[] = result.issues.map(this.convertPythonIssueToRaw.bind(this));
      const duration = Date.now() - startTime;

      logger.info(`✅ Pylint completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'pylint',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Pylint failed: ${error.message}`);
      return this.createFailedResult('pylint', error.message);
    }
  }

  private async runBandit(repoPath: string, branch: 'base' | 'pr'): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Bandit on ${branch} branch...`);
      const result = await this.parser.runBandit(repoPath);
      const rawIssues: RawIssue[] = result.issues.map(this.convertPythonIssueToRaw.bind(this));
      const duration = Date.now() - startTime;

      logger.info(`✅ Bandit completed: ${rawIssues.length} security issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'bandit',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Bandit failed: ${error.message}`);
      return this.createFailedResult('bandit', error.message);
    }
  }

  private async runMypy(repoPath: string, branch: 'base' | 'pr'): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running mypy on ${branch} branch...`);
      const result = await this.parser.runMypy(repoPath);
      const rawIssues: RawIssue[] = result.issues.map(this.convertPythonIssueToRaw.bind(this));
      const duration = Date.now() - startTime;

      logger.info(`✅ mypy completed: ${rawIssues.length} type errors in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'mypy',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ mypy failed: ${error.message}`);
      return this.createFailedResult('mypy', error.message);
    }
  }

  private async runSafety(repoPath: string, branch: 'base' | 'pr'): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Safety on ${branch} branch...`);
      const result = await this.parser.runSafety(repoPath);
      const rawIssues: RawIssue[] = result.issues.map(this.convertPythonIssueToRaw.bind(this));
      const duration = Date.now() - startTime;

      logger.info(`✅ Safety completed: ${rawIssues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'safety',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Safety failed: ${error.message}`);
      return this.createFailedResult('safety', error.message);
    }
  }

  // ============================================================
  // SESSION 51: NEW TOOLS - Ruff and pip-audit
  // ============================================================

  /**
   * Run Ruff linter (SESSION 51: Replaces Pylint)
   * 10-100x faster than Pylint, includes security rules (flake8-bandit)
   */
  private async runRuff(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Ruff on ${branch} branch...`);
      const result = await this.parser.runRuff(repoPath, changedFiles);
      const rawIssues: RawIssue[] = result.issues.map(this.convertPythonIssueToRaw.bind(this));
      const duration = Date.now() - startTime;

      logger.info(`✅ Ruff completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'ruff',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Ruff failed: ${error.message}`);
      return this.createFailedResult('ruff', error.message);
    }
  }

  /**
   * Run pip-audit dependency scanner (SESSION 51: Replaces Safety)
   * PyPA maintained, uses official PyPI vulnerability database
   */
  private async runPipAudit(repoPath: string, branch: 'base' | 'pr'): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running pip-audit on ${branch} branch...`);
      const result = await this.parser.runPipAudit(repoPath);
      const rawIssues: RawIssue[] = result.issues.map(this.convertPythonIssueToRaw.bind(this));
      const duration = Date.now() - startTime;

      logger.info(`✅ pip-audit completed: ${rawIssues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'pip-audit',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ pip-audit failed: ${error.message}`);
      return this.createFailedResult('pip-audit', error.message);
    }
  }

  // runSemgrep() removed - Semgrep now handled by base class executeUniversalTool()
  // See executeTool() method which routes universal tools to the base class

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private convertPythonIssueToRaw(pyIssue: PythonIssue): RawIssue {
    return {
      tool: pyIssue.tool,
      file: pyIssue.file,
      line: pyIssue.line,
      column: pyIssue.column,
      severity: pyIssue.severity,
      message: pyIssue.message,
      rule: pyIssue.category || pyIssue.code || pyIssue.symbol || 'unknown',
      category: this.mapPythonTypeToCategory(pyIssue.type)
    };
  }

  private mapPythonTypeToCategory(type: string): string {
    const mapping: Record<string, string> = {
      'security': 'security',
      'performance': 'performance',
      'quality': 'code-quality',
      'bug': 'bug',
      'style': 'style',
      'type-error': 'type-error'
    };
    return mapping[type] || 'code-quality';
  }
}

export default PythonToolOrchestrator;

