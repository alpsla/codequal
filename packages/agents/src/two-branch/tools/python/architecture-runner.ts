/**
 * Python Architecture Tool Runner
 *
 * Architecture analysis for Python code:
 * - pydeps: Dependency graph generation and circular dependency detection
 * - import-linter: Architecture layer validation
 * - Static import analysis: Module dependency patterns
 *
 * Session 59: Added as part of P2 tool integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface PythonArchitectureIssue {
  tool: 'pydeps' | 'import-linter' | 'import-analysis';
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file?: string;
  line?: number;
  details?: {
    from?: string;
    to?: string;
    cycle?: string[];
  };
}

export interface PythonArchitectureScanResult {
  tool: string;
  issues: PythonArchitectureIssue[];
  scanDuration: number;
  dependencyGraph?: Record<string, string[]>;
  metrics?: {
    totalModules: number;
    totalDependencies: number;
    circularDependencies: number;
    maxDepth: number;
  };
}

/**
 * Python Architecture Runner
 * Analyzes Python project structure and dependencies
 */
export class PythonArchitectureRunner {
  /**
   * Run pydeps for dependency graph and circular dependency detection
   * pydeps: pip install pydeps
   */
  async runPydeps(repoPath: string): Promise<PythonArchitectureIssue[]> {
    try {
      console.log('[pydeps] Analyzing Python dependencies...');

      // Find main Python package
      const packageDir = await this.findPythonPackage(repoPath);
      if (!packageDir) {
        console.log('[pydeps] No Python package found, skipping');
        return [];
      }

      // Run pydeps with JSON output for dependency graph
      const { stdout } = await execAsync(
        `pydeps ${packageDir} --show-deps --no-show --json`,
        { cwd: repoPath, timeout: 120000, maxBuffer: 50 * 1024 * 1024 }
      );

      return this.parsePydepsResults(stdout, repoPath);
    } catch (error: any) {
      // Check if pydeps is not installed
      if (error.message?.includes('command not found') || error.message?.includes('not recognized')) {
        console.log('[pydeps] Tool not installed, skipping (pip install pydeps)');
        return [];
      }

      // pydeps may return output even on error
      if (error.stdout) {
        try {
          return this.parsePydepsResults(error.stdout, repoPath);
        } catch (parseError) {
          console.warn('[pydeps] Failed to parse results:', parseError);
        }
      }
      console.warn('[pydeps] Failed:', error.message);
      return [];
    }
  }

  /**
   * Run import-linter for architecture layer validation
   * import-linter: pip install import-linter
   */
  async runImportLinter(repoPath: string): Promise<PythonArchitectureIssue[]> {
    try {
      console.log('[import-linter] Validating architecture layers...');

      // Check if .importlinter config exists
      const configFiles = [
        path.join(repoPath, '.importlinter'),
        path.join(repoPath, 'setup.cfg'),
        path.join(repoPath, 'pyproject.toml'),
      ];

      const hasConfig = configFiles.some((f) => {
        if (fs.existsSync(f)) {
          const content = fs.readFileSync(f, 'utf-8');
          return content.includes('[importlinter]') || content.includes('[tool.importlinter]');
        }
        return false;
      });

      if (!hasConfig) {
        console.log('[import-linter] No configuration found, skipping');
        return [];
      }

      const { stdout, stderr } = await execAsync('lint-imports', {
        cwd: repoPath,
        timeout: 60000,
      });

      return this.parseImportLinterResults(stdout, stderr);
    } catch (error: any) {
      // Check if import-linter is not installed
      if (error.message?.includes('command not found') || error.message?.includes('not recognized')) {
        console.log('[import-linter] Tool not installed, skipping');
        return [];
      }

      // import-linter returns non-zero when violations found
      if (error.stdout || error.stderr) {
        return this.parseImportLinterResults(error.stdout || '', error.stderr || '');
      }
      console.warn('[import-linter] Failed:', error.message);
      return [];
    }
  }

  /**
   * Run static import analysis for dependency patterns
   * No external tool required - uses Python AST parsing via grep/regex
   */
  async runImportAnalysis(repoPath: string): Promise<PythonArchitectureIssue[]> {
    const issues: PythonArchitectureIssue[] = [];

    try {
      console.log('[import-analysis] Analyzing import patterns...');

      // Find all Python files
      const pythonFiles = await this.findPythonFiles(repoPath);

      for (const file of pythonFiles.slice(0, 100)) {
        // Limit to first 100 files
        const fileIssues = await this.analyzeFileImports(file, repoPath);
        issues.push(...fileIssues);
      }

      return issues;
    } catch (error: any) {
      console.warn('[import-analysis] Failed:', error.message);
      return issues;
    }
  }

  /**
   * Run all Python architecture tools
   */
  async runAll(repoPath: string): Promise<PythonArchitectureScanResult> {
    const startTime = Date.now();
    const allIssues: PythonArchitectureIssue[] = [];

    // Run pydeps
    const pydepsIssues = await this.runPydeps(repoPath);
    allIssues.push(...pydepsIssues);

    // Run import-linter
    const importLinterIssues = await this.runImportLinter(repoPath);
    allIssues.push(...importLinterIssues);

    // Run static import analysis
    const importAnalysisIssues = await this.runImportAnalysis(repoPath);
    allIssues.push(...importAnalysisIssues);

    return {
      tool: 'python-architecture',
      issues: allIssues,
      scanDuration: Date.now() - startTime,
      metrics: {
        totalModules: 0, // Would be populated from pydeps
        totalDependencies: 0,
        circularDependencies: allIssues.filter((i) => i.rule === 'circular-dependency').length,
        maxDepth: 0,
      },
    };
  }

  // ============================================================================
  // Parsing Methods
  // ============================================================================

  private parsePydepsResults(stdout: string, repoPath: string): PythonArchitectureIssue[] {
    const issues: PythonArchitectureIssue[] = [];

    try {
      const result = JSON.parse(stdout);

      // Check for circular dependencies in the graph
      if (result.cycles && Array.isArray(result.cycles)) {
        for (const cycle of result.cycles) {
          issues.push({
            tool: 'pydeps',
            rule: 'circular-dependency',
            severity: 'high',
            message: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
            details: {
              cycle: cycle,
            },
          });
        }
      }

      // Check for deep dependency chains
      if (result.max_depth && result.max_depth > 10) {
        issues.push({
          tool: 'pydeps',
          rule: 'deep-dependency-chain',
          severity: 'medium',
          message: `Deep dependency chain detected (depth: ${result.max_depth}). Consider flattening module structure.`,
        });
      }
    } catch (parseError) {
      // Try line-by-line parsing for non-JSON output
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('cycle') || line.includes('circular')) {
          issues.push({
            tool: 'pydeps',
            rule: 'circular-dependency',
            severity: 'high',
            message: line.trim(),
          });
        }
      }
    }

    return issues;
  }

  private parseImportLinterResults(stdout: string, stderr: string): PythonArchitectureIssue[] {
    const issues: PythonArchitectureIssue[] = [];
    const output = stdout + '\n' + stderr;

    // Parse import-linter violations
    // Format: "module.name is not allowed to import other.module (contract: layer_name)"
    const violationPattern = /(\S+)\s+is not allowed to import\s+(\S+)\s*\(contract:\s*(\S+)\)/gi;
    let match;

    while ((match = violationPattern.exec(output)) !== null) {
      issues.push({
        tool: 'import-linter',
        rule: 'layer-violation',
        severity: 'high',
        message: `Architecture violation: ${match[1]} cannot import ${match[2]} (contract: ${match[3]})`,
        details: {
          from: match[1],
          to: match[2],
        },
      });
    }

    // Check for forbidden imports
    const forbiddenPattern = /Forbidden import.*?(\S+)\s+imports\s+(\S+)/gi;
    while ((match = forbiddenPattern.exec(output)) !== null) {
      issues.push({
        tool: 'import-linter',
        rule: 'forbidden-import',
        severity: 'medium',
        message: `Forbidden import: ${match[1]} imports ${match[2]}`,
        details: {
          from: match[1],
          to: match[2],
        },
      });
    }

    return issues;
  }

  private async analyzeFileImports(
    filePath: string,
    repoPath: string
  ): Promise<PythonArchitectureIssue[]> {
    const issues: PythonArchitectureIssue[] = [];

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = path.relative(repoPath, filePath);

      // Check for wildcard imports
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Wildcard import: from module import *
        if (/from\s+\S+\s+import\s+\*/.test(line)) {
          issues.push({
            tool: 'import-analysis',
            rule: 'wildcard-import',
            severity: 'medium',
            message: 'Wildcard import detected. Prefer explicit imports for clarity.',
            file: relativePath,
            line: i + 1,
          });
        }

        // Relative import going up too many levels: from .... import
        const relativeMatch = line.match(/from\s+(\.{3,})/);
        if (relativeMatch) {
          issues.push({
            tool: 'import-analysis',
            rule: 'deep-relative-import',
            severity: 'low',
            message: `Deep relative import (${relativeMatch[1].length} levels up). Consider using absolute imports.`,
            file: relativePath,
            line: i + 1,
          });
        }
      }
    } catch {
      // Ignore file read errors
    }

    return issues;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async findPythonPackage(repoPath: string): Promise<string | null> {
    // Look for common Python package indicators
    const indicators = ['setup.py', 'setup.cfg', 'pyproject.toml', '__init__.py'];

    for (const indicator of indicators) {
      const indicatorPath = path.join(repoPath, indicator);
      if (fs.existsSync(indicatorPath)) {
        // For __init__.py, return the directory
        if (indicator === '__init__.py') {
          return repoPath;
        }
        // For setup files, try to find the main package directory
        const srcDir = path.join(repoPath, 'src');
        if (fs.existsSync(srcDir)) return srcDir;

        // Look for directory with __init__.py
        const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const initPath = path.join(repoPath, entry.name, '__init__.py');
            if (fs.existsSync(initPath)) {
              return path.join(repoPath, entry.name);
            }
          }
        }
        return repoPath;
      }
    }

    return null;
  }

  private async findPythonFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];

    async function searchDir(dir: string, depth = 0): Promise<void> {
      if (depth > 5) return; // Limit depth

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden and common non-source directories
        if (
          entry.name.startsWith('.') ||
          ['node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build'].includes(entry.name)
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith('.py')) {
          files.push(fullPath);
        }
      }
    }

    await searchDir(repoPath);
    return files;
  }
}

// Export singleton runner
export const pythonArchitectureRunner = new PythonArchitectureRunner();

// Export convenience function
export async function runPythonArchitectureAnalysis(
  repoPath: string
): Promise<PythonArchitectureScanResult> {
  return pythonArchitectureRunner.runAll(repoPath);
}
