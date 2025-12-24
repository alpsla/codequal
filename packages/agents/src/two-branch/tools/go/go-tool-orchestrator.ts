/**
 * Go Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution.
 *
 * This orchestrator contains Go-specific logic:
 * - golangci-lint: Meta-linter that runs 50+ linters in parallel
 * - govulncheck: Official Go vulnerability scanner (uses Go vulnerability database)
 * - staticcheck: Advanced static analysis for Go
 * - Semgrep security analysis (via universal runner)
 *
 * All universal orchestration logic (branch management, parallel execution,
 * result aggregation) is inherited from BaseToolOrchestrator.
 *
 * Performance: 50-65% faster than sequential execution via parallel tool runs
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
// GO-SPECIFIC TYPES
// ============================================================

export interface GoToolConfig {
  golangciLint: {
    enabled: boolean;
    configFile?: string;
    timeout?: string; // e.g., '5m'
  };
  govulncheck: {
    enabled: boolean;
  };
  staticcheck: {
    enabled: boolean;
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  // SESSION 57 Part 5: Architecture analysis tools
  goArchLint: {
    enabled: boolean;
    configFile?: string; // Custom .go-arch-lint.yml path
  };
  // SESSION 58: Performance static analysis
  performance: {
    enabled: boolean;
  };
  docker: {
    mountPath: string;
    goVersion: string;
    memory: string;
  };
}

export const DEFAULT_GO_CONFIG: GoToolConfig = {
  golangciLint: {
    enabled: true,
    timeout: '5m'
  },
  govulncheck: {
    enabled: true
  },
  staticcheck: {
    enabled: true
  },
  semgrep: {
    enabled: true,
    config: 'auto'
  },
  // SESSION 57 Part 5: Architecture analysis
  goArchLint: {
    enabled: true
  },
  // SESSION 58: Performance static analysis (complete mode only)
  performance: {
    enabled: true
  },
  docker: {
    mountPath: '/workspace',
    goVersion: '1.22',
    memory: '2g'
  }
};

const GO_TOOL_CATEGORIES = {
  'golangci-lint': ToolCategory.CODE_QUALITY,
  govulncheck: ToolCategory.DEPENDENCY_SCAN,
  staticcheck: ToolCategory.CODE_QUALITY,
  semgrep: ToolCategory.SECURITY,
  // SESSION 57 Part 5: Architecture tools
  'go-arch-lint': ToolCategory.ADVANCED,  // Architecture analysis - only in 'complete' mode
  // SESSION 58: Performance static analysis
  performance: ToolCategory.ADVANCED  // Static performance analysis - only in 'complete' mode
};

function shouldGoToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = GO_TOOL_CATEGORIES[toolName as keyof typeof GO_TOOL_CATEGORIES];
  if (!category) return false;

  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];

  switch (category) {
    case ToolCategory.CODE_QUALITY:
      return modeConfig.toolCategories.codeQuality;
    case ToolCategory.SECURITY:
      return modeConfig.toolCategories.security;
    case ToolCategory.DEPENDENCY_SCAN:
      return modeConfig.toolCategories.dependencyScan;
    // SESSION 57 Part 5: Architecture tools (ADVANCED category)
    case ToolCategory.ADVANCED:
      return modeConfig.toolCategories.advanced;
    default:
      return false;
  }
}

// ============================================================
// GO TOOL ORCHESTRATOR
// ============================================================

export class GoToolOrchestrator extends BaseToolOrchestrator {
  private config: GoToolConfig;

  // Parser validation wrapper for shadow mode (Session 57)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<GoToolConfig> = {},
    dockerImage = 'golang:1.22-alpine'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_GO_CONFIG, ...config };

    // Initialize parser validation (Session 57 Part 2 - Migration Phase 2)
    // Now uses enhanced parser for verified tools
    this.parserValidator = createParserValidationWrapper({
      language: 'go',
      enabled: true,  // Always enabled for Phase 2 migration
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['semgrep', 'golangci-lint', 'staticcheck', 'gosec', 'govulncheck'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
  }

  protected getLanguageName(): string {
    return 'go';
  }

  /**
   * Get tools to run based on analysis mode
   *
   * Go tools:
   * - golangci-lint: Meta-linter (always run for code quality)
   * - govulncheck: Vulnerability scanning (dependency scan mode)
   * - staticcheck: Advanced static analysis (code quality)
   * - semgrep: Security patterns (via universal runner)
   * - go-arch-lint: Architecture validation (SESSION 57 Part 5)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // golangci-lint - Primary linter (runs 50+ linters)
    if (this.config.golangciLint.enabled && shouldGoToolRun('golangci-lint', mode)) {
      tools.push('golangci-lint');
    }

    // staticcheck - Advanced static analysis
    if (this.config.staticcheck.enabled && shouldGoToolRun('staticcheck', mode)) {
      tools.push('staticcheck');
    }

    // govulncheck - Official Go vulnerability scanner
    if (this.config.govulncheck.enabled && shouldGoToolRun('govulncheck', mode)) {
      tools.push('govulncheck');
    }

    // Semgrep - Security analysis (via universal runner)
    if (this.config.semgrep.enabled && shouldGoToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }

    // SESSION 57 Part 5: Architecture analysis
    // go-arch-lint - Architecture validation (only in 'complete' mode)
    if (this.config.goArchLint.enabled && shouldGoToolRun('go-arch-lint', mode)) {
      tools.push('go-arch-lint');
    }

    // SESSION 58: Performance static analysis (complete mode)
    if (this.config.performance.enabled && shouldGoToolRun('performance', mode)) {
      tools.push('performance');
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'govulncheck'],
      'Code Quality': ['golangci-lint', 'staticcheck'],
      // SESSION 58: Added static performance analysis
      'Performance': ['performance'],  // staticcheck perf, golangci perf linters, memory patterns
      'Architecture': ['go-arch-lint'],  // SESSION 57 Part 5
      'Dependencies': ['govulncheck']
    };
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing Go tool: ${toolName}`);

    // Route universal tools to shared runners (Semgrep, Dependency-Check)
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // Route to Go-specific tool methods
    switch (toolName) {
      case 'golangci-lint':
        return this.runGolangciLint(repoPath, branch, options.changedFiles);
      case 'staticcheck':
        return this.runStaticcheck(repoPath, branch);
      case 'govulncheck':
        return this.runGovulncheck(repoPath, branch);
      // SESSION 57 Part 5: Architecture tools
      case 'go-arch-lint':
        return this.runGoArchLint(repoPath, branch);
      // SESSION 58: Performance static analysis
      case 'performance':
        return this.runPerformanceAnalysis(repoPath, branch);
      default:
        throw new Error(`Unknown Go tool: ${toolName}`);
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run golangci-lint meta-linter
   * Runs 50+ linters in parallel for comprehensive Go analysis
   */
  private async runGolangciLint(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running golangci-lint on ${branch} branch...`);

      // Check if go.mod exists
      const goModPath = path.join(repoPath, 'go.mod');
      if (!existsSync(goModPath)) {
        logger.warn('⚠️ No go.mod found - skipping golangci-lint');
        return this.createSkippedResult('golangci-lint', 'No go.mod found');
      }

      // Build command with timeout
      const timeout = this.config.golangciLint.timeout || '5m';
      let command = `cd "${repoPath}" && golangci-lint run --timeout ${timeout} --out-format json ./...`;

      // Add config file if specified
      if (this.config.golangciLint.configFile) {
        command += ` --config "${this.config.golangciLint.configFile}"`;
      }

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000 // 10 minute timeout
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // golangci-lint exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles all JSON parsing
      const validatedIssues = this.parserValidator.validate('golangci-lint', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ golangci-lint completed: ${validatedIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'golangci-lint',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ golangci-lint failed: ${error.message}`);
      return this.createFailedResult('golangci-lint', error.message);
    }
  }

  /**
   * Run staticcheck advanced static analysis
   */
  private async runStaticcheck(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running staticcheck on ${branch} branch...`);

      // Check if go.mod exists
      const goModPath = path.join(repoPath, 'go.mod');
      if (!existsSync(goModPath)) {
        logger.warn('⚠️ No go.mod found - skipping staticcheck');
        return this.createSkippedResult('staticcheck', 'No go.mod found');
      }

      const command = `cd "${repoPath}" && staticcheck -f json ./...`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // staticcheck exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles JSON lines format
      const validatedIssues = this.parserValidator.validate('staticcheck', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ staticcheck completed: ${validatedIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'staticcheck',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ staticcheck failed: ${error.message}`);
      return this.createFailedResult('staticcheck', error.message);
    }
  }

  /**
   * Run govulncheck vulnerability scanner
   * Official Go tool for finding vulnerabilities in dependencies
   */
  private async runGovulncheck(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running govulncheck on ${branch} branch...`);

      // Check if go.mod exists
      const goModPath = path.join(repoPath, 'go.mod');
      if (!existsSync(goModPath)) {
        logger.warn('⚠️ No go.mod found - skipping govulncheck');
        return this.createSkippedResult('govulncheck', 'No go.mod found');
      }

      const command = `cd "${repoPath}" && govulncheck -json ./...`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // govulncheck exits with non-zero when vulnerabilities found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles govulncheck JSON lines format
      const validatedIssues = this.parserValidator.validate('govulncheck', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ govulncheck completed: ${validatedIssues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'govulncheck',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ govulncheck failed: ${error.message}`);
      return this.createFailedResult('govulncheck', error.message);
    }
  }

  /**
   * Run go-arch-lint architecture validator (SESSION 57 Part 5)
   *
   * go-arch-lint checks Go import paths against architecture rules
   * defined in a .go-arch-lint.yml configuration file.
   *
   * Features:
   * - Validates dependency rules between components
   * - Enforces clean architecture, hexagonal, DDD, MVC patterns
   * - Outputs JSON for programmatic processing
   * - Exits with code 1 when violations found
   */
  private async runGoArchLint(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🏗️ Running go-arch-lint on ${branch} branch...`);

      // Check if go.mod exists (required for Go projects)
      const goModPath = path.join(repoPath, 'go.mod');
      if (!existsSync(goModPath)) {
        logger.warn('⚠️ No go.mod found - skipping go-arch-lint');
        return this.createSkippedResult('go-arch-lint', 'No go.mod found');
      }

      // Check for .go-arch-lint.yml config (optional - tool creates default rules)
      const configPath = this.config.goArchLint.configFile
        ? path.join(repoPath, this.config.goArchLint.configFile)
        : path.join(repoPath, '.go-arch-lint.yml');

      const hasConfig = existsSync(configPath);
      if (!hasConfig) {
        logger.info('ℹ️ No .go-arch-lint.yml found - tool will use default architecture rules');
      }

      // Build command with JSON output
      let command = `cd "${repoPath}" && go-arch-lint check --output-type json`;
      if (hasConfig && this.config.goArchLint.configFile) {
        command += ` --arch-file "${this.config.goArchLint.configFile}"`;
      }

      let rawOutput = '';
      const issues: RawIssue[] = [];

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // go-arch-lint exits with code 1 when violations found
        rawOutput = error.stdout || error.stderr || '';

        // Check if it's a "tool not found" error
        if (rawOutput.includes('command not found') || rawOutput.includes('not found')) {
          logger.warn('⚠️ go-arch-lint not installed - skipping');
          return this.createSkippedResult('go-arch-lint', 'go-arch-lint not installed');
        }

        // Check if it's a "no config" error
        if (rawOutput.includes('config') && rawOutput.includes('not found')) {
          logger.warn('⚠️ No architecture config found - skipping');
          return this.createSkippedResult('go-arch-lint', 'No .go-arch-lint.yml config found');
        }
      }

      // Parse JSON output
      if (rawOutput.trim()) {
        try {
          const result = JSON.parse(rawOutput);

          // go-arch-lint JSON structure has "deps" violations
          if (result.deps && Array.isArray(result.deps)) {
            for (const violation of result.deps) {
              issues.push(this.parseGoArchLintIssue(violation));
            }
          }

          // Also check for "notices" which may contain warnings
          if (result.notices && Array.isArray(result.notices)) {
            for (const notice of result.notices) {
              issues.push(this.parseGoArchLintNotice(notice));
            }
          }
        } catch {
          // Try parsing as JSON lines (one object per line)
          const lines = rawOutput.trim().split('\n');
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.violation || entry.type === 'dep_violation') {
                issues.push(this.parseGoArchLintIssue(entry));
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Validate with shadow mode (Session 57)
      const validatedIssues = this.parserValidator.validate('go-arch-lint', rawOutput, issues);

      const duration = Date.now() - startTime;
      logger.info(`✅ go-arch-lint completed: ${validatedIssues.length} violations in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'go-arch-lint',
        success: true,
        duration,
        issues: validatedIssues,
        rawOutput,
        metadata: this.calculateMetadata(validatedIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ go-arch-lint failed: ${error.message}`);
      return this.createFailedResult('go-arch-lint', error.message);
    }
  }

  /**
   * Parse go-arch-lint dependency violation
   */
  private parseGoArchLintIssue(violation: any): RawIssue {
    // Architecture violations are typically high severity
    const severity: 'critical' | 'high' | 'medium' | 'low' = 'high';

    // Extract file info from violation
    const file = violation.file || violation.path || 'unknown';
    const line = violation.line || 1;

    // Construct descriptive message
    const from = violation.from || violation.component || '';
    const to = violation.to || violation.target || '';
    const message = violation.message ||
      `Architecture violation: ${from} depends on ${to} (not allowed by rules)`;

    return {
      tool: 'go-arch-lint',
      file,
      line,
      severity,
      message,
      rule: 'dep-violation',
      category: 'architecture'
    };
  }

  /**
   * Parse go-arch-lint notice/warning
   */
  private parseGoArchLintNotice(notice: any): RawIssue {
    return {
      tool: 'go-arch-lint',
      file: notice.file || 'project',
      line: notice.line || 1,
      severity: 'medium',
      message: notice.message || 'Architecture notice',
      rule: 'arch-notice',
      category: 'architecture'
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  // NOTE: Legacy parsing methods for golangci-lint, staticcheck, govulncheck
  // have been removed in Phase 3. All parsing now uses EnhancedUniversalToolParser
  // via ParserValidationWrapper. See Session 58 migration notes.

  private createSkippedResult(toolName: string, reason: string): ToolResult {
    return {
      tool: toolName,
      success: true,
      duration: 0,
      issues: [],
      rawOutput: `Skipped: ${reason}`,
      metadata: {
        filesScanned: 0,
        issuesFound: 0,
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
        skipped: true,
        skipReason: reason
      }
    };
  }

  // ============================================================
  // SESSION 58: PERFORMANCE STATIC ANALYSIS
  // ============================================================

  /**
   * Run static performance analysis using:
   * - staticcheck SA* rules: Performance-related static analysis
   * - golangci-lint perf linters: prealloc, ineffassign, etc.
   * - Memory pattern detection: Common memory issues
   *
   * NOTE: Runtime profilers (pprof, go tool trace) are NOT included
   * because they require actual code execution.
   */
  private async runPerformanceAnalysis(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🚀 Running Go performance analysis on ${branch} branch...`);

      // Dynamically import the performance runner
      const { GoPerformanceRunner } = await import('./performance-runner');
      const runner = new GoPerformanceRunner();

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
}

export default GoToolOrchestrator;
