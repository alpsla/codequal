/**
 * Cached Repository Manager
 * 
 * Optimized version that:
 * 1. Clones repository once and caches it
 * 2. Creates PR branches from cached clone (much faster)
 * 3. Uses Redis to track cache metadata
 * 4. Implements smart cache invalidation
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';
import { RepositoryIndexer } from '../indexing/RepositoryIndexer';
import { RepositoryIndex } from '../indexing/RepositoryIndexer';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

export interface CachedRepositoryInfo {
  url: string;
  owner: string;
  name: string;
  mainBranch: string;
  prBranch?: string;
  prNumber?: number;
  localPath: string;
  isCache?: boolean;
  isTemp?: boolean;
  lastUpdated?: Date;
  commitHash?: string;
  index?: RepositoryIndex;  // Repository index for fast lookups
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 1 hour)
  forceRefresh?: boolean; // Force fresh clone even if cache exists
  shallow?: boolean; // Use shallow clone (default: true)
  depth?: number; // Clone depth (default: 50)
}

export class CachedRepositoryManager {
  private redis: Redis | null;
  private cacheDir: string;
  private tempDirs: Set<string> = new Set();
  private readonly CACHE_PREFIX = 'repo:cache:';
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private indexer: RepositoryIndexer;
  
  constructor(
    cacheDir?: string,
    redisUrl?: string
  ) {
    // Setup cache directory
    this.cacheDir = cacheDir || path.join(os.homedir(), '.codequal', 'repo-cache');
    this.ensureDirectory(this.cacheDir);
    
    // Setup Redis connection (optional)
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        logger.info('✅ Redis connected for repository caching');
      } catch (error) {
        logger.warn('⚠️ Redis connection failed, using filesystem cache only');
        this.redis = null;
      }
    } else {
      this.redis = null;
    }
    
    // Initialize repository indexer
    this.indexer = new RepositoryIndexer();
  }

  /**
   * Clone repository for PR analysis with caching
   * 
   * Strategy:
   * 1. Check if we have a cached base repository
   * 2. If not, clone once and cache it
   * 3. Create PR branch from cached repository (fast local operation)
   * 4. Update cache metadata in Redis
   */
  async cloneForPRAnalysis(
    repoUrl: string,
    prNumber: number,
    mainBranch = 'main',
    options: CacheOptions = {}
  ): Promise<{ main: CachedRepositoryInfo; pr: CachedRepositoryInfo }> {
    logger.info(`🚀 Smart PR analysis setup for PR #${prNumber}`);
    
    const { owner, name } = this.parseGitHubUrl(repoUrl);
    const cacheKey = this.getCacheKey(repoUrl);
    
    // Step 1: Get or create cached base repository with index
    logger.info('📦 Checking repository cache...');
    const cachedBase = await this.getOrCreateCachedRepo(
      repoUrl,
      mainBranch,
      options
    );
    
    // Ensure we have an index for the cached repository
    if (!cachedBase.index) {
      logger.info('📚 Building repository index...');
      cachedBase.index = await this.indexer.buildIndex(cachedBase.localPath, repoUrl, 'main');
      await this.saveCachedIndex(cacheKey, cachedBase.index);
    }
    
    // Step 2: Create working copies from cache
    logger.info('🔄 Creating working copies from cache...');
    
    // Create main branch working copy
    const mainWorkingPath = path.join(
      this.getTempDir(),
      `${owner}-${name}-main-${Date.now()}`
    );
    await this.createWorkingCopy(cachedBase.localPath, mainWorkingPath);
    
    // Ensure we're on the main branch
    await this.executeGitCommand(
      `git checkout ${mainBranch}`,
      { cwd: mainWorkingPath }
    );
    
    const mainRepo: CachedRepositoryInfo = {
      ...cachedBase,
      localPath: mainWorkingPath,
      isCache: false,
      isTemp: true,
      index: cachedBase.index  // Share the index
    };
    this.tempDirs.add(mainWorkingPath);
    
    // Step 3: Create PR branch working copy
    const prWorkingPath = path.join(
      this.getTempDir(),
      `${owner}-${name}-pr-${prNumber}-${Date.now()}`
    );
    await this.createWorkingCopy(cachedBase.localPath, prWorkingPath);
    
    // Fetch and checkout PR
    logger.info(`🎯 Fetching PR #${prNumber}...`);
    await this.executeGitCommand(
      `git fetch origin pull/${prNumber}/head:pr-${prNumber}`,
      { cwd: prWorkingPath, timeout: 60000 }
    );
    
    await this.executeGitCommand(
      `git checkout pr-${prNumber}`,
      { cwd: prWorkingPath }
    );
    
    const prRepo: CachedRepositoryInfo = {
      url: repoUrl,
      owner,
      name,
      mainBranch,
      prBranch: `pr-${prNumber}`,
      prNumber,
      localPath: prWorkingPath,
      isCache: false,
      isTemp: true,
      index: cachedBase.index  // Share the index (PR branch has same structure)
    };
    this.tempDirs.add(prWorkingPath);
    
    logger.info('✅ Repositories ready (using cache)');
    logger.info(`   Cache:  ${cachedBase.localPath}`);
    logger.info(`   Main:   ${mainRepo.localPath}`);
    logger.info(`   PR:     ${prRepo.localPath}`);
    
    // Step 4: Update cache metadata
    await this.updateCacheMetadata(cacheKey, {
      lastUsed: new Date(),
      usageCount: await this.incrementUsageCount(cacheKey)
    });
    
    return { main: mainRepo, pr: prRepo };
  }

  /**
   * Get or create cached repository
   */
  private async getOrCreateCachedRepo(
    repoUrl: string,
    mainBranch: string,
    options: CacheOptions
  ): Promise<CachedRepositoryInfo> {
    const { owner, name } = this.parseGitHubUrl(repoUrl);
    const cacheKey = this.getCacheKey(repoUrl);
    const cachePath = path.join(this.cacheDir, `${owner}-${name}-base`);
    
    // Check if we need to refresh
    const shouldRefresh = options.forceRefresh || 
      !(await this.isCacheValid(cacheKey, cachePath, options.ttl));
    
    if (shouldRefresh) {
      logger.info('🔄 Refreshing repository cache...');
      
      // Remove old cache if exists
      if (fs.existsSync(cachePath)) {
        await this.cleanupDirectory(cachePath);
      }
      
      // Clone fresh
      await this.ensureDirectory(cachePath);
      
      const cloneArgs = [
        'clone',
        options.shallow !== false ? `--depth ${options.depth || 50}` : '',
        '--no-single-branch', // We need all branches for PR fetching
        repoUrl,
        cachePath
      ].filter(Boolean).join(' ');
      
      await this.executeGitCommand(`git ${cloneArgs}`, { timeout: 300000 });
      
      // Build repository index immediately after cloning
      logger.info('📚 Building initial repository index...');
      const index = await this.indexer.buildIndex(cachePath, repoUrl, 'main');
      
      // Update cache metadata
      const commitHash = await this.getCommitHash(cachePath);
      await this.setCacheMetadata(cacheKey, {
        url: repoUrl,
        owner,
        name,
        mainBranch,
        localPath: cachePath,
        lastUpdated: new Date(),
        commitHash,
        ttl: options.ttl || this.DEFAULT_TTL
      });
      
      // Save the index
      await this.saveCachedIndex(cacheKey, index);
      
      logger.info('✅ Repository cached and indexed successfully');
      logger.info(`   Files indexed: ${index.stats.totalFiles}`);
      logger.info(`   Languages: ${Array.from(index.stats.languages.keys()).join(', ')}`);
      
      return {
        url: repoUrl,
        owner,
        name,
        mainBranch,
        localPath: cachePath,
        isCache: true,
        lastUpdated: new Date(),
        commitHash,
        index
      };
    }
    
    // Using existing cache
    logger.info('✅ Using existing repository cache');
    
    // Update the cache to get latest changes
    await this.updateCachedRepo(cachePath);
    
    // Load cached index
    const cachedIndex = await this.loadCachedIndex(cacheKey);
    if (cachedIndex) {
      logger.info('✅ Loaded cached index');
      logger.info(`   Files indexed: ${cachedIndex.stats.totalFiles}`);
      logger.info(`   Languages: ${Array.from(cachedIndex.stats.languages.keys()).join(', ')}`);
    }
    
    return {
      url: repoUrl,
      owner,
      name,
      mainBranch,
      localPath: cachePath,
      isCache: true,
      lastUpdated: new Date(),
      commitHash: await this.getCommitHash(cachePath),
      index: cachedIndex || undefined
    };
  }

  /**
   * Update cached repository with latest changes
   */
  private async updateCachedRepo(cachePath: string): Promise<void> {
    try {
      logger.info('📥 Fetching latest changes for cache...');
      await this.executeGitCommand(
        'git fetch --all --prune',
        { cwd: cachePath, timeout: 60000 }
      );
      
      // Reset to latest main branch
      await this.executeGitCommand(
        'git reset --hard origin/HEAD',
        { cwd: cachePath }
      );
    } catch (error) {
      logger.warn(`Failed to update cache: ${error}`);
      // Cache is still usable even if update fails
    }
  }

  /**
   * Create a working copy from cached repository
   * Uses git worktree for efficiency if possible, otherwise copies
   */
  private async createWorkingCopy(
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    // Try using git worktree (most efficient)
    try {
      await this.executeGitCommand(
        `git worktree add ${targetPath} HEAD`,
        { cwd: sourcePath }
      );
      logger.info('✅ Created working copy using git worktree');
    } catch {
      // Fallback to copy
      logger.info('📋 Creating working copy using file copy...');
      await this.copyDirectory(sourcePath, targetPath);
    }
  }

  /**
   * Copy directory efficiently
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    await this.ensureDirectory(target);
    
    // Use rsync if available (fastest)
    try {
      await execAsync(`rsync -a --exclude=.git/logs ${source}/ ${target}/`);
    } catch {
      // Fallback to cp
      await execAsync(`cp -R ${source}/* ${target}/`);
    }
  }

  /**
   * Check if cache is valid
   */
  private async isCacheValid(
    cacheKey: string,
    cachePath: string,
    ttl?: number
  ): Promise<boolean> {
    // Check if directory exists
    if (!fs.existsSync(cachePath)) {
      return false;
    }
    
    // Check cache metadata
    const metadata = await this.getCacheMetadata(cacheKey);
    if (!metadata) {
      return false;
    }
    
    // Check TTL
    const maxAge = (ttl || this.DEFAULT_TTL) * 1000;
    const age = Date.now() - new Date(metadata.lastUpdated).getTime();
    
    if (age > maxAge) {
      logger.info('⏰ Cache expired');
      return false;
    }
    
    return true;
  }

  /**
   * Get cache key for repository
   */
  private getCacheKey(repoUrl: string): string {
    const hash = createHash('md5').update(repoUrl).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get cache metadata from Redis
   */
  private async getCacheMetadata(key: string): Promise<any> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set cache metadata in Redis
   */
  private async setCacheMetadata(key: string, metadata: any): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(
        key,
        metadata.ttl || this.DEFAULT_TTL,
        JSON.stringify(metadata)
      );
    } catch (error) {
      logger.warn(`Failed to set cache metadata: ${error}`);
    }
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMetadata(key: string, updates: any): Promise<void> {
    const existing = await this.getCacheMetadata(key);
    if (existing) {
      await this.setCacheMetadata(key, { ...existing, ...updates });
    }
  }

  /**
   * Increment usage count
   */
  private async incrementUsageCount(key: string): Promise<number> {
    if (!this.redis) return 0;
    
    try {
      return await this.redis.hincrby(`${key}:stats`, 'usageCount', 1);
    } catch {
      return 0;
    }
  }

  /**
   * Get statistics for all cached repositories
   */
  async getCacheStatistics(): Promise<{
    totalCached: number;
    totalSize: number;
    repositories: Array<{
      url: string;
      size: number;
      lastUsed: Date;
      usageCount: number;
    }>;
  }> {
    const stats = {
      totalCached: 0,
      totalSize: 0,
      repositories: []
    };
    
    // Scan cache directory
    const entries = await fsPromises.readdir(this.cacheDir);
    
    for (const entry of entries) {
      const fullPath = path.join(this.cacheDir, entry);
      const stat = await fsPromises.stat(fullPath);
      
      if (stat.isDirectory()) {
        stats.totalCached++;
        // Get directory size (simplified)
        const size = await this.getDirectorySize(fullPath);
        stats.totalSize += size;
        
        // Get metadata if available
        // ... (implementation depends on Redis availability)
      }
    }
    
    return stats;
  }

  /**
   * Clear old cache entries
   */
  async clearOldCache(maxAge: number = 7 * 24 * 3600): Promise<void> {
    logger.info('🧹 Cleaning old cache entries...');
    
    const entries = await fsPromises.readdir(this.cacheDir);
    const now = Date.now();
    let cleaned = 0;
    
    for (const entry of entries) {
      const fullPath = path.join(this.cacheDir, entry);
      const stat = await fsPromises.stat(fullPath);
      
      const age = now - stat.mtimeMs;
      if (age > maxAge * 1000) {
        await this.cleanupDirectory(fullPath);
        cleaned++;
      }
    }
    
    logger.info(`✅ Cleaned ${cleaned} old cache entries`);
  }

  /**
   * Clean up temporary directories
   */
  async cleanupTempDirs(): Promise<void> {
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
   * Clean up everything (temp + cache)
   */
  async cleanupAll(): Promise<void> {
    await this.cleanupTempDirs();
    // Don't clean cache by default, it's valuable
  }

  // ... (Helper methods from original RepositoryManager)
  
  private parseGitHubUrl(url: string): { owner: string; name: string } {
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

  private async getCommitHash(repoPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'git rev-parse HEAD',
        { cwd: repoPath }
      );
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  private async executeGitCommand(
    command: string,
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 60000;
    
    return new Promise((resolve, reject) => {
      const proc = exec(command, { cwd: options.cwd }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
      
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out: ${command}`));
      }, timeout);
      
      proc.on('exit', () => clearTimeout(timer));
    });
  }

  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private async cleanupDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) return;
    
    try {
      execSync(`rm -rf ${dirPath}`, { stdio: 'ignore' });
    } catch {
      await fsPromises.rm(dirPath, { recursive: true, force: true });
    }
  }

  private getTempDir(): string {
    return path.join(os.tmpdir(), 'codequal-analysis');
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`du -sb ${dirPath}`);
      return parseInt(stdout.split('\t')[0]);
    } catch {
      return 0;
    }
  }

  /**
   * Save repository index to cache
   */
  private async saveCachedIndex(cacheKey: string, index: RepositoryIndex): Promise<void> {
    // Save to Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(
          `${cacheKey}:index`,
          this.DEFAULT_TTL,
          JSON.stringify(index)
        );
      } catch (error) {
        logger.warn(`Failed to save index to Redis: ${error}`);
      }
    }
    
    // Also save to filesystem for persistence
    const indexPath = path.join(this.cacheDir, `${cacheKey.replace(':', '_')}_index.json`);
    try {
      await fsPromises.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      logger.warn(`Failed to save index to filesystem: ${error}`);
    }
  }

  /**
   * Load cached repository index
   */
  private async loadCachedIndex(cacheKey: string): Promise<RepositoryIndex | null> {
    // Try Redis first
    if (this.redis) {
      try {
        const data = await this.redis.get(`${cacheKey}:index`);
        if (data) {
          return JSON.parse(data);
        }
      } catch {
        // Fall through to filesystem
      }
    }
    
    // Try filesystem
    const indexPath = path.join(this.cacheDir, `${cacheKey.replace(':', '_')}_index.json`);
    try {
      const data = await fsPromises.readFile(indexPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Get index for a repository (from cache or build new)
   */
  public async getRepositoryIndex(repoPath: string): Promise<RepositoryIndex> {
    const cacheKey = this.getCacheKey(repoPath);
    
    // Try to load from cache first
    const cachedIndex = await this.loadCachedIndex(cacheKey);
    if (cachedIndex) {
      logger.info('✅ Loaded repository index from cache');
      return cachedIndex;
    }
    
    // Build new index
    logger.info('📚 Building new repository index...');
    const index = await this.indexer.buildIndex(repoPath, '', 'main');
    
    // Save for next time
    await this.saveCachedIndex(cacheKey, index);
    
    return index;
  }
}