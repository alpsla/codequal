/**
 * Rust Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution.
 *
 * This orchestrator contains Rust-specific logic:
 * - clippy: Official Rust linter with 700+ lint rules
 * - cargo-audit: Security vulnerability scanner for Cargo.lock
 * - cargo-deny: Checks licenses, bans, sources, and vulnerabilities
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
// RUST-SPECIFIC TYPES
// ============================================================

export interface RustToolConfig {
  clippy: {
    enabled: boolean;
    allTargets: boolean; // --all-targets
    allFeatures: boolean; // --all-features
  };
  cargoAudit: {
    enabled: boolean;
    denyWarnings: boolean;
  };
  cargoDeny: {
    enabled: boolean;
    checks: ('licenses' | 'bans' | 'advisories' | 'sources')[];
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  // SESSION 57 Part 5: Architecture analysis tools
  cargoModules: {
    enabled: boolean;
    checkAcyclic: boolean; // --acyclic flag for circular dependency detection
    checkOrphans: boolean; // Also run orphans check
  };
  docker: {
    mountPath: string;
    rustVersion: string;
    memory: string;
  };
}

export const DEFAULT_RUST_CONFIG: RustToolConfig = {
  clippy: {
    enabled: true,
    allTargets: true,
    allFeatures: false // Some projects have feature gates that conflict
  },
  cargoAudit: {
    enabled: true,
    denyWarnings: false
  },
  cargoDeny: {
    enabled: true,
    checks: ['advisories', 'bans'] // Most common checks
  },
  semgrep: {
    enabled: true,
    config: 'auto'
  },
  // SESSION 57 Part 5: Architecture analysis
  cargoModules: {
    enabled: true,
    checkAcyclic: true,  // Detect circular dependencies
    checkOrphans: true   // Detect orphaned modules
  },
  docker: {
    mountPath: '/workspace',
    rustVersion: '1.75',
    memory: '4g' // Rust builds can be memory-intensive
  }
};

const RUST_TOOL_CATEGORIES = {
  clippy: ToolCategory.CODE_QUALITY,
  'cargo-audit': ToolCategory.DEPENDENCY_SCAN,
  'cargo-deny': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY,
  // SESSION 57 Part 5: Architecture tools
  'cargo-modules': ToolCategory.ADVANCED  // Architecture analysis - only in 'complete' mode
};

function shouldRustToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = RUST_TOOL_CATEGORIES[toolName as keyof typeof RUST_TOOL_CATEGORIES];
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
// RUST TOOL ORCHESTRATOR
// ============================================================

export class RustToolOrchestrator extends BaseToolOrchestrator {
  private config: RustToolConfig;
  
  // Parser validation wrapper (Session 58 - Migration Phase 2)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<RustToolConfig> = {},
    dockerImage = 'rust:1.75-alpine'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_RUST_CONFIG, ...config };
    
    // Initialize parser validation (Session 58 - Migration Phase 2)
    this.parserValidator = createParserValidationWrapper({
      language: 'rust',
      enabled: true,
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['semgrep', 'clippy', 'cargo-audit', 'cargo-deny'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
  }

  protected getLanguageName(): string {
    return 'rust';
  }

  /**
   * Get tools to run based on analysis mode
   *
   * Rust tools:
   * - clippy: Official linter with 700+ lint rules
   * - cargo-audit: Security vulnerabilities in dependencies
   * - cargo-deny: License + ban + advisory checking
   * - semgrep: Security patterns (via universal runner)
   * - cargo-modules: Architecture analysis (SESSION 57 Part 5)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // clippy - Official Rust linter
    if (this.config.clippy.enabled && shouldRustToolRun('clippy', mode)) {
      tools.push('clippy');
    }

    // cargo-audit - Security vulnerability scanner
    if (this.config.cargoAudit.enabled && shouldRustToolRun('cargo-audit', mode)) {
      tools.push('cargo-audit');
    }

    // cargo-deny - License, bans, advisories, sources checker
    if (this.config.cargoDeny.enabled && shouldRustToolRun('cargo-deny', mode)) {
      tools.push('cargo-deny');
    }

    // Semgrep - Security analysis (via universal runner)
    if (this.config.semgrep.enabled && shouldRustToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }

    // SESSION 57 Part 5: Architecture analysis
    // cargo-modules - Module structure and dependency analysis (only in 'complete' mode)
    if (this.config.cargoModules.enabled && shouldRustToolRun('cargo-modules', mode)) {
      tools.push('cargo-modules');
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'cargo-audit', 'cargo-deny'],
      'Code Quality': ['clippy'],
      'Performance': [],
      'Architecture': ['cargo-modules'],  // SESSION 57 Part 5
      'Dependencies': ['cargo-audit', 'cargo-deny']
    };
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing Rust tool: ${toolName}`);

    // Route universal tools to shared runners
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // Route to Rust-specific tool methods
    switch (toolName) {
      case 'clippy':
        return this.runClippy(repoPath, branch);
      case 'cargo-audit':
        return this.runCargoAudit(repoPath, branch);
      case 'cargo-deny':
        return this.runCargoDeny(repoPath, branch);
      // SESSION 57 Part 5: Architecture tools
      case 'cargo-modules':
        return this.runCargoModules(repoPath, branch);
      default:
        throw new Error(`Unknown Rust tool: ${toolName}`);
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run clippy - Official Rust linter
   * Provides 700+ lint rules for catching common mistakes
   */
  private async runClippy(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running clippy on ${branch} branch...`);

      // Check if Cargo.toml exists
      const cargoTomlPath = path.join(repoPath, 'Cargo.toml');
      if (!existsSync(cargoTomlPath)) {
        logger.warn('⚠️ No Cargo.toml found - skipping clippy');
        return this.createSkippedResult('clippy', 'No Cargo.toml found');
      }

      // Build clippy command
      let command = `cd "${repoPath}" && cargo clippy --message-format=json`;

      if (this.config.clippy.allTargets) {
        command += ' --all-targets';
      }
      if (this.config.clippy.allFeatures) {
        command += ' --all-features';
      }

      command += ' -- -D warnings 2>&1';

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000, // 10 minute timeout for compilation
          env: { ...process.env, CARGO_TERM_COLOR: 'never' }
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // clippy exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles Clippy JSON lines
      const issues = this.parserValidator.validate('clippy', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ clippy completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'clippy',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ clippy failed: ${error.message}`);
      return this.createFailedResult('clippy', error.message);
    }
  }

  /**
   * Run cargo-audit - Security vulnerability scanner
   * Checks Cargo.lock against RustSec advisory database
   */
  private async runCargoAudit(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running cargo-audit on ${branch} branch...`);

      // Check if Cargo.lock exists (required for audit)
      const cargoLockPath = path.join(repoPath, 'Cargo.lock');
      if (!existsSync(cargoLockPath)) {
        logger.warn('⚠️ No Cargo.lock found - skipping cargo-audit');
        return this.createSkippedResult('cargo-audit', 'No Cargo.lock found (run cargo build first)');
      }

      let command = `cd "${repoPath}" && cargo audit --json`;

      if (this.config.cargoAudit.denyWarnings) {
        command += ' --deny warnings';
      }

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // cargo-audit exits with non-zero when vulnerabilities found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles cargo-audit JSON
      const issues = this.parserValidator.validate('cargo-audit', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ cargo-audit completed: ${issues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'cargo-audit',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ cargo-audit failed: ${error.message}`);
      return this.createFailedResult('cargo-audit', error.message);
    }
  }

  /**
   * Run cargo-deny - License, ban, and advisory checker
   * Comprehensive dependency policy enforcement
   */
  private async runCargoDeny(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running cargo-deny on ${branch} branch...`);

      // Check if Cargo.toml exists
      const cargoTomlPath = path.join(repoPath, 'Cargo.toml');
      if (!existsSync(cargoTomlPath)) {
        logger.warn('⚠️ No Cargo.toml found - skipping cargo-deny');
        return this.createSkippedResult('cargo-deny', 'No Cargo.toml found');
      }

      // Build command with selected checks
      const checks = this.config.cargoDeny.checks.join(' ');
      const command = `cd "${repoPath}" && cargo deny check ${checks} --format json 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // cargo-deny exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles cargo-deny JSON lines
      const issues = this.parserValidator.validate('cargo-deny', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ cargo-deny completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'cargo-deny',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ cargo-deny failed: ${error.message}`);
      return this.createFailedResult('cargo-deny', error.message);
    }
  }

  /**
   * Run cargo-modules - Architecture analyzer (SESSION 57 Part 5)
   *
   * cargo-modules analyzes Rust crate structure:
   * - Module hierarchy visualization
   * - Internal dependency graph
   * - Circular dependency detection (--acyclic)
   * - Orphaned module detection
   */
  private async runCargoModules(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🏗️ Running cargo-modules on ${branch} branch...`);

      // Check if Cargo.toml exists
      const cargoTomlPath = path.join(repoPath, 'Cargo.toml');
      if (!existsSync(cargoTomlPath)) {
        logger.warn('⚠️ No Cargo.toml found - skipping cargo-modules');
        return this.createSkippedResult('cargo-modules', 'No Cargo.toml found');
      }

      const issues: RawIssue[] = [];
      let rawOutput = '';

      // Run circular dependency check with --acyclic flag
      if (this.config.cargoModules.checkAcyclic) {
        try {
          const acyclicCommand = `cd "${repoPath}" && cargo modules dependencies --acyclic --no-externs --no-sysroot 2>&1`;
          const { stdout, stderr } = await execAsync(acyclicCommand, {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 5 * 60 * 1000,
            env: { ...process.env, NO_COLOR: '1' }
          });
          rawOutput += stdout || stderr;
        } catch (error: any) {
          // cargo-modules exits with error when cycles found
          const output = error.stdout || error.stderr || '';
          rawOutput += output;

          // Check if it's a "command not found" error
          if (output.includes('command not found') || output.includes('not found')) {
            logger.warn('⚠️ cargo-modules not installed - skipping');
            return this.createSkippedResult('cargo-modules', 'cargo-modules not installed (run: cargo install cargo-modules)');
          }

          // Parse circular dependency errors
          const cycleIssues = this.parseCargoModulesCycles(output);
          issues.push(...cycleIssues);
        }
      }

      // Run orphan module check
      if (this.config.cargoModules.checkOrphans) {
        try {
          const orphansCommand = `cd "${repoPath}" && cargo modules orphans 2>&1`;
          const { stdout, stderr } = await execAsync(orphansCommand, {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 2 * 60 * 1000,
            env: { ...process.env, NO_COLOR: '1' }
          });
          const orphansOutput = stdout || stderr;
          rawOutput += '\n' + orphansOutput;

          // Parse orphan warnings
          const orphanIssues = this.parseCargoModulesOrphans(orphansOutput);
          issues.push(...orphanIssues);
        } catch (error: any) {
          // Orphan check may fail or warn
          const output = error.stdout || error.stderr || '';
          rawOutput += '\n' + output;

          const orphanIssues = this.parseCargoModulesOrphans(output);
          issues.push(...orphanIssues);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ cargo-modules completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'cargo-modules',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ cargo-modules failed: ${error.message}`);
      return this.createFailedResult('cargo-modules', error.message);
    }
  }

  /**
   * Parse circular dependency errors from cargo-modules --acyclic output
   */
  private parseCargoModulesCycles(output: string): RawIssue[] {
    const issues: RawIssue[] = [];

    // Pattern: "Error: Circular dependency between `module_a` and `module_b`"
    const cyclePattern = /Circular dependency between `([^`]+)` and `([^`]+)`/gi;
    let match;

    while ((match = cyclePattern.exec(output)) !== null) {
      const [_, moduleA, moduleB] = match;
      issues.push({
        tool: 'cargo-modules',
        file: 'src/lib.rs', // Cycles are typically in lib.rs
        line: 1,
        severity: 'high',
        message: `Circular dependency between \`${moduleA}\` and \`${moduleB}\``,
        rule: 'circular-dependency',
        category: 'architecture'
      });
    }

    // Also check for general cycle error messages
    if (output.includes('cycle') || output.includes('Circular')) {
      // If no specific matches but cycle mentioned, add general issue
      if (issues.length === 0 && (output.includes('Error') || output.includes('error'))) {
        issues.push({
          tool: 'cargo-modules',
          file: 'src/lib.rs',
          line: 1,
          severity: 'high',
          message: 'Module dependency cycle detected - review module structure',
          rule: 'circular-dependency',
          category: 'architecture'
        });
      }
    }

    return issues;
  }

  /**
   * Parse orphan module warnings from cargo-modules orphans output
   */
  private parseCargoModulesOrphans(output: string): RawIssue[] {
    const issues: RawIssue[] = [];

    // Pattern: "warning: orphaned module `foo` at src/orphans/foo/mod.rs"
    const orphanPattern = /orphaned module `([^`]+)` at ([^\s]+)/gi;
    let match;

    while ((match = orphanPattern.exec(output)) !== null) {
      const [_, moduleName, filePath] = match;
      issues.push({
        tool: 'cargo-modules',
        file: filePath,
        line: 1,
        severity: 'medium',
        message: `Orphaned module \`${moduleName}\` - not linked from any parent module`,
        rule: 'orphan-module',
        category: 'architecture'
      });
    }

    return issues;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  // NOTE: Legacy parsing methods for clippy, cargo-audit, cargo-deny
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

export default RustToolOrchestrator;
