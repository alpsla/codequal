/**
 * Repository Manager for Two-Branch Analysis
 * 
 * Handles Git operations:
 * - Cloning repositories
 * - Checking out branches
 * - Managing temporary directories
 * - Cleaning up after analysis
 */

import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

export interface CloneOptions {
  depth?: number;           // Shallow clone depth (default: full clone)
  singleBranch?: boolean;   // Clone only specific branch
  quiet?: boolean;          // Suppress git output
  timeout?: number;         // Clone timeout in ms (default: 5 minutes)
}

export interface RepositoryInfo {
  url: string;
  owner: string;
  name: string;
  mainBranch: string;
  prBranch?: string;
  prNumber?: number;
  localPath: string;
  isTemp: boolean;
}

export class RepositoryManager {
  private tempDirs: Set<string> = new Set();
  private readonly baseDir: string;
  
  constructor(baseDir?: string) {
    // Use system temp dir or provided base directory
    this.baseDir = baseDir || path.join(os.tmpdir(), 'two-branch-analysis');
    this.ensureDirectory(this.baseDir);
  }
  
  /**
   * Clone a repository and prepare it for analysis
   */
  async cloneRepository(
    repoUrl: string,
    targetBranch?: string,
    options: CloneOptions = {}
  ): Promise<RepositoryInfo> {
    const repoInfo = this.parseGitHubUrl(repoUrl);
    const timestamp = Date.now();
    const dirName = `${repoInfo.owner}-${repoInfo.name}-${targetBranch || 'main'}-${timestamp}`;
    const localPath = path.join(this.baseDir, dirName);
    
    logger.info(`🔄 Cloning repository: ${repoUrl}`);
    logger.info(`   Target: ${localPath}`);
    
    try {
      // Ensure clean directory
      await this.ensureCleanDirectory(localPath);
      this.tempDirs.add(localPath);
      
      // Build clone command
      const cloneArgs = [
        'clone',
        options.quiet ? '--quiet' : '',
        options.depth ? `--depth ${options.depth}` : '',
        options.singleBranch && targetBranch ? '--single-branch' : '',
        targetBranch ? `--branch ${targetBranch}` : '',
        repoUrl,
        localPath
      ].filter(Boolean).join(' ');
      
      // Clone with timeout
      const timeout = options.timeout || 300000; // 5 minutes default
      await this.executeGitCommand(`git ${cloneArgs}`, { timeout });
      
      // Get default branch if not specified
      const mainBranch = targetBranch || await this.getDefaultBranch(localPath);
      
      logger.info(`✅ Repository cloned successfully`);
      
      return {
        url: repoUrl,
        owner: repoInfo.owner,
        name: repoInfo.name,
        mainBranch,
        localPath,
        isTemp: true
      };
    } catch (error) {
      logger.error(`Failed to clone repository: ${error}`);
      // Cleanup on failure
      await this.cleanupDirectory(localPath);
      throw error;
    }
  }
  
  /**
   * Clone repository for PR analysis (both main and PR branches)
   */
  async cloneForPRAnalysis(
    repoUrl: string,
    prNumber: number,
    mainBranch = 'main'
  ): Promise<{ main: RepositoryInfo; pr: RepositoryInfo }> {
    logger.info(`📦 Setting up repositories for PR #${prNumber} analysis`);
    
    // Parse repo info
    const { owner, name } = this.parseGitHubUrl(repoUrl);
    
    // Clone main branch
    logger.info(`\n1️⃣ Cloning main branch (${mainBranch})...`);
    const mainRepo = await this.cloneRepository(repoUrl, mainBranch, {
      depth: 50, // Shallow clone for performance
      singleBranch: true
    });
    
    // Clone and checkout PR branch
    logger.info(`\n2️⃣ Cloning PR #${prNumber}...`);
    const prDirName = `${owner}-${name}-pr-${prNumber}-${Date.now()}`;
    const prPath = path.join(this.baseDir, prDirName);
    
    try {
      await this.ensureCleanDirectory(prPath);
      this.tempDirs.add(prPath);
      
      // Clone repository
      await this.executeGitCommand(
        `git clone --depth 50 ${repoUrl} ${prPath}`,
        { timeout: 300000 }
      );
      
      // Fetch PR head
      await this.executeGitCommand(
        `git fetch origin pull/${prNumber}/head:pr-${prNumber}`,
        { cwd: prPath, timeout: 60000 }
      );
      
      // Checkout PR branch
      await this.executeGitCommand(
        `git checkout pr-${prNumber}`,
        { cwd: prPath }
      );
      
      const prRepo: RepositoryInfo = {
        url: repoUrl,
        owner,
        name,
        mainBranch,
        prBranch: `pr-${prNumber}`,
        prNumber,
        localPath: prPath,
        isTemp: true
      };
      
      logger.info(`✅ Both repositories ready for analysis`);
      logger.info(`   Main: ${mainRepo.localPath}`);
      logger.info(`   PR:   ${prRepo.localPath}`);
      
      return { main: mainRepo, pr: prRepo };
    } catch (error) {
      logger.error(`Failed to setup PR branch: ${error}`);
      // Cleanup both repos on failure
      await this.cleanupDirectory(mainRepo.localPath);
      await this.cleanupDirectory(prPath);
      throw error;
    }
  }
  
  /**
   * Checkout a specific branch in a repository
   */
  async checkoutBranch(
    repoPath: string,
    branch: string,
    create = false
  ): Promise<void> {
    logger.info(`🔀 Checking out branch: ${branch}`);
    
    try {
      if (create) {
        // Create and checkout new branch
        await this.executeGitCommand(
          `git checkout -b ${branch}`,
          { cwd: repoPath }
        );
      } else {
        // Fetch latest and checkout existing branch
        await this.executeGitCommand(
          `git fetch origin ${branch}`,
          { cwd: repoPath }
        );
        await this.executeGitCommand(
          `git checkout ${branch}`,
          { cwd: repoPath }
        );
      }
      
      logger.info(`✅ Switched to branch: ${branch}`);
    } catch (error) {
      logger.error(`Failed to checkout branch ${branch}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get list of files changed in a PR
   */
  async getPRChangedFiles(
    repoPath: string,
    baseBranch: string,
    prBranch: string
  ): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `git diff --name-only ${baseBranch}...${prBranch}`,
        { cwd: repoPath }
      );
      
      return stdout
        .split('\n')
        .filter(Boolean)
        .map(file => file.trim());
    } catch (error) {
      logger.error(`Failed to get changed files: ${error}`);
      return [];
    }
  }
  
  /**
   * Get commit hash for current HEAD
   */
  async getCommitHash(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'git rev-parse HEAD',
        { cwd: repoPath }
      );
      return stdout.trim();
    } catch (error) {
      logger.error(`Failed to get commit hash: ${error}`);
      return 'unknown';
    }
  }
  
  /**
   * Clean up a single repository
   */
  async cleanupRepository(repo: RepositoryInfo): Promise<void> {
    if (repo.isTemp && repo.localPath) {
      await this.cleanupDirectory(repo.localPath);
      this.tempDirs.delete(repo.localPath);
    }
  }
  
  /**
   * Clean up all temporary directories
   */
  async cleanupAll(): Promise<void> {
    logger.info(`🧹 Cleaning up ${this.tempDirs.size} temporary directories`);
    
    const cleanupPromises = Array.from(this.tempDirs).map(dir =>
      this.cleanupDirectory(dir).catch(err =>
        logger.warn(`Failed to cleanup ${dir}: ${err}`)
      )
    );
    
    await Promise.all(cleanupPromises);
    this.tempDirs.clear();
  }
  
  /**
   * Parse GitHub URL to extract owner and repo name
   */
  private parseGitHubUrl(url: string): { owner: string; name: string } {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/,
      /^([^/]+)\/([^/]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          name: match[2]
        };
      }
    }
    
    throw new Error(`Invalid GitHub URL: ${url}`);
  }
  
  /**
   * Get default branch of a repository
   */
  private async getDefaultBranch(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'git symbolic-ref refs/remotes/origin/HEAD',
        { cwd: repoPath }
      );
      return stdout.trim().replace('refs/remotes/origin/', '');
    } catch {
      // Fallback to common defaults
      const branches = await this.listBranches(repoPath);
      if (branches.includes('main')) return 'main';
      if (branches.includes('master')) return 'master';
      return branches[0] || 'main';
    }
  }
  
  /**
   * List all branches in a repository
   */
  private async listBranches(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        'git branch -r',
        { cwd: repoPath }
      );
      return stdout
        .split('\n')
        .filter(Boolean)
        .map(b => b.trim().replace('origin/', ''));
    } catch {
      return [];
    }
  }
  
  /**
   * Execute git command with timeout
   */
  private async executeGitCommand(
    command: string,
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 60000; // 1 minute default
    
    return new Promise((resolve, reject) => {
      const proc = exec(command, { cwd: options.cwd }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
      
      // Set timeout
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out: ${command}`));
      }, timeout);
      
      proc.on('exit', () => clearTimeout(timer));
    });
  }
  
  /**
   * Ensure directory exists and is empty
   */
  private async ensureCleanDirectory(dirPath: string): Promise<void> {
    try {
      await this.cleanupDirectory(dirPath);
      await fsPromises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error(`Failed to ensure clean directory: ${error}`);
      throw error;
    }
  }
  
  /**
   * Ensure directory exists
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  /**
   * Clean up a directory
   */
  private async cleanupDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) return;
    
    try {
      // Use rm -rf for efficiency
      execSync(`rm -rf ${dirPath}`, { stdio: 'ignore' });
    } catch (error) {
      // Fallback to Node.js fs
      await fsPromises.rmdir(dirPath, { recursive: true });
    }
  }
}

export default RepositoryManager;