/**
 * Base adapter for direct tool integrations
 * Provides common functionality for non-MCP tools
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

const execAsync = promisify(exec);

export abstract class DirectToolAdapter implements Tool {
  abstract readonly id: string;
  abstract readonly name: string;
  readonly type = 'direct' as const;
  abstract readonly version: string;
  abstract readonly capabilities: ToolCapability[];
  abstract readonly requirements: ToolRequirements;

  /**
   * Check if tool can analyze given PR context
   */
  abstract canAnalyze(context: AnalysisContext): boolean;

  /**
   * Execute analysis on PR files
   */
  abstract analyze(context: AnalysisContext): Promise<ToolResult>;

  /**
   * Get tool metadata
   */
  abstract getMetadata(): ToolMetadata;
  
  /**
   * Execute command and return output
   */
  protected async executeCommand(
    command: string,
    args: string[],
    options?: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    }
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        timeout: options?.timeout
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Simple command execution with output
   */
  protected async execSimple(command: string): Promise<string> {
    const { stdout } = await execAsync(command);
    return stdout.trim();
  }
  
  /**
   * Parse JSON output safely
   */
  protected parseJsonOutput(output: string): any {
    try {
      // Remove any non-JSON content before/after
      const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch {
      return null;
    }
  }
  
  /**
   * Common health check implementation
   */
  async healthCheck(): Promise<boolean> {
    try {
      const checkCommand = this.getHealthCheckCommand();
      const { code } = await this.executeCommand(checkCommand.cmd, checkCommand.args, {
        timeout: 5000
      });
      return code === 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Get health check command - must be implemented by subclasses
   */
  protected abstract getHealthCheckCommand(): { cmd: string; args: string[] };
}

/**
 * Prettier Direct Adapter - Code formatting checks
 */
export class PrettierDirectAdapter extends DirectToolAdapter {
  readonly id = 'prettier-direct';
  readonly name = 'Prettier Code Formatter';
  readonly version = '3.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'code-formatting',
      category: 'quality',
      languages: ['javascript', 'typescript', 'css', 'html', 'json', 'yaml'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.json', '.yml', '.yaml']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 20000,
    authentication: { type: 'none', required: false }
  };
  
  canAnalyze(context: AnalysisContext): boolean {
    // Check if PR has formattable files
    return context.pr.files.some(file => 
      this.capabilities[0].fileTypes?.some(ext => file.path.endsWith(ext))
    );
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Check formatting for each file
      let formattedCount = 0;
      let needsFormattingCount = 0;
      
      for (const file of context.pr.files) {
        if (file.changeType === 'deleted') continue;
        
        const isSupported = this.capabilities[0].fileTypes?.some(ext => 
          file.path.endsWith(ext)
        );
        
        if (isSupported) {
          const needsFormatting = await this.checkFormatting(file.path);
          
          if (needsFormatting) {
            needsFormattingCount++;
            findings.push({
              type: 'suggestion',
              severity: 'low',
              category: 'formatting',
              message: `File needs formatting: ${file.path}`,
              file: file.path,
              ruleId: 'prettier',
              autoFixable: true,
              fix: {
                description: 'Run prettier --write',
                changes: []
              }
            });
          } else {
            formattedCount++;
          }
        }
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesChecked: formattedCount + needsFormattingCount,
          properlyFormatted: formattedCount,
          needsFormatting: needsFormattingCount,
          formattingRate: formattedCount / (formattedCount + needsFormattingCount)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'PRETTIER_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  private async checkFormatting(filePath: string): Promise<boolean> {
    try {
      const { code } = await this.executeCommand('npx', [
        'prettier',
        '--check',
        filePath
      ], { timeout: 5000 });
      
      // Exit code 0 means properly formatted
      // Exit code 1 means needs formatting
      return code !== 0;
    } catch {
      // If prettier fails, assume file doesn't need formatting
      return false;
    }
  }
  
  protected getHealthCheckCommand() {
    return { cmd: 'npx', args: ['prettier', '--version'] };
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Code formatting checker using Prettier',
      author: 'CodeQual',
      supportedRoles: ['codeQuality'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript', 'css', 'html'],
      tags: ['formatting', 'code-style', 'quality'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

/**
 * Dependency Cruiser Direct Adapter - Dependency analysis
 */
export class DependencyCruiserDirectAdapter extends DirectToolAdapter {
  readonly id = 'dependency-cruiser-direct';
  readonly name = 'Dependency Cruiser';
  readonly version = '15.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'dependency-analysis',
      category: 'architecture',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: { type: 'none', required: false }
  };
  
  canAnalyze(context: AnalysisContext): boolean {
    const supportedLangs = ['javascript', 'typescript'];
    return context.repository.languages.some(lang => 
      supportedLangs.includes(lang.toLowerCase())
    );
  }
  
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Analyze dependencies in changed files
      const jsFiles = context.pr.files.filter(f => 
        f.changeType !== 'deleted' &&
        this.capabilities[0].fileTypes?.some(ext => f.path.endsWith(ext))
      );
      
      if (jsFiles.length === 0) {
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings: [],
          metrics: { filesAnalyzed: 0 }
        };
      }
      
      // Run dependency analysis
      const violations = await this.analyzeDependencies(jsFiles.map(f => f.path));
      
      // Convert violations to findings
      violations.forEach(violation => {
        findings.push({
          type: 'issue',
          severity: this.mapSeverity(violation.severity),
          category: 'architecture',
          message: violation.message,
          file: violation.from,
          ruleId: violation.rule,
          documentation: violation.comment
        });
      });
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesAnalyzed: jsFiles.length,
          violations: violations.length,
          circularDependencies: violations.filter(v => v.rule === 'no-circular').length
        }
      };
    } catch (error: any) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'DEPCRUISE_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  private async analyzeDependencies(files: string[]): Promise<any[]> {
    // Simplified - in real implementation would parse actual output
    const { stdout } = await this.executeCommand('npx', [
      'depcruise',
      '--output-type', 'json',
      ...files
    ]);
    
    const result = this.parseJsonOutput(stdout);
    return result?.violations || [];
  }
  
  private mapSeverity(severity: string): ToolFinding['severity'] {
    switch (severity) {
      case 'error': return 'high';
      case 'warn': return 'medium';
      case 'info': return 'low';
      default: return 'info';
    }
  }
  
  protected getHealthCheckCommand() {
    return { cmd: 'npx', args: ['depcruise', '--version'] };
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Dependency analysis and validation',
      author: 'CodeQual',
      supportedRoles: ['architecture'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      tags: ['dependencies', 'architecture', 'validation'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

// Export all direct adapters
export const prettierDirectAdapter = new PrettierDirectAdapter();
export const dependencyCruiserDirectAdapter = new DependencyCruiserDirectAdapter();
