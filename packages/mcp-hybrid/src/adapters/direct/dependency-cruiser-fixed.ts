/**
 * Fixed Dependency Cruiser Direct Adapter
 * This version properly analyzes directories instead of individual files
 */

import { DirectToolAdapter } from './base-adapter';
import { AnalysisContext, ToolResult, ToolFinding, AgentRole } from '../../core/interfaces';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DependencyCruiserDirectAdapterFixed extends DirectToolAdapter {
  readonly id = 'dependency-cruiser-direct';
  readonly name = 'Dependency Cruiser';
  readonly version = '15.0.0';
  
  readonly capabilities = [
    {
      name: 'dependency-analysis',
      category: 'architecture' as const,
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']
    }
  ];
  
  readonly requirements = {
    minFiles: 1,
    executionMode: 'on-demand' as const,
    timeout: 30000,
    authentication: { type: 'none' as const, required: false }
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
      // Filter supported files
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
      
      // Create a temporary directory and write files
      const tempDir = `/tmp/depcruise-${Date.now()}`;
      await fs.mkdir(tempDir, { recursive: true });
      
      try {
        // Write all files to temp directory maintaining their structure
        for (const file of jsFiles) {
          const filePath = path.join(tempDir, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content || '');
        }
        
        // Create a comprehensive config to detect circular dependencies
        const config = {
          forbidden: [
            {
              name: 'no-circular',
              severity: 'error',
              comment: 'Circular dependencies lead to initialization problems and make code harder to maintain',
              from: {},
              to: { circular: true }
            },
            {
              name: 'no-orphans',
              severity: 'warn',
              comment: 'Orphan modules are not imported by any other module',
              from: { orphan: true, pathNot: '\\.(test|spec|d\\.ts)' },
              to: {}
            }
          ],
          options: {
            doNotFollow: {
              path: 'node_modules'
            },
            tsPreCompilationDeps: true,
            combinedDependencies: true,
            externalModuleResolutionStrategy: 'node_modules',
            progress: { type: 'none' },
            tsConfig: {
              fileName: 'tsconfig.json'
            },
            enhancedResolveOptions: {
              exportsFields: ['exports'],
              conditionNames: ['import', 'require', 'node', 'default']
            }
          }
        };
        
        await fs.writeFile(
          path.join(tempDir, '.dependency-cruiser.js'),
          `module.exports = ${JSON.stringify(config, null, 2)};`
        );
        
        // Create a basic tsconfig.json for TypeScript analysis
        const tsConfig = {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            skipLibCheck: true
          },
          include: ['src/**/*'],
          exclude: ['node_modules']
        };
        
        await fs.writeFile(
          path.join(tempDir, 'tsconfig.json'),
          JSON.stringify(tsConfig, null, 2)
        );
        
        // Always analyze the src directory to ensure proper dependency resolution
        const analyzeDir = 'src';
        
        // Run dependency analysis on the directory
        const { stdout, stderr, code } = await this.executeCommand('npx', [
          'dependency-cruiser',
          '--config', '.dependency-cruiser.js',
          '--output-type', 'json',
          analyzeDir
        ], {
          cwd: tempDir,
          timeout: this.requirements.timeout
        });
        
        // Dependency-cruiser returns non-zero exit code when violations are found
        // This is expected behavior, not an error
        if (process.env.NODE_ENV === 'development') {
          console.log('Dependency cruiser exit code:', code);
          console.log('STDOUT length:', stdout.length);
          console.log('STDERR:', stderr);
        }
        
        if (!stdout || stdout.trim().length === 0) {
          // Only throw error if there's no output at all
          console.error('No output from dependency cruiser');
          console.error('Exit code:', code);
          console.error('STDERR:', stderr);
          throw new Error(`Dependency cruiser produced no output: ${stderr || 'Unknown error'}`);
        }
        
        // Debug: Log raw output for debugging (only in development)
        if (process.env.NODE_ENV === 'development' && stdout.length < 2000) {
          console.log('Dependency cruiser raw output:', stdout);
        }
        
        const result = this.parseJsonOutput(stdout);
        if (!result) {
          console.error('Failed to parse dependency cruiser output');
          throw new Error('Invalid JSON output from dependency cruiser');
        }
        
        const violations = result.violations || [];
        
        // Convert violations to findings
        violations.forEach((violation: any) => {
          findings.push({
            type: 'issue',
            severity: this.mapSeverity(violation.severity || 'error'),
            category: 'architecture',
            message: violation.message || `${violation.rule}: ${violation.from} → ${violation.to}`,
            file: violation.from,
            ruleId: violation.rule || 'dependency-issue',
            documentation: violation.comment
          });
        });
        
        // Also check modules for circular dependencies if no violations found
        if (findings.length === 0 && result.modules) {
          result.modules.forEach((module: any) => {
            if (module.dependencies) {
              module.dependencies.forEach((dep: any) => {
                if (dep.circular) {
                  findings.push({
                    type: 'issue',
                    severity: 'high',
                    category: 'architecture',
                    message: `Circular dependency: ${module.source} → ${dep.resolved}`,
                    file: module.source,
                    ruleId: 'no-circular',
                    documentation: 'Circular dependencies can cause initialization problems and make code harder to maintain'
                  });
                }
              });
            }
            
            // Check for orphans
            if (module.orphan && !module.source.match(/\.(test|spec|d\.ts)/)) {
              findings.push({
                type: 'issue',
                severity: 'medium',
                category: 'architecture',
                message: `Orphan module: ${module.source}`,
                file: module.source,
                ruleId: 'no-orphans',
                documentation: 'This module is not imported by any other module'
              });
            }
          });
        }
        
        // Calculate metrics
        const circularCount = findings.filter(f => f.ruleId === 'no-circular').length;
        const orphanCount = findings.filter(f => f.ruleId === 'no-orphans').length;
        
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings,
          metrics: {
            filesAnalyzed: jsFiles.length,
            violations: findings.length,
            circularDependencies: circularCount,
            orphanModules: orphanCount
          }
        };
      } finally {
        // Cleanup temp directory
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch (error: any) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings: [],
        error: {
          code: 'DEPCRUISE_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
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
    return { cmd: 'npx', args: ['dependency-cruiser', '--version'] };
  }
  
  getMetadata() {
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
