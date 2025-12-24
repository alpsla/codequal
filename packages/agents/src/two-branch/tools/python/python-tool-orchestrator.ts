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

// Import parser validation wrapper (Session 57)
import {
  ParserValidationWrapper,
  createParserValidationWrapper
} from '../../parsers/parser-validation-wrapper';

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
  // SESSION 57 Part 4: pydeps for architecture/dependency analysis
  pydeps: {
    enabled: boolean;
    maxBacon?: number;  // Limit dependency hops (default: no limit)
  };
  // SESSION 57 Part 5: import-linter for architecture layer enforcement
  importLinter: {
    enabled: boolean;
    configFile?: string;  // Custom .importlinter file path
  };
  // SESSION 58: Performance static analysis
  performance: {
    enabled: boolean;
    complexityThreshold?: number;  // Default: 10
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
  // SESSION 57 Part 4: pydeps for architecture analysis (thorough/complete modes)
  pydeps: { enabled: true },
  // SESSION 57 Part 5: import-linter for architecture layer enforcement
  importLinter: { enabled: true },
  // SESSION 58: Performance static analysis (thorough/complete modes)
  performance: { enabled: true, complexityThreshold: 10 },
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
// SESSION 57 Part 4: Added pydeps for architecture analysis
// SESSION 57 Part 5: Added import-linter for layer enforcement
// SESSION 58: Added performance static analysis
const PYTHON_TOOL_CATEGORIES = {
  // New default tools (SESSION 51)
  ruff: ToolCategory.CODE_QUALITY,
  bandit: ToolCategory.SECURITY,
  mypy: ToolCategory.CODE_QUALITY,
  'pip-audit': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY,
  // Architecture tools (SESSION 57 Part 4 & 5)
  pydeps: ToolCategory.ADVANCED,  // Circular dependency detection
  'import-linter': ToolCategory.ADVANCED,  // Layer/contract enforcement
  // Performance tools (SESSION 58 - static analysis only)
  performance: ToolCategory.ADVANCED,  // Ruff PERF rules, Radon complexity, memory patterns
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
    // SESSION 57 Part 4: ADVANCED category for architecture tools (pydeps)
    // Only runs in 'complete' mode
    case ToolCategory.ADVANCED:
      return modeConfig.toolCategories.advanced;
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

  // Parser validation wrapper for shadow mode (Session 57)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<PythonToolConfig> = {},
    dockerImage = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v4.1-arm'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_PYTHON_CONFIG, ...config };
    this.parser = new PythonToolParser();

    // Initialize parser validation (Session 57 Part 2 - Migration Phase 2)
    // Now uses enhanced parser for verified tools
    this.parserValidator = createParserValidationWrapper({
      language: 'python',
      enabled: true,  // Always enabled for Phase 2 migration
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['semgrep', 'bandit', 'pylint', 'ruff', 'mypy', 'pip-audit', 'safety'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
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

    // SESSION 57 Part 4: pydeps for architecture/dependency analysis
    // Only runs in 'complete' mode (via ADVANCED category check)
    if (this.config.pydeps.enabled && shouldPythonToolRun('pydeps', mode)) {
      tools.push('pydeps');
    }

    // SESSION 57 Part 5: import-linter for architecture layer enforcement
    // Only runs in 'complete' mode (via ADVANCED category check)
    if (this.config.importLinter.enabled && shouldPythonToolRun('import-linter', mode)) {
      tools.push('import-linter');
    }

    // SESSION 58: Performance static analysis
    // Only runs in 'complete' mode (via ADVANCED category check)
    if (this.config.performance.enabled && shouldPythonToolRun('performance', mode)) {
      tools.push('performance');
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      // SESSION 51: Updated to include new tools
      'Security': ['bandit', 'semgrep', 'pip-audit', 'ruff'],  // Ruff has S* security rules
      'Code Quality': ['ruff', 'mypy', 'pylint'],  // Ruff is primary, pylint for legacy
      'Dependencies': ['pip-audit', 'safety'],  // pip-audit is primary, safety for legacy
      // SESSION 57 Part 4 & 5: Architecture analysis tools
      'Architecture': ['pydeps', 'import-linter'],  // pydeps=cycles, import-linter=layers
      // SESSION 58: Performance static analysis
      'Performance': ['performance']  // Ruff PERF rules, Radon complexity, memory patterns
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
    // SESSION 57 Part 4: Added pydeps
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
      case 'pydeps':
        return this.runPydeps(repoPath, branch);
      case 'import-linter':
        return this.runImportLinter(repoPath, branch);
      case 'performance':
        return this.runPerformanceAnalysis(repoPath, branch);
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

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('pylint', result.rawOutput, rawIssues);

      const duration = Date.now() - startTime;

      logger.info(`✅ Pylint completed: ${validatedIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'pylint',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
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

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('bandit', result.rawOutput, rawIssues);

      const duration = Date.now() - startTime;

      logger.info(`✅ Bandit completed: ${validatedIssues.length} security issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'bandit',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
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

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('mypy', result.rawOutput, rawIssues);

      const duration = Date.now() - startTime;

      logger.info(`✅ mypy completed: ${validatedIssues.length} type errors in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'mypy',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
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

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('safety', result.rawOutput, rawIssues);

      const duration = Date.now() - startTime;

      logger.info(`✅ Safety completed: ${validatedIssues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'safety',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
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

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('ruff', result.rawOutput, rawIssues);

      const duration = Date.now() - startTime;

      logger.info(`✅ Ruff completed: ${validatedIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'ruff',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
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

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('pip-audit', result.rawOutput, rawIssues);

      const duration = Date.now() - startTime;

      logger.info(`✅ pip-audit completed: ${validatedIssues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'pip-audit',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ pip-audit failed: ${error.message}`);
      return this.createFailedResult('pip-audit', error.message);
    }
  }

  // runSemgrep() removed - Semgrep now handled by base class executeUniversalTool()
  // See executeTool() method which routes universal tools to the base class

  /**
   * Run pydeps for architecture/dependency analysis (SESSION 57 Part 4)
   * Detects circular dependencies and module relationship issues
   */
  private async runPydeps(repoPath: string, branch: 'base' | 'pr'): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running pydeps on ${branch} branch...`);

      // Find the main Python package in the repo
      const packageName = await this.findMainPythonPackage(repoPath);
      if (!packageName) {
        logger.warn('⚠️ No Python package found for pydeps analysis');
        return {
          tool: 'pydeps',
          success: true,
          duration: Date.now() - startTime,
          issues: [],
          rawOutput: 'No Python package found',
          metadata: this.calculateMetadata([])
        };
      }

      // Build pydeps command with JSON output
      const maxBacon = this.config.pydeps.maxBacon ? `--max-bacon=${this.config.pydeps.maxBacon}` : '';
      const cmd = `cd ${repoPath} && pydeps ${packageName} --show-deps --no-output ${maxBacon} 2>&1`;

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      const rawOutput = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

      // Parse pydeps output to extract dependency information
      const issues = this.parsePydepsOutput(rawOutput, repoPath);

      const duration = Date.now() - startTime;
      logger.info(`✅ pydeps completed: ${issues.length} architecture issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'pydeps',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // pydeps might not be installed - provide helpful message
      if (error.message.includes('command not found') || error.message.includes('not recognized')) {
        logger.warn('⚠️ pydeps not installed. Install with: pip install pydeps');
        return {
          tool: 'pydeps',
          success: false,
          duration,
          issues: [],
          rawOutput: 'pydeps not installed. Install with: pip install pydeps',
          metadata: this.calculateMetadata([]),
          error: 'pydeps not installed'
        };
      }

      logger.error(`❌ pydeps failed: ${error.message}`);
      return this.createFailedResult('pydeps', error.message);
    }
  }

  /**
   * Find the main Python package in the repository
   */
  private async findMainPythonPackage(repoPath: string): Promise<string | null> {
    try {
      // Check for setup.py or pyproject.toml to find package name
      const setupPyPath = path.join(repoPath, 'setup.py');
      const pyprojectPath = path.join(repoPath, 'pyproject.toml');

      // Look for directories with __init__.py (Python packages)
      const { stdout } = await execAsync(
        `find ${repoPath} -maxdepth 2 -name "__init__.py" -type f | head -5`,
        { timeout: 10000 }
      );

      const initFiles = stdout.trim().split('\n').filter(Boolean);
      if (initFiles.length > 0) {
        // Extract package name from first __init__.py path
        const packageDir = path.dirname(initFiles[0]);
        const packageName = path.basename(packageDir);
        return packageName;
      }

      // Fallback: try common patterns
      const commonPackageNames = ['src', 'lib', 'app'];
      for (const name of commonPackageNames) {
        const packagePath = path.join(repoPath, name, '__init__.py');
        if (existsSync(packagePath)) {
          return name;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse pydeps output and extract architecture issues
   */
  private parsePydepsOutput(output: string, repoPath: string): RawIssue[] {
    const issues: RawIssue[] = [];

    try {
      // pydeps --show-deps outputs JSON-like structure
      // Look for circular dependencies indicated by cycles in the graph

      // Try to parse as JSON (pydeps outputs structured data)
      const lines = output.split('\n');
      const depData: Record<string, any> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
          try {
            // Try to parse individual JSON entries
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') {
              Object.assign(depData, parsed);
            }
          } catch {
            // Not valid JSON, continue
          }
        }
      }

      // Detect circular dependencies from import relationships
      const circularDeps = this.detectCircularDependencies(depData);

      for (const cycle of circularDeps) {
        issues.push({
          tool: 'pydeps',
          file: cycle.modules[0] + '.py',
          line: 1,
          severity: 'high',
          message: `Circular dependency detected: ${cycle.modules.join(' → ')} → ${cycle.modules[0]}`,
          rule: 'circular-dependency',
          category: 'architecture'
        });
      }

      // If no structured data, look for text patterns indicating issues
      if (issues.length === 0 && output.includes('cycle')) {
        // Extract cycle information from text output
        const cyclePattern = /cycle[^:]*:\s*([^\n]+)/gi;
        let match;
        while ((match = cyclePattern.exec(output)) !== null) {
          issues.push({
            tool: 'pydeps',
            file: 'unknown',
            line: 1,
            severity: 'high',
            message: `Circular dependency: ${match[1].trim()}`,
            rule: 'circular-dependency',
            category: 'architecture'
          });
        }
      }

    } catch (error) {
      logger.warn(`⚠️ Could not parse pydeps output: ${error}`);
    }

    return issues;
  }

  /**
   * Detect circular dependencies from pydeps dependency data
   */
  private detectCircularDependencies(depData: Record<string, any>): Array<{ modules: string[] }> {
    const cycles: Array<{ modules: string[] }> = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (module: string, path: string[]): boolean => {
      if (stack.has(module)) {
        // Found a cycle
        const cycleStart = path.indexOf(module);
        if (cycleStart !== -1) {
          cycles.push({ modules: path.slice(cycleStart) });
        }
        return true;
      }

      if (visited.has(module)) return false;

      visited.add(module);
      stack.add(module);
      path.push(module);

      const imports = depData[module]?.imports || [];
      for (const imported of imports) {
        if (typeof imported === 'string') {
          dfs(imported, [...path]);
        }
      }

      stack.delete(module);
      return false;
    };

    // Check all modules for cycles
    for (const module of Object.keys(depData)) {
      if (!visited.has(module)) {
        dfs(module, []);
      }
    }

    return cycles;
  }

  // ============================================================
  // SESSION 57 Part 5: import-linter for layer enforcement
  // ============================================================

  /**
   * Run import-linter to check architecture contracts
   * import-linter enforces layer architecture rules (e.g., layers can't import from higher layers)
   *
   * Requires:
   * - pip install import-linter
   * - .importlinter config file in repository
   */
  private async runImportLinter(repoPath: string, branch: 'base' | 'pr'): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running import-linter on ${branch} branch...`);

      // Check if import-linter config exists
      const configPath = this.config.importLinter.configFile ||
        path.join(repoPath, '.importlinter');
      const hasConfig = existsSync(configPath) ||
        existsSync(path.join(repoPath, 'setup.cfg')) ||
        existsSync(path.join(repoPath, 'pyproject.toml'));

      if (!hasConfig) {
        // No config - import-linter requires configuration to work
        logger.warn('⚠️ No import-linter configuration found (.importlinter, setup.cfg, or pyproject.toml)');
        return {
          tool: 'import-linter',
          success: true,
          duration: Date.now() - startTime,
          issues: [],
          rawOutput: 'No import-linter configuration found. Add contracts to .importlinter file.',
          metadata: this.calculateMetadata([])
        };
      }

      // Run import-linter
      const cmd = `cd ${repoPath} && lint-imports --verbose 2>&1`;

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 180000, // 3 minute timeout (can be slow on large codebases)
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      const rawOutput = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

      // Parse import-linter output
      const issues = this.parseImportLinterOutput(rawOutput, repoPath);

      const duration = Date.now() - startTime;
      logger.info(`✅ import-linter completed: ${issues.length} contract violations in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'import-linter',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // import-linter returns non-zero exit code when contracts are broken
      // We need to parse the output even on "error"
      if (error.stdout || error.stderr) {
        const rawOutput = (error.stdout || '') + (error.stderr ? `\nSTDERR:\n${error.stderr}` : '');
        const issues = this.parseImportLinterOutput(rawOutput, repoPath);

        if (issues.length > 0) {
          logger.info(`✅ import-linter completed: ${issues.length} contract violations in ${(duration / 1000).toFixed(1)}s`);
          return {
            tool: 'import-linter',
            success: true,
            duration,
            issues,
            rawOutput,
            metadata: this.calculateMetadata(issues)
          };
        }
      }

      // Check if import-linter is not installed
      if (error.message.includes('command not found') || error.message.includes('not recognized')) {
        logger.warn('⚠️ import-linter not installed. Install with: pip install import-linter');
        return {
          tool: 'import-linter',
          success: false,
          duration,
          issues: [],
          rawOutput: 'import-linter not installed. Install with: pip install import-linter',
          metadata: this.calculateMetadata([]),
          error: 'import-linter not installed'
        };
      }

      logger.error(`❌ import-linter failed: ${error.message}`);
      return this.createFailedResult('import-linter', error.message);
    }
  }

  /**
   * Parse import-linter output and extract contract violations
   *
   * Output format example:
   * ```
   * ============= Import Linter =============
   * Contracts: 0 kept, 2 broken.
   *
   * ---------------- Broken contracts ----------------
   * Three tier architecture
   * -----------------------
   * myproject.data.userrecord is not allowed to import myproject.domain.user:
   *   myproject.data.userrecord -> myproject.domain.user (l. 5)
   * ```
   */
  private parseImportLinterOutput(output: string, repoPath: string): RawIssue[] {
    const issues: RawIssue[] = [];

    try {
      // Check if any contracts are broken
      const brokenMatch = output.match(/Contracts:\s*(\d+)\s*kept,\s*(\d+)\s*broken/i);
      if (!brokenMatch || parseInt(brokenMatch[2]) === 0) {
        // No broken contracts
        return issues;
      }

      // Extract broken contract sections
      const brokenSection = output.split(/[-]+\s*Broken contracts\s*[-]+/i)[1];
      if (!brokenSection) return issues;

      // Parse each violation
      // Pattern: "module.a is not allowed to import module.b:"
      const violationPattern = /(\S+)\s+is\s+not\s+allowed\s+to\s+import\s+(\S+):/gi;
      let match;

      while ((match = violationPattern.exec(brokenSection)) !== null) {
        const fromModule = match[1];
        const toModule = match[2];

        // Extract the import chain details
        const chainStart = brokenSection.indexOf(match[0]) + match[0].length;
        const chainEnd = brokenSection.indexOf('\n\n', chainStart);
        const chainDetails = brokenSection.substring(chainStart, chainEnd > 0 ? chainEnd : undefined).trim();

        // Extract line number if available (format: "(l. 5)")
        const lineMatch = chainDetails.match(/\(l\.\s*(\d+)\)/);
        const line = lineMatch ? parseInt(lineMatch[1]) : 1;

        // Convert module path to file path
        const filePath = fromModule.replace(/\./g, '/') + '.py';

        issues.push({
          tool: 'import-linter',
          file: filePath,
          line,
          severity: 'high',  // Layer violations are architectural issues
          message: `Layer violation: ${fromModule} imports ${toModule}. ${chainDetails.split('\n')[0].trim()}`,
          rule: 'layer-violation',
          category: 'architecture'
        });
      }

      // Also check for independence contract violations
      const independencePattern = /(\S+)\s+and\s+(\S+)\s+are\s+independent.*?BROKEN/gi;
      while ((match = independencePattern.exec(output)) !== null) {
        issues.push({
          tool: 'import-linter',
          file: match[1].replace(/\./g, '/') + '.py',
          line: 1,
          severity: 'high',
          message: `Independence violation: ${match[1]} and ${match[2]} should be independent but have imports between them`,
          rule: 'independence-violation',
          category: 'architecture'
        });
      }

    } catch (error) {
      logger.warn(`⚠️ Could not parse import-linter output: ${error}`);
    }

    return issues;
  }

  // ============================================================
  // SESSION 58: PERFORMANCE STATIC ANALYSIS
  // ============================================================

  /**
   * Run static performance analysis using:
   * - Ruff PERF rules: Performance anti-patterns
   * - Radon: Cyclomatic complexity
   * - Memory pattern detection: Common memory leak patterns
   *
   * NOTE: Runtime profilers (py-spy, Scalene, memray) are NOT included
   * because they require actual code execution.
   */
  private async runPerformanceAnalysis(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🚀 Running Python performance analysis on ${branch} branch...`);

      // Dynamically import the performance runner
      const { PythonPerformanceRunner } = await import('./performance-runner');
      const runner = new PythonPerformanceRunner();

      // Run all performance analysis tools
      const perfIssues = await runner.runAll(repoPath);

      // Convert to RawIssue format
      const rawIssues: RawIssue[] = perfIssues.map(issue => ({
        tool: issue.tool,
        file: issue.file,
        line: issue.line,
        severity: issue.severity,
        message: issue.message,
        rule: issue.rule,
        category: 'performance',
        autoFixable: false
      }));

      const duration = Date.now() - startTime;
      const metadata = this.calculateMetadata(rawIssues);

      logger.info(`✅ Performance analysis completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'performance',
        success: true,
        duration,
        issues: rawIssues,
        metadata
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Performance analysis failed: ${error.message}`);
      return this.createFailedResult('performance', error.message);
    }
  }

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

