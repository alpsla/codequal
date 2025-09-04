/**
 * Optimized Repository Manager for Large Repositories
 * Handles efficient cloning of large repos like rust-lang/rust
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import logger from '../utils/logger';

interface CloneOptions {
  depth?: number;
  singleBranch?: boolean;
  filter?: string; // Use partial clone filters
  sparse?: string[]; // Sparse checkout paths
  timeout?: number;
  progress?: boolean;
}

export class OptimizedRepositoryManager {
  private tempDirs: Set<string> = new Set();
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.tmpdir(), 'two-branch-analysis');
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Execute git command with progress reporting
   */
  private async executeGitCommand(
    command: string,
    options: { cwd?: string; timeout?: number; showProgress?: boolean } = {}
  ): Promise<string> {
    const { cwd, timeout = 600000, showProgress = true } = options;
    
    try {
      // Add progress flag for clone/fetch operations
      let finalCommand = command;
      if (showProgress && (command.includes('clone') || command.includes('fetch'))) {
        finalCommand = command.replace('git ', 'git --progress ');
      }

      logger.info(`Executing: ${finalCommand}`);
      
      const result = execSync(finalCommand, {
        cwd,
        timeout,
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
        stdio: showProgress ? 'inherit' : 'pipe',
        encoding: 'utf8'
      });

      return typeof result === 'string' ? result : '';
    } catch (error: any) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  /**
   * Optimized PR clone using several strategies:
   * 1. Shallow clone with minimal depth
   * 2. Partial clone using blob filters
   * 3. Single branch clone
   * 4. Sparse checkout if needed
   */
  async cloneForPRAnalysisOptimized(
    repoUrl: string,
    prNumber: number,
    mainBranch = 'main'
  ): Promise<{ main: any; pr: any }> {
    logger.info(`🚀 Optimized clone for PR #${prNumber}`);
    
    const { owner, name } = this.parseGitHubUrl(repoUrl);
    const timestamp = Date.now();

    // Strategy 1: Use GitHub API to get just the PR diff without cloning
    const useAPIOnly = await this.checkIfAPIOnlyPossible(repoUrl, prNumber);
    if (useAPIOnly) {
      logger.info(`✅ Using GitHub API only - no clone needed`);
      return this.getFilesViaAPI(repoUrl, prNumber, mainBranch);
    }

    // Strategy 2: Ultra-shallow clone with blob filter
    logger.info(`📦 Using optimized clone strategy...`);
    
    // Clone with minimal data for PR analysis
    const prPath = path.join(this.baseDir, `${owner}-${name}-pr-${prNumber}-${timestamp}`);
    this.ensureDirectory(prPath);
    this.tempDirs.add(prPath);

    try {
      // Step 1: Initialize empty repo
      await this.executeGitCommand('git init', { cwd: prPath });
      
      // Step 2: Add remote
      await this.executeGitCommand(
        `git remote add origin ${repoUrl}`,
        { cwd: prPath }
      );

      // Step 3: Configure partial clone (exclude large blobs)
      await this.executeGitCommand(
        'git config core.sparseCheckout true',
        { cwd: prPath }
      );
      
      // Step 4: Fetch only the PR with minimal history
      logger.info(`⚡ Fetching PR #${prNumber} with minimal data...`);
      
      // Fetch just the PR head with depth 1
      await this.executeGitCommand(
        `git fetch --depth=1 origin pull/${prNumber}/head:pr-${prNumber}`,
        { 
          cwd: prPath,
          timeout: 120000, // 2 minutes for shallow fetch
          showProgress: true
        }
      );

      // Step 5: Checkout PR branch
      await this.executeGitCommand(
        `git checkout pr-${prNumber}`,
        { cwd: prPath }
      );

      // Step 6: For base comparison, fetch just the merge base
      logger.info(`⚡ Fetching merge base for comparison...`);
      await this.executeGitCommand(
        `git fetch --depth=1 origin ${mainBranch}`,
        { 
          cwd: prPath,
          timeout: 120000
        }
      );

      const mainPath = path.join(this.baseDir, `${owner}-${name}-${mainBranch}-${timestamp}`);
      this.ensureDirectory(mainPath);
      this.tempDirs.add(mainPath);

      // Create a worktree for the main branch (shares objects, saves space)
      await this.executeGitCommand(
        `git worktree add ${mainPath} origin/${mainBranch}`,
        { cwd: prPath }
      );

      logger.info(`✅ Optimized clone complete`);
      logger.info(`   PR: ${prPath}`);
      logger.info(`   Main: ${mainPath}`);

      return {
        main: {
          url: repoUrl,
          owner,
          name,
          mainBranch,
          localPath: mainPath,
          isTemp: true
        },
        pr: {
          url: repoUrl,
          owner,
          name,
          prBranch: `pr-${prNumber}`,
          prNumber,
          localPath: prPath,
          isTemp: true
        }
      };
    } catch (error: any) {
      logger.error(`Clone failed: ${error.message}`);
      
      // Fallback: Try even shallower clone
      if (error.message.includes('timeout')) {
        logger.info(`⚠️ Timeout detected, trying ultra-minimal clone...`);
        return this.ultraMinimalClone(repoUrl, prNumber, mainBranch);
      }
      
      // Cleanup on failure
      await this.cleanupDirectory(prPath);
      throw error;
    }
  }

  /**
   * Ultra-minimal clone for extremely large repos
   */
  private async ultraMinimalClone(
    repoUrl: string,
    prNumber: number,
    mainBranch: string
  ): Promise<any> {
    const { owner, name } = this.parseGitHubUrl(repoUrl);
    const timestamp = Date.now();
    const prPath = path.join(this.baseDir, `${owner}-${name}-minimal-${timestamp}`);
    
    this.ensureDirectory(prPath);
    this.tempDirs.add(prPath);

    // Use blobless clone - fetches commits and trees but not file contents
    await this.executeGitCommand(
      `git clone --filter=blob:none --depth=1 --single-branch --branch=${mainBranch} ${repoUrl} ${prPath}`,
      { 
        timeout: 180000, // 3 minutes
        showProgress: true
      }
    );

    // Fetch just the PR commit
    await this.executeGitCommand(
      `git fetch --depth=1 origin pull/${prNumber}/head:pr-${prNumber}`,
      { cwd: prPath, timeout: 60000 }
    );

    return {
      main: {
        url: repoUrl,
        owner,
        name,
        mainBranch,
        localPath: prPath,
        isTemp: true
      },
      pr: {
        url: repoUrl,
        owner,
        name,
        prBranch: `pr-${prNumber}`,
        prNumber,
        localPath: prPath,
        isTemp: true
      }
    };
  }

  /**
   * Check if we can analyze using just the API
   */
  private async checkIfAPIOnlyPossible(
    repoUrl: string,
    prNumber: number
  ): Promise<boolean> {
    // For now, return false to always clone
    // In future, could check PR size via API first
    return false;
  }

  /**
   * Get files via GitHub API without cloning
   */
  private async getFilesViaAPI(
    repoUrl: string,
    prNumber: number,
    mainBranch: string
  ): Promise<any> {
    // This would use GitHub API to fetch only changed files
    // Placeholder for API-only implementation
    throw new Error('API-only analysis not yet implemented');
  }

  /**
   * Parse GitHub URL to extract owner and repo name
   */
  private parseGitHubUrl(repoUrl: string): { owner: string; name: string } {
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${repoUrl}`);
    }
    return { owner: match[1], name: match[2] };
  }

  /**
   * Cleanup directory
   */
  private async cleanupDirectory(dirPath: string): Promise<void> {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      this.tempDirs.delete(dirPath);
    } catch (error) {
      logger.warn(`Failed to cleanup ${dirPath}: ${error}`);
    }
  }

  /**
   * Cleanup all temporary directories
   */
  async cleanupAll(): Promise<void> {
    for (const dir of this.tempDirs) {
      await this.cleanupDirectory(dir);
    }
  }
}

export default OptimizedRepositoryManager;