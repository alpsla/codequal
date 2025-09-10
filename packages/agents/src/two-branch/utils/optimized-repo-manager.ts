/**
 * Optimized Repository Manager
 * Implements efficient repository cloning and caching strategy:
 * 1. Shallow clone main branch once
 * 2. Cache in local filesystem
 * 3. Create instant PR workspaces using hard links
 * 4. Fetch only PR-specific changes
 * 
 * Works efficiently for all repository sizes
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
// Simple logger implementation to avoid circular dependencies
const createLogger = (name: string) => ({
  info: (msg: string, data?: any) => console.log(`[${name}] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[${name}] ${msg}`, error || ''),
  warn: (msg: string, data?: any) => console.warn(`[${name}] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => process.env.DEBUG && console.log(`[${name}] DEBUG: ${msg}`, data || '')
});

const exec = promisify(execCallback);
const logger = createLogger('OptimizedRepoManager');

export interface RepoConfig {
  owner: string;
  repo: string;
  baseUrl?: string;
  defaultBranch?: string;
  shallowDepth?: number;
}

export interface PRWorkspace {
  path: string;
  prNumber: number;
  baseBranch: string;
  prBranch: string;
  changedFiles: string[];
  createdAt: Date;
}

export interface CloneMetrics {
  isInitialClone: boolean;
  cloneTime: number;
  repoSize: number;
  commitCount: number;
  lastUpdated: Date;
}

export class OptimizedRepoManager {
  private cacheDir: string;
  private redis: Redis;
  private workspaceDir: string;
  private metrics: Map<string, CloneMetrics>;

  constructor(
    cacheDir: string = '/tmp/codequal/cache/repos',
    workspaceDir: string = '/tmp/codequal/workspaces',
    redisUrl?: string
  ) {
    this.cacheDir = cacheDir;
    this.workspaceDir = workspaceDir;
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.metrics = new Map();

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories() {
    [this.cacheDir, this.workspaceDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Setup or update repository cache
   * Uses shallow clone for efficiency
   */
  async setupRepo(config: RepoConfig): Promise<CloneMetrics> {
    const startTime = Date.now();
    const { owner, repo, baseUrl = 'https://github.com', defaultBranch = 'main', shallowDepth = 500 } = config;
    const repoPath = path.join(this.cacheDir, owner, repo);
    const repoUrl = `${baseUrl}/${owner}/${repo}.git`;
    
    let isInitialClone = false;

    logger.info(`Setting up repository: ${owner}/${repo}`);

    try {
      if (!fs.existsSync(repoPath)) {
        // Initial shallow clone
        isInitialClone = true;
        logger.info(`Performing initial shallow clone (depth=${shallowDepth})...`);
        
        // Create parent directory
        fs.mkdirSync(path.dirname(repoPath), { recursive: true });
        
        // Shallow clone with single branch
        const cloneCmd = `git clone --depth=${shallowDepth} --single-branch --branch=${defaultBranch} ${repoUrl} ${repoPath}`;
        await exec(cloneCmd);
        
        logger.info(`Initial clone completed for ${owner}/${repo}`);
      } else {
        // Update existing cache
        logger.info(`Updating cached repository...`);
        
        // Fetch latest changes
        await exec(`git -C ${repoPath} fetch --depth=${shallowDepth} origin ${defaultBranch}`);
        
        // Reset to latest
        await exec(`git -C ${repoPath} reset --hard origin/${defaultBranch}`);
        
        // Clean any uncommitted changes
        await exec(`git -C ${repoPath} clean -fd`);
        
        logger.info(`Cache updated for ${owner}/${repo}`);
      }

      // Index repository in Redis
      await this.indexRepository(repoPath, owner, repo);

      // Get repository metrics
      const { stdout: sizeOutput } = await exec(`du -sh ${repoPath} | cut -f1`);
      const { stdout: commitOutput } = await exec(`git -C ${repoPath} rev-list --count HEAD`);

      const metrics: CloneMetrics = {
        isInitialClone,
        cloneTime: Date.now() - startTime,
        repoSize: this.parseSize(sizeOutput.trim()),
        commitCount: parseInt(commitOutput.trim()),
        lastUpdated: new Date()
      };

      this.metrics.set(`${owner}/${repo}`, metrics);
      
      logger.info(`Repository setup complete: ${owner}/${repo}`, {
        cloneTime: `${metrics.cloneTime}ms`,
        size: sizeOutput.trim(),
        commits: metrics.commitCount
      });

      return metrics;
    } catch (error) {
      logger.error(`Failed to setup repository ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Create PR workspace using hard links (COW)
   * This is nearly instant even for large repos
   */
  async createPRWorkspace(
    owner: string,
    repo: string,
    prNumber: number,
    prBranch?: string
  ): Promise<PRWorkspace> {
    const startTime = Date.now();
    const sourcePath = path.join(this.cacheDir, owner, repo);
    const workspacePath = path.join(this.workspaceDir, `${owner}-${repo}-pr-${prNumber}`);
    
    logger.info(`Creating PR workspace for ${owner}/${repo}#${prNumber}`);

    try {
      // Ensure source repository exists
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Repository cache not found. Run setupRepo first for ${owner}/${repo}`);
      }

      // Remove existing workspace if it exists
      if (fs.existsSync(workspacePath)) {
        logger.info(`Removing existing workspace: ${workspacePath}`);
        await exec(`rm -rf ${workspacePath}`);
      }

      // Create workspace using hard links (instant, no actual copying)
      logger.info(`Creating COW workspace using hard links...`);
      // Use rsync for better error handling with large repos
      await exec(
        `rsync -a --link-dest=${sourcePath} ${sourcePath}/ ${workspacePath}/`,
        { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for error messages
      );

      // Fetch PR changes
      logger.info(`Fetching PR #${prNumber} changes...`);
      const prRef = prBranch || `pull/${prNumber}/head`;
      await exec(`git -C ${workspacePath} fetch origin ${prRef}:pr-${prNumber}`);
      
      // Checkout PR branch
      await exec(`git -C ${workspacePath} checkout pr-${prNumber}`);

      // Get changed files
      const { stdout: mainBranch } = await exec(`git -C ${workspacePath} symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`);
      const baseBranch = mainBranch.trim() || 'main';
      
      const { stdout: changedFilesOutput } = await exec(
        `git -C ${workspacePath} diff --name-only origin/${baseBranch}...pr-${prNumber}`
      );
      
      const changedFiles = changedFilesOutput.trim().split('\n').filter(f => f);

      const workspace: PRWorkspace = {
        path: workspacePath,
        prNumber,
        baseBranch,
        prBranch: `pr-${prNumber}`,
        changedFiles,
        createdAt: new Date()
      };

      const setupTime = Date.now() - startTime;
      logger.info(`PR workspace created in ${setupTime}ms`, {
        path: workspacePath,
        changedFiles: changedFiles.length,
        files: changedFiles.slice(0, 5) // Log first 5 files
      });

      // Cache workspace info in Redis
      await this.redis.setex(
        `workspace:${owner}:${repo}:${prNumber}`,
        3600, // 1 hour TTL
        JSON.stringify(workspace)
      );

      return workspace;
    } catch (error) {
      logger.error(`Failed to create PR workspace for ${owner}/${repo}#${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get list of changed files for a PR
   */
  async getPRChangedFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<string[]> {
    // Check if workspace exists
    const cachedWorkspace = await this.redis.get(`workspace:${owner}:${repo}:${prNumber}`);
    
    if (cachedWorkspace) {
      const workspace: PRWorkspace = JSON.parse(cachedWorkspace);
      return workspace.changedFiles;
    }

    // Use GitHub API as fallback
    return this.fetchPRChangedFilesFromAPI(owner, repo, prNumber);
  }

  /**
   * Fetch changed files using GitHub API
   */
  private async fetchPRChangedFilesFromAPI(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<string[]> {
    const token = process.env.GITHUB_TOKEN;
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const files = await response.json();
      return files.map((f: any) => f.filename);
    } catch (error) {
      logger.error(`Failed to fetch PR files from API:`, error);
      throw error;
    }
  }

  /**
   * Index repository structure in Redis for fast lookups
   */
  private async indexRepository(repoPath: string, owner: string, repo: string) {
    try {
      // For large repos, just count files instead of listing all
      const { stdout: fileCountOutput } = await exec(
        `git -C ${repoPath} ls-files | wc -l`,
        { maxBuffer: 1024 * 1024 } // 1MB buffer
      );
      const fileCount = parseInt(fileCountOutput.trim());

      // For small repos, index file list; for large ones, just store count
      if (fileCount < 10000) {
        // Get all files in repository with limited buffer
        const { stdout } = await exec(
          `git -C ${repoPath} ls-files`,
          { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
        );
        const files = stdout.trim().split('\n');

        // Store file list in Redis
        const key = `repo:${owner}:${repo}:files`;
        await this.redis.del(key);
        
        // Store in batches for efficiency
        const batchSize = 1000;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          await this.redis.sadd(key, ...batch);
        }
      }

      // Store metadata
      await this.redis.hset(`repo:${owner}:${repo}:meta`, {
        fileCount,
        lastIndexed: new Date().toISOString(),
        path: repoPath,
        indexed: fileCount < 10000
      });

      logger.info(`Repository ${owner}/${repo}: ${fileCount} files${fileCount >= 10000 ? ' (indexing skipped for large repo)' : ' (indexed)'}`);
    } catch (error) {
      logger.error(`Failed to index repository:`, error);
      // Non-critical error, continue
    }
  }

  /**
   * Clean up PR workspace
   */
  async cleanupWorkspace(owner: string, repo: string, prNumber: number) {
    const workspacePath = path.join(this.workspaceDir, `${owner}-${repo}-pr-${prNumber}`);
    
    try {
      if (fs.existsSync(workspacePath)) {
        await exec(`rm -rf ${workspacePath}`);
        logger.info(`Cleaned up workspace: ${workspacePath}`);
      }

      // Clear Redis cache
      await this.redis.del(`workspace:${owner}:${repo}:${prNumber}`);
    } catch (error) {
      logger.error(`Failed to cleanup workspace:`, error);
    }
  }

  /**
   * Get repository metrics
   */
  getMetrics(owner: string, repo: string): CloneMetrics | undefined {
    return this.metrics.get(`${owner}/${repo}`);
  }

  /**
   * Parse size output to bytes
   */
  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^([\d.]+)([KMG])?$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2] || '';
      return value * (units[unit] || 1);
    }
    return 0;
  }

  /**
   * Close connections
   */
  async close() {
    await this.redis.quit();
  }
}

// Export singleton instance for convenience
export const repoManager = new OptimizedRepoManager();