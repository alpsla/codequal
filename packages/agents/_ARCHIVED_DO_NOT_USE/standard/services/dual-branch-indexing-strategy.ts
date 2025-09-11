/**
 * Dual Branch Indexing Strategy
 * 
 * Efficiently indexes both main and PR branches for comparison
 * Supports diff-aware validation and cross-branch code recovery
 */

import { RepositoryIndexer, RepositoryIndex } from './repository-indexer';
import { BidirectionalCodeLocator } from './code-snippet-bidirectional-locator';
import Redis from 'ioredis';
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
  movedFiles: Map<string, string>; // Old path -> New path
}

export interface FileMappings {
  mainPath?: string;
  prPath?: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged' | 'moved';
}

export class DualBranchIndexingStrategy {
  private indexer: RepositoryIndexer;
  private locator: BidirectionalCodeLocator;
  private redis?: Redis;
  
  constructor(redis?: Redis) {
    this.redis = redis;
    this.indexer = new RepositoryIndexer(redis);
    this.locator = new BidirectionalCodeLocator();
  }
  
  /**
   * Build indices for both branches in parallel
   */
  async buildDualIndices(
    repoUrl: string,
    mainBranch = 'main',
    prBranch: string
  ): Promise<DualBranchIndices> {
    console.log(`🔀 Building dual indices for ${mainBranch} and ${prBranch}...`);
    
    const repoName = this.getRepoNameFromUrl(repoUrl);
    const mainPath = `/tmp/codequal-repos/${repoName}-${mainBranch}`;
    const prPath = `/tmp/codequal-repos/${repoName}-${prBranch}`;
    
    // Build both indices in parallel
    const [mainIndex, prIndex] = await Promise.all([
      this.indexer.buildIndex(mainPath, repoUrl, { branch: mainBranch }),
      this.indexer.buildIndex(prPath, repoUrl, { branch: prBranch })
    ]);
    
    console.log(`✅ Built indices:`);
    console.log(`  Main: ${mainIndex.stats.totalFiles} files, ${mainIndex.stats.totalLines} lines`);
    console.log(`  PR:   ${prIndex.stats.totalFiles} files, ${prIndex.stats.totalLines} lines`);
    
    // Calculate diff between branches
    const diff = this.calculateDiff(mainIndex, prIndex);
    
    // Build cross-reference map
    const crossReference = this.buildCrossReference(mainIndex, prIndex, diff);
    
    return {
      main: mainIndex,
      pr: prIndex,
      diff,
      crossReference
    };
  }
  
  /**
   * Calculate differences between branches
   */
  private calculateDiff(main: RepositoryIndex, pr: RepositoryIndex): BranchDiff {
    const added = new Set<string>();
    const removed = new Set<string>();
    const modified = new Set<string>();
    const unchanged = new Set<string>();
    const movedFiles = new Map<string, string>();
    
    // Find added and modified files
    for (const prFile of pr.fileSet) {
      if (!main.fileSet.has(prFile)) {
        // Check if file was moved (same content hash, different path)
        const prHash = pr.contentHashes.get(prFile);
        if (prHash) {
          let found = false;
          for (const [mainFile, mainHash] of main.contentHashes) {
            if (mainHash === prHash && !pr.fileSet.has(mainFile)) {
              movedFiles.set(mainFile, prFile);
              found = true;
              break;
            }
          }
          if (!found) {
            added.add(prFile);
          }
        } else {
          added.add(prFile);
        }
      } else {
        // File exists in both - check if modified
        const mainHash = main.contentHashes.get(prFile);
        const prHash = pr.contentHashes.get(prFile);
        
        if (mainHash !== prHash) {
          modified.add(prFile);
        } else {
          unchanged.add(prFile);
        }
      }
    }
    
    // Find removed files
    for (const mainFile of main.fileSet) {
      if (!pr.fileSet.has(mainFile) && !movedFiles.has(mainFile)) {
        removed.add(mainFile);
      }
    }
    
    console.log(`📊 Branch diff:`);
    console.log(`  Added: ${added.size} files`);
    console.log(`  Removed: ${removed.size} files`);
    console.log(`  Modified: ${modified.size} files`);
    console.log(`  Moved: ${movedFiles.size} files`);
    console.log(`  Unchanged: ${unchanged.size} files`);
    
    return {
      added,
      removed,
      modified,
      unchanged,
      movedFiles
    };
  }
  
  /**
   * Build cross-reference map for quick lookups
   */
  private buildCrossReference(
    main: RepositoryIndex,
    pr: RepositoryIndex,
    diff: BranchDiff
  ): Map<string, FileMappings> {
    const crossRef = new Map<string, FileMappings>();
    
    // Added files
    for (const file of diff.added) {
      crossRef.set(file, {
        prPath: file,
        status: 'added'
      });
    }
    
    // Removed files
    for (const file of diff.removed) {
      crossRef.set(file, {
        mainPath: file,
        status: 'removed'
      });
    }
    
    // Modified files
    for (const file of diff.modified) {
      crossRef.set(file, {
        mainPath: file,
        prPath: file,
        status: 'modified'
      });
    }
    
    // Unchanged files
    for (const file of diff.unchanged) {
      crossRef.set(file, {
        mainPath: file,
        prPath: file,
        status: 'unchanged'
      });
    }
    
    // Moved files
    for (const [oldPath, newPath] of diff.movedFiles) {
      crossRef.set(oldPath, {
        mainPath: oldPath,
        prPath: newPath,
        status: 'moved'
      });
      crossRef.set(newPath, {
        mainPath: oldPath,
        prPath: newPath,
        status: 'moved'
      });
    }
    
    return crossRef;
  }
  
  /**
   * Smart issue recovery across both branches
   */
  async recoverIssueAcrossBranches(
    issue: any,
    dualIndices: DualBranchIndices,
    repoBasePath: string
  ): Promise<{
    recovered: boolean;
    branch?: 'main' | 'pr';
    location?: any;
    confidence: number;
  }> {
    const repoName = path.basename(repoBasePath);
    
    // Try PR branch first (more likely to have new issues)
    if (issue.codeSnippet) {
      const prPath = `${repoBasePath}-pr`;
      const prLocation = await this.locator.findLocationFromSnippet(
        issue.codeSnippet,
        dualIndices.pr,
        prPath
      );
      
      if (prLocation) {
        return {
          recovered: true,
          branch: 'pr',
          location: prLocation,
          confidence: prLocation.confidence
        };
      }
      
      // Try main branch
      const mainPath = `${repoBasePath}-main`;
      const mainLocation = await this.locator.findLocationFromSnippet(
        issue.codeSnippet,
        dualIndices.main,
        mainPath
      );
      
      if (mainLocation) {
        // Check if this code was moved in PR
        const mapping = dualIndices.crossReference.get(mainLocation.file);
        if (mapping && mapping.status === 'moved' && mapping.prPath) {
          // Update location to PR path
          mainLocation.file = mapping.prPath;
          return {
            recovered: true,
            branch: 'pr',
            location: mainLocation,
            confidence: mainLocation.confidence - 10 // Slightly lower confidence for moved files
          };
        }
        
        return {
          recovered: true,
          branch: 'main',
          location: mainLocation,
          confidence: mainLocation.confidence
        };
      }
    }
    
    return {
      recovered: false,
      confidence: 0
    };
  }
  
  /**
   * Extract code snippets for issues with locations
   */
  async enhanceIssuesWithSnippets(
    issues: any[],
    dualIndices: DualBranchIndices,
    repoBasePath: string
  ): Promise<any[]> {
    const enhanced = [];
    
    for (const issue of issues) {
      if (issue.location?.file && issue.location?.line) {
        // Determine which branch to use
        const mapping = dualIndices.crossReference.get(issue.location.file);
        
        let branchIndex: RepositoryIndex;
        let branchPath: string;
        
        if (mapping?.status === 'added' || mapping?.status === 'modified') {
          // Use PR branch for new/modified files
          branchIndex = dualIndices.pr;
          branchPath = `${repoBasePath}-pr`;
        } else {
          // Use main branch for unchanged files
          branchIndex = dualIndices.main;
          branchPath = `${repoBasePath}-main`;
        }
        
        // Extract snippet
        const snippet = await this.locator.extractSnippetFromLocation(
          issue.location.file,
          issue.location.line,
          branchIndex,
          branchPath,
          { contextLines: 3 }
        );
        
        if (snippet) {
          enhanced.push({
            ...issue,
            codeSnippet: snippet.code,
            codeContext: snippet.context,
            language: snippet.language
          });
        } else {
          enhanced.push(issue);
        }
      } else {
        enhanced.push(issue);
      }
    }
    
    return enhanced;
  }
  
  /**
   * Categorize issues by branch impact
   */
  categorizeIssuesByImpact(
    issues: any[],
    dualIndices: DualBranchIndices
  ): {
    newInPR: any[];      // Issues only in PR code
    fixed: any[];        // Issues only in main (fixed in PR)
    unchanged: any[];    // Issues in unchanged code
    modified: any[];     // Issues in modified code
  } {
    const newInPR = [];
    const fixed = [];
    const unchanged = [];
    const modified = [];
    
    for (const issue of issues) {
      const file = issue.location?.file;
      if (!file) continue;
      
      const mapping = dualIndices.crossReference.get(file);
      
      if (mapping?.status === 'added') {
        newInPR.push(issue);
      } else if (mapping?.status === 'removed') {
        fixed.push(issue);
      } else if (mapping?.status === 'unchanged') {
        unchanged.push(issue);
      } else if (mapping?.status === 'modified') {
        modified.push(issue);
      }
    }
    
    return {
      newInPR,
      fixed,
      unchanged,
      modified
    };
  }
  
  /**
   * Get repository name from URL
   */
  private getRepoNameFromUrl(repoUrl: string): string {
    const match = repoUrl.match(/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
    return match ? `${match[1]}-${match[2]}` : 'unknown-repo';
  }
}

export default DualBranchIndexingStrategy;