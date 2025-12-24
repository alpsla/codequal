/**
 * Ruby Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution.
 *
 * This orchestrator contains Ruby-specific logic:
 * - RuboCop: Ruby linter and code analyzer
 * - Brakeman: Security vulnerability scanner for Rails
 * - bundler-audit: Gem vulnerability scanner
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

// Import parser validation wrapper (Session 58 - Migration Phase 2)
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
// RUBY-SPECIFIC TYPES
// ============================================================

export interface RubyToolConfig {
  rubocop: {
    enabled: boolean;
    configFile?: string;
    rails: boolean; // Enable Rails-specific cops
  };
  brakeman: {
    enabled: boolean;
    confidence: 'high' | 'medium' | 'low'; // Minimum confidence level
  };
  bundlerAudit: {
    enabled: boolean;
    update: boolean; // Update advisory database before scan
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  // SESSION 57 Part 5: Architecture analysis tools
  packwerk: {
    enabled: boolean;
    strictMode: boolean; // Fail on any violations (vs just recording in todo)
  };
  docker: {
    mountPath: string;
    rubyVersion: string;
    memory: string;
  };
}

export const DEFAULT_RUBY_CONFIG: RubyToolConfig = {
  rubocop: {
    enabled: true,
    rails: true
  },
  brakeman: {
    enabled: true,
    confidence: 'low' // Report all confidence levels
  },
  bundlerAudit: {
    enabled: true,
    update: true
  },
  semgrep: {
    enabled: true,
    config: 'auto'
  },
  packwerk: {
    enabled: true,
    strictMode: false // Record violations in package_todo.yml
  },
  docker: {
    mountPath: '/workspace',
    rubyVersion: '3.2',
    memory: '2g'
  }
};

const RUBY_TOOL_CATEGORIES = {
  rubocop: ToolCategory.CODE_QUALITY,
  brakeman: ToolCategory.SECURITY,
  'bundler-audit': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY,
  packwerk: ToolCategory.ADVANCED  // Architecture analysis - only in 'complete' mode
};

function shouldRubyToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = RUBY_TOOL_CATEGORIES[toolName as keyof typeof RUBY_TOOL_CATEGORIES];
  if (!category) return false;

  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];

  switch (category) {
    case ToolCategory.CODE_QUALITY:
      return modeConfig.toolCategories.codeQuality;
    case ToolCategory.SECURITY:
      return modeConfig.toolCategories.security;
    case ToolCategory.DEPENDENCY_SCAN:
      return modeConfig.toolCategories.dependencyScan;
    case ToolCategory.ADVANCED:
      return modeConfig.toolCategories.advanced;
    default:
      return false;
  }
}

// ============================================================
// RUBY TOOL ORCHESTRATOR
// ============================================================

export class RubyToolOrchestrator extends BaseToolOrchestrator {
  private config: RubyToolConfig;
  
  // Parser validation wrapper (Session 58 - Migration Phase 2)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<RubyToolConfig> = {},
    dockerImage = 'ruby:3.2-alpine'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_RUBY_CONFIG, ...config };
    
    // Initialize parser validation (Session 58 - Migration Phase 2)
    this.parserValidator = createParserValidationWrapper({
      language: 'ruby',
      enabled: true,
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['semgrep', 'brakeman', 'rubocop', 'bundler-audit'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
  }

  protected getLanguageName(): string {
    return 'ruby';
  }

  /**
   * Get tools to run based on analysis mode
   *
   * Ruby tools:
   * - rubocop: Code style and quality linter
   * - brakeman: Security scanner for Rails apps
   * - bundler-audit: Gem vulnerability scanner
   * - semgrep: Security patterns (via universal runner)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // RuboCop - Ruby linter
    if (this.config.rubocop.enabled && shouldRubyToolRun('rubocop', mode)) {
      tools.push('rubocop');
    }

    // Brakeman - Rails security scanner
    if (this.config.brakeman.enabled && shouldRubyToolRun('brakeman', mode)) {
      tools.push('brakeman');
    }

    // bundler-audit - Gem vulnerability scanner
    if (this.config.bundlerAudit.enabled && shouldRubyToolRun('bundler-audit', mode)) {
      tools.push('bundler-audit');
    }

    // Semgrep - Security analysis (via universal runner)
    if (this.config.semgrep.enabled && shouldRubyToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }

    // Packwerk - Rails package architecture analyzer (Shopify)
    if (this.config.packwerk.enabled && shouldRubyToolRun('packwerk', mode)) {
      tools.push('packwerk');
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'brakeman', 'bundler-audit'],
      'Code Quality': ['rubocop'],
      'Dependencies': ['bundler-audit'],
      'Architecture': ['packwerk']
    };
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing Ruby tool: ${toolName}`);

    // Route universal tools to shared runners
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // Route to Ruby-specific tool methods
    switch (toolName) {
      case 'rubocop':
        return this.runRubocop(repoPath, branch, options.changedFiles);
      case 'brakeman':
        return this.runBrakeman(repoPath, branch);
      case 'bundler-audit':
        return this.runBundlerAudit(repoPath, branch);
      case 'packwerk':
        return this.runPackwerk(repoPath, branch);
      default:
        throw new Error(`Unknown Ruby tool: ${toolName}`);
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run RuboCop - Ruby linter and code analyzer
   */
  private async runRubocop(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running RuboCop on ${branch} branch...`);

      // Check if Gemfile exists
      const gemfilePath = path.join(repoPath, 'Gemfile');
      if (!existsSync(gemfilePath)) {
        logger.warn('⚠️ No Gemfile found - skipping RuboCop');
        return this.createSkippedResult('rubocop', 'No Gemfile found');
      }

      // Build command
      let command = `cd "${repoPath}" && rubocop --format json`;

      // Add config file if specified
      if (this.config.rubocop.configFile) {
        command += ` --config "${this.config.rubocop.configFile}"`;
      }

      // Enable Rails cops if configured and Rails is detected
      if (this.config.rubocop.rails) {
        const railsApp = existsSync(path.join(repoPath, 'config', 'application.rb'));
        if (railsApp) {
          command += ' --require rubocop-rails';
        }
      }

      // If changed files specified, only lint those
      if (changedFiles && changedFiles.length > 0) {
        const rubyFiles = changedFiles.filter(f => f.endsWith('.rb'));
        if (rubyFiles.length > 0) {
          command += ` ${rubyFiles.join(' ')}`;
        }
      }

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // RuboCop exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles RuboCop JSON
      const issues = this.parserValidator.validate('rubocop', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ RuboCop completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'rubocop',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ RuboCop failed: ${error.message}`);
      return this.createFailedResult('rubocop', error.message);
    }
  }

  /**
   * Run Brakeman - Rails security scanner
   */
  private async runBrakeman(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Brakeman on ${branch} branch...`);

      // Check if this is a Rails app
      const railsApp = existsSync(path.join(repoPath, 'config', 'application.rb'));
      if (!railsApp) {
        logger.warn('⚠️ Not a Rails app - skipping Brakeman');
        return this.createSkippedResult('brakeman', 'Not a Rails application');
      }

      // Build command
      const confidence = this.getConfidenceLevel(this.config.brakeman.confidence);
      const command = `cd "${repoPath}" && brakeman --format json --confidence-level ${confidence} --no-progress 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // Brakeman exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles Brakeman JSON
      const issues = this.parserValidator.validate('brakeman', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ Brakeman completed: ${issues.length} security issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'brakeman',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Brakeman failed: ${error.message}`);
      return this.createFailedResult('brakeman', error.message);
    }
  }

  /**
   * Run bundler-audit - Gem vulnerability scanner
   */
  private async runBundlerAudit(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running bundler-audit on ${branch} branch...`);

      // Check if Gemfile.lock exists
      const gemfileLockPath = path.join(repoPath, 'Gemfile.lock');
      if (!existsSync(gemfileLockPath)) {
        logger.warn('⚠️ No Gemfile.lock found - skipping bundler-audit');
        return this.createSkippedResult('bundler-audit', 'No Gemfile.lock found');
      }

      // Update advisory database if configured
      if (this.config.bundlerAudit.update) {
        try {
          await execAsync('bundle audit update', { timeout: 60000 });
        } catch {
          logger.warn('Failed to update bundler-audit database');
        }
      }

      const command = `cd "${repoPath}" && bundle audit check --format json 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // bundler-audit exits with non-zero when vulnerabilities found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles bundler-audit JSON
      const issues = this.parserValidator.validate('bundler-audit', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ bundler-audit completed: ${issues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'bundler-audit',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ bundler-audit failed: ${error.message}`);
      return this.createFailedResult('bundler-audit', error.message);
    }
  }

  /**
   * Run Packwerk - Rails package architecture analyzer (Shopify)
   *
   * Packwerk enforces modular boundaries in Rails monoliths by detecting:
   * - Dependency violations: cross-package references without declared dependencies
   * - Privacy violations: accessing private constants from other packages
   *
   * Output format: "file:line:column\nViolation type: message"
   * Example: "app/models/accounting/accounts.rb:6:8\nDependency violation: ::Debtors::DebtorsService belongs to..."
   */
  private async runPackwerk(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Packwerk on ${branch} branch...`);

      // Check if this is a Rails app with Packwerk configured
      const packwerkConfigPath = path.join(repoPath, 'packwerk.yml');
      const gemfilePath = path.join(repoPath, 'Gemfile');

      // Must have both Gemfile and packwerk.yml
      if (!existsSync(gemfilePath)) {
        logger.warn('⚠️ No Gemfile found - skipping Packwerk');
        return this.createSkippedResult('packwerk', 'No Gemfile found');
      }

      if (!existsSync(packwerkConfigPath)) {
        logger.warn('⚠️ No packwerk.yml found - skipping Packwerk');
        return this.createSkippedResult('packwerk', 'No packwerk.yml configuration found');
      }

      // Run packwerk check
      const command = `cd "${repoPath}" && bundle exec packwerk check 2>&1`;

      let rawOutput = '';
      const issues: RawIssue[] = [];

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000 // 10 minutes for large Rails apps
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // Packwerk exits with non-zero when violations found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Parse packwerk output
      // Format: "file:line:column\nViolation type: message"
      const parsedIssues = this.parsePackwerkOutput(rawOutput);
      issues.push(...parsedIssues);

      const duration = Date.now() - startTime;
      logger.info(`✅ Packwerk completed: ${issues.length} architecture violations in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'packwerk',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Packwerk failed: ${error.message}`);
      return this.createFailedResult('packwerk', error.message);
    }
  }

  /**
   * Parse Packwerk check output
   *
   * Example output:
   * app/models/accounting/accounts.rb:6:8
   * Dependency violation: ::Debtors::DebtorsService belongs to 'app/models/debtors',
   * but 'app/models/accounting' does not specify a dependency on 'app/models/debtors'.
   *
   * lib/orchestrator.rb:6:6
   * Privacy violation: ::Airplane::Communication::Services::Satellites is private to
   * 'packages/airplane/lib/airplane/communication' but referenced from 'lib'.
   */
  private parsePackwerkOutput(output: string): RawIssue[] {
    const issues: RawIssue[] = [];
    const lines = output.split('\n');

    // Pattern: file:line:column followed by violation type
    const locationPattern = /^([^:\s]+):(\d+):(\d+)$/;
    const dependencyViolationPattern = /^Dependency violation:/i;
    const privacyViolationPattern = /^Privacy violation:/i;

    let currentFile = '';
    let currentLine = 1;
    let currentColumn = 1;
    let currentMessage = '';
    let collectingMessage = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for file:line:column format
      const locationMatch = line.match(locationPattern);
      if (locationMatch) {
        // Save previous issue if we were collecting one
        if (collectingMessage && currentMessage) {
          issues.push(this.createPackwerkIssue(
            currentFile,
            currentLine,
            currentColumn,
            currentMessage.trim()
          ));
        }

        currentFile = locationMatch[1];
        currentLine = parseInt(locationMatch[2], 10);
        currentColumn = parseInt(locationMatch[3], 10);
        currentMessage = '';
        collectingMessage = false;
        continue;
      }

      // Check for violation type
      if (dependencyViolationPattern.test(line) || privacyViolationPattern.test(line)) {
        currentMessage = line;
        collectingMessage = true;
        continue;
      }

      // Continue collecting message lines (multi-line messages)
      if (collectingMessage && line && !line.startsWith('📦')) {
        currentMessage += ' ' + line;
      }

      // End of message on empty line or packwerk status line
      if (collectingMessage && (line === '' || line.startsWith('📦'))) {
        if (currentMessage) {
          issues.push(this.createPackwerkIssue(
            currentFile,
            currentLine,
            currentColumn,
            currentMessage.trim()
          ));
        }
        currentMessage = '';
        collectingMessage = false;
      }
    }

    // Don't forget last issue
    if (collectingMessage && currentMessage) {
      issues.push(this.createPackwerkIssue(
        currentFile,
        currentLine,
        currentColumn,
        currentMessage.trim()
      ));
    }

    return issues;
  }

  /**
   * Create a RawIssue from Packwerk violation
   */
  private createPackwerkIssue(
    file: string,
    line: number,
    column: number,
    message: string
  ): RawIssue {
    // Determine violation type from message
    const isDependencyViolation = message.toLowerCase().includes('dependency violation');
    const isPrivacyViolation = message.toLowerCase().includes('privacy violation');

    let rule = 'boundary-violation';
    if (isDependencyViolation) {
      rule = 'dependency-violation';
    } else if (isPrivacyViolation) {
      rule = 'privacy-violation';
    }

    return {
      tool: 'packwerk',
      file,
      line,
      column,
      severity: 'medium', // Architecture violations are important but not blocking
      message,
      rule,
      category: 'architecture'
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  // NOTE: Legacy parsing methods for rubocop, brakeman, bundler-audit
  // have been removed in Phase 3. All parsing now uses EnhancedUniversalToolParser
  // via ParserValidationWrapper. See Session 58 migration notes.

  private getConfidenceLevel(level: 'high' | 'medium' | 'low'): number {
    switch (level) {
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
        return 3;
      default:
        return 3;
    }
  }

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
}

export default RubyToolOrchestrator;
