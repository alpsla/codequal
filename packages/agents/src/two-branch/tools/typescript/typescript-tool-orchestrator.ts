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
  OrchestrationOptions 
} from '../base-tool-orchestrator';

// Import existing TypeScript parser
import { TypeScriptToolParser, TypeScriptIssue } from '../../parsers/typescript-tool-parser';

// Import universal analysis modes
import type { AnalysisMode } from '../../config/analysis-modes';
import { 
  UNIVERSAL_ANALYSIS_MODES, 
  ToolCategory,
  getToolsForMode 
} from '../../config/analysis-modes';

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
  docker: {
    mountPath: '/workspace',
    nodeVersion: '20',
    memory: '2g'
  }
};

/**
 * TypeScript tool category mapping
 */
const TYPESCRIPT_TOOL_CATEGORIES = {
  eslint: ToolCategory.CODE_QUALITY,
  typescript: ToolCategory.CODE_QUALITY,
  'npm-audit': ToolCategory.DEPENDENCY_SCAN,
  semgrep: ToolCategory.SECURITY
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
   * Get language name (required by base)
   */
  protected getLanguageName(): string {
    return 'typescript';
  }

  /**
   * Get tools to run based on analysis mode (required by base)
   */
  protected getToolsToRun(mode: AnalysisMode, branch: 'base' | 'pr'): string[] {
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
    
    // Semgrep - Security analysis (standard and above)
    if (this.config.semgrep?.enabled && shouldTypeScriptToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }
    
    return tools;
  }

  /**
   * Override agent tool categories for TypeScript-specific mapping
   */
  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      'Security': ['semgrep', 'npm-audit'],
      'Code Quality': ['eslint', 'typescript'],
      'Performance': ['eslint'],  // ESLint has performance rules
      'Dependencies': ['npm-audit']
    };
  }

  /**
   * Execute a specific TypeScript tool (required by base)
   * Dispatches to appropriate tool-specific method
   * 
   * UPDATED: Now routes universal tools (Semgrep) to shared runners
   * This should FIX the Semgrep output issue from Test #1
   */
  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing TypeScript tool: ${toolName}`);
    
    // UNIVERSAL TOOLS: Route to shared runners
    // This ensures same Semgrep behavior across Java, TypeScript, Python, etc.
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }
    
    // LANGUAGE-SPECIFIC TOOLS: Use TypeScript-specific implementations
    switch (toolName) {
      case 'eslint':
        return this.runESLint(repoPath, branch, options.changedFiles);
      
      case 'typescript':
        return this.runTypeScriptCompiler(repoPath, branch);
      
      case 'npm-audit':
        return this.runNpmAudit(repoPath, branch);
      
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
      rule: tsIssue.category || tsIssue.code || 'unknown',
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
}

// Export for use in V9 analyzer
export default TypeScriptToolOrchestrator;

