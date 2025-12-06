/**
 * File Cache
 *
 * In-memory cache for file contents to avoid repeated disk I/O.
 * Pre-caches all files affected by issues for fast access during parallel fixing.
 *
 * Features:
 * - Pre-load all affected files in one pass
 * - Extract code snippets around specific lines
 * - Track modified files
 * - Write back changes
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedFile {
  /** File path (relative to workspace) */
  filePath: string;
  /** Full absolute path */
  absolutePath: string;
  /** File content */
  content: string;
  /** Content split into lines */
  lines: string[];
  /** Whether the file has been modified */
  modified: boolean;
  /** Original content (for rollback) */
  originalContent: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  mtime: Date;
}

export interface FileCacheStats {
  totalFiles: number;
  totalSize: number;
  modifiedFiles: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface SnippetOptions {
  /** Lines before the target line */
  linesBefore?: number;
  /** Lines after the target line */
  linesAfter?: number;
  /** Include line numbers in output */
  includeLineNumbers?: boolean;
}

// ============================================================================
// FILE CACHE CLASS
// ============================================================================

/**
 * File Cache for parallel fix execution
 *
 * Usage:
 * ```typescript
 * const cache = new FileCache('/path/to/workspace');
 *
 * // Pre-cache all affected files
 * await cache.preloadFiles(['src/app.ts', 'src/index.ts']);
 *
 * // Get file content
 * const content = cache.getContent('src/app.ts');
 *
 * // Get snippet around a line
 * const snippet = cache.getSnippet('src/app.ts', 42, { linesBefore: 5, linesAfter: 5 });
 *
 * // Update content
 * cache.setContent('src/app.ts', newContent);
 *
 * // Write all modified files
 * await cache.writeModified();
 * ```
 */
export class FileCache {
  private cache: Map<string, CachedFile> = new Map();
  private workspaceRoot: string;

  // Stats
  private hits = 0;
  private misses = 0;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  // ============================================================================
  // PRELOAD METHODS
  // ============================================================================

  /**
   * Preload multiple files into cache
   */
  async preloadFiles(filePaths: string[]): Promise<number> {
    const uniquePaths = Array.from(new Set(filePaths));
    let loaded = 0;

    const startTime = Date.now();

    for (const filePath of uniquePaths) {
      try {
        await this.loadFile(filePath);
        loaded++;
      } catch (error) {
        // File doesn't exist or can't be read - skip
        console.warn(`[FileCache] Could not load ${filePath}: ${(error as Error).message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[FileCache] Preloaded ${loaded}/${uniquePaths.length} files in ${duration}ms`
    );

    return loaded;
  }

  /**
   * Load a single file into cache
   */
  private async loadFile(filePath: string): Promise<CachedFile> {
    const absolutePath = this.resolveAbsolutePath(filePath);
    const relativePath = this.resolveRelativePath(filePath);

    // Check if already cached
    if (this.cache.has(relativePath)) {
      return this.cache.get(relativePath)!;
    }

    // Read file
    const stat = await fs.promises.stat(absolutePath);
    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');

    const cached: CachedFile = {
      filePath: relativePath,
      absolutePath,
      content,
      lines,
      modified: false,
      originalContent: content,
      size: stat.size,
      mtime: stat.mtime,
    };

    this.cache.set(relativePath, cached);
    return cached;
  }

  // ============================================================================
  // READ METHODS
  // ============================================================================

  /**
   * Get file content (loads on demand if not cached)
   */
  getContent(filePath: string): string | undefined {
    const relativePath = this.resolveRelativePath(filePath);
    const cached = this.cache.get(relativePath);

    if (cached) {
      this.hits++;
      return cached.content;
    }

    this.misses++;

    // Try to load synchronously (for consistency in parallel execution)
    try {
      const absolutePath = this.resolveAbsolutePath(filePath);
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const stat = fs.statSync(absolutePath);

      const newCached: CachedFile = {
        filePath: relativePath,
        absolutePath,
        content,
        lines: content.split('\n'),
        modified: false,
        originalContent: content,
        size: stat.size,
        mtime: stat.mtime,
      };

      this.cache.set(relativePath, newCached);
      return content;
    } catch {
      return undefined;
    }
  }

  /**
   * Get lines array (for line-based operations)
   */
  getLines(filePath: string): string[] | undefined {
    const relativePath = this.resolveRelativePath(filePath);
    const cached = this.cache.get(relativePath);

    if (cached) {
      this.hits++;
      return cached.lines;
    }

    // Load content which will populate lines
    const content = this.getContent(filePath);
    if (!content) return undefined;

    return this.cache.get(relativePath)!.lines;
  }

  /**
   * Get a code snippet around a specific line
   */
  getSnippet(
    filePath: string,
    lineNumber: number,
    options: SnippetOptions = {}
  ): string | undefined {
    const { linesBefore = 5, linesAfter = 5, includeLineNumbers = false } = options;

    const lines = this.getLines(filePath);
    if (!lines) return undefined;

    // Convert to 0-indexed
    const targetLine = lineNumber - 1;

    const startLine = Math.max(0, targetLine - linesBefore);
    const endLine = Math.min(lines.length - 1, targetLine + linesAfter);

    const snippetLines = lines.slice(startLine, endLine + 1);

    if (includeLineNumbers) {
      return snippetLines
        .map((line, i) => `${startLine + i + 1}: ${line}`)
        .join('\n');
    }

    return snippetLines.join('\n');
  }

  /**
   * Check if a file is cached
   */
  has(filePath: string): boolean {
    const relativePath = this.resolveRelativePath(filePath);
    return this.cache.has(relativePath);
  }

  // ============================================================================
  // WRITE METHODS
  // ============================================================================

  /**
   * Update file content in cache
   */
  setContent(filePath: string, newContent: string): boolean {
    const relativePath = this.resolveRelativePath(filePath);
    const cached = this.cache.get(relativePath);

    if (!cached) {
      // Create new cache entry
      const absolutePath = this.resolveAbsolutePath(filePath);
      const newCached: CachedFile = {
        filePath: relativePath,
        absolutePath,
        content: newContent,
        lines: newContent.split('\n'),
        modified: true,
        originalContent: '', // New file
        size: Buffer.byteLength(newContent, 'utf-8'),
        mtime: new Date(),
      };
      this.cache.set(relativePath, newCached);
      return true;
    }

    // Update existing
    cached.content = newContent;
    cached.lines = newContent.split('\n');
    cached.modified = true;
    cached.size = Buffer.byteLength(newContent, 'utf-8');

    return true;
  }

  /**
   * Update specific lines in a file
   */
  updateLines(
    filePath: string,
    startLine: number,
    endLine: number,
    newLines: string[]
  ): boolean {
    const lines = this.getLines(filePath);
    if (!lines) return false;

    // Convert to 0-indexed
    const start = startLine - 1;
    const end = endLine - 1;

    // Replace lines
    const newLineArray = [
      ...lines.slice(0, start),
      ...newLines,
      ...lines.slice(end + 1),
    ];

    const newContent = newLineArray.join('\n');
    return this.setContent(filePath, newContent);
  }

  /**
   * Replace a specific line
   */
  replaceLine(filePath: string, lineNumber: number, newLine: string): boolean {
    return this.updateLines(filePath, lineNumber, lineNumber, [newLine]);
  }

  /**
   * Write all modified files to disk
   */
  async writeModified(): Promise<string[]> {
    const modifiedFiles: string[] = [];

    for (const [filePath, cached] of Array.from(this.cache.entries())) {
      if (cached.modified) {
        try {
          // Ensure directory exists
          const dir = path.dirname(cached.absolutePath);
          await fs.promises.mkdir(dir, { recursive: true });

          // Write file
          await fs.promises.writeFile(cached.absolutePath, cached.content, 'utf-8');

          // Mark as no longer modified
          cached.modified = false;
          cached.originalContent = cached.content;

          modifiedFiles.push(filePath);
        } catch (error) {
          console.error(`[FileCache] Failed to write ${filePath}: ${(error as Error).message}`);
        }
      }
    }

    console.log(`[FileCache] Wrote ${modifiedFiles.length} modified files`);
    return modifiedFiles;
  }

  /**
   * Rollback a file to original content
   */
  rollback(filePath: string): boolean {
    const relativePath = this.resolveRelativePath(filePath);
    const cached = this.cache.get(relativePath);

    if (!cached) return false;

    cached.content = cached.originalContent;
    cached.lines = cached.originalContent.split('\n');
    cached.modified = false;

    return true;
  }

  /**
   * Rollback all modified files
   */
  rollbackAll(): number {
    let count = 0;

    for (const [, cached] of Array.from(this.cache.entries())) {
      if (cached.modified) {
        cached.content = cached.originalContent;
        cached.lines = cached.originalContent.split('\n');
        cached.modified = false;
        count++;
      }
    }

    return count;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Get all modified files
   */
  getModifiedFiles(): string[] {
    const modified: string[] = [];

    for (const [filePath, cached] of Array.from(this.cache.entries())) {
      if (cached.modified) {
        modified.push(filePath);
      }
    }

    return modified;
  }

  /**
   * Get all cached files
   */
  getCachedFiles(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get file metadata
   */
  getFileInfo(filePath: string): Pick<CachedFile, 'size' | 'mtime' | 'modified'> | undefined {
    const relativePath = this.resolveRelativePath(filePath);
    const cached = this.cache.get(relativePath);

    if (!cached) return undefined;

    return {
      size: cached.size,
      mtime: cached.mtime,
      modified: cached.modified,
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get cache statistics
   */
  getStats(): FileCacheStats {
    let totalSize = 0;
    let modifiedFiles = 0;

    for (const cached of Array.from(this.cache.values())) {
      totalSize += cached.size;
      if (cached.modified) {
        modifiedFiles++;
      }
    }

    return {
      totalFiles: this.cache.size,
      totalSize,
      modifiedFiles,
      cacheHits: this.hits,
      cacheMisses: this.misses,
    };
  }

  /**
   * Get cache size in files
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Resolve to absolute path
   */
  private resolveAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.workspaceRoot, filePath);
  }

  /**
   * Resolve to relative path
   */
  private resolveRelativePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return path.relative(this.workspaceRoot, filePath);
    }
    return filePath;
  }
}

export default FileCache;
