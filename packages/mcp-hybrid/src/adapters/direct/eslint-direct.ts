/**
 * ESLint Direct Adapter
 * Directly executes ESLint for JavaScript/TypeScript analysis
 */

import { DirectToolAdapter } from './base-adapter';
import { AnalysisContext, ToolResult, ToolFinding, AgentRole, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  nodeType?: string;
  messageId?: string;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  suppressedMessages: ESLintMessage[];
  errorCount: number;
  fatalErrorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
  source?: string;
}

export class ESLintDirectAdapter extends DirectToolAdapter {
  readonly id = 'eslint-direct';
  readonly name = 'ESLint Code Quality Analyzer';
  readonly version = '9.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'linting',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    },
    {
      name: 'code-smell-detection',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: { type: 'none', required: false }
  };

  canAnalyze(context: AnalysisContext): boolean {
    // Check if PR has JavaScript/TypeScript files
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    return context.pr.files.some(file => {
      const ext = path.extname(file.path).toLowerCase();
      return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
    });
  }

  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Filter files for ESLint analysis
      const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
      const jstsFiles = context.pr.files.filter(file => {
        const ext = path.extname(file.path).toLowerCase();
        return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
      });

      if (jstsFiles.length === 0) {
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings: [],
          metrics: { filesAnalyzed: 0, totalIssues: 0, errors: 0, warnings: 0 }
        };
      }

      // Create temporary directory
      const tempDir = `/tmp/eslint-direct-${Date.now()}`;
      await fs.mkdir(tempDir, { recursive: true });

      try {
        // Write files to temp directory
        for (const file of jstsFiles) {
          const filePath = path.join(tempDir, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content);
        }

        // Create basic ESLint config
        await this.writeESLintConfig(tempDir, context);

        // Run ESLint
        const eslintResults = await this.runESLint(tempDir, jstsFiles.map(f => f.path));

        // Parse results
        for (const result of eslintResults) {
          const originalFile = jstsFiles.find(f => result.filePath.endsWith(f.path));
          if (originalFile) {
            const fileFindings = this.parseESLintMessages(result, originalFile.path);
            findings.push(...fileFindings);
          }
        }

        const metrics = this.calculateMetrics(eslintResults);

        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings,
          metrics
        };
      } finally {
        // Cleanup temp directory
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'ESLINT_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }

  private async writeESLintConfig(tempDir: string, context: AnalysisContext): Promise<void> {
    const isTypeScript = context.repository.languages.includes('typescript');
    const frameworks = context.repository.frameworks || [];

    const config: Record<string, any> = {
      env: {
        browser: true,
        es2021: true,
        node: true
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        'no-unused-vars': 'warn',
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-alert': 'warn',
        'no-var': 'error',
        'prefer-const': 'warn',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'multi-line'],
        'no-eval': 'error'
      }
    };

    // Add TypeScript support
    if (isTypeScript) {
      config.parser = '@typescript-eslint/parser';
      config.plugins = ['@typescript-eslint'];
      config.extends.push('@typescript-eslint/recommended');
      config.rules['@typescript-eslint/no-unused-vars'] = 'warn';
      config.rules['no-unused-vars'] = 'off';
    }

    // Add React support
    if (frameworks.includes('react')) {
      config.plugins = config.plugins || [];
      config.plugins.push('react', 'react-hooks');
      config.extends.push('plugin:react/recommended', 'plugin:react-hooks/recommended');
      config.parserOptions.ecmaFeatures = { jsx: true };
      config.settings = { react: { version: 'detect' } };
    }

    // Use legacy .eslintrc.json format with ESLINT_USE_FLAT_CONFIG=false
    const configPath = path.join(tempDir, '.eslintrc.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  private async runESLint(tempDir: string, filePaths: string[]): Promise<ESLintResult[]> {
    return new Promise((resolve, reject) => {
      const fullPaths = filePaths.map(f => path.join(tempDir, f));
      
      const eslintProcess = spawn('npx', ['eslint', '--format', 'json', ...fullPaths], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ESLINT_USE_FLAT_CONFIG: 'false'
        }
      });

      let stdout = '';
      let stderr = '';

      eslintProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      eslintProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      eslintProcess.on('close', (code) => {
        try {
          // ESLint exits with code 1 when there are linting errors, which is expected
          if (code !== null && code > 2) {
            reject(new Error(`ESLint failed with code ${code}: ${stderr}`));
            return;
          }

          // Parse JSON output
          if (stdout.trim()) {
            const results = JSON.parse(stdout) as ESLintResult[];
            resolve(results);
          } else {
            resolve([]);
          }
        } catch (error) {
          reject(new Error(`Failed to parse ESLint output: ${error}`));
        }
      });

      eslintProcess.on('error', (error) => {
        reject(new Error(`Failed to run ESLint: ${error.message}`));
      });
    });
  }

  private parseESLintMessages(result: ESLintResult, originalPath: string): ToolFinding[] {
    const findings: ToolFinding[] = [];

    for (const message of result.messages) {
      const finding: ToolFinding = {
        type: message.severity === 2 ? 'issue' : 'suggestion',
        severity: message.severity === 2 ? 'high' : 'medium',
        category: 'code-quality',
        message: message.message,
        file: originalPath,
        line: message.line,
        column: message.column,
        ruleId: message.ruleId || undefined,
        documentation: message.ruleId 
          ? `https://eslint.org/docs/latest/rules/${message.ruleId}`
          : undefined,
        autoFixable: !!message.fix
      };

      // Enhance severity for specific rules
      if (message.ruleId === 'no-eval' || message.ruleId === 'no-implied-eval') {
        finding.severity = 'critical';
      } else if (message.ruleId === 'no-debugger' || message.ruleId === 'no-alert') {
        finding.severity = 'high';
      }

      findings.push(finding);
    }

    return findings;
  }

  private calculateMetrics(results: ESLintResult[]): Record<string, number> {
    let totalErrors = 0;
    let totalWarnings = 0;
    let fixableErrors = 0;
    let fixableWarnings = 0;
    let filesWithErrors = 0;
    let filesWithWarnings = 0;

    for (const result of results) {
      totalErrors += result.errorCount;
      totalWarnings += result.warningCount;
      fixableErrors += result.fixableErrorCount;
      fixableWarnings += result.fixableWarningCount;

      if (result.errorCount > 0) filesWithErrors++;
      if (result.warningCount > 0) filesWithWarnings++;
    }

    return {
      filesAnalyzed: results.length,
      totalIssues: totalErrors + totalWarnings,
      errors: totalErrors,
      warnings: totalWarnings,
      fixableIssues: fixableErrors + fixableWarnings,
      fixableErrors,
      fixableWarnings,
      filesWithErrors,
      filesWithWarnings,
      averageIssuesPerFile: results.length > 0 
        ? (totalErrors + totalWarnings) / results.length 
        : 0
    };
  }

  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Direct ESLint adapter for JavaScript/TypeScript linting',
      author: 'CodeQual',
      homepage: 'https://eslint.org/',
      documentationUrl: 'https://docs.codequal.com/tools/eslint-direct',
      supportedRoles: ['codeQuality'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['react', 'vue', 'angular', 'node', 'express', 'next', 'nuxt'],
      tags: ['linting', 'code-quality', 'javascript', 'typescript'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }

  /**
   * Get health check command for ESLint
   */
  protected getHealthCheckCommand(): { cmd: string; args: string[] } {
    return {
      cmd: 'npx',
      args: ['eslint', '--version']
    };
  }
}

// Export singleton instance
export const eslintDirectAdapter = new ESLintDirectAdapter();