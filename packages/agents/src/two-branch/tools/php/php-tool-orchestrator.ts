/**
 * PHP Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution.
 *
 * This orchestrator contains PHP-specific logic:
 * - PHPStan: Static analysis for PHP
 * - Psalm: Static analysis with type inference
 * - PHP_CodeSniffer: Code style checker
 * - composer audit: Composer package vulnerability scanner
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
// PHP-SPECIFIC TYPES
// ============================================================

export interface PHPToolConfig {
  phpstan: {
    enabled: boolean;
    level: number; // 0-9 (0 is loosest, 9 is strictest)
    configFile?: string;
  };
  psalm: {
    enabled: boolean;
    configFile?: string;
    level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 1 is strictest
  };
  phpcs: {
    enabled: boolean;
    standard: string; // e.g., 'PSR12', 'PSR1', 'Squiz'
  };
  composerAudit: {
    enabled: boolean;
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  // SESSION 57 Part 5: Architecture analysis tools
  deptrac: {
    enabled: boolean;
    configFile?: string; // Custom deptrac.yaml path
    reportUncovered: boolean; // Also report uncovered dependencies
  };
  docker: {
    mountPath: string;
    phpVersion: string;
    memory: string;
  };
}

export const DEFAULT_PHP_CONFIG: PHPToolConfig = {
  phpstan: {
    enabled: true,
    level: 5 // Balanced strictness
  },
  psalm: {
    enabled: true,
    level: 4 // Balanced strictness
  },
  phpcs: {
    enabled: true,
    standard: 'PSR12'
  },
  composerAudit: {
    enabled: true
  },
  semgrep: {
    enabled: true,
    config: 'auto'
  },
  deptrac: {
    enabled: true,
    reportUncovered: true // Report classes not assigned to any layer
  },
  docker: {
    mountPath: '/workspace',
    phpVersion: '8.2',
    memory: '2g'
  }
};

const PHP_TOOL_CATEGORIES = {
  phpstan: ToolCategory.CODE_QUALITY,
  psalm: ToolCategory.CODE_QUALITY,
  phpcs: ToolCategory.STYLE_LINT,
  'composer-audit': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY,
  deptrac: ToolCategory.ADVANCED  // Architecture analysis - only in 'complete' mode
};

function shouldPHPToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = PHP_TOOL_CATEGORIES[toolName as keyof typeof PHP_TOOL_CATEGORIES];
  if (!category) return false;

  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];

  switch (category) {
    case ToolCategory.CODE_QUALITY:
      return modeConfig.toolCategories.codeQuality;
    case ToolCategory.SECURITY:
      return modeConfig.toolCategories.security;
    case ToolCategory.DEPENDENCY_SCAN:
      return modeConfig.toolCategories.dependencyScan;
    case ToolCategory.STYLE_LINT:
      return modeConfig.toolCategories.styleLint;
    case ToolCategory.ADVANCED:
      return modeConfig.toolCategories.advanced;
    default:
      return false;
  }
}

// ============================================================
// PHP TOOL ORCHESTRATOR
// ============================================================

export class PHPToolOrchestrator extends BaseToolOrchestrator {
  private config: PHPToolConfig;
  
  // Parser validation wrapper (Session 58 - Migration Phase 2)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<PHPToolConfig> = {},
    dockerImage = 'php:8.2-cli-alpine'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_PHP_CONFIG, ...config };
    
    // Initialize parser validation (Session 58 - Migration Phase 2)
    this.parserValidator = createParserValidationWrapper({
      language: 'php',
      enabled: true,
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['semgrep', 'phpstan', 'psalm', 'phpcs', 'php-codesniffer', 'composer-audit'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
  }

  protected getLanguageName(): string {
    return 'php';
  }

  /**
   * Get tools to run based on analysis mode
   *
   * PHP tools:
   * - phpstan: Static analysis
   * - psalm: Static analysis with type inference
   * - phpcs: Code style checker
   * - composer-audit: Package vulnerability scanner
   * - semgrep: Security patterns (via universal runner)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // PHPStan - Static analysis
    if (this.config.phpstan.enabled && shouldPHPToolRun('phpstan', mode)) {
      tools.push('phpstan');
    }

    // Psalm - Static analysis with type inference
    if (this.config.psalm.enabled && shouldPHPToolRun('psalm', mode)) {
      tools.push('psalm');
    }

    // PHP_CodeSniffer - Code style
    if (this.config.phpcs.enabled && shouldPHPToolRun('phpcs', mode)) {
      tools.push('phpcs');
    }

    // Composer audit - Package vulnerabilities
    if (this.config.composerAudit.enabled && shouldPHPToolRun('composer-audit', mode)) {
      tools.push('composer-audit');
    }

    // Semgrep - Security analysis (via universal runner)
    if (this.config.semgrep.enabled && shouldPHPToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }

    // Deptrac - PHP architecture dependency analyzer
    if (this.config.deptrac.enabled && shouldPHPToolRun('deptrac', mode)) {
      tools.push('deptrac');
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'composer-audit'],
      'Code Quality': ['phpstan', 'psalm'],
      'Style': ['phpcs'],
      'Dependencies': ['composer-audit'],
      'Architecture': ['deptrac']
    };
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing PHP tool: ${toolName}`);

    // Route universal tools to shared runners
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // Route to PHP-specific tool methods
    switch (toolName) {
      case 'phpstan':
        return this.runPHPStan(repoPath, branch);
      case 'psalm':
        return this.runPsalm(repoPath, branch);
      case 'phpcs':
        return this.runPHPCS(repoPath, branch, options.changedFiles);
      case 'composer-audit':
        return this.runComposerAudit(repoPath, branch);
      case 'deptrac':
        return this.runDeptrac(repoPath, branch);
      default:
        throw new Error(`Unknown PHP tool: ${toolName}`);
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run PHPStan - Static analysis for PHP
   */
  private async runPHPStan(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running PHPStan on ${branch} branch...`);

      // Check if composer.json exists
      const composerPath = path.join(repoPath, 'composer.json');
      if (!existsSync(composerPath)) {
        logger.warn('⚠️ No composer.json found - skipping PHPStan');
        return this.createSkippedResult('phpstan', 'No composer.json found');
      }

      // Build command
      let command = `cd "${repoPath}" && vendor/bin/phpstan analyse --error-format=json --level=${this.config.phpstan.level}`;

      // Add config file if specified
      if (this.config.phpstan.configFile) {
        command += ` --configuration="${this.config.phpstan.configFile}"`;
      } else if (existsSync(path.join(repoPath, 'phpstan.neon'))) {
        command += ' --configuration=phpstan.neon';
      }

      // Default to src directory if it exists
      if (existsSync(path.join(repoPath, 'src'))) {
        command += ' src';
      } else {
        command += ' .';
      }

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // PHPStan exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles PHPStan JSON
      const issues = this.parserValidator.validate('phpstan', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ PHPStan completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'phpstan',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ PHPStan failed: ${error.message}`);
      return this.createFailedResult('phpstan', error.message);
    }
  }

  /**
   * Run Psalm - Static analysis with type inference
   */
  private async runPsalm(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Psalm on ${branch} branch...`);

      // Check if composer.json exists
      const composerPath = path.join(repoPath, 'composer.json');
      if (!existsSync(composerPath)) {
        logger.warn('⚠️ No composer.json found - skipping Psalm');
        return this.createSkippedResult('psalm', 'No composer.json found');
      }

      // Check for psalm.xml config
      const psalmConfig = existsSync(path.join(repoPath, 'psalm.xml')) ||
                         existsSync(path.join(repoPath, 'psalm.xml.dist'));

      if (!psalmConfig) {
        logger.warn('⚠️ No psalm.xml found - skipping Psalm');
        return this.createSkippedResult('psalm', 'No psalm.xml configuration found');
      }

      // Build command
      let command = `cd "${repoPath}" && vendor/bin/psalm --output-format=json`;

      if (this.config.psalm.configFile) {
        command += ` --config="${this.config.psalm.configFile}"`;
      }

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // Psalm exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles Psalm JSON
      const issues = this.parserValidator.validate('psalm', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ Psalm completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'psalm',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Psalm failed: ${error.message}`);
      return this.createFailedResult('psalm', error.message);
    }
  }

  /**
   * Run PHP_CodeSniffer - Code style checker
   */
  private async runPHPCS(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running PHP_CodeSniffer on ${branch} branch...`);

      // Check if composer.json exists
      const composerPath = path.join(repoPath, 'composer.json');
      if (!existsSync(composerPath)) {
        logger.warn('⚠️ No composer.json found - skipping PHPCS');
        return this.createSkippedResult('phpcs', 'No composer.json found');
      }

      // Build command
      let command = `cd "${repoPath}" && vendor/bin/phpcs --report=json --standard=${this.config.phpcs.standard}`;

      // If changed files specified, only check those
      if (changedFiles && changedFiles.length > 0) {
        const phpFiles = changedFiles.filter(f => f.endsWith('.php'));
        if (phpFiles.length > 0) {
          command += ` ${phpFiles.join(' ')}`;
        } else {
          // No PHP files changed
          return this.createSkippedResult('phpcs', 'No PHP files changed');
        }
      } else {
        // Default to src directory
        if (existsSync(path.join(repoPath, 'src'))) {
          command += ' src';
        } else {
          command += ' .';
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
        // PHPCS exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles PHPCS JSON
      const issues = this.parserValidator.validate('phpcs', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ PHPCS completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'phpcs',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ PHPCS failed: ${error.message}`);
      return this.createFailedResult('phpcs', error.message);
    }
  }

  /**
   * Run composer audit - Package vulnerability scanner
   */
  private async runComposerAudit(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running composer audit on ${branch} branch...`);

      // Check if composer.lock exists
      const composerLockPath = path.join(repoPath, 'composer.lock');
      if (!existsSync(composerLockPath)) {
        logger.warn('⚠️ No composer.lock found - skipping composer audit');
        return this.createSkippedResult('composer-audit', 'No composer.lock found');
      }

      const command = `cd "${repoPath}" && composer audit --format=json 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // composer audit exits with non-zero when vulnerabilities found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles composer-audit JSON
      const issues = this.parserValidator.validate('composer-audit', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ composer audit completed: ${issues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'composer-audit',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ composer audit failed: ${error.message}`);
      return this.createFailedResult('composer-audit', error.message);
    }
  }

  /**
   * Run Deptrac - PHP architecture dependency analyzer
   *
   * Deptrac enforces architecture rules by validating layer dependencies:
   * - DependsOnDisallowedLayer: cross-layer dependency violations
   * - Uncovered: classes not assigned to any layer
   *
   * Output format:
   * "Reason                     File
   *  DependsOnDisallowedLayer   ClassName must not depend on OtherClass..."
   */
  private async runDeptrac(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Deptrac on ${branch} branch...`);

      // Check if deptrac.yaml exists
      const deptracConfigPath = this.config.deptrac.configFile
        ? path.join(repoPath, this.config.deptrac.configFile)
        : path.join(repoPath, 'deptrac.yaml');

      const altConfigPath = path.join(repoPath, 'deptrac.yml');

      // Must have deptrac configuration
      if (!existsSync(deptracConfigPath) && !existsSync(altConfigPath)) {
        logger.warn('⚠️ No deptrac.yaml found - skipping Deptrac');
        return this.createSkippedResult('deptrac', 'No deptrac.yaml configuration found');
      }

      // Build command
      let command = `cd "${repoPath}" && vendor/bin/deptrac analyse --formatter=json`;

      if (this.config.deptrac.configFile) {
        command += ` --config-file="${this.config.deptrac.configFile}"`;
      }

      if (this.config.deptrac.reportUncovered) {
        command += ' --report-uncovered';
      }

      let rawOutput = '';
      const issues: RawIssue[] = [];

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000 // 10 minutes for large codebases
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // Deptrac exits with non-zero when violations found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Try to parse JSON output first
      let parsed = false;
      try {
        const result = JSON.parse(rawOutput);
        if (result.Report || result.files) {
          const parsedIssues = this.parseDeptracJson(result);
          issues.push(...parsedIssues);
          parsed = true;
        }
      } catch {
        // JSON parse failed, try console output
      }

      // Fall back to console output parsing
      if (!parsed) {
        const parsedIssues = this.parseDeptracConsoleOutput(rawOutput);
        issues.push(...parsedIssues);
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Deptrac completed: ${issues.length} architecture violations in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'deptrac',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Deptrac failed: ${error.message}`);
      return this.createFailedResult('deptrac', error.message);
    }
  }

  /**
   * Parse Deptrac JSON output
   */
  private parseDeptracJson(result: any): RawIssue[] {
    const issues: RawIssue[] = [];

    // Handle violations array
    if (result.violations && Array.isArray(result.violations)) {
      for (const violation of result.violations) {
        issues.push({
          tool: 'deptrac',
          file: violation.file || violation.classLike || 'unknown',
          line: violation.line || 1,
          severity: 'medium',
          message: violation.message || `${violation.classLike} must not depend on ${violation.dependency}`,
          rule: violation.type || 'DependsOnDisallowedLayer',
          category: 'architecture'
        });
      }
    }

    // Handle files object format
    if (result.files && typeof result.files === 'object') {
      for (const [filePath, fileData] of Object.entries(result.files)) {
        const data = fileData as any;
        for (const violation of data.violations || data.messages || []) {
          issues.push({
            tool: 'deptrac',
            file: filePath,
            line: violation.line || 1,
            severity: 'medium',
            message: violation.message || 'Architecture violation',
            rule: violation.type || 'DependsOnDisallowedLayer',
            category: 'architecture'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Parse Deptrac console output
   *
   * Example output:
   * Reason                     Repository
   * ------------------------------------------------------------------------------------------
   * DependsOnDisallowedLayer   examples\MyNamespace\Repository\SomeRepository must not
   *                            depend on examples\MyNamespace\Controllers\SomeController
   *                            You are depending on token that is a part of a layer...
   *                            /path/to/SomeRepository.php:5
   */
  private parseDeptracConsoleOutput(output: string): RawIssue[] {
    const issues: RawIssue[] = [];
    const lines = output.split('\n');

    // Pattern for violation lines
    const violationPattern = /^(DependsOnDisallowedLayer|Uncovered)\s+(.+)/i;
    // Pattern for file:line reference
    const fileLinePattern = /([^\s]+\.php):(\d+)/;

    let currentReason = '';
    let currentMessage = '';
    let currentFile = '';
    let currentLine = 1;
    let collectingMessage = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for new violation
      const violationMatch = line.match(violationPattern);
      if (violationMatch) {
        // Save previous issue if we were collecting one
        if (collectingMessage && currentMessage) {
          issues.push(this.createDeptracIssue(
            currentFile || 'unknown',
            currentLine,
            currentReason,
            currentMessage.trim()
          ));
        }

        currentReason = violationMatch[1];
        currentMessage = violationMatch[2];
        collectingMessage = true;
        currentFile = '';
        currentLine = 1;
        continue;
      }

      // Check for file:line reference
      const fileMatch = line.match(fileLinePattern);
      if (fileMatch && collectingMessage) {
        currentFile = fileMatch[1];
        currentLine = parseInt(fileMatch[2], 10);
        currentMessage += ' ' + line;
        continue;
      }

      // Continue collecting message
      if (collectingMessage && line && !line.startsWith('---') && !line.startsWith('Report')) {
        currentMessage += ' ' + line;
      }

      // End of violation on separator or report summary
      if (collectingMessage && (line.startsWith('---') || line.startsWith('Report') || line === '')) {
        if (currentMessage) {
          issues.push(this.createDeptracIssue(
            currentFile || 'unknown',
            currentLine,
            currentReason,
            currentMessage.trim()
          ));
        }
        currentMessage = '';
        collectingMessage = false;
      }
    }

    // Don't forget last issue
    if (collectingMessage && currentMessage) {
      issues.push(this.createDeptracIssue(
        currentFile || 'unknown',
        currentLine,
        currentReason,
        currentMessage.trim()
      ));
    }

    return issues;
  }

  /**
   * Create a RawIssue from Deptrac violation
   */
  private createDeptracIssue(
    file: string,
    line: number,
    reason: string,
    message: string
  ): RawIssue {
    return {
      tool: 'deptrac',
      file,
      line,
      severity: reason === 'Uncovered' ? 'low' : 'medium',
      message,
      rule: reason || 'DependsOnDisallowedLayer',
      category: 'architecture'
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  // NOTE: Legacy parsing methods for phpstan, psalm, phpcs, composer-audit
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
}

export default PHPToolOrchestrator;
