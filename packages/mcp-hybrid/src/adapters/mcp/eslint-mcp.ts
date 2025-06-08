/**
 * ESLint MCP Adapter
 * Primary code quality tool for JavaScript/TypeScript analysis
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
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
  suggestions?: Array<{
    desc: string;
    messageId?: string;
    fix: {
      range: [number, number];
      text: string;
    };
  }>;
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
  usedDeprecatedRules?: Array<{
    ruleId: string;
    replacedBy: string[];
  }>;
}

export class ESLintMCPAdapter implements Tool {
  readonly id = 'eslint-mcp';
  readonly name = 'ESLint MCP';
  readonly type = 'mcp' as const;
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
    },
    {
      name: 'auto-fix',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'persistent',
    timeout: 30000, // 30 seconds
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  private mcpProcess?: ChildProcess;
  private isInitialized = false;
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // ESLint can analyze if there are JS/TS files in the PR
    const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    
    return context.pr.files.some(file => {
      const ext = path.extname(file.path).toLowerCase();
      return supportedExtensions.includes(ext) && file.changeType !== 'deleted';
    });
  }
  
  /**
   * Execute ESLint analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Initialize MCP server if not already running
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Filter files for ESLint analysis
      const jstsFiles = context.pr.files.filter(file => {
        const ext = path.extname(file.path).toLowerCase();
        const supported = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
        return supported.includes(ext) && file.changeType !== 'deleted';
      });
      
      if (jstsFiles.length === 0) {
        return {
          success: true,
          toolId: this.id,
          executionTime: Date.now() - startTime,
          findings: [],
          metrics: {
            filesAnalyzed: 0,
            errors: 0,
            warnings: 0,
            fixable: 0
          }
        };
      }
      
      // Run ESLint on each file
      const results = await this.runESLint(jstsFiles, context);
      
      // Parse results into findings
      findings.push(...this.parseESLintResults(results));
      
      // Calculate metrics
      const metrics = this.calculateMetrics(results);
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics
      };
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'ESLINT_FAILED',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Initialize ESLint MCP server
   */
  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start ESLint MCP server
      this.mcpProcess = spawn('npx', ['@eslint/mcp'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      this.mcpProcess.on('error', (error) => {
        reject(new Error(`Failed to start ESLint MCP server: ${error.message}`));
      });
      
      // Wait for server to be ready
      setTimeout(() => {
        this.isInitialized = true;
        resolve();
      }, 2000);
    });
  }
  
  /**
   * Run ESLint on files
   */
  private async runESLint(
    files: Array<{ path: string; content: string }>,
    context: AnalysisContext
  ): Promise<ESLintResult[]> {
    const results: ESLintResult[] = [];
    
    // Create temporary directory for analysis
    const tempDir = `/tmp/eslint-${context.userContext.userId}-${Date.now()}`;
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      // Write files to temp directory
      for (const file of files) {
        const filePath = path.join(tempDir, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }
      
      // Check if there's a custom ESLint config in the PR
      const configFile = context.pr.files.find(f => 
        f.path === '.eslintrc.js' || 
        f.path === '.eslintrc.json' ||
        f.path === '.eslintrc.yml' ||
        f.path === 'eslint.config.js' ||
        f.path === 'eslint.config.mjs'
      );
      
      if (configFile && configFile.changeType !== 'deleted') {
        const configPath = path.join(tempDir, configFile.path);
        await fs.writeFile(configPath, configFile.content);
      } else {
        // Use default config for the detected framework
        await this.writeDefaultConfig(tempDir, context);
      }
      
      // Run ESLint via MCP
      const eslintResults = await this.executeMCPCommand({
        command: 'lint',
        args: {
          files: files.map(f => path.join(tempDir, f.path)),
          format: 'json',
          fix: false // Don't auto-fix for analysis
        }
      });
      
      // Parse and map results
      if (eslintResults && Array.isArray(eslintResults)) {
        for (const result of eslintResults) {
          // Map temp paths back to original paths
          const originalPath = files.find(f => 
            path.join(tempDir, f.path) === result.filePath
          )?.path;
          
          if (originalPath) {
            results.push({
              ...result,
              filePath: originalPath
            });
          }
        }
      }
    } finally {
      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
    
    return results;
  }
  
  /**
   * Write default ESLint config based on detected framework
   */
  private async writeDefaultConfig(tempDir: string, context: AnalysisContext): Promise<void> {
    const frameworks = context.repository.frameworks || [];
    const isTypeScript = context.repository.languages.includes('typescript');
    
    const config: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
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
        'curly': ['error', 'multi-line']
      }
    };
    
    // Add TypeScript support
    if (isTypeScript) {
      config.parser = '@typescript-eslint/parser';
      config.plugins = ['@typescript-eslint'];
      config.extends.push(
        'plugin:@typescript-eslint/recommended'
      );
      config.rules['@typescript-eslint/no-unused-vars'] = 'warn';
      config.rules['no-unused-vars'] = 'off';
    }
    
    // Add React support
    if (frameworks.includes('react')) {
      config.plugins = config.plugins || [];
      config.plugins.push('react', 'react-hooks');
      config.extends.push(
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
      );
      config.parserOptions.ecmaFeatures = {
        jsx: true
      };
      config.settings = {
        react: {
          version: 'detect'
        }
      };
    }
    
    // Add Vue support
    if (frameworks.includes('vue')) {
      config.extends.push('plugin:vue/vue3-recommended');
      if (isTypeScript) {
        config.parserOptions.parser = '@typescript-eslint/parser';
      }
    }
    
    // Write config file
    const configPath = path.join(tempDir, '.eslintrc.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
  
  /**
   * Execute MCP command
   */
  private async executeMCPCommand(command: any): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    return new Promise((resolve, reject) => {
      if (!this.mcpProcess) {
        reject(new Error('ESLint MCP server not initialized'));
        return;
      }
      
      // Send command to MCP server
      const request = {
        jsonrpc: '2.0',
        method: command.command,
        params: command.args,
        id: Date.now()
      };
      
      this.mcpProcess.stdin?.write(JSON.stringify(request) + '\n');
      
      // Handle response
      const handleResponse = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === request.id) {
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
            this.mcpProcess?.stdout?.off('data', handleResponse);
          }
        } catch (error) {
          // Partial data, wait for more
        }
      };
      
      this.mcpProcess.stdout?.on('data', handleResponse);
      
      // Timeout
      setTimeout(() => {
        this.mcpProcess?.stdout?.off('data', handleResponse);
        reject(new Error('ESLint MCP command timeout'));
      }, this.requirements.timeout);
    });
  }
  
  /**
   * Parse ESLint results into tool findings
   */
  private parseESLintResults(results: ESLintResult[]): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    for (const result of results) {
      for (const message of result.messages) {
        const finding: ToolFinding = {
          type: message.severity === 2 ? 'issue' : 'suggestion',
          severity: this.mapSeverity(message.severity),
          category: 'code-quality',
          message: message.message,
          file: result.filePath,
          line: message.line,
          column: message.column,
          ruleId: message.ruleId || undefined,
          documentation: message.ruleId 
            ? `https://eslint.org/docs/latest/rules/${message.ruleId}`
            : undefined,
          autoFixable: !!message.fix
        };
        
        // Add fix information if available
        if (message.fix) {
          finding.fix = {
            description: `Apply ESLint auto-fix for ${message.ruleId || 'issue'}`,
            changes: [{
              file: result.filePath,
              line: message.line,
              oldText: '', // Would need source mapping
              newText: message.fix.text
            }]
          };
        }
        
        // Add suggestions if available
        if (message.suggestions && message.suggestions.length > 0) {
          finding.message += '\nSuggestions:\n' + 
            message.suggestions.map((s, i) => `${i + 1}. ${s.desc}`).join('\n');
        }
        
        findings.push(finding);
      }
      
      // Add deprecated rule warnings
      if (result.usedDeprecatedRules) {
        for (const deprecated of result.usedDeprecatedRules) {
          findings.push({
            type: 'info',
            severity: 'info',
            category: 'configuration',
            message: `Rule '${deprecated.ruleId}' is deprecated. Replace with: ${deprecated.replacedBy.join(', ') || 'Remove this rule'}`,
            file: result.filePath
          });
        }
      }
    }
    
    return findings;
  }
  
  /**
   * Calculate metrics from ESLint results
   */
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
  
  /**
   * Map ESLint severity to tool severity
   */
  private mapSeverity(eslintSeverity: 1 | 2): ToolFinding['severity'] {
    return eslintSeverity === 2 ? 'high' : 'medium';
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if we can run eslint
      return new Promise((resolve) => {
        const child = spawn('npx', ['eslint', '--version'], {
          timeout: 5000
        });
        
        child.on('close', (code) => {
          resolve(code === 0);
        });
        
        child.on('error', () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }
  
  /**
   * Cleanup when shutting down
   */
  async cleanup(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
      this.isInitialized = false;
    }
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'ESLint Model Context Protocol adapter for JavaScript/TypeScript linting',
      author: 'CodeQual',
      homepage: 'https://eslint.org/',
      documentationUrl: 'https://docs.codequal.com/tools/eslint-mcp',
      supportedRoles: ['codeQuality'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['react', 'vue', 'angular', 'node', 'express', 'next', 'nuxt'],
      tags: ['linting', 'code-quality', 'javascript', 'typescript', 'auto-fix'],
      securityVerified: true,
      lastVerified: new Date('2025-06-08')
    };
  }
}

// Export singleton instance
export const eslintMCPAdapter = new ESLintMCPAdapter();
