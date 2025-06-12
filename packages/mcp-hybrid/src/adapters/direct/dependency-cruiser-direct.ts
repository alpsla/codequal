/**
 * Dependency Cruiser Direct Adapter - Enhanced with role-based filtering
 * Serves both Architecture and Dependency agents with filtered results
 */

import { spawn } from 'child_process';
import { DirectToolAdapter } from './base-adapter';
import { AnalysisContext, ToolResult, ToolFinding, AgentRole } from '../../core/interfaces';

interface DependencyCruiserViolation {
  from: string;
  to: string;
  rule: string;
  severity: string;
  message: string;
  comment?: string;
}

interface DependencyCruiserOutput {
  violations: DependencyCruiserViolation[];
}

export class DependencyCruiserDirectAdapter extends DirectToolAdapter {
  readonly id = 'dependency-cruiser-direct';
  readonly name = 'Dependency Cruiser';
  readonly version = '15.0.0';
  readonly capabilities = [
    {
      name: 'dependency-analysis',
      category: 'architecture' as const,
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx']
    }
  ];
  readonly requirements = {
    minFiles: 1,
    executionMode: 'on-demand' as const,
    timeout: 30000,
    authentication: {
      type: 'none' as const,
      required: false
    }
  };

  constructor() {
    super();
  }

  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Filter supported files that aren't deleted
      const supportedFiles = context.pr.files
        .filter(file => 
          file.changeType !== 'deleted' &&
          this.isFileSupported(file.path)
        )
        .map(file => file.path);

      if (supportedFiles.length === 0) {
        return {
          success: true,
          toolId: this.id,
          findings: [],
          metrics: { filesAnalyzed: 0 },
          executionTime: Date.now() - startTime
        };
      }

      // Run dependency-cruiser with full output
      const output = await this.runDependencyCruiser(supportedFiles);
      
      // Filter findings based on the requesting agent's role
      const agentRole = context.agentRole || this.inferAgentRole(context);
      const findings = this.filterFindingsByRole(output.violations, agentRole);
      const metrics = this.calculateMetricsByRole(output, agentRole, supportedFiles.length);
      
      return {
        success: true,
        toolId: this.id,
        findings,
        metrics,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        findings: [],
        error: {
          code: 'DEPCRUISE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        },
        executionTime: Date.now() - startTime
      };
    }
  }

  private isFileSupported(filePath: string): boolean {
    const extensions = ['.js', '.ts', '.jsx', '.tsx'];
    return extensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  private async runDependencyCruiser(files: string[]): Promise<DependencyCruiserOutput> {
    return new Promise((resolve, reject) => {
      const args = ['depcruise', '--output-type', 'json', ...files];
      const process = spawn('npx', args, { timeout: this.requirements.timeout });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            const output = JSON.parse(stdout);
            resolve(output);
          } catch {
            // Return empty violations if JSON parsing fails
            resolve({ violations: [] });
          }
        } else {
          reject(new Error(stderr || 'Dependency cruiser failed'));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private filterFindingsByRole(violations: DependencyCruiserViolation[], role: AgentRole | undefined): ToolFinding[] {
    let filteredViolations = violations;
    
    if (role === 'architecture') {
      // Architecture agent focuses on structural issues
      const architecturalRules = ['no-circular', 'no-orphans', 'no-unreachable', 'no-duplicate-dep-types'];
      filteredViolations = violations.filter(v => architecturalRules.includes(v.rule));
    } else if (role === 'dependency') {
      // Dependency agent focuses on package-level issues  
      const dependencyRules = ['not-to-deprecated', 'no-non-package-json', 'not-to-unresolvable'];
      filteredViolations = violations.filter(v => dependencyRules.includes(v.rule));
    }
    // If no specific role or unknown role, return all violations
    
    return filteredViolations.map(violation => ({
      type: 'issue',
      severity: this.mapSeverity(violation.severity),
      category: role === 'dependency' ? 'dependency' : 'architecture',
      message: violation.message,
      file: violation.from,
      ruleId: violation.rule,
      documentation: violation.comment
    }));
  }
  
  private calculateMetricsByRole(output: DependencyCruiserOutput, role: AgentRole | undefined, filesAnalyzed: number): Record<string, any> {
    const baseMetrics = {
      filesAnalyzed,
      totalViolations: output.violations.length
    };
    
    if (role === 'architecture') {
      return {
        ...baseMetrics,
        circularDependencies: output.violations.filter(v => v.rule === 'no-circular').length,
        orphanModules: output.violations.filter(v => v.rule === 'no-orphans').length,
        duplicateDependencies: output.violations.filter(v => v.rule === 'no-duplicate-dep-types').length
      };
    } else if (role === 'dependency') {
      return {
        ...baseMetrics,
        deprecatedDependencies: output.violations.filter(v => v.rule === 'not-to-deprecated').length,
        unresolvableDependencies: output.violations.filter(v => v.rule === 'not-to-unresolvable').length,
        nonPackageJsonImports: output.violations.filter(v => v.rule === 'no-non-package-json').length
      };
    }
    
    // Default metrics for unknown role
    return {
      ...baseMetrics,
      violations: output.violations.length,
      circularDependencies: output.violations.filter(v => v.rule === 'no-circular').length
    };
  }
  
  private inferAgentRole(context: AnalysisContext): AgentRole | undefined {
    // Try to infer from context if not explicitly set
    // This is a fallback - ideally agentRole should always be set
    return undefined;
  }
  
  private processViolations(violations: DependencyCruiserViolation[]): ToolFinding[] {
    return violations.map(violation => ({
      type: 'issue',
      severity: this.mapSeverity(violation.severity),
      category: 'architecture',
      message: violation.message,
      file: violation.from,
      ruleId: violation.rule,
      documentation: violation.comment
    }));
  }

  private mapSeverity(severity: string): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'error':
        return 'high';
      case 'warn':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'info';
    }
  }

  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('npx', ['depcruise', '--version'], { timeout: 5000 });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  canAnalyze(context: AnalysisContext): boolean {
    const supportedLanguages = ['javascript', 'typescript'];
    return context.repository.languages.some(lang => 
      supportedLanguages.includes(lang.toLowerCase())
    );
  }

  protected getHealthCheckCommand() {
    return { cmd: 'npx', args: ['depcruise', '--version'] };
  }

  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      description: 'Dependency analysis and validation with role-based filtering',
      author: 'CodeQual',
      supportedRoles: ['architecture', 'dependency'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      tags: ['dependencies', 'architecture', 'validation', 'circular-dependencies', 'orphan-modules'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }
}
