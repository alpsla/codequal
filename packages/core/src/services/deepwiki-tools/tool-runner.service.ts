/* eslint-disable @typescript-eslint/no-explicit-any */
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
  output?: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
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
    'npm-audit',
    'license-checker',
    'madge',
    'dependency-cruiser',
    'npm-outdated'
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
        const license = (info as any).licenses || 'Unknown';
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
        const current = (pkg as any).current;
        const latest = (pkg as any).latest;
        
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
}
