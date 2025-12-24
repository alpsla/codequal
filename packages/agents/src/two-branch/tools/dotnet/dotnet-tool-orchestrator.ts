/**
 * .NET/C# Tool Orchestrator for V9
 *
 * Extends BaseToolOrchestrator for parallel tool execution.
 *
 * This orchestrator contains .NET-specific logic:
 * - dotnet format: Code style and formatting analyzer
 * - Security Code Scan: Security vulnerability analyzer for .NET
 * - dotnet-outdated: NuGet package vulnerability scanner
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
// DOTNET-SPECIFIC TYPES
// ============================================================

export interface DotnetToolConfig {
  dotnetFormat: {
    enabled: boolean;
    severity: 'info' | 'warn' | 'error';
  };
  securityCodeScan: {
    enabled: boolean;
  };
  dotnetOutdated: {
    enabled: boolean;
    includePrerelease: boolean;
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  docker: {
    mountPath: string;
    sdkVersion: string;
    memory: string;
  };
}

export const DEFAULT_DOTNET_CONFIG: DotnetToolConfig = {
  dotnetFormat: {
    enabled: true,
    severity: 'warn'
  },
  securityCodeScan: {
    enabled: true
  },
  dotnetOutdated: {
    enabled: true,
    includePrerelease: false
  },
  semgrep: {
    enabled: true,
    config: 'auto'
  },
  docker: {
    mountPath: '/workspace',
    sdkVersion: '8.0',
    memory: '4g'
  }
};

const DOTNET_TOOL_CATEGORIES = {
  'dotnet-format': ToolCategory.CODE_QUALITY,
  'security-code-scan': ToolCategory.SECURITY,
  'dotnet-outdated': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY
};

function shouldDotnetToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = DOTNET_TOOL_CATEGORIES[toolName as keyof typeof DOTNET_TOOL_CATEGORIES];
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
// DOTNET TOOL ORCHESTRATOR
// ============================================================

export class DotnetToolOrchestrator extends BaseToolOrchestrator {
  private config: DotnetToolConfig;
  
  // Parser validation wrapper (Session 58 - Migration Phase 2)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<DotnetToolConfig> = {},
    dockerImage = 'mcr.microsoft.com/dotnet/sdk:8.0'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_DOTNET_CONFIG, ...config };
    
    // Initialize parser validation (Session 58 - Migration Phase 2)
    this.parserValidator = createParserValidationWrapper({
      language: 'csharp',
      enabled: true,
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['semgrep', 'dotnet-format', 'security-code-scan', 'dotnet-outdated'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
  }

  protected getLanguageName(): string {
    return 'csharp';
  }

  /**
   * Get tools to run based on analysis mode
   *
   * .NET tools:
   * - dotnet format: Code style and formatting
   * - security-code-scan: Security vulnerability analysis
   * - dotnet-outdated: NuGet package vulnerabilities
   * - semgrep: Security patterns (via universal runner)
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // dotnet format - Code style analyzer
    if (this.config.dotnetFormat.enabled && shouldDotnetToolRun('dotnet-format', mode)) {
      tools.push('dotnet-format');
    }

    // Security Code Scan - .NET security analyzer
    if (this.config.securityCodeScan.enabled && shouldDotnetToolRun('security-code-scan', mode)) {
      tools.push('security-code-scan');
    }

    // dotnet-outdated - NuGet vulnerability scanner
    if (this.config.dotnetOutdated.enabled && shouldDotnetToolRun('dotnet-outdated', mode)) {
      tools.push('dotnet-outdated');
    }

    // Semgrep - Security analysis (via universal runner)
    if (this.config.semgrep.enabled && shouldDotnetToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }

    return tools;
  }

  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'security-code-scan'],
      'Code Quality': ['dotnet-format'],
      'Dependencies': ['dotnet-outdated']
    };
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing .NET tool: ${toolName}`);

    // Route universal tools to shared runners
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }

    // Route to .NET-specific tool methods
    switch (toolName) {
      case 'dotnet-format':
        return this.runDotnetFormat(repoPath, branch);
      case 'security-code-scan':
        return this.runSecurityCodeScan(repoPath, branch);
      case 'dotnet-outdated':
        return this.runDotnetOutdated(repoPath, branch);
      default:
        throw new Error(`Unknown .NET tool: ${toolName}`);
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run dotnet format - Code style and formatting analyzer
   * Reports style violations without fixing them
   */
  private async runDotnetFormat(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running dotnet format on ${branch} branch...`);

      // Find solution or project file
      const { slnFile, csprojFiles } = await this.findDotnetProject(repoPath);

      if (!slnFile && csprojFiles.length === 0) {
        logger.warn('⚠️ No .sln or .csproj found - skipping dotnet format');
        return this.createSkippedResult('dotnet-format', 'No .sln or .csproj found');
      }

      const target = slnFile || csprojFiles[0];
      const severity = this.config.dotnetFormat.severity;

      // Run dotnet format in verify mode (report issues, don't fix)
      const command = `cd "${repoPath}" && dotnet format "${target}" --verify-no-changes --severity ${severity} --verbosity diagnostic 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // dotnet format exits with non-zero when issues found
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles dotnet format output
      const issues = this.parserValidator.validate('dotnet-format', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ dotnet format completed: ${issues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'dotnet-format',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ dotnet format failed: ${error.message}`);
      return this.createFailedResult('dotnet-format', error.message);
    }
  }

  /**
   * Run Security Code Scan - .NET security analyzer
   * Detects security vulnerabilities in .NET code
   */
  private async runSecurityCodeScan(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running Security Code Scan on ${branch} branch...`);

      // Find solution or project file
      const { slnFile, csprojFiles } = await this.findDotnetProject(repoPath);

      if (!slnFile && csprojFiles.length === 0) {
        logger.warn('⚠️ No .sln or .csproj found - skipping Security Code Scan');
        return this.createSkippedResult('security-code-scan', 'No .sln or .csproj found');
      }

      const target = slnFile || csprojFiles[0];

      // Build with Roslyn analyzers to detect security issues
      // Security Code Scan is typically added as a NuGet package to the project
      const command = `cd "${repoPath}" && dotnet build "${target}" -warnaserror:SCS -v:n 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 15 * 60 * 1000 // Build can take longer
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        // Build exits with non-zero when security warnings are errors
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles Security Code Scan output
      const issues = this.parserValidator.validate('security-code-scan', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ Security Code Scan completed: ${issues.length} security issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'security-code-scan',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Security Code Scan failed: ${error.message}`);
      return this.createFailedResult('security-code-scan', error.message);
    }
  }

  /**
   * Run dotnet-outdated - NuGet package vulnerability scanner
   * Checks for vulnerable or outdated packages
   */
  private async runDotnetOutdated(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running dotnet-outdated on ${branch} branch...`);

      // Find solution or project file
      const { slnFile, csprojFiles } = await this.findDotnetProject(repoPath);

      if (!slnFile && csprojFiles.length === 0) {
        logger.warn('⚠️ No .sln or .csproj found - skipping dotnet-outdated');
        return this.createSkippedResult('dotnet-outdated', 'No .sln or .csproj found');
      }

      const target = slnFile || csprojFiles[0];

      // Use dotnet list package --vulnerable for security issues
      const command = `cd "${repoPath}" && dotnet list "${target}" package --vulnerable --format json 2>&1`;

      let rawOutput = '';

      try {
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 5 * 60 * 1000
        });
        rawOutput = stdout || stderr;
      } catch (error: any) {
        rawOutput = error.stdout || error.stderr || '';
      }

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline parsing removed - enhanced parser handles dotnet-outdated JSON output
      const issues = this.parserValidator.validate('dotnet-outdated', rawOutput, []);

      const duration = Date.now() - startTime;
      logger.info(`✅ dotnet-outdated completed: ${issues.length} vulnerable packages in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'dotnet-outdated',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ dotnet-outdated failed: ${error.message}`);
      return this.createFailedResult('dotnet-outdated', error.message);
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async findDotnetProject(repoPath: string): Promise<{
    slnFile: string | null;
    csprojFiles: string[];
  }> {
    let slnFile: string | null = null;
    const csprojFiles: string[] = [];

    try {
      const files = await fs.readdir(repoPath);

      for (const file of files) {
        if (file.endsWith('.sln')) {
          slnFile = file;
        } else if (file.endsWith('.csproj')) {
          csprojFiles.push(file);
        }
      }

      // If no files found in root, look in src directory
      if (!slnFile && csprojFiles.length === 0) {
        const srcPath = path.join(repoPath, 'src');
        if (existsSync(srcPath)) {
          const srcFiles = await fs.readdir(srcPath);
          for (const file of srcFiles) {
            if (file.endsWith('.sln')) {
              slnFile = path.join('src', file);
            } else if (file.endsWith('.csproj')) {
              csprojFiles.push(path.join('src', file));
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return { slnFile, csprojFiles };
  }

  // NOTE: Legacy parsing methods for dotnet-format, security-code-scan, dotnet-outdated
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

export default DotnetToolOrchestrator;
