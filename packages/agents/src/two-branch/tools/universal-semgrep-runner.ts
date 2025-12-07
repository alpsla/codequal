/**
 * Universal Semgrep Runner
 * 
 * Provides a consistent way to run Semgrep across ALL languages.
 * Handles different execution environments:
 * 1. Semgrep in language Docker image (Java pattern)
 * 2. Standalone Semgrep Docker image
 * 3. Semgrep installed on host
 * 
 * This prevents duplicate Semgrep implementations and ensures
 * consistent behavior across TypeScript, Python, Java, Go, etc.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { RawIssue } from './base-tool-orchestrator';

const execAsync = promisify(exec);

export interface SemgrepRunnerOptions {
  repoPath: string;
  branch: 'base' | 'pr';
  languageDockerImage?: string;  // If Semgrep is in language image (Java pattern)
  workspaceDir?: string;          // Docker workspace mount point
  timeout?: number;
}

export interface SemgrepResult {
  success: boolean;
  duration: number;
  issues: RawIssue[];
  error?: string;
}

/**
 * Universal Semgrep runner - works for all languages
 */
export class UniversalSemgrepRunner {
  
  /**
   * Run Semgrep with automatic environment detection
   */
  static async run(options: SemgrepRunnerOptions): Promise<SemgrepResult> {
    const startTime = Date.now();
    const outputFileName = `semgrep-results-${options.branch}.json`;
    const outputFile = path.join(options.repoPath, outputFileName);
    
    try {
      logger.info(`🔒 Running Semgrep (universal runner)...`);
      
      // Strategy 1: Try language Docker image if provided (Java pattern)
      if (options.languageDockerImage) {
        logger.info('   Attempting: Language Docker image...');
        const success = await this.runInLanguageContainer(
          options.repoPath,
          outputFileName,
          options.languageDockerImage,
          options.workspaceDir || '/workspace'
        );
        
        if (success && existsSync(outputFile)) {
          return await this.parseResults(outputFile, startTime);
        }
      }
      
      // Strategy 2: Try host installation (fastest if available)
      logger.info('   Attempting: Host installation...');
      const hostSuccess = await this.runOnHost(options.repoPath, outputFileName);
      if (hostSuccess && existsSync(outputFile)) {
        return await this.parseResults(outputFile, startTime);
      }
      
      // Strategy 3: Use standalone Semgrep Docker image
      logger.info('   Attempting: Standalone Semgrep Docker...');
      const dockerSuccess = await this.runInSemgrepContainer(options.repoPath, outputFileName);
      if (dockerSuccess && existsSync(outputFile)) {
        return await this.parseResults(outputFile, startTime);
      }
      
      // All strategies failed
      const duration = Date.now() - startTime;
      logger.warn('⚠️ All Semgrep execution strategies failed');
      
      return {
        success: false,
        duration,
        issues: [],
        error: 'Semgrep not available in any execution environment'
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Semgrep failed: ${error.message}`);
      
      return {
        success: false,
        duration,
        issues: [],
        error: error.message
      };
    }
  }
  
  /**
   * Strategy 1: Run in language Docker container (Java pattern)
   */
  private static async runInLanguageContainer(
    repoPath: string,
    outputFileName: string,
    dockerImage: string,
    workspaceDir: string
  ): Promise<boolean> {
    try {
      const containerOutputPath = `${workspaceDir}/${outputFileName}`;
      
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${workspaceDir}" \
        -w ${workspaceDir} \
        ${dockerImage} \
        semgrep --config=auto --jobs=2 --json --output=${containerOutputPath} ${workspaceDir} 2>&1 || true`;
      
      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 }); // 10 minutes
      
      return true;
    } catch (error: any) {
      logger.warn(`   Language container failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Strategy 2: Run on host (fastest if available)
   */
  private static async runOnHost(
    repoPath: string,
    outputFileName: string
  ): Promise<boolean> {
    try {
      const command = `cd ${repoPath} && semgrep --config=auto --jobs=2 --json -o ${outputFileName} . 2>&1 || true`;
      
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 }); // 10 minutes
      
      return true;
    } catch (error: any) {
      logger.warn(`   Host execution failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Strategy 3: Run in standalone Semgrep Docker image
   */
  private static async runInSemgrepContainer(
    repoPath: string,
    outputFileName: string
  ): Promise<boolean> {
    try {
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:/src" \
        returntocorp/semgrep:latest \
        semgrep --config=auto --jobs=2 --json --output=/src/${outputFileName} /src 2>&1 || true`;
      
      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 }); // 10 minutes
      
      return true;
    } catch (error: any) {
      logger.warn(`   Semgrep container failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Parse Semgrep JSON results
   */
  private static async parseResults(outputFile: string, startTime: number): Promise<SemgrepResult> {
    try {
      const resultContent = await fs.readFile(outputFile, 'utf-8');
      const semgrepResult = JSON.parse(resultContent);
      
      const issues: RawIssue[] = [];
      
      if (semgrepResult.results) {
        for (const result of semgrepResult.results) {
          // Map Semgrep severity to CodeQual severity
          let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
          if (result.extra?.severity) {
            const semgrepSeverity = result.extra.severity.toLowerCase();
            if (semgrepSeverity === 'error') severity = 'high';
            else if (semgrepSeverity === 'warning') severity = 'medium';
            else if (semgrepSeverity === 'info') severity = 'low';
          }
          
          issues.push({
            tool: 'semgrep',
            file: result.path.replace('/workspace/', '').replace('/src/', ''),
            line: result.start?.line || 1,
            column: result.start?.col,
            severity,
            message: result.extra?.message || result.check_id,
            rule: result.check_id || 'Unknown',
            category: 'security',
            cwe: result.extra?.metadata?.cwe?.join(', '),
            autoFixable: !!result.extra?.fix
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Semgrep completed: ${issues.length} security issues in ${(duration / 1000).toFixed(1)}s`);
      
      // Cleanup
      await fs.unlink(outputFile).catch(() => {
        // Ignore cleanup errors
      });
      
      return {
        success: true,
        duration,
        issues
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Semgrep parsing failed: ${error.message}`);
      
      return {
        success: false,
        duration,
        issues: [],
        error: error.message
      };
    }
  }
}

export default UniversalSemgrepRunner;

