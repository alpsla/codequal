/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

import { Logger } from '../../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

interface PackageInfo {
  licenses?: string | string[];
  current?: string;
  latest?: string;
  [key: string]: unknown;
}

interface ESLintResult {
  errorCount?: number;
  warningCount?: number;
  fixableErrorCount?: number;
  fixableWarningCount?: number;
  filePath?: string;
  messages?: Array<{
    severity: number;
    message: string;
    ruleId?: string;
    line?: number;
    column?: number;
  }>;
}

/**
 * Configuration for tool execution
 */
export interface ToolExecutionConfig {
  repositoryPath: string;
  enabledTools: string[];
  timeout?: number;
}

/**
 * Tool Runner Service - Executes analysis tools on cloned repositories
 * This service runs INSIDE the DeepWiki pod and has access to the cloned repository
 */
export class ToolRunnerService {
  private readonly logger: Logger;
  
  // Tools that run in DeepWiki (need full repository access)
  private readonly supportedTools = [
    // Security Tools
    'npm-audit',
    'license-checker',
    
    // Architecture Tools
    'madge',
    'dependency-cruiser',
    
    // Dependency Tools
    'npm-outdated',
    
    // Code Quality Tools
    'eslint',
    'prettier-check',
    
    // Performance Tools
    'bundlephobia',
    'lighthouse-ci',
    
    // Type Safety Tools
    'typescript-strict',
    
    // Test Coverage Tools
    'jest-coverage',
    'nyc-coverage'
  ];
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  /**
   * Run all applicable tools on the repository
   */
  async runTools(config: ToolExecutionConfig): Promise<Record<string, ToolExecutionResult>> {
    this.logger.info('Starting tool execution', {
      repositoryPath: config.repositoryPath,
      enabledTools: config.enabledTools
    });
    
    const results: Record<string, ToolExecutionResult> = {};
    
    // Filter to only supported tools
    const toolsToRun = config.enabledTools.filter(tool => 
      this.supportedTools.includes(tool)
    );
    
    if (toolsToRun.length === 0) {
      this.logger.warn('No supported tools requested');
      return results;
    }
    
    // Detect repository type and applicable tools
    const applicableTools = await this.detectApplicableTools(
      config.repositoryPath, 
      toolsToRun
    );
    
    this.logger.info(`Running ${applicableTools.length} applicable tools`);
    
    // Run tools in parallel with timeout
    const toolPromises = applicableTools.map(toolId => 
      this.executeToolWithTimeout(
        toolId, 
        config.repositoryPath,
        config.timeout || 60000 // Default 60s timeout per tool
      )
    );
    
    const toolResults = await Promise.allSettled(toolPromises);
    
    // Process results
    toolResults.forEach((result, index) => {
      const toolId = applicableTools[index];
      if (result.status === 'fulfilled') {
        results[toolId] = result.value;
      } else {
        results[toolId] = {
          toolId,
          success: false,
          error: result.reason?.message || 'Unknown error',
          executionTime: 0
        };
      }
    });
    
    this.logger.info('Tool execution completed', {
      successfulTools: Object.values(results).filter(r => r.success).length,
      failedTools: Object.values(results).filter(r => !r.success).length
    });
    
    return results;
  }
  
  /**
   * Detect which tools are applicable to the repository
   */
  private async detectApplicableTools(
    repositoryPath: string,
    requestedTools: string[]
  ): Promise<string[]> {
    const applicable: string[] = [];
    
    try {
      // Check for Node.js/npm project
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      const hasPackageJson = await this.fileExists(packageJsonPath);
      
      if (hasPackageJson) {
        // NPM-based tools
        if (requestedTools.includes('npm-audit')) {
          // npm audit requires package-lock.json
          const lockPath = path.join(repositoryPath, 'package-lock.json');
          if (await this.fileExists(lockPath)) {
            applicable.push('npm-audit');
          }
        }
        
        if (requestedTools.includes('license-checker')) {
          applicable.push('license-checker');
        }
        
        if (requestedTools.includes('npm-outdated')) {
          applicable.push('npm-outdated');
        }
      }
      
      // Check for JavaScript/TypeScript files for architecture tools
      const hasJsFiles = await this.hasJavaScriptFiles(repositoryPath);
      if (hasJsFiles) {
        if (requestedTools.includes('madge')) {
          applicable.push('madge');
        }
        
        if (requestedTools.includes('dependency-cruiser')) {
          // Check if dependency-cruiser config exists
          const depCruiserConfig = await this.findDepCruiserConfig(repositoryPath);
          if (depCruiserConfig || hasPackageJson) {
            applicable.push('dependency-cruiser');
          }
        }
        
        // Code Quality Tools
        if (requestedTools.includes('eslint')) {
          const eslintConfig = await this.findESLintConfig(repositoryPath);
          if (eslintConfig || hasPackageJson) {
            applicable.push('eslint');
          }
        }
        
        if (requestedTools.includes('prettier-check')) {
          const prettierConfig = await this.findPrettierConfig(repositoryPath);
          if (prettierConfig || hasPackageJson) {
            applicable.push('prettier-check');
          }
        }
        
        // TypeScript Tools
        if (requestedTools.includes('typescript-strict')) {
          const tsconfigPath = path.join(repositoryPath, 'tsconfig.json');
          if (await this.fileExists(tsconfigPath)) {
            applicable.push('typescript-strict');
          }
        }
        
        // Test Coverage Tools
        if (requestedTools.includes('jest-coverage')) {
          const jestConfig = await this.findJestConfig(repositoryPath);
          if (jestConfig || hasPackageJson) {
            applicable.push('jest-coverage');
          }
        }
        
        if (requestedTools.includes('nyc-coverage')) {
          const nycConfig = await this.findNycConfig(repositoryPath);
          if (nycConfig || hasPackageJson) {
            applicable.push('nyc-coverage');
          }
        }
        
        // Performance Tools
        if (requestedTools.includes('bundlephobia')) {
          // Only applicable if has dependencies
          if (hasPackageJson) {
            applicable.push('bundlephobia');
          }
        }
        
        if (requestedTools.includes('lighthouse-ci')) {
          const lighthouseConfig = await this.findLighthouseConfig(repositoryPath);
          // Check if it's a web project (has index.html or build scripts)
          const isWebProject = await this.isWebProject(repositoryPath);
          if (lighthouseConfig || isWebProject) {
            applicable.push('lighthouse-ci');
          }
        }
      }
    } catch (error) {
      this.logger.error('Error detecting applicable tools', { error });
    }
    
    return applicable;
  }
  
  /**
   * Execute a tool with timeout
   */
  private async executeToolWithTimeout(
    toolId: string,
    repositoryPath: string,
    timeout: number
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool ${toolId} timed out after ${timeout}ms`)), timeout);
      });
      
      // Execute tool
      const executionPromise = this.executeTool(toolId, repositoryPath);
      
      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        toolId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Execute a specific tool
   */
  private async executeTool(
    toolId: string,
    repositoryPath: string
  ): Promise<ToolExecutionResult> {
    switch (toolId) {
      case 'npm-audit':
        return this.runNpmAudit(repositoryPath);
      
      case 'license-checker':
        return this.runLicenseChecker(repositoryPath);
      
      case 'madge':
        return this.runMadge(repositoryPath);
      
      case 'dependency-cruiser':
        return this.runDependencyCruiser(repositoryPath);
      
      case 'npm-outdated':
        return this.runNpmOutdated(repositoryPath);
      
      case 'eslint':
        return this.runESLint(repositoryPath);
      
      case 'prettier-check':
        return this.runPrettierCheck(repositoryPath);
      
      case 'typescript-strict':
        return this.runTypeScriptStrict(repositoryPath);
      
      case 'jest-coverage':
        return this.runJestCoverage(repositoryPath);
      
      case 'nyc-coverage':
        return this.runNycCoverage(repositoryPath);
      
      case 'bundlephobia':
        return this.runBundlephobia(repositoryPath);
      
      case 'lighthouse-ci':
        return this.runLighthouseCI(repositoryPath);
      
      default:
        throw new Error(`Unsupported tool: ${toolId}`);
    }
  }
  
  /**
   * Run npm audit
   */
  private async runNpmAudit(repositoryPath: string): Promise<ToolExecutionResult> {
    try {
      const { stdout } = await execAsync('npm audit --json', {
        cwd: repositoryPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }).catch(error => {
        // npm audit exits with non-zero if vulnerabilities found
        if (error.stdout) {
          return { stdout: error.stdout };
        }
        throw error;
      });
      
      const auditData = JSON.parse(stdout || '{}');
      
      return {
        toolId: 'npm-audit',
        success: true,
        output: auditData,
        executionTime: 0, // Will be set by caller
        metadata: {
          vulnerabilities: auditData.metadata?.vulnerabilities || {},
          dependencies: auditData.metadata?.dependencies || {},
          totalVulnerabilities: auditData.metadata?.vulnerabilities?.total || 0
        }
      };
    } catch (error) {
      throw new Error(`npm audit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Run license-checker
   */
  private async runLicenseChecker(repositoryPath: string): Promise<ToolExecutionResult> {
    try {
      const { stdout } = await execAsync('npx license-checker --json --production', {
        cwd: repositoryPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      
      const licenseData = JSON.parse(stdout || '{}');
      
      // Analyze licenses
      const licenseTypes = new Set<string>();
      const riskyLicenses = [];
      
      for (const [pkg, info] of Object.entries(licenseData)) {
        const licenses = (info as PackageInfo).licenses || 'Unknown';
        const license = Array.isArray(licenses) ? licenses.join(', ') : licenses;
        licenseTypes.add(license);
        
        // Check for risky licenses
        if (/GPL|AGPL|LGPL/i.test(license)) {
          riskyLicenses.push({ package: pkg, license });
        }
      }
      
      return {
        toolId: 'license-checker',
        success: true,
        output: licenseData,
        executionTime: 0,
        metadata: {
          totalPackages: Object.keys(licenseData).length,
          uniqueLicenses: licenseTypes.size,
          riskyLicenses: riskyLicenses.length,
          licenseTypes: Array.from(licenseTypes)
        }
      };
    } catch (error) {
      throw new Error(`license-checker failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Run madge for circular dependency detection
   */
  private async runMadge(repositoryPath: string): Promise<ToolExecutionResult> {
    try {
      // First, find the source directory
      const srcPath = await this.findSourceDirectory(repositoryPath);
      
      const { stdout } = await execAsync(`npx madge --circular --json "${srcPath}"`, {
        cwd: repositoryPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      
      const madgeData = JSON.parse(stdout || '[]');
      
      return {
        toolId: 'madge',
        success: true,
        output: madgeData,
        executionTime: 0,
        metadata: {
          circularDependencies: madgeData.length,
          hasCircularDeps: madgeData.length > 0
        }
      };
    } catch (error) {
      throw new Error(`madge failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Run dependency-cruiser
   */
  private async runDependencyCruiser(repositoryPath: string): Promise<ToolExecutionResult> {
    try {
      // Check for config file
      const configPath = await this.findDepCruiserConfig(repositoryPath);
      const srcPath = await this.findSourceDirectory(repositoryPath);
      
      let command = `npx dependency-cruiser "${srcPath}" --output-type json`;
      if (configPath) {
        command += ` --config "${configPath}"`;
      } else {
        // Use --no-config if no config file found
        command += ' --no-config';
      }
      
      const { stdout } = await execAsync(command, {
        cwd: repositoryPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      
      const depCruiserData = JSON.parse(stdout || '{}');
      
      return {
        toolId: 'dependency-cruiser',
        success: true,
        output: depCruiserData,
        executionTime: 0,
        metadata: {
          violations: depCruiserData.summary?.violations || 0,
          dependencies: depCruiserData.summary?.totalCruised || 0,
          modules: depCruiserData.modules?.length || 0
        }
      };
    } catch (error) {
      throw new Error(`dependency-cruiser failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Run npm outdated
   */
  private async runNpmOutdated(repositoryPath: string): Promise<ToolExecutionResult> {
    try {
      // npm outdated exits with non-zero if outdated packages found
      const { stdout } = await execAsync('npm outdated --json', {
        cwd: repositoryPath,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      }).catch(error => {
        if (error.stdout) {
          return { stdout: error.stdout };
        }
        throw error;
      });
      
      const outdatedData = JSON.parse(stdout || '{}');
      
      // Count severity levels
      let major = 0, minor = 0, patch = 0;
      
      for (const pkg of Object.values(outdatedData)) {
        const current = (pkg as PackageInfo).current;
        const latest = (pkg as PackageInfo).latest;
        
        if (!current || !latest) continue;
        
        const [currMajor, currMinor] = current.split('.');
        const [latestMajor, latestMinor] = latest.split('.');
        
        if (currMajor !== latestMajor) {
          major++;
        } else if (currMinor !== latestMinor) {
          minor++;
        } else {
          patch++;
        }
      }
      
      return {
        toolId: 'npm-outdated',
        success: true,
        output: outdatedData,
        executionTime: 0,
        metadata: {
          totalOutdated: Object.keys(outdatedData).length,
          majorUpdates: major,
          minorUpdates: minor,
          patchUpdates: patch
        }
      };
    } catch (error) {
      throw new Error(`npm outdated failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Helper: Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Helper: Check if repository has JavaScript/TypeScript files
   */
  private async hasJavaScriptFiles(repositoryPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(repositoryPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          // Check common source directories
          if (['src', 'lib', 'app', 'components', 'pages'].includes(entry.name)) {
            return true;
          }
        } else if (entry.isFile()) {
          // Check for JS/TS files in root
          if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
            return true;
          }
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * Helper: Find source directory
   */
  private async findSourceDirectory(repositoryPath: string): Promise<string> {
    // Common source directory names
    const commonDirs = ['src', 'lib', 'app', 'source'];
    
    for (const dir of commonDirs) {
      const dirPath = path.join(repositoryPath, dir);
      if (await this.fileExists(dirPath)) {
        return dirPath;
      }
    }
    
    // Default to repository root
    return repositoryPath;
  }
  
  /**
   * Helper: Find dependency-cruiser config
   */
  private async findDepCruiserConfig(repositoryPath: string): Promise<string | null> {
    const configNames = [
      '.dependency-cruiser.js',
      '.dependency-cruiser.json',
      '.dependency-cruiser.cjs',
      'dependency-cruiser.config.js',
      'dependency-cruiser.config.json'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(repositoryPath, configName);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }
  
  /**
   * Run ESLint
   */
  private async runESLint(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Try different ESLint commands
      let command = 'npx eslint . --format json';
      
      // Check if there's an eslint config
      const eslintConfig = await this.findESLintConfig(repositoryPath);
      if (eslintConfig) {
        command = `npx eslint . --config "${eslintConfig}" --format json`;
      }
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      let eslintResults;
      try {
        eslintResults = JSON.parse(stdout || '[]');
      } catch {
        // If JSON parsing fails, create a basic result
        eslintResults = [{
          filePath: 'unknown',
          errorCount: stderr ? 1 : 0,
          warningCount: stderr ? 1 : 0,
          messages: stderr ? [{ message: stderr }] : []
        }];
      }
      
      const totalErrors = eslintResults.reduce((sum: number, file: ESLintResult) => sum + (file.errorCount || 0), 0);
      const totalWarnings = eslintResults.reduce((sum: number, file: ESLintResult) => sum + (file.warningCount || 0), 0);
      
      return {
        toolId: 'eslint',
        success: true,
        output: eslintResults,
        executionTime: Date.now() - startTime,
        metadata: {
          totalFiles: eslintResults.length,
          totalErrors,
          totalWarnings,
          fixableIssues: eslintResults.reduce((sum: number, file: ESLintResult) => sum + (file.fixableErrorCount || 0) + (file.fixableWarningCount || 0), 0)
        }
      };
    } catch (error) {
      return {
        toolId: 'eslint',
        success: false,
        error: `ESLint failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Run Prettier check
   */
  private async runPrettierCheck(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { stdout } = await execAsync('npx prettier --check . --list-different', {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer
      });
      
      const unformattedFiles = stdout.trim().split('\n').filter(line => line.trim());
      
      return {
        toolId: 'prettier-check',
        success: true,
        output: {
          unformattedFiles,
          allFilesFormatted: unformattedFiles.length === 0
        },
        executionTime: Date.now() - startTime,
        metadata: {
          totalUnformattedFiles: unformattedFiles.length,
          needsFormatting: unformattedFiles.length > 0
        }
      };
    } catch (error) {
      // Prettier returns exit code 1 if files need formatting
      if ((error as any).code === 1 && (error as any).stdout) {
        const unformattedFiles = (error as any).stdout.trim().split('\n').filter((line: string) => line.trim());
        return {
          toolId: 'prettier-check',
          success: true,
          output: {
            unformattedFiles,
            allFilesFormatted: false
          },
          executionTime: Date.now() - startTime,
          metadata: {
            totalUnformattedFiles: unformattedFiles.length,
            needsFormatting: true
          }
        };
      }
      
      return {
        toolId: 'prettier-check',
        success: false,
        error: `Prettier check failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Run TypeScript strict check
   */
  private async runTypeScriptStrict(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit --strict', {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        toolId: 'typescript-strict',
        success: true,
        output: {
          compileErrors: stderr ? stderr.split('\n').filter(line => line.trim()) : [],
          hasErrors: !!stderr,
          stdout: stdout || ''
        },
        executionTime: Date.now() - startTime,
        metadata: {
          strictMode: true,
          errorCount: stderr ? stderr.split('\n').filter(line => line.includes('error')).length : 0
        }
      };
    } catch (error) {
      // TypeScript returns exit code when there are errors
      const errors = (error as any).stderr ? (error as any).stderr.split('\n').filter((line: string) => line.trim()) : [];
      
      return {
        toolId: 'typescript-strict',
        success: true, // Still successful if we got error info
        output: {
          compileErrors: errors,
          hasErrors: true,
          stdout: (error as any).stdout || ''
        },
        executionTime: Date.now() - startTime,
        metadata: {
          strictMode: true,
          errorCount: errors.filter((line: string) => line.includes('error')).length
        }
      };
    }
  }
  
  /**
   * Run Jest coverage
   */
  private async runJestCoverage(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { stdout } = await execAsync('npx jest --coverage --coverageReporters=json-summary --passWithNoTests', {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Try to read coverage summary
      let coverageData = null;
      try {
        const coveragePath = path.join(repositoryPath, 'coverage', 'coverage-summary.json');
        const coverageContent = await fs.readFile(coveragePath, 'utf8');
        coverageData = JSON.parse(coverageContent);
      } catch {
        // Coverage file not found or invalid
      }
      
      return {
        toolId: 'jest-coverage',
        success: true,
        output: {
          coverage: coverageData,
          testOutput: stdout
        },
        executionTime: Date.now() - startTime,
        metadata: {
          coverageAvailable: !!coverageData,
          linesCovered: coverageData?.total?.lines?.pct || 0,
          functionsCovered: coverageData?.total?.functions?.pct || 0,
          branchesCovered: coverageData?.total?.branches?.pct || 0,
          statementsCovered: coverageData?.total?.statements?.pct || 0
        }
      };
    } catch (error) {
      return {
        toolId: 'jest-coverage',
        success: false,
        error: `Jest coverage failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Run NYC coverage
   */
  private async runNycCoverage(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { stdout } = await execAsync('npx nyc --reporter=json-summary npm test', {
        cwd: repositoryPath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Try to read coverage summary
      let coverageData = null;
      try {
        const coveragePath = path.join(repositoryPath, 'coverage', 'coverage-summary.json');
        const coverageContent = await fs.readFile(coveragePath, 'utf8');
        coverageData = JSON.parse(coverageContent);
      } catch {
        // Coverage file not found or invalid
      }
      
      return {
        toolId: 'nyc-coverage',
        success: true,
        output: {
          coverage: coverageData,
          testOutput: stdout
        },
        executionTime: Date.now() - startTime,
        metadata: {
          coverageAvailable: !!coverageData,
          linesCovered: coverageData?.total?.lines?.pct || 0,
          functionsCovered: coverageData?.total?.functions?.pct || 0,
          branchesCovered: coverageData?.total?.branches?.pct || 0,
          statementsCovered: coverageData?.total?.statements?.pct || 0
        }
      };
    } catch (error) {
      return {
        toolId: 'nyc-coverage',
        success: false,
        error: `NYC coverage failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Run Bundlephobia analysis
   */
  private async runBundlephobia(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Read package.json to get dependencies
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      const bundleSizes = [];
      
      // Analyze bundle size for major dependencies (limit to avoid timeout)
      const majorDeps = Object.keys(dependencies).slice(0, 10);
      
      for (const dep of majorDeps) {
        try {
          // This is a simplified version - in production you'd use bundlephobia API
          const { stdout } = await execAsync(`npm info ${dep} dist-tags.latest`, {
            cwd: repositoryPath,
            timeout: 5000
          });
          
          bundleSizes.push({
            name: dep,
            version: dependencies[dep],
            latest: stdout.trim(),
            estimated: true // Mark as estimated since we're not using real bundlephobia
          });
        } catch {
          // Skip if package info fails
        }
      }
      
      return {
        toolId: 'bundlephobia',
        success: true,
        output: {
          dependencies: bundleSizes,
          totalDependencies: Object.keys(dependencies).length
        },
        executionTime: Date.now() - startTime,
        metadata: {
          analyzedPackages: bundleSizes.length,
          totalPackages: Object.keys(dependencies).length,
          note: 'Simplified analysis - consider full bundlephobia integration'
        }
      };
    } catch (error) {
      return {
        toolId: 'bundlephobia',
        success: false,
        error: `Bundlephobia analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Run Lighthouse CI
   */
  private async runLighthouseCI(repositoryPath: string): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Check if this is a web project that can be built
      const isWebProject = await this.isWebProject(repositoryPath);
      
      if (!isWebProject) {
        return {
          toolId: 'lighthouse-ci',
          success: false,
          error: 'Not a web project or no build configuration found',
          executionTime: Date.now() - startTime
        };
      }
      
      // This is a simplified version - full implementation would:
      // 1. Build the project
      // 2. Start a local server
      // 3. Run lighthouse
      // 4. Cleanup
      
      return {
        toolId: 'lighthouse-ci',
        success: true,
        output: {
          status: 'skipped',
          reason: 'Simplified implementation - requires full lighthouse CI setup',
          isWebProject: true
        },
        executionTime: Date.now() - startTime,
        metadata: {
          note: 'Full lighthouse CI implementation needed for production'
        }
      };
    } catch (error) {
      return {
        toolId: 'lighthouse-ci',
        success: false,
        error: `Lighthouse CI failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Helper: Find ESLint config
   */
  private async findESLintConfig(repositoryPath: string): Promise<string | null> {
    const configNames = [
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(repositoryPath, configName);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }
  
  /**
   * Helper: Find Prettier config
   */
  private async findPrettierConfig(repositoryPath: string): Promise<string | null> {
    const configNames = [
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.js',
      '.prettierrc.yml',
      '.prettierrc.yaml',
      'prettier.config.js'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(repositoryPath, configName);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }
  
  /**
   * Helper: Find Jest config
   */
  private async findJestConfig(repositoryPath: string): Promise<string | null> {
    const configNames = [
      'jest.config.js',
      'jest.config.ts',
      'jest.config.json'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(repositoryPath, configName);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }
    
    // Check package.json for jest config
    try {
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      if (packageJson.jest) {
        return packageJsonPath;
      }
    } catch {
      // Ignore errors
    }
    
    return null;
  }
  
  /**
   * Helper: Find NYC config
   */
  private async findNycConfig(repositoryPath: string): Promise<string | null> {
    const configNames = [
      '.nycrc',
      '.nycrc.json',
      '.nycrc.yml',
      '.nycrc.yaml',
      'nyc.config.js'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(repositoryPath, configName);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }
  
  /**
   * Helper: Find Lighthouse config
   */
  private async findLighthouseConfig(repositoryPath: string): Promise<string | null> {
    const configNames = [
      'lighthouserc.js',
      'lighthouserc.json',
      '.lighthouserc.js',
      '.lighthouserc.json'
    ];
    
    for (const configName of configNames) {
      const configPath = path.join(repositoryPath, configName);
      if (await this.fileExists(configPath)) {
        return configPath;
      }
    }
    
    return null;
  }
  
  /**
   * Helper: Check if this is a web project
   */
  private async isWebProject(repositoryPath: string): Promise<boolean> {
    try {
      // Check for common web project indicators
      const webIndicators = [
        'index.html',
        'public/index.html',
        'src/index.html',
        'dist/index.html'
      ];
      
      for (const indicator of webIndicators) {
        const indicatorPath = path.join(repositoryPath, indicator);
        if (await this.fileExists(indicatorPath)) {
          return true;
        }
      }
      
      // Check package.json for web-related scripts
      const packageJsonPath = path.join(repositoryPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        const scripts = packageJson.scripts || {};
        const webScripts = ['start', 'serve', 'dev', 'build'];
        
        for (const script of webScripts) {
          if (scripts[script] && (
            scripts[script].includes('webpack') ||
            scripts[script].includes('vite') ||
            scripts[script].includes('react-scripts') ||
            scripts[script].includes('next') ||
            scripts[script].includes('serve')
          )) {
            return true;
          }
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
}
