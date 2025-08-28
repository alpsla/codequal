/**
 * Repository Indexer Service
 * 
 * Builds and maintains an in-memory index of repository structure for O(1) lookups
 * Runs in parallel with DeepWiki analysis for zero overhead
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import Redis from 'ioredis';

export interface FileMetadata {
  path: string;
  relativePath: string;
  lines: number;
  size: number;
  hash: string;
  extension: string;
  lastModified: Date;
  language?: string;
}

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  snippet: string;
  confidence: number;
}

export interface RepositoryIndex {
  repoUrl: string;
  commitHash?: string;
  branch?: string;
  indexedAt: Date;
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    languages: Map<string, number>;
    indexingTime: number;
  };
  // Core index structures for O(1) lookups
  fileSet: Set<string>;                    // Quick file existence check
  fileMetadata: Map<string, FileMetadata>; // Detailed file info
  lineCountCache: Map<string, number>;     // Quick line validation
  extensionMap: Map<string, string[]>;     // Files by extension
  contentHashes: Map<string, string>;      // For duplicate detection
  // Code search structures
  codeSnippets?: Map<string, CodeLocation[]>; // Optional: snippet->locations
}

export class RepositoryIndexer {
  private redis?: Redis;
  private cacheEnabled: boolean;
  private cacheTTL: number = 1800; // 30 minutes default
  
  constructor(redis?: Redis, options?: { cacheTTL?: number; cacheEnabled?: boolean }) {
    this.redis = redis;
    this.cacheEnabled = options?.cacheEnabled ?? true;
    this.cacheTTL = options?.cacheTTL ?? 1800;
  }
  
  /**
   * Build a complete index of the repository
   * Designed to run in parallel with DeepWiki analysis
   */
  async buildIndex(
    repoPath: string,
    repoUrl: string,
    options?: {
      branch?: string;
      includeContent?: boolean;
      filePatterns?: string[];
    }
  ): Promise<RepositoryIndex> {
    const startTime = Date.now();
    console.log('📊 Starting repository indexing...');
    
    // Check cache first
    if (this.cacheEnabled) {
      const cached = await this.getCachedIndex(repoUrl, options?.branch);
      if (cached) {
        console.log('✅ Using cached index (built in 0ms)');
        return cached;
      }
    }
    
    // Get current commit hash for cache key
    const commitHash = this.getCommitHash(repoPath);
    
    // Initialize index structure
    const index: RepositoryIndex = {
      repoUrl,
      commitHash,
      branch: options?.branch,
      indexedAt: new Date(),
      stats: {
        totalFiles: 0,
        totalLines: 0,
        totalSize: 0,
        languages: new Map(),
        indexingTime: 0
      },
      fileSet: new Set(),
      fileMetadata: new Map(),
      lineCountCache: new Map(),
      extensionMap: new Map(),
      contentHashes: new Map()
    };
    
    // Build file list efficiently
    const files = await this.getRelevantFiles(repoPath, options?.filePatterns);
    console.log(`  📁 Found ${files.length} files to index`);
    
    // Process files in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(file => this.indexFile(file, repoPath, index)));
      
      // Progress indicator for large repos
      if (files.length > 1000 && i % 500 === 0) {
        console.log(`  📊 Indexed ${i}/${files.length} files...`);
      }
    }
    
    // Calculate final stats
    index.stats.totalFiles = index.fileSet.size;
    index.stats.indexingTime = Date.now() - startTime;
    
    console.log(`✅ Index built successfully:`);
    console.log(`  - Files: ${index.stats.totalFiles}`);
    console.log(`  - Lines: ${index.stats.totalLines.toLocaleString()}`);
    console.log(`  - Size: ${(index.stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  - Time: ${index.stats.indexingTime}ms`);
    
    // Cache the index
    if (this.cacheEnabled) {
      await this.cacheIndex(index);
    }
    
    return index;
  }
  
  /**
   * Index a single file
   */
  private async indexFile(
    filePath: string,
    repoPath: string,
    index: RepositoryIndex
  ): Promise<void> {
    try {
      const relativePath = path.relative(repoPath, filePath);
      const stats = fs.statSync(filePath);
      
      // Skip large files (>10MB)
      if (stats.size > 10 * 1024 * 1024) {
        return;
      }
      
      // Read file content for line counting and hashing
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      const hash = crypto.createHash('md5').update(content).digest('hex');
      const ext = path.extname(filePath).toLowerCase();
      
      // Create metadata
      const metadata: FileMetadata = {
        path: filePath,
        relativePath,
        lines,
        size: stats.size,
        hash,
        extension: ext,
        lastModified: stats.mtime,
        language: this.detectLanguage(ext)
      };
      
      // Update index structures
      index.fileSet.add(relativePath);
      index.fileMetadata.set(relativePath, metadata);
      index.lineCountCache.set(relativePath, lines);
      index.contentHashes.set(relativePath, hash);
      
      // Update extension map
      if (!index.extensionMap.has(ext)) {
        index.extensionMap.set(ext, []);
      }
      index.extensionMap.get(ext)!.push(relativePath);
      
      // Update language stats
      if (metadata.language) {
        const count = index.stats.languages.get(metadata.language) || 0;
        index.stats.languages.set(metadata.language, count + 1);
      }
      
      // Update totals
      index.stats.totalLines += lines;
      index.stats.totalSize += stats.size;
      
    } catch (error) {
      // Silently skip files we can't read (permissions, etc.)
    }
  }
  
  /**
   * Get list of relevant files to index
   */
  private async getRelevantFiles(
    repoPath: string,
    patterns?: string[]
  ): Promise<string[]> {
    // Use git ls-files for speed and to respect .gitignore
    try {
      const gitFiles = execSync(
        'git ls-files --cached --others --exclude-standard',
        { cwd: repoPath, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );
      
      const files = gitFiles
        .split('\n')
        .filter(f => f.trim())
        .map(f => path.join(repoPath, f))
        .filter(f => {
          // Filter by patterns if provided
          if (patterns && patterns.length > 0) {
            const fileName = path.basename(f);
            return patterns.some(p => fileName.match(p));
          }
          // Default: include common code files
          const ext = path.extname(f).toLowerCase();
          return [
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
            '.py', '.java', '.go', '.rs', '.cpp', '.c',
            '.cs', '.rb', '.php', '.swift', '.kt', '.scala',
            '.vue', '.svelte', '.astro', '.yaml', '.yml',
            '.json', '.xml', '.html', '.css', '.scss'
          ].includes(ext);
        });
      
      return files;
    } catch {
      // Fallback to recursive directory scan
      return this.scanDirectory(repoPath);
    }
  }
  
  /**
   * Fallback directory scanner
   */
  private scanDirectory(dir: string, files: string[] = []): string[] {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        if (entry.isDirectory()) {
          this.scanDirectory(fullPath, files);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
    
    return files;
  }
  
  /**
   * Detect programming language from extension
   */
  private detectLanguage(extension: string): string | undefined {
    const languageMap: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.java': 'Java',
      '.go': 'Go',
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.scala': 'Scala',
      '.vue': 'Vue',
      '.svelte': 'Svelte'
    };
    
    return languageMap[extension.toLowerCase()];
  }
  
  /**
   * Get current git commit hash
   */
  private getCommitHash(repoPath: string): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: repoPath,
        encoding: 'utf-8'
      }).trim();
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Cache the index in Redis
   */
  private async cacheIndex(index: RepositoryIndex): Promise<void> {
    if (!this.redis || !this.cacheEnabled) return;
    
    try {
      const cacheKey = this.getCacheKey(index.repoUrl, index.branch, index.commitHash);
      
      // Convert Sets and Maps to arrays for JSON serialization
      const serializable = {
        ...index,
        fileSet: Array.from(index.fileSet),
        fileMetadata: Array.from(index.fileMetadata.entries()),
        lineCountCache: Array.from(index.lineCountCache.entries()),
        extensionMap: Array.from(index.extensionMap.entries()),
        contentHashes: Array.from(index.contentHashes.entries()),
        stats: {
          ...index.stats,
          languages: Array.from(index.stats.languages.entries())
        }
      };
      
      await this.redis.setex(
        cacheKey,
        this.cacheTTL,
        JSON.stringify(serializable)
      );
      
      console.log(`  💾 Index cached for ${this.cacheTTL}s`);
    } catch (error) {
      console.warn('  ⚠️ Failed to cache index:', error);
    }
  }
  
  /**
   * Retrieve cached index from Redis
   */
  private async getCachedIndex(
    repoUrl: string,
    branch?: string
  ): Promise<RepositoryIndex | null> {
    if (!this.redis || !this.cacheEnabled) return null;
    
    try {
      // Try with current commit first
      const repoPath = `/tmp/codequal-repos/${this.getRepoNameFromUrl(repoUrl)}`;
      const commitHash = fs.existsSync(repoPath) ? this.getCommitHash(repoPath) : undefined;
      
      const cacheKey = this.getCacheKey(repoUrl, branch, commitHash);
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // Restore Sets and Maps
        return {
          ...parsed,
          fileSet: new Set(parsed.fileSet),
          fileMetadata: new Map(parsed.fileMetadata),
          lineCountCache: new Map(parsed.lineCountCache),
          extensionMap: new Map(parsed.extensionMap),
          contentHashes: new Map(parsed.contentHashes),
          stats: {
            ...parsed.stats,
            languages: new Map(parsed.stats.languages)
          },
          indexedAt: new Date(parsed.indexedAt)
        };
      }
    } catch (error) {
      console.warn('  ⚠️ Failed to retrieve cached index:', error);
    }
    
    return null;
  }
  
  /**
   * Generate cache key
   */
  private getCacheKey(repoUrl: string, branch?: string, commitHash?: string): string {
    const parts = ['repo-index', repoUrl];
    if (branch) parts.push(branch);
    if (commitHash) parts.push(commitHash.substring(0, 8));
    return parts.join(':');
  }
  
  /**
   * Extract repository name from URL
   */
  private getRepoNameFromUrl(repoUrl: string): string {
    const match = repoUrl.match(/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
    return match ? `${match[1]}-${match[2]}` : 'unknown-repo';
  }
}

export default RepositoryIndexer;