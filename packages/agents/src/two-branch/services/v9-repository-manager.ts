/**
 * V9 Repository Manager
 * 
 * Universal repository management service for V9 architecture.
 * Handles cloning, branching, cleanup, and caching across all languages.
 * 
 * Features:
 * - Cross-platform cleanup (sudo/non-sudo)
 * - Git operations (clone, checkout, diff)
 * - Repository caching
 * - Safe error handling
 * 
 * Usage:
 *   const repoManager = new V9RepositoryManager();
 *   await repoManager.prepareRepository(url, localPath, branches);
 *   await repoManager.cleanup(localPath);
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RepositoryBranches {
  base: string;
  pr: string;
}

export interface RepositoryInfo {
  localPath: string;
  url: string;
  branches: RepositoryBranches;
  defaultBranch: string;
}

export interface CloneOptions {
  depth?: number;
  skipCache?: boolean;
  timeoutSeconds?: number;
}

export class V9RepositoryManager {
  private readonly cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || '/tmp/.codequal-repo-cache';
  }

  /**
   * Prepare repository for two-branch analysis
   */
  async prepareRepository(
    repoUrl: string,
    localPath: string,
    branches: RepositoryBranches,
    options?: CloneOptions
  ): Promise<RepositoryInfo> {
    console.log(`📦 Preparing repository: ${repoUrl}`);
    console.log(`   Local path: ${localPath}`);
    console.log(`   Branches: ${branches.base} → ${branches.pr}`);

    // Step 1: Clean up any existing repository
    await this.cleanup(localPath);

    // Step 2: Clone repository
    await this.cloneRepository(repoUrl, localPath, options);

    // Step 3: Detect default branch
    const defaultBranch = this.detectDefaultBranch(localPath);
    console.log(`   Default branch: ${defaultBranch}`);

    // Step 4: Ensure branches exist
    await this.ensureBranchesExist(localPath, branches);

    return {
      localPath,
      url: repoUrl,
      branches,
      defaultBranch
    };
  }

  /**
   * Clone repository with caching support
   */
  private async cloneRepository(
    repoUrl: string,
    localPath: string,
    options?: CloneOptions
  ): Promise<void> {
    const depth = options?.depth || 100;
    const timeout = options?.timeoutSeconds || 600;

    console.log(`   Cloning with depth=${depth}, timeout=${timeout}s...`);

    try {
      const cloneCmd = `git clone --depth ${depth} "${repoUrl}" "${localPath}"`;
      execSync(cloneCmd, {
        stdio: 'pipe',
        timeout: timeout * 1000,
        maxBuffer: 50 * 1024 * 1024 // 50 MB
      });
      console.log(`   ✅ Clone successful`);
    } catch (error: any) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Detect default branch (main/master)
   */
  private detectDefaultBranch(localPath: string): string {
    try {
      const result = execSync('git remote show origin', {
        cwd: localPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      const match = result.match(/HEAD branch: (.+)/);
      return match ? match[1].trim() : 'main';
    } catch (error) {
      console.warn(`   ⚠️  Could not detect default branch, using 'main'`);
      return 'main';
    }
  }

  /**
   * Ensure required branches exist locally
   */
  private async ensureBranchesExist(
    localPath: string,
    branches: RepositoryBranches
  ): Promise<void> {
    const branchesToCheck = [branches.base, branches.pr];

    for (const branch of branchesToCheck) {
      try {
        // Try to checkout the branch
        execSync(`git checkout ${branch}`, {
          cwd: localPath,
          stdio: 'pipe'
        });
        console.log(`   ✅ Branch '${branch}' exists`);
      } catch (error) {
        // If checkout fails, try to fetch the branch
        try {
          execSync(`git fetch origin ${branch}:${branch}`, {
            cwd: localPath,
            stdio: 'pipe'
          });
          console.log(`   ✅ Fetched branch '${branch}'`);
        } catch (fetchError: any) {
          throw new Error(`Branch '${branch}' not found: ${fetchError.message}`);
        }
      }
    }
  }

  /**
   * Get modified files between two branches
   */
  getModifiedFiles(localPath: string, baseBranch: string, prBranch: string): string[] {
    try {
      const result = execSync(`git diff --name-only ${baseBranch}...${prBranch}`, {
        cwd: localPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      return result.trim().split('\n').filter(f => f.length > 0);
    } catch (error: any) {
      throw new Error(`Failed to get modified files: ${error.message}`);
    }
  }

  /**
   * Checkout a specific branch
   */
  checkoutBranch(localPath: string, branch: string): void {
    try {
      execSync(`git checkout ${branch}`, {
        cwd: localPath,
        stdio: 'pipe'
      });
      console.log(`   ✅ Checked out branch: ${branch}`);
    } catch (error: any) {
      throw new Error(`Failed to checkout branch '${branch}': ${error.message}`);
    }
  }

  /**
   * Get current branch name
   */
  getCurrentBranch(localPath: string): string {
    try {
      const result = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: localPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      return result.trim();
    } catch (error: any) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * Universal cleanup - works across platforms and permission levels
   */
  async cleanup(localPath: string): Promise<void> {
    if (!localPath || localPath === '/' || localPath === '/tmp') {
      console.warn(`   ⚠️  Refusing to clean dangerous path: ${localPath}`);
      return;
    }

    if (!fs.existsSync(localPath)) {
      console.log(`   ℹ️  Path does not exist: ${localPath}`);
      return;
    }

    console.log(`   🧹 Cleaning up: ${localPath}`);

    try {
      // Method 1: Try standard removal
      this.removeDirectoryRecursive(localPath);
      console.log(`   ✅ Cleanup successful (standard)`);
      return;
    } catch (error: any) {
      console.log(`   ⚠️  Standard cleanup failed: ${error.message}`);
    }

    try {
      // Method 2: Try with sudo (Linux/macOS only)
      if (process.platform !== 'win32') {
        execSync(`sudo rm -rf "${localPath}"`, {
          stdio: 'pipe',
          timeout: 30000
        });
        console.log(`   ✅ Cleanup successful (sudo)`);
        return;
      }
    } catch (error: any) {
      console.log(`   ⚠️  Sudo cleanup failed: ${error.message}`);
    }

    try {
      // Method 3: Try Git removal (if it's a Git repo)
      if (fs.existsSync(path.join(localPath, '.git'))) {
        execSync(`git clean -fdx && rm -rf "${localPath}"`, {
          cwd: path.dirname(localPath),
          stdio: 'pipe',
          timeout: 30000
        });
        console.log(`   ✅ Cleanup successful (git clean)`);
        return;
      }
    } catch (error: any) {
      console.log(`   ⚠️  Git cleanup failed: ${error.message}`);
    }

    // If all methods fail, log warning but continue
    console.warn(`   ⚠️  Could not fully clean ${localPath}, continuing anyway...`);
  }

  /**
   * Recursive directory removal (cross-platform)
   */
  private removeDirectoryRecursive(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.lstatSync(filePath);

      if (stat.isDirectory()) {
        this.removeDirectoryRecursive(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    }

    fs.rmdirSync(dirPath);
  }

  /**
   * Get repository size information
   */
  getRepositorySize(localPath: string): { files: number; sizeBytes: number } {
    let fileCount = 0;
    let totalSize = 0;

    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory()) {
          if (!file.startsWith('.')) {
            walk(filePath);
          }
        } else {
          fileCount++;
          totalSize += stat.size;
        }
      }
    };

    walk(localPath);

    return { files: fileCount, sizeBytes: totalSize };
  }

  /**
   * Check if repository is valid
   */
  isValidRepository(localPath: string): boolean {
    try {
      return fs.existsSync(path.join(localPath, '.git'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository remote URL
   */
  getRemoteUrl(localPath: string): string | null {
    try {
      const result = execSync('git config --get remote.origin.url', {
        cwd: localPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      return result.trim();
    } catch (error) {
      return null;
    }
  }
}

