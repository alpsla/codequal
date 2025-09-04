/**
 * Missing JavaScript/TypeScript Tools Implementation
 * 
 * Implements the tools that were identified as missing in the comprehensive analysis
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';

export interface ToolResult {
  tool: string;
  findings: any[];
  metadata?: {
    executionTime: number;
    filesAnalyzed?: number;
    errors?: string[];
  };
}

/**
 * JSHint - JavaScript linter (legacy but still used)
 */
export class JSHintTool {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      // Check if jshint is available
      try {
        execSync('which jshint', { stdio: 'pipe' });
      } catch {
        return {
          tool: 'jshint',
          findings: [],
          metadata: {
            executionTime: Date.now() - startTime,
            errors: ['JSHint not installed. Run: npm install -g jshint']
          }
        };
      }
      
      // Run jshint
      try {
        const output = execSync(`jshint ${targetPath} --reporter=json`, {
          cwd: targetPath,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        if (output) {
          const results = JSON.parse(output);
          results.forEach((issue: any) => {
            findings.push({
              severity: issue.code?.startsWith('E') ? 'high' : 'medium',
              title: issue.reason,
              file: issue.file,
              line: issue.line,
              column: issue.character,
              rule: issue.code
            });
          });
        }
      } catch (error: any) {
        // JSHint returns non-zero on errors
        if (error.stdout) {
          try {
            const results = JSON.parse(error.stdout);
            results.forEach((issue: any) => {
              findings.push({
                severity: issue.code?.startsWith('E') ? 'high' : 'medium',
                title: issue.reason,
                file: issue.file,
                line: issue.line,
                column: issue.character,
                rule: issue.code
              });
            });
          } catch {
            // Parsing failed
          }
        }
      }
      
      return {
        tool: 'jshint',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed: findings.length > 0 ? 1 : 0
        }
      };
    } catch (error: any) {
      return {
        tool: 'jshint',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }
}

/**
 * JSCS - JavaScript Code Style checker (deprecated but checking for completeness)
 */
export class JSCSTool {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    
    // JSCS is deprecated, return informational message
    return {
      tool: 'jscs',
      findings: [],
      metadata: {
        executionTime: Date.now() - startTime,
        errors: ['JSCS is deprecated. Use ESLint with style rules instead.']
      }
    };
  }
}

/**
 * Dependency Cruiser - Validates and visualizes dependencies
 */
export class DependencyCruiserTool {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      // Check if dependency-cruiser is available
      try {
        execSync('which depcruise', { stdio: 'pipe' });
      } catch {
        return {
          tool: 'dependency-cruiser',
          findings: [],
          metadata: {
            executionTime: Date.now() - startTime,
            errors: ['dependency-cruiser not installed. Run: npm install -g dependency-cruiser']
          }
        };
      }
      
      // Run dependency-cruiser
      try {
        const output = execSync(`depcruise --output-type json src`, {
          cwd: targetPath,
          encoding: 'utf8',
          stdio: 'pipe',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        
        if (output) {
          const result = JSON.parse(output);
          
          // Check for violations
          if (result.summary?.violations) {
            result.summary.violations.forEach((violation: any) => {
              findings.push({
                severity: violation.rule.severity || 'medium',
                title: `Dependency violation: ${violation.rule.name}`,
                description: violation.comment || violation.rule.comment,
                file: violation.from,
                dependency: violation.to,
                rule: violation.rule.name
              });
            });
          }
          
          // Check for circular dependencies
          if (result.summary?.error > 0) {
            findings.push({
              severity: 'high',
              title: 'Circular dependencies detected',
              description: `Found ${result.summary.error} circular dependency violations`,
              recommendation: 'Refactor to remove circular dependencies'
            });
          }
        }
      } catch (error: any) {
        // Parse error output if available
        if (error.message.includes('no such file')) {
          // No src directory, try current directory
          const output = execSync(`depcruise --output-type json .`, {
            cwd: targetPath,
            encoding: 'utf8',
            stdio: 'pipe'
          });
          // Process output as above
        }
      }
      
      return {
        tool: 'dependency-cruiser',
        findings,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        tool: 'dependency-cruiser',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }
}

/**
 * Complexity Report - Generates complexity reports for JavaScript
 */
export class ComplexityReportTool {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      // Check if cr (complexity-report) is available
      try {
        execSync('which cr', { stdio: 'pipe' });
      } catch {
        return {
          tool: 'complexity-report',
          findings: [],
          metadata: {
            executionTime: Date.now() - startTime,
            errors: ['complexity-report not installed. Run: npm install -g complexity-report']
          }
        };
      }
      
      // Run complexity-report
      try {
        const output = execSync(`cr --format json ${targetPath}`, {
          encoding: 'utf8',
          stdio: 'pipe',
          maxBuffer: 10 * 1024 * 1024
        });
        
        if (output) {
          const report = JSON.parse(output);
          
          // Check aggregate complexity
          if (report.aggregate) {
            const complexity = report.aggregate.cyclomatic;
            if (complexity > 100) {
              findings.push({
                severity: 'high',
                title: 'High overall complexity',
                description: `Total cyclomatic complexity: ${complexity}`,
                recommendation: 'Consider breaking down complex modules'
              });
            }
          }
          
          // Check individual module complexity
          if (report.reports) {
            report.reports.forEach((module: any) => {
              if (module.aggregate?.cyclomatic > 20) {
                findings.push({
                  severity: module.aggregate.cyclomatic > 30 ? 'high' : 'medium',
                  title: `Complex module: ${module.path}`,
                  description: `Cyclomatic complexity: ${module.aggregate.cyclomatic}`,
                  file: module.path,
                  metrics: {
                    cyclomatic: module.aggregate.cyclomatic,
                    halstead: module.aggregate.halstead,
                    maintainability: module.maintainability
                  }
                });
              }
            });
          }
        }
      } catch (error: any) {
        if (error.stderr?.includes('ENOENT')) {
          // File not found, skip
        } else {
          throw error;
        }
      }
      
      return {
        tool: 'complexity-report',
        findings,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        tool: 'complexity-report',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }
}

/**
 * ESLint Plugin SonarJS - Additional code quality rules
 */
export class ESLintSonarJSPlugin {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      // Check if eslint and plugin are available
      const eslintConfigPath = path.join(targetPath, '.eslintrc.json');
      
      if (!fs.existsSync(eslintConfigPath)) {
        // Create temporary config with sonarjs plugin
        const tempConfig = {
          "extends": ["plugin:sonarjs/recommended"],
          "plugins": ["sonarjs"],
          "env": {
            "es6": true,
            "node": true
          },
          "parserOptions": {
            "ecmaVersion": 2020,
            "sourceType": "module"
          }
        };
        
        fs.writeFileSync(
          path.join(targetPath, '.eslintrc.sonarjs.json'),
          JSON.stringify(tempConfig, null, 2)
        );
      }
      
      // Run ESLint with SonarJS plugin
      try {
        const configFile = fs.existsSync(eslintConfigPath) ? '.eslintrc.json' : '.eslintrc.sonarjs.json';
        const output = execSync(
          `npx eslint --config ${configFile} --format json .`,
          {
            cwd: targetPath,
            encoding: 'utf8',
            stdio: 'pipe'
          }
        );
        
        if (output) {
          const results = JSON.parse(output);
          results.forEach((file: any) => {
            file.messages?.forEach((msg: any) => {
              if (msg.ruleId?.startsWith('sonarjs/')) {
                findings.push({
                  severity: msg.severity === 2 ? 'high' : 'medium',
                  title: msg.message,
                  file: file.filePath,
                  line: msg.line,
                  column: msg.column,
                  rule: msg.ruleId
                });
              }
            });
          });
        }
      } catch (error: any) {
        // ESLint returns non-zero on lint errors
        if (error.stdout) {
          try {
            const results = JSON.parse(error.stdout);
            results.forEach((file: any) => {
              file.messages?.forEach((msg: any) => {
                if (msg.ruleId?.startsWith('sonarjs/')) {
                  findings.push({
                    severity: msg.severity === 2 ? 'high' : 'medium',
                    title: msg.message,
                    file: file.filePath,
                    line: msg.line,
                    column: msg.column,
                    rule: msg.ruleId
                  });
                }
              });
            });
          } catch {
            // Parsing failed
          }
        }
      } finally {
        // Clean up temporary config
        const tempConfigPath = path.join(targetPath, '.eslintrc.sonarjs.json');
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }
      }
      
      return {
        tool: 'eslint-plugin-sonarjs',
        findings,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        tool: 'eslint-plugin-sonarjs',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }
}

/**
 * Lighthouse - Performance testing for web apps
 */
export class LighthouseTool {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      // Check if this is a web application
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check for web frameworks
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const isWebApp = Object.keys(deps).some(dep => 
          ['react', 'vue', 'angular', 'next', 'nuxt', 'gatsby'].includes(dep)
        );
        
        if (isWebApp) {
          findings.push({
            severity: 'info',
            title: 'Web application detected',
            description: 'Lighthouse performance testing available for production builds',
            recommendation: 'Run lighthouse CI in your build pipeline for performance metrics'
          });
        }
      }
      
      return {
        tool: 'lighthouse',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: ['Lighthouse requires a running web server. Use in CI/CD pipeline.']
        }
      };
    } catch (error: any) {
      return {
        tool: 'lighthouse',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }
}

/**
 * Webpack Bundle Analyzer - Analyzes webpack bundle sizes
 */
export class WebpackBundleAnalyzerTool {
  async execute(targetPath: string): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      // Check for webpack config
      const webpackConfigPath = path.join(targetPath, 'webpack.config.js');
      const hasWebpack = fs.existsSync(webpackConfigPath) || 
                        fs.existsSync(path.join(targetPath, 'webpack.config.ts'));
      
      if (hasWebpack) {
        findings.push({
          severity: 'info',
          title: 'Webpack configuration found',
          description: 'Bundle analysis available via webpack-bundle-analyzer',
          recommendation: 'Add webpack-bundle-analyzer to your build process for bundle optimization'
        });
        
        // Check for stats.json
        const statsPath = path.join(targetPath, 'stats.json');
        if (fs.existsSync(statsPath)) {
          const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
          
          // Analyze bundle size
          if (stats.assets) {
            const largeAssets = stats.assets.filter((asset: any) => asset.size > 250000);
            largeAssets.forEach((asset: any) => {
              findings.push({
                severity: asset.size > 500000 ? 'high' : 'medium',
                title: `Large bundle: ${asset.name}`,
                description: `Size: ${(asset.size / 1024).toFixed(1)}KB`,
                recommendation: 'Consider code splitting or lazy loading'
              });
            });
          }
        }
      }
      
      return {
        tool: 'webpack-bundle-analyzer',
        findings,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    } catch (error: any) {
      return {
        tool: 'webpack-bundle-analyzer',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }
}

/**
 * Tool executor factory
 */
export class MissingJavaScriptToolsExecutor {
  private tools = [
    new JSHintTool(),
    new JSCSTool(),
    new DependencyCruiserTool(),
    new ComplexityReportTool(),
    new ESLintSonarJSPlugin(),
    new LighthouseTool(),
    new WebpackBundleAnalyzerTool()
  ];
  
  async executeAll(targetPath: string): Promise<ToolResult[]> {
    const results = await Promise.all(
      this.tools.map(tool => tool.execute(targetPath))
    );
    
    return results;
  }
  
  async execute(toolName: string, targetPath: string): Promise<ToolResult | null> {
    switch (toolName) {
      case 'jshint':
        return new JSHintTool().execute(targetPath);
      case 'jscs':
        return new JSCSTool().execute(targetPath);
      case 'dependency-cruiser':
        return new DependencyCruiserTool().execute(targetPath);
      case 'complexity-report':
        return new ComplexityReportTool().execute(targetPath);
      case 'eslint-plugin-sonarjs':
        return new ESLintSonarJSPlugin().execute(targetPath);
      case 'lighthouse':
        return new LighthouseTool().execute(targetPath);
      case 'webpack-bundle-analyzer':
        return new WebpackBundleAnalyzerTool().execute(targetPath);
      default:
        return null;
    }
  }
}