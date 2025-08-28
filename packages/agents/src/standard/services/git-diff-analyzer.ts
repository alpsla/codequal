/**
 * Git Diff Analyzer
 * Analyzes git diffs to determine if issues are in modified code
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface DiffRange {
  file: string;
  startLine: number;
  endLine: number;
  type: 'added' | 'modified' | 'deleted';
}

export interface GitDiffAnalysis {
  modifiedFiles: string[];
  modifiedRanges: DiffRange[];
  addedFiles: string[];
  deletedFiles: string[];
  totalChanges: number;
}

export class GitDiffAnalyzer {
  /**
   * Get the diff between two branches/commits
   */
  async analyzeDiff(
    repoPath: string,
    baseBranch: string = 'main',
    headBranch: string = 'HEAD'
  ): Promise<GitDiffAnalysis> {
    try {
      // Get list of modified files
      const { stdout: filesOutput } = await execAsync(
        `git diff --name-status ${baseBranch}...${headBranch}`,
        { cwd: repoPath }
      );
      
      const modifiedFiles: string[] = [];
      const addedFiles: string[] = [];
      const deletedFiles: string[] = [];
      
      filesOutput.split('\n').forEach(line => {
        if (!line.trim()) return;
        const [status, file] = line.split('\t');
        
        switch (status) {
          case 'A':
            addedFiles.push(file);
            modifiedFiles.push(file);
            break;
          case 'M':
            modifiedFiles.push(file);
            break;
          case 'D':
            deletedFiles.push(file);
            break;
          case 'R':
            // Renamed files - treat as modified
            const [, newFile] = file.split('\t');
            modifiedFiles.push(newFile || file);
            break;
        }
      });
      
      // Get detailed line changes for each modified file
      const modifiedRanges: DiffRange[] = [];
      
      for (const file of modifiedFiles) {
        if (deletedFiles.includes(file)) continue;
        
        try {
          // Get unified diff for the file
          const { stdout: diffOutput } = await execAsync(
            `git diff -U0 ${baseBranch}...${headBranch} -- "${file}"`,
            { cwd: repoPath }
          );
          
          // Parse the diff to extract line ranges
          const ranges = this.parseDiffOutput(diffOutput, file);
          modifiedRanges.push(...ranges);
        } catch (error) {
          console.log(`Could not get diff for ${file}:`, error);
        }
      }
      
      return {
        modifiedFiles,
        modifiedRanges,
        addedFiles,
        deletedFiles,
        totalChanges: modifiedRanges.length
      };
    } catch (error: any) {
      console.error('Error analyzing git diff:', error);
      throw new Error(`Failed to analyze git diff: ${error.message}`);
    }
  }
  
  /**
   * Parse git diff output to extract modified line ranges
   */
  private parseDiffOutput(diffOutput: string, fileName: string): DiffRange[] {
    const ranges: DiffRange[] = [];
    const lines = diffOutput.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for hunk headers: @@ -start,count +start,count @@
      const hunkMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkMatch) {
        const [, , , addStart, addCount] = hunkMatch;
        const startLine = parseInt(addStart);
        const count = parseInt(addCount || '1');
        
        if (count > 0) {
          ranges.push({
            file: fileName,
            startLine,
            endLine: startLine + count - 1,
            type: 'modified'
          });
        }
      }
    }
    
    return ranges;
  }
  
  /**
   * Check if an issue is in modified code
   */
  isIssueInModifiedCode(
    issue: { location?: { file?: string; line?: number } },
    diffAnalysis: GitDiffAnalysis
  ): {
    isModified: boolean;
    confidence: number;
    reason?: string;
  } {
    const file = issue.location?.file;
    const line = issue.location?.line;
    
    if (!file) {
      return {
        isModified: false,
        confidence: 0,
        reason: 'No file location specified'
      };
    }
    
    // Normalize file path for comparison
    const normalizedFile = this.normalizePath(file);
    
    // Check if file is in added files (entire file is new)
    if (diffAnalysis.addedFiles.some(f => this.normalizePath(f) === normalizedFile)) {
      return {
        isModified: true,
        confidence: 1.0,
        reason: 'Issue is in a newly added file'
      };
    }
    
    // Check if file was deleted
    if (diffAnalysis.deletedFiles.some(f => this.normalizePath(f) === normalizedFile)) {
      return {
        isModified: false,
        confidence: 1.0,
        reason: 'Issue is in a deleted file (should be fixed)'
      };
    }
    
    // Check if file was modified at all
    if (!diffAnalysis.modifiedFiles.some(f => this.normalizePath(f) === normalizedFile)) {
      return {
        isModified: false,
        confidence: 1.0,
        reason: 'File was not modified in this PR'
      };
    }
    
    // File was modified, check if the specific line was modified
    if (line) {
      const relevantRanges = diffAnalysis.modifiedRanges.filter(
        range => this.normalizePath(range.file) === normalizedFile
      );
      
      for (const range of relevantRanges) {
        // Direct hit - line is within modified range
        if (line >= range.startLine && line <= range.endLine) {
          return {
            isModified: true,
            confidence: 1.0,
            reason: `Line ${line} is within modified range ${range.startLine}-${range.endLine}`
          };
        }
        
        // Near miss - line is close to modified range (within 5 lines)
        const proximity = Math.min(
          Math.abs(line - range.startLine),
          Math.abs(line - range.endLine)
        );
        
        if (proximity <= 5) {
          return {
            isModified: true,
            confidence: 0.8 - (proximity * 0.1),
            reason: `Line ${line} is ${proximity} lines from modified code`
          };
        }
      }
      
      // File was modified but not at this line
      return {
        isModified: false,
        confidence: 0.9,
        reason: `File was modified but not at line ${line}`
      };
    }
    
    // File was modified but no specific line provided
    return {
      isModified: true,
      confidence: 0.5,
      reason: 'File was modified (no specific line to check)'
    };
  }
  
  /**
   * Categorize issues based on git diff
   */
  categorizeIssuesWithDiff(
    issues: any[],
    diffAnalysis: GitDiffAnalysis
  ): {
    newInModifiedCode: any[];
    preExistingInModifiedCode: any[];
    preExistingUntouched: any[];
  } {
    const newInModifiedCode: any[] = [];
    const preExistingInModifiedCode: any[] = [];
    const preExistingUntouched: any[] = [];
    
    for (const issue of issues) {
      const { isModified, confidence, reason } = this.isIssueInModifiedCode(issue, diffAnalysis);
      
      // Add metadata about the modification status
      const enhancedIssue = {
        ...issue,
        modificationStatus: {
          isModified,
          confidence,
          reason
        }
      };
      
      if (isModified && confidence > 0.5) {
        // Issue is in modified code
        if (this.isLikelyNewIssue(issue)) {
          newInModifiedCode.push(enhancedIssue);
        } else {
          preExistingInModifiedCode.push(enhancedIssue);
        }
      } else {
        // Issue is in untouched code
        preExistingUntouched.push(enhancedIssue);
      }
    }
    
    return {
      newInModifiedCode,
      preExistingInModifiedCode,
      preExistingUntouched
    };
  }
  
  /**
   * Heuristic to determine if an issue is likely new
   * (e.g., in a newly added file or a significantly modified section)
   */
  private isLikelyNewIssue(issue: any): boolean {
    // If the issue mentions "new", "added", "introduced" it's likely new
    const title = (issue.title || issue.message || '').toLowerCase();
    const newIndicators = ['new', 'added', 'introduced', 'created'];
    
    return newIndicators.some(indicator => title.includes(indicator));
  }
  
  /**
   * Normalize file path for comparison
   */
  private normalizePath(filePath: string): string {
    // Remove leading slashes and normalize separators
    return filePath
      .replace(/^[\/\\]+/, '')
      .replace(/\\/g, '/')
      .toLowerCase();
  }
  
  /**
   * Get PR diff summary for reporting
   */
  async getPRDiffSummary(
    repoPath: string,
    baseBranch: string = 'main',
    headBranch: string = 'HEAD'
  ): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `git diff --stat ${baseBranch}...${headBranch}`,
        { cwd: repoPath }
      );
      
      return stdout;
    } catch (error: any) {
      return `Could not generate diff summary: ${error.message}`;
    }
  }
}