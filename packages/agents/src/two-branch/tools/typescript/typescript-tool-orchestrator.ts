/**
 * TypeScript/JavaScript Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution!
 * 
 * This orchestrator contains TypeScript/JavaScript-specific logic:
 * - ESLint code quality and security linting
 * - TypeScript compiler type checking
 * - npm audit dependency vulnerability scanning
 * - Semgrep security analysis
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
import { determineCodeQualSeverity } from '../../utils/severity-mapper';

// Import base orchestrator
import {
  BaseToolOrchestrator,
  ToolResult,
  RawIssue,
  OrchestrationOptions,
  OrchestrationResult
} from '../base-tool-orchestrator';

// Import existing TypeScript parser
import { TypeScriptToolParser, TypeScriptIssue } from '../../parsers/typescript-tool-parser';

// Import universal analysis modes
import type { AnalysisMode } from '../../config/analysis-modes';
import {
  UNIVERSAL_ANALYSIS_MODES,
  ToolCategory,
  getToolsForMode,
  DeepSecurityOptions,
  validateCodeQLOptions
} from '../../config/analysis-modes';

// Import CodeQL runner
import {
  runCodeQL,
  runCodeQLFast,
  isCodeQLAvailable
} from '../universal/codeql-runner';

const execAsync = promisify(exec);

// ============================================================
// TYPESCRIPT-SPECIFIC TYPES
// ============================================================

/**
 * TypeScript/JavaScript-specific tool configuration
 */
export interface TypeScriptToolConfig {
  // REQUIRED TOOLS
  eslint: {
    enabled: boolean;
    configFile?: string;
    fix: boolean;
  };
  typescript: {
    enabled: boolean;
    strict: boolean;
    configFile?: string;
  };

  // OPTIONAL TOOLS
  npmAudit?: {
    enabled: boolean;
    level: 'info' | 'low' | 'moderate' | 'high' | 'critical';
    production: boolean;
  };
  semgrep?: {
    enabled: boolean;
    config: string;
  };
  dependencyCheck?: {
    enabled: boolean;
    failOnCVSS: number;
    suppressionFile?: string;
    formats: string[];  // e.g., ['JSON', 'HTML']
    caching: {
      enabled: boolean;
      location: string;
    };
  };

  // DEEP SECURITY (PRO TIER, OPT-IN ONLY)
  // SESSION 52: Changed queryPack to querySuite to align with CodeQLConfig
  codeql?: {
    enabled: boolean;
    querySuite: 'security' | 'security-extended';
  };

  // DOCKER CONFIG
  docker: {
    mountPath: string;
    nodeVersion: string;
    memory: string;
  };
}

/**
 * Default TypeScript tool configuration
 */
export const DEFAULT_TYPESCRIPT_CONFIG: TypeScriptToolConfig = {
  eslint: {
    enabled: true,
    fix: false
  },
  typescript: {
    enabled: true,
    strict: true
  },
  npmAudit: {
    enabled: true,
    level: 'moderate',
    production: false
  },
  semgrep: {
    enabled: true,
    config: 'auto'
  },
  dependencyCheck: {
    enabled: true,
    failOnCVSS: 0,  // Report all CVEs, don't fail build
    formats: ['JSON'],
    caching: {
      enabled: true,
      location: '/var/lib/dependency-check/data'  // Shared NVD cache
    }
  },
  // CodeQL - DISABLED by default, PRO tier opt-in only
  // SESSION 52: Changed queryPack to querySuite to align with CodeQLConfig
  codeql: {
    enabled: false,
    querySuite: 'security'  // Default to faster suite
  },
  docker: {
    mountPath: '/workspace',
    nodeVersion: '20',
    memory: '2g'
  }
};

/**
 * Map TypeScript tools to universal tool categories
 */
const TYPESCRIPT_TOOL_CATEGORIES = {
  eslint: ToolCategory.CODE_QUALITY,
  typescript: ToolCategory.CODE_QUALITY,
  'npm-audit': ToolCategory.DEPENDENCY_SCAN,
  'dependency-check': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY,
  codeql: ToolCategory.DEEP_SECURITY,  // Deep semantic analysis (PRO tier, opt-in)
  performance: ToolCategory.ADVANCED,   // Performance analysis tools
  architecture: ToolCategory.ADVANCED   // Architecture analysis tools
};

/**
 * Check if a TypeScript tool should run based on analysis mode
 */
function shouldTypeScriptToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = TYPESCRIPT_TOOL_CATEGORIES[toolName as keyof typeof TYPESCRIPT_TOOL_CATEGORIES];
  if (!category) return false;

  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];

  // Check based on tool category
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
// TYPESCRIPT TOOL ORCHESTRATOR (EXTENDS BASE)
// ============================================================

/**
 * TypeScript/JavaScript-specific tool orchestrator
 * 
 * Extends BaseToolOrchestrator to inherit universal orchestration logic.
 * Only implements TypeScript-specific tool execution.
 */
export class TypeScriptToolOrchestrator extends BaseToolOrchestrator {
  private config: TypeScriptToolConfig;
  private parser: TypeScriptToolParser;

  constructor(
    config: Partial<TypeScriptToolConfig> = {},
    dockerImage = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm'
  ) {
    // Call base constructor
    super(dockerImage, '/workspace');

    // Merge with defaults
    this.config = { ...DEFAULT_TYPESCRIPT_CONFIG, ...config };

    // Initialize parser
    this.parser = new TypeScriptToolParser();
  }

  // ============================================================
  // IMPLEMENT ABSTRACT METHODS FROM BASE
  // ============================================================

  /**
   * Override orchestrate to filter ESLint for monorepos
   */
  async orchestrate(
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions = {}
  ): Promise<OrchestrationResult> {
    // Detect monorepo structure before running tools
    const fs = await import('fs');
    const path = await import('path');

    const isMonorepo = await (async () => {
      try {
        const packagesDir = path.join(repoPath, 'packages');
        const appsDir = path.join(repoPath, 'apps');

        const hasPackages = await fs.promises.access(packagesDir).then(() => true).catch(() => false);
        const hasApps = await fs.promises.access(appsDir).then(() => true).catch(() => false);

        return hasPackages || hasApps;
      } catch {
        return false;
      }
    })();

    // If monorepo, disable ESLint to prevent it from appearing in tool list
    if (isMonorepo) {
      logger.info('⏭️  Monorepo detected - disabling ESLint (packages/ or apps/ directory found)');
      this.config.eslint.enabled = false;
    }

    // Call parent orchestrate method
    return super.orchestrate(repoPath, branch, options);
  }

  /**
   * Get language name (required by base)
   */
  protected getLanguageName(): string {
    return 'typescript';
  }

  /**
   * Get tools to run based on analysis mode (required by base)
   *
   * SESSION 34 OPTIMIZATION: userTier parameter for Semgrep skip logic
   * - BASIC tier: Run Semgrep here (Step 3), Lite Security Agent groups issues
   * - PRO tier: Skip Semgrep here, run scan+fix combined in Step 5.5
   *
   * CodeQL: Only runs if:
   * 1. config.codeql.enabled = true (explicit opt-in)
   * 2. userTier = 'pro' (PRO tier only)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // ESLint - Always included (code quality + security)
    if (this.config.eslint.enabled && shouldTypeScriptToolRun('eslint', mode)) {
      tools.push('eslint');
    }

    // TypeScript Compiler - Always included (type checking)
    if (this.config.typescript.enabled && shouldTypeScriptToolRun('typescript', mode)) {
      tools.push('typescript');
    }

    // npm audit - Standard and above (dependency vulnerabilities)
    if (this.config.npmAudit?.enabled && shouldTypeScriptToolRun('npm-audit', mode)) {
      tools.push('npm-audit');
    }

    // Dependency-Check - CVE scanning (standard and above)
    if (this.config.dependencyCheck?.enabled && shouldTypeScriptToolRun('dependency-check', mode)) {
      tools.push('dependency-check');
    }

    // Semgrep - Security analysis
    // SESSION 34 FIX: Always run Semgrep in Step 3 for all tiers
    // The PRO tier optimization was incomplete - scan-fix-executor doesn't run Semgrep,
    // so skipping here meant PRO tier missed security scanning entirely!
    if (this.config.semgrep?.enabled && shouldTypeScriptToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }

    // CodeQL - Deep semantic security analysis (PRO tier, opt-in only)
    // NOTE: CodeQL is NOT controlled by analysis mode - it's a separate opt-in
    // This adds significant time (5-30 min) so must be explicitly enabled
    if (this.config.codeql?.enabled && userTier === 'pro') {
      tools.push('codeql');
      logger.info('🔬 CodeQL deep security analysis enabled (PRO tier opt-in)');
    }

    // Performance Tools - Standard and above (Lighthouse, Bundle Analyzer, ESLint-Perf)
    if (shouldTypeScriptToolRun('performance', mode)) {
      tools.push('performance');
    }

    // Architecture Tools - Standard and above (Madge, Dependency Cruiser, ts-unused-exports)
    if (shouldTypeScriptToolRun('architecture', mode)) {
      tools.push('architecture');
    }

    return tools;
  }

  /**
   * Override agent tool categories for TypeScript-specific mapping
   */
  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'npm-audit', 'dependency-check'],
      'Code Quality': ['eslint', 'typescript'],
      'Performance': ['performance'],  // Lighthouse, Bundle Analyzer, ESLint-Perf
      'Architecture': ['architecture'],  // Madge, Dependency Cruiser, ts-unused-exports
      'Dependencies': ['npm-audit', 'dependency-check']
    };
  }

  /**
   * Execute a specific TypeScript tool (required by base)
   * Dispatches to appropriate tool-specific method
   * 
   * UPDATED: Now routes universal tools (Semgrep) to shared runners
   * UPDATED: Added Performance and Architecture tools
   */
  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    // Route universal tools to shared runners (Semgrep, Dependency-Check)
    if (this.isUniversalTool(toolName)) {
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // Route to TypeScript-specific tool methods
    switch (toolName.toLowerCase()) {
      case 'eslint': {
        // Detect monorepo structure before running ESLint to save time
        // ESLint has issues with monorepos due to root .eslintrc.json with "root": true
        const fs = await import('fs');
        const path = await import('path');

        const isMonorepo = await (async () => {
          try {
            const packagesDir = path.join(repoPath, 'packages');
            const appsDir = path.join(repoPath, 'apps');

            const hasPackages = await fs.promises.access(packagesDir).then(() => true).catch(() => false);
            const hasApps = await fs.promises.access(appsDir).then(() => true).catch(() => false);

            return hasPackages || hasApps;
          } catch {
            return false;
          }
        })();

        // Skip ESLint immediately for monorepos to save ~2 seconds
        if (isMonorepo) {
          logger.info('⏭️  Skipping ESLint - monorepo detected (packages/ or apps/ directory found)');
          return {
            tool: 'eslint',
            success: true,
            duration: 0,
            issues: [],
            rawOutput: 'ESLint skipped - monorepo structure detected',
            metadata: {
              filesScanned: 0,
              issuesFound: 0,
              severity: { critical: 0, high: 0, medium: 0, low: 0 },
              skipped: true,
              skipReason: 'Monorepo detected (packages/ or apps/ directory) - ESLint has configuration conflicts with nested configs'
            }
          };
        }

        // Try to run ESLint for simple repos
        try {
          const result = await this.runESLint(repoPath, branch, options.changedFiles);

          // If ESLint found 0 issues and scanned 0 files, mark as skipped
          const scannedZeroFiles = result.rawOutput.includes('0 files') ||
            result.rawOutput.includes('Discovered 0 files') ||
            (result.issues.length === 0 && result.rawOutput.length < 100);

          if (scannedZeroFiles) {
            return {
              tool: 'eslint',
              success: true,
              duration: result.duration || 0,
              issues: [],
              rawOutput: result.rawOutput,
              metadata: {
                filesScanned: 0,
                issuesFound: 0,
                severity: { critical: 0, high: 0, medium: 0, low: 0 },
                skipped: true,
                skipReason: 'ESLint found 0 files to scan'
              }
            };
          }

          // ESLint ran successfully and found files/issues
          return result;
        } catch (error: any) {
          // ESLint failed - skip gracefully
          logger.warn(`[ESLint] Skipping due to error: ${error.message}`);
          return {
            tool: 'eslint',
            success: true,
            duration: 0,
            issues: [],
            rawOutput: `ESLint skipped: ${error.message}`,
            metadata: {
              filesScanned: 0,
              issuesFound: 0,
              severity: { critical: 0, high: 0, medium: 0, low: 0 },
              skipped: true,
              skipReason: `ESLint execution failed: ${error.message}`
            }
          };
        }
      }

      case 'typescript':
        return this.runTypeScriptCompiler(repoPath, branch);

      case 'npm-audit':
        return this.runNpmAudit(repoPath, branch);

      case 'dependency-check':
        return this.runDependencyCheck(repoPath, branch);

      case 'performance': {
        // Get all TypeScript/JavaScript files for performance analysis
        const { stdout: filesOutput } = await execAsync(
          `find ${repoPath} -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) | grep -v node_modules | head -100`,
          { maxBuffer: 10 * 1024 * 1024 }
        );
        const files = filesOutput.trim().split('\n').filter(f => f);
        return this.executePerformanceTools(repoPath, branch, files);
      }

      case 'architecture': {
        return this.executeArchitectureTools(repoPath, branch);
      }

      case 'codeql': {
        return this.runCodeQLAnalysis(repoPath, branch);
      }

      default:
        throw new Error(`Unknown TypeScript tool: ${toolName}`);
    }
  }

  // ============================================================
  // TYPESCRIPT-SPECIFIC TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run ESLint code quality and security analysis
   */
  private async runESLint(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running ESLint analysis on ${branch} branch...`);

      // Use existing parser (handles both Docker and local execution)
      const result = await this.parser.runESLint(repoPath, changedFiles);

      // Convert TypeScriptIssue[] to RawIssue[]
      const rawIssues: RawIssue[] = result.issues.map(this.convertTypeScriptIssueToRaw.bind(this));

      const duration = Date.now() - startTime;

      logger.info(`✅ ESLint completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'eslint',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ ESLint failed: ${error.message}`);

      return {
        tool: 'eslint',
        success: false,
        duration,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
          skipped: true,
          skipReason: `Failed: ${error.message}`
        }
      };
    }
  }

  /**
   * Run TypeScript compiler type checking
   */
  private async runTypeScriptCompiler(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running TypeScript compiler on ${branch} branch...`);

      // Use existing parser
      const result = await this.parser.runTypeScriptCompiler(repoPath);

      // Convert TypeScriptIssue[] to RawIssue[]
      const rawIssues: RawIssue[] = result.issues.map(this.convertTypeScriptIssueToRaw.bind(this));

      const duration = Date.now() - startTime;

      logger.info(`✅ TypeScript completed: ${rawIssues.length} type errors in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'typescript',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ TypeScript compiler failed: ${error.message}`);

      return {
        tool: 'typescript',
        success: false,
        duration,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
          skipped: true,
          skipReason: `Failed: ${error.message}`
        }
      };
    }
  }

  /**
   * Run npm audit for dependency vulnerabilities
   */
  private async runNpmAudit(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running npm audit on ${branch} branch...`);

      // Use existing parser
      const result = await this.parser.runNpmAudit(repoPath);

      // Convert TypeScriptIssue[] to RawIssue[]
      const rawIssues: RawIssue[] = result.issues.map(this.convertTypeScriptIssueToRaw.bind(this));

      const duration = Date.now() - startTime;

      logger.info(`✅ npm audit completed: ${rawIssues.length} vulnerabilities in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'npm-audit',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: result.rawOutput,
        metadata: this.calculateMetadata(rawIssues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ npm audit failed: ${error.message}`);

      return {
        tool: 'npm-audit',
        success: false,
        duration,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
          skipped: true,
          skipReason: `Failed: ${error.message}`
        }
      };
    }
  }

  // runSemgrep() removed - Semgrep now handled by base class executeUniversalTool()
  // See executeTool() method which routes universal tools to the base class

  /**
   * Run OWASP Dependency-Check for CVE scanning
   * Uses shared PostgreSQL/NVD database infrastructure (updated daily at 2am)
   * Same fast performance as Java (<10s) via shared cache
   */
  private async runDependencyCheck(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const outputFileName = `dependency-check-${branch}.json`;
    const outputFile = path.join(repoPath, outputFileName);

    try {
      logger.info(`🔐 Running Dependency-Check CVE scanning on ${branch} branch...`);

      // Dependency-Check: Use entrypoint bash -c and output to directory
      // Same infrastructure as Java - shared PostgreSQL/NVD cache
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${this.workspaceDir}" \
        -v "${this.config.dependencyCheck!.caching.location}:/cache" \
        ${this.dockerImage} \
        -c '/opt/dependency-check/bin/dependency-check.sh --scan ${this.workspaceDir} --format JSON --out ${this.workspaceDir} --data /cache --failOnCVSS ${this.config.dependencyCheck!.failOnCVSS} || true'`;

      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024 });

      // Dependency-Check always outputs to dependency-check-report.json
      const defaultOutputFile = path.join(repoPath, 'dependency-check-report.json');

      // Read from default location
      const resultContent = await fs.readFile(defaultOutputFile, 'utf-8');
      const depCheckResult = JSON.parse(resultContent);

      // Rename to our expected filename for consistency
      await fs.rename(defaultOutputFile, outputFile);

      const issues: RawIssue[] = [];

      if (depCheckResult.dependencies) {
        for (const dep of depCheckResult.dependencies) {
          if (dep.vulnerabilities) {
            for (const vuln of dep.vulnerabilities) {
              issues.push({
                tool: 'dependency-check',
                file: dep.fileName || 'dependencies',
                line: 1,
                severity: this.mapCVSSSeverity(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0),
                message: vuln.description || `CVE: ${vuln.name}`,
                rule: vuln.name,
                category: 'Dependency',
                cwe: vuln.cwes?.join(', '),
                autoFixable: false
              });
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Dependency-Check complete: ${issues.length} CVEs found in ${(duration / 1000).toFixed(1)}s`);

      // Count actual dependencies scanned, not just files with issues
      const filesScanned = depCheckResult.dependencies?.length || 0;

      const severity = {
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      };

      return {
        tool: 'dependency-check',
        success: true,
        duration,
        issues,
        metadata: {
          filesScanned,
          issuesFound: issues.length,
          severity
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Dependency-Check failed: ${error.message}`);

      return {
        tool: 'dependency-check',
        success: false,
        duration,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
          skipped: true,
          skipReason: `Failed: ${error.message}`
        }
      };
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Convert TypeScriptIssue to RawIssue format
   * Adapter method for compatibility with BaseToolOrchestrator
   */
  private convertTypeScriptIssueToRaw(tsIssue: TypeScriptIssue): RawIssue {
    return {
      tool: tsIssue.tool,
      file: tsIssue.file,
      line: tsIssue.line,
      column: tsIssue.column,
      severity: tsIssue.severity,
      message: tsIssue.message,
      // Use code field (ESLint rule ID) if available, otherwise category
      rule: tsIssue.code || tsIssue.category || 'unknown',
      category: this.mapTypeScriptTypeToCategory(tsIssue.type),
      autoFixable: tsIssue.fixable
    };
  }

  /**
   * Map TypeScript issue type to category
   */
  private mapTypeScriptTypeToCategory(type: string): string {
    const mapping: Record<string, string> = {
      'security': 'security',
      'performance': 'performance',
      'quality': 'code-quality',
      'bug': 'bug',
      'style': 'style',
      'type-error': 'type-error',
      'test': 'test-coverage'
    };
    return mapping[type] || 'code-quality';
  }

  /**
   * Map TypeScript-specific severity descriptors
   */
  private mapTypeScriptSeverity(tsType: string, message: string): 'critical' | 'high' | 'medium' | 'low' {
    // Security issues get higher severity
    if (tsType === 'security') {
      if (message.toLowerCase().includes('injection') || message.toLowerCase().includes('xss')) {
        return 'critical';
      }
      return 'high';
    }

    // Type errors
    if (tsType === 'type-error') {
      return 'high';
    }

    // Bugs
    if (tsType === 'bug') {
      return 'high';
    }

    // Performance issues
    if (tsType === 'performance') {
      return 'medium';
    }

    // Style and quality
    return 'low';
  }

  /**
   * Map CVSS score to CodeQual severity
   * Same mapping as Java for consistency
   */
  private mapCVSSSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  // ============================================================
  // CODEQL DEEP SECURITY ANALYSIS (PRO TIER ONLY)
  // ============================================================

  /**
   * Run CodeQL deep security analysis
   *
   * This provides semantic analysis that finds complex vulnerabilities
   * that pattern-based tools (Semgrep, ESLint) cannot detect:
   * - Data flow analysis (taint tracking)
   * - Cross-function/cross-file analysis
   * - Complex SQL injection through indirect paths
   * - Command injection with sanitization bypasses
   *
   * Only available for PRO tier users with explicit opt-in.
   * Adds 5-30 minutes to analysis depending on codebase size.
   */
  private async runCodeQLAnalysis(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Check if CodeQL is available
      const available = await isCodeQLAvailable();
      if (!available) {
        logger.warn('⚠️ CodeQL not available - skipping deep security analysis');
        return {
          tool: 'codeql',
          success: true,
          duration: Date.now() - startTime,
          issues: [],
          rawOutput: 'CodeQL not available on this system',
          metadata: {
            filesScanned: 0,
            issuesFound: 0,
            severity: { critical: 0, high: 0, medium: 0, low: 0 },
            skipped: true,
            skipReason: 'CodeQL CLI not available'
          }
        };
      }

      // SESSION 52: Fixed - CodeQLConfig uses 'querySuite' not 'queryPack'
      const querySuite = this.config.codeql?.querySuite || 'security';
      logger.info(`🔬 Running CodeQL deep security analysis on ${branch} branch (${querySuite} suite)...`);

      // Run CodeQL analysis using the universal runner
      const issues = await runCodeQL(repoPath, 'javascript', {
        querySuite,
        // SESSION 52: Removed invalid 'outputFormat' and 'useDocker' - not in CodeQLConfig
        timeout: 30 * 60 * 1000 // 30 minutes max
      });

      // Convert CodeQL issues to RawIssue format
      // SESSION 52: Fixed - Issue type uses 'title'/'description'/'rule', not 'message'/'ruleId'
      const rawIssues: RawIssue[] = issues.map(issue => ({
        tool: 'codeql',
        file: issue.file,
        line: issue.line,
        severity: this.mapCodeQLSeverity(issue.severity),
        message: issue.title || issue.description, // Issue uses 'title' not 'message'
        rule: issue.rule, // Issue uses 'rule' not 'ruleId'
        category: 'security',
        cwe: issue.cwe,
        autoFixable: false, // CodeQL issues are complex - require manual review
        fixTier: 3 as const // Tier 3 = AI/Manual review
      }));

      const duration = Date.now() - startTime;

      logger.info(`✅ CodeQL completed: ${rawIssues.length} security issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'codeql',
        success: true,
        duration,
        issues: rawIssues,
        rawOutput: `CodeQL ${querySuite} analysis found ${rawIssues.length} issues`,
        metadata: {
          filesScanned: -1, // CodeQL doesn't report this directly
          issuesFound: rawIssues.length,
          severity: this.calculateSeverityCounts(rawIssues)
        }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ CodeQL analysis failed: ${error.message}`);

      return {
        tool: 'codeql',
        success: false,
        duration,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 },
          skipped: true,
          skipReason: `Failed: ${error.message}`
        }
      };
    }
  }

  /**
   * Map CodeQL severity to CodeQual severity
   */
  private mapCodeQLSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'critical';
      case 'warning':
      case 'high':
        return 'high';
      case 'note':
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Calculate severity counts from issues
   */
  private calculateSeverityCounts(issues: RawIssue[]): { critical: number; high: number; medium: number; low: number } {
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

// Export for use in V9 analyzer
export default TypeScriptToolOrchestrator;

