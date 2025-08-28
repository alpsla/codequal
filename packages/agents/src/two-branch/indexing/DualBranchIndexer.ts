/**
 * Dual Branch Indexer for Two-Branch Analysis
 * 
 * Efficiently indexes both main and PR branches for comparison
 * Identifies added, removed, modified, and moved files
 */

import { RepositoryIndexer, RepositoryIndex, FileMetadata } from './RepositoryIndexer';
import { AnalysisCacheService } from '../cache/AnalysisCacheService';
import * as path from 'path';
import { execSync } from 'child_process';

export interface DualBranchIndices {
  main: RepositoryIndex;
  pr: RepositoryIndex;
  diff: BranchDiff;
  crossReference: Map<string, FileMappings>;
}

export interface BranchDiff {
  added: Set<string>;      // Files only in PR
  removed: Set<string>;     // Files only in main
  modified: Set<string>;    // Files in both but changed
  unchanged: Set<string>;   // Files in both, unchanged
  moved: Map<string, string>; // Old path -> New path
  stats: {
    addedLines: number;
    removedLines: number;
    modifiedFiles: number;
    totalChanges: number;
  };
}

export interface FileMappings {
  mainPath?: string;
  prPath?: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged' | 'moved';
  similarity?: number; // For moved files
}

export interface IndexingOptions {
  includeContent?: boolean;
  filePatterns?: string[];
  maxFileSize?: number;
  parallel?: boolean;
}

export class DualBranchIndexer {
  private indexer: RepositoryIndexer;
  private cacheService: AnalysisCacheService;
  
  constructor(cacheService?: AnalysisCacheService) {
    this.cacheService = cacheService || new AnalysisCacheService();
    this.indexer = new RepositoryIndexer(this.cacheService);
  }
  
  /**
   * Build indices for both branches
   */
  async buildDualIndices(
    repoUrl: string,
    repoPaths: {
      main: string;
      pr: string;
    },
    branches: {
      main: string;
      pr: string;
    },
    options?: IndexingOptions
  ): Promise<DualBranchIndices> {
    console.log(`🔀 Building dual indices for ${branches.main} and ${branches.pr}...`);
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.cacheService.generateCacheKey('comparison', {
      repo: repoUrl,
      branch: `${branches.main}-vs-${branches.pr}`
    });
    const cached = await this.cacheService.get<DualBranchIndices>(cacheKey);
    if (cached && this.isValidCache(cached, repoPaths)) {
      console.log(`✅ Using cached dual indices (0ms)`);
      return cached;
    }
    
    // Build both indices (in parallel if requested)
    let mainIndex: RepositoryIndex;
    let prIndex: RepositoryIndex;
    
    if (options?.parallel !== false) {
      // Parallel indexing (default)
      [mainIndex, prIndex] = await Promise.all([
        this.indexer.buildIndex(repoPaths.main, repoUrl, branches.main, options),
        this.indexer.buildIndex(repoPaths.pr, repoUrl, branches.pr, options)
      ]);
    } else {
      // Sequential indexing (for memory-constrained environments)
      mainIndex = await this.indexer.buildIndex(repoPaths.main, repoUrl, branches.main, options);
      prIndex = await this.indexer.buildIndex(repoPaths.pr, repoUrl, branches.pr, options);
    }
    
    console.log(`✅ Built indices:`);
    console.log(`  Main (${branches.main}): ${mainIndex.stats.totalFiles} files, ${mainIndex.stats.totalLines} lines`);
    console.log(`  PR (${branches.pr}): ${prIndex.stats.totalFiles} files, ${prIndex.stats.totalLines} lines`);
    
    // Calculate diff between branches
    const diff = this.calculateDiff(mainIndex, prIndex);
    
    // Build cross-reference map
    const crossReference = this.buildCrossReference(mainIndex, prIndex, diff);
    
    const result: DualBranchIndices = {
      main: mainIndex,
      pr: prIndex,
      diff,
      crossReference
    };
    
    // Cache the result
    await this.cacheService.set(cacheKey, result, 1800); // 30 minutes TTL
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Dual indexing completed in ${totalTime}ms`);
    
    return result;
  }
  
  /**
   * Calculate differences between branches
   */
  private calculateDiff(main: RepositoryIndex, pr: RepositoryIndex): BranchDiff {
    const added = new Set<string>();
    const removed = new Set<string>();
    const modified = new Set<string>();
    const unchanged = new Set<string>();
    const moved = new Map<string, string>();
    
    // Track statistics
    let addedLines = 0;
    let removedLines = 0;
    
    // Build hash to files map for main branch (for detecting moves)
    const mainHashToFile = new Map<string, string[]>();
    for (const [file, hash] of main.contentHashes) {
      if (!mainHashToFile.has(hash)) {
        mainHashToFile.set(hash, []);
      }
      mainHashToFile.get(hash)!.push(file);
    }
    
    // Process PR files
    for (const prFile of pr.fileSet) {
      const prMetadata = pr.fileMetadata.get(prFile);
      if (!prMetadata) continue;
      
      if (!main.fileSet.has(prFile)) {
        // File doesn't exist in main - check if it was moved
        const prHash = pr.contentHashes.get(prFile);
        
        if (prHash && mainHashToFile.has(prHash)) {
          // Same content exists in main - likely moved
          const candidates = mainHashToFile.get(prHash)!;
          const movedFrom = candidates.find(f => !pr.fileSet.has(f));
          
          if (movedFrom) {
            moved.set(movedFrom, prFile);
            continue;
          }
        }
        
        // New file
        added.add(prFile);
        addedLines += prMetadata.lines;
      } else {
        // File exists in both - check if modified
        const mainHash = main.contentHashes.get(prFile);
        const prHash = pr.contentHashes.get(prFile);
        
        if (mainHash !== prHash) {
          modified.add(prFile);
          // Approximate line changes (actual diff would be more accurate)
          const mainLines = main.lineCountCache.get(prFile) || 0;
          const prLines = pr.lineCountCache.get(prFile) || 0;
          if (prLines > mainLines) {
            addedLines += prLines - mainLines;
          } else {
            removedLines += mainLines - prLines;
          }
        } else {
          unchanged.add(prFile);
        }
      }
    }
    
    // Find removed files
    for (const mainFile of main.fileSet) {
      if (!pr.fileSet.has(mainFile) && !moved.has(mainFile)) {
        removed.add(mainFile);
        const mainMetadata = main.fileMetadata.get(mainFile);
        if (mainMetadata) {
          removedLines += mainMetadata.lines;
        }
      }
    }
    
    const stats = {
      addedLines,
      removedLines,
      modifiedFiles: modified.size,
      totalChanges: added.size + removed.size + modified.size + moved.size
    };
    
    console.log(`📊 Branch diff summary:`);
    console.log(`  Added: ${added.size} files (+${addedLines} lines)`);
    console.log(`  Removed: ${removed.size} files (-${removedLines} lines)`);
    console.log(`  Modified: ${modified.size} files`);
    console.log(`  Moved: ${moved.size} files`);
    console.log(`  Unchanged: ${unchanged.size} files`);
    
    return {
      added,
      removed,
      modified,
      unchanged,
      moved,
      stats
    };
  }
  
  /**
   * Build cross-reference map between branches
   */
  private buildCrossReference(
    main: RepositoryIndex,
    pr: RepositoryIndex,
    diff: BranchDiff
  ): Map<string, FileMappings> {
    const crossReference = new Map<string, FileMappings>();
    
    // Added files
    for (const file of diff.added) {
      crossReference.set(file, {
        prPath: file,
        status: 'added'
      });
    }
    
    // Removed files
    for (const file of diff.removed) {
      crossReference.set(file, {
        mainPath: file,
        status: 'removed'
      });
    }
    
    // Modified files
    for (const file of diff.modified) {
      crossReference.set(file, {
        mainPath: file,
        prPath: file,
        status: 'modified'
      });
    }
    
    // Unchanged files
    for (const file of diff.unchanged) {
      crossReference.set(file, {
        mainPath: file,
        prPath: file,
        status: 'unchanged'
      });
    }
    
    // Moved files
    for (const [oldPath, newPath] of diff.moved) {
      crossReference.set(oldPath, {
        mainPath: oldPath,
        prPath: newPath,
        status: 'moved',
        similarity: 100 // Same content hash = 100% similar
      });
      
      // Also add entry for new path
      crossReference.set(newPath, {
        mainPath: oldPath,
        prPath: newPath,
        status: 'moved',
        similarity: 100
      });
    }
    
    return crossReference;
  }
  
  /**
   * Check if cached indices are still valid
   */
  private isValidCache(cached: DualBranchIndices, repoPaths: { main: string; pr: string }): boolean {
    try {
      const mainHash = execSync('git rev-parse HEAD', {
        cwd: repoPaths.main,
        encoding: 'utf-8'
      }).trim();
      
      const prHash = execSync('git rev-parse HEAD', {
        cwd: repoPaths.pr,
        encoding: 'utf-8'
      }).trim();
      
      return cached.main.commitHash === mainHash && cached.pr.commitHash === prHash;
    } catch {
      return false;
    }
  }
  
  /**
   * Find file in the opposite branch (for tracking renames/moves)
   */
  findCorrespondingFile(
    indices: DualBranchIndices,
    filePath: string,
    inBranch: 'main' | 'pr'
  ): string | null {
    const mapping = indices.crossReference.get(filePath);
    if (!mapping) return null;
    
    if (inBranch === 'main') {
      return mapping.prPath || null;
    } else {
      return mapping.mainPath || null;
    }
  }
  
  /**
   * Get all files that changed between branches
   */
  getChangedFiles(indices: DualBranchIndices): string[] {
    const changed = new Set<string>();
    
    indices.diff.added.forEach(f => changed.add(f));
    indices.diff.removed.forEach(f => changed.add(f));
    indices.diff.modified.forEach(f => changed.add(f));
    indices.diff.moved.forEach((newPath, oldPath) => {
      changed.add(oldPath);
      changed.add(newPath);
    });
    
    return Array.from(changed);
  }
  
  /**
   * Get files by change type
   */
  getFilesByChangeType(
    indices: DualBranchIndices,
    changeType: 'added' | 'removed' | 'modified' | 'unchanged' | 'moved'
  ): string[] {
    switch (changeType) {
      case 'added':
        return Array.from(indices.diff.added);
      case 'removed':
        return Array.from(indices.diff.removed);
      case 'modified':
        return Array.from(indices.diff.modified);
      case 'unchanged':
        return Array.from(indices.diff.unchanged);
      case 'moved':
        return Array.from(indices.diff.moved.values());
      default:
        return [];
    }
  }
  
  /**
   * Calculate impact score for changes
   */
  calculateImpactScore(indices: DualBranchIndices): number {
    const { diff } = indices;
    
    // Weight different types of changes
    const weights = {
      added: 0.3,
      removed: 0.5, // Removing code is riskier
      modified: 0.4,
      moved: 0.1
    };
    
    const score = 
      diff.added.size * weights.added +
      diff.removed.size * weights.removed +
      diff.modified.size * weights.modified +
      diff.moved.size * weights.moved;
    
    // Normalize to 0-100 scale
    const totalFiles = indices.main.stats.totalFiles + indices.pr.stats.totalFiles;
    return Math.min(100, (score / Math.max(1, totalFiles)) * 100);
  }
}

export default DualBranchIndexer;