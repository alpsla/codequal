/**
 * Repository Indexer for Two-Branch Analysis
 * 
 * Builds and maintains an in-memory index of repository structure for fast lookups
 * Optimized for comparing two branches efficiently
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { AnalysisCacheService } from '../cache/AnalysisCacheService';
import { FileInfo } from '../types';

export interface FileMetadata {
  path: string;
  relativePath: string;
  lines: number;
  size: number;
  hash: string;
  extension: string;
  lastModified: Date;
  language?: string;
  content?: string; // Optional, for small files
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
  branch: string;
  commitHash: string;
  indexedAt: Date;
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    languages: Map<string, number>;
    indexingTime: number;
  };
  // Core index structures for fast lookups
  fileSet: Set<string>;                    // Quick file existence check
  fileMetadata: Map<string, FileMetadata>; // Detailed file info
  lineCountCache: Map<string, number>;     // Quick line validation
  extensionMap: Map<string, string[]>;     // Files by extension
  contentHashes: Map<string, string>;      // For duplicate detection
  languageMap: Map<string, string[]>;      // Files by language
}

export class RepositoryIndexer {
  private cacheService: AnalysisCacheService;
  private readonly supportedExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs',
    '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.hpp', '.swift',
    '.kt', '.scala', '.r', '.m', '.mm', '.vue', '.svelte'
  ]);
  
  private readonly languageMap: Map<string, string> = new Map([
    ['.js', 'javascript'],
    ['.jsx', 'javascript'],
    ['.ts', 'typescript'],
    ['.tsx', 'typescript'],
    ['.py', 'python'],
    ['.java', 'java'],
    ['.go', 'go'],
    ['.rs', 'rust'],
    ['.rb', 'ruby'],
    ['.php', 'php'],
    ['.cs', 'csharp'],
    ['.cpp', 'cpp'],
    ['.c', 'c'],
    ['.swift', 'swift'],
    ['.kt', 'kotlin'],
    ['.scala', 'scala'],
    ['.vue', 'vue'],
    ['.svelte', 'svelte']
  ]);
  
  constructor(cacheService?: AnalysisCacheService) {
    this.cacheService = cacheService || new AnalysisCacheService();
  }
  
  /**
   * Build a complete index of the repository
   */
  async buildIndex(
    repoPath: string,
    repoUrl: string,
    branch: string,
    options?: {
      includeContent?: boolean;
      filePatterns?: string[];
      maxFileSize?: number;
    }
  ): Promise<RepositoryIndex> {
    const startTime = Date.now();
    console.log(`📊 Indexing repository: ${repoUrl} (${branch})`);
    
    // Check cache first
    const cacheKey = this.cacheService.generateCacheKey('repo', { 
      repo: repoUrl, 
      branch 
    });
    const cached = await this.cacheService.get<RepositoryIndex>(cacheKey);
    if (cached && this.isCacheValid(cached, repoPath)) {
      console.log(`✅ Using cached index for ${branch} (built in 0ms)`);
      return cached;
    }
    
    // Get current commit hash
    const commitHash = this.getCommitHash(repoPath);
    
    // Initialize index structure
    const index: RepositoryIndex = {
      repoUrl,
      branch,
      commitHash,
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
      contentHashes: new Map(),
      languageMap: new Map()
    };
    
    // Walk through repository and index files
    await this.walkDirectory(repoPath, repoPath, index, options);
    
    // Calculate final statistics
    index.stats.indexingTime = Date.now() - startTime;
    
    console.log(`✅ Indexed ${index.stats.totalFiles} files in ${index.stats.indexingTime}ms`);
    console.log(`   Total lines: ${index.stats.totalLines}`);
    console.log(`   Total size: ${this.formatBytes(index.stats.totalSize)}`);
    console.log(`   Languages: ${Array.from(index.stats.languages.keys()).join(', ')}`);
    
    // Cache the index
    await this.cacheService.set(cacheKey, index, 3600); // 1 hour TTL
    
    return index;
  }
  
  /**
   * Walk directory and index files
   */
  private async walkDirectory(
    rootPath: string,
    currentPath: string,
    index: RepositoryIndex,
    options?: {
      includeContent?: boolean;
      filePatterns?: string[];
      maxFileSize?: number;
    }
  ): Promise<void> {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);
        
        // Skip hidden files and common ignore patterns
        if (this.shouldSkip(entry.name, relativePath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively index subdirectories
          await this.walkDirectory(rootPath, fullPath, index, options);
        } else if (entry.isFile()) {
          // Index file
          await this.indexFile(fullPath, relativePath, index, options);
        }
      }
    } catch (error) {
      console.warn(`Failed to index directory ${currentPath}:`, error);
    }
  }
  
  /**
   * Index a single file
   */
  private async indexFile(
    fullPath: string,
    relativePath: string,
    index: RepositoryIndex,
    options?: {
      includeContent?: boolean;
      maxFileSize?: number;
    }
  ): Promise<void> {
    try {
      const stats = fs.statSync(fullPath);
      const extension = path.extname(fullPath).toLowerCase();
      
      // Skip if not a supported file type
      if (!this.supportedExtensions.has(extension)) {
        return;
      }
      
      // Skip large files
      const maxSize = options?.maxFileSize || 1024 * 1024; // 1MB default
      if (stats.size > maxSize) {
        return;
      }
      
      // Read file content for analysis
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      const hash = this.hashContent(content);
      const language = this.languageMap.get(extension) || 'unknown';
      
      // Create metadata
      const metadata: FileMetadata = {
        path: fullPath,
        relativePath,
        lines,
        size: stats.size,
        hash,
        extension,
        lastModified: stats.mtime,
        language
      };
      
      // Optionally include content for small files
      if (options?.includeContent && stats.size < 10240) { // < 10KB
        metadata.content = content;
      }
      
      // Update index structures
      index.fileSet.add(relativePath);
      index.fileMetadata.set(relativePath, metadata);
      index.lineCountCache.set(relativePath, lines);
      index.contentHashes.set(relativePath, hash);
      
      // Update extension map
      if (!index.extensionMap.has(extension)) {
        index.extensionMap.set(extension, []);
      }
      index.extensionMap.get(extension)!.push(relativePath);
      
      // Update language map
      if (!index.languageMap.has(language)) {
        index.languageMap.set(language, []);
      }
      index.languageMap.get(language)!.push(relativePath);
      
      // Update statistics
      index.stats.totalFiles++;
      index.stats.totalLines += lines;
      index.stats.totalSize += stats.size;
      
      const count = index.stats.languages.get(language) || 0;
      index.stats.languages.set(language, count + 1);
    } catch (error) {
      // Silently skip files that can't be read
    }
  }
  
  /**
   * Check if file/directory should be skipped
   */
  private shouldSkip(name: string, relativePath: string): boolean {
    // Skip hidden files/directories
    if (name.startsWith('.')) return true;
    
    // Skip common ignore patterns
    const ignorePatterns = [
      'node_modules',
      '__pycache__',
      'dist',
      'build',
      'target',
      'out',
      '.git',
      '.svn',
      '.hg',
      'vendor',
      'venv',
      '.env',
      'coverage',
      '.nyc_output',
      '.pytest_cache'
    ];
    
    return ignorePatterns.some(pattern => 
      name === pattern || relativePath.includes(`/${pattern}/`)
    );
  }
  
  /**
   * Get commit hash for the repository
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
   * Check if cached index is still valid
   */
  private isCacheValid(cached: RepositoryIndex, repoPath: string): boolean {
    const currentHash = this.getCommitHash(repoPath);
    return cached.commitHash === currentHash;
  }
  
  /**
   * Hash content for comparison
   */
  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  }
  
  /**
   * Get files by extension
   */
  getFilesByExtension(index: RepositoryIndex, extension: string): string[] {
    return index.extensionMap.get(extension) || [];
  }
  
  /**
   * Get files by language
   */
  getFilesByLanguage(index: RepositoryIndex, language: string): string[] {
    return index.languageMap.get(language) || [];
  }
  
  /**
   * Check if file exists in index
   */
  fileExists(index: RepositoryIndex, filePath: string): boolean {
    return index.fileSet.has(filePath);
  }
  
  /**
   * Get file metadata
   */
  getFileMetadata(index: RepositoryIndex, filePath: string): FileMetadata | undefined {
    return index.fileMetadata.get(filePath);
  }
  
  /**
   * Validate line number for a file
   */
  isValidLineNumber(index: RepositoryIndex, filePath: string, line: number): boolean {
    const lineCount = index.lineCountCache.get(filePath);
    return lineCount !== undefined && line > 0 && line <= lineCount;
  }
}

export default RepositoryIndexer;