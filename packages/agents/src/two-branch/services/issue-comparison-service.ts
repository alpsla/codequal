/**
 * Issue Comparison Service
 * 
 * Intelligently compares issues between main and PR branches
 * Handles fuzzy matching for moved/refactored code
 * Integrates with git diff to filter by changed files
 */

import { StandardizedFinding } from '../types/mcp-types';

export interface GitDiffResult {
  changedFiles: string[];
  addedFiles: string[];
  deletedFiles: string[];
  modifiedFiles: string[];
  renamedFiles: Array<{ from: string; to: string }>;
  fileChanges: Map<string, {
    additions: number;
    deletions: number;
    changes: Array<{
      type: 'add' | 'delete' | 'modify';
      startLine: number;
      endLine: number;
    }>;
  }>;
}

export interface ComparisonResult {
  // Core categories
  resolvedIssues: StandardizedFinding[];    // Issues FIXED: in main but NOT in PR
  existingIssues: StandardizedFinding[];    // Issues UNCHANGED: in both branches
  
  // New issues with important sub-categorization
  newIssues: {
    inDiffLines: StandardizedFinding[];     // NEW issues directly in changed lines (user introduced)
    inChangedFiles: StandardizedFinding[];  // NEW issues in modified files but outside diff lines (should have been cleaned)
    all: StandardizedFinding[];             // All new issues combined
  };
  
  movedIssues: Array<{                      // Issues that moved location
    original: StandardizedFinding;
    current: StandardizedFinding;
    confidence: number;
  }>;
  
  summary: {
    totalResolved: number;                  // Good: user fixed these
    totalExisting: number;                  // Neutral: pre-existing, not user's fault
    totalNewInDiff: number;                 // Bad: user introduced these
    totalNewInFiles: number;                // Bad: user should have cleaned these
    totalMoved: number;
    
    recommendation: {
      severity: 'approve' | 'block';  // Simple binary decision
      message: string;
      reasoning: string[];
    };
    
    byCategory: Record<string, {
      resolved: number;
      existing: number;
      newInDiff: number;
      newInFiles: number;
    }>;
    
    bySeverity: Record<string, {
      resolved: number;
      existing: number;
      newInDiff: number;
      newInFiles: number;
    }>;
  };
}

export class IssueComparisonService {
  private readonly SIMILARITY_THRESHOLD = 0.85;
  private readonly LINE_TOLERANCE = 5; // Lines can move by up to 5 lines

  /**
   * Compare issues between main and PR branches with git diff filtering
   */
  async compareIssues(
    mainIssues: StandardizedFinding[],
    prIssues: StandardizedFinding[],
    gitDiff: GitDiffResult
  ): Promise<ComparisonResult> {
    // Step 1: We DON'T filter initially - we need ALL issues to properly categorize
    // We'll filter and categorize based on whether they're in changed files/lines
    
    // Step 2: Create fingerprint maps for exact matching
    const mainFingerprintMap = this.createFingerprintMap(mainIssues);
    const prFingerprintMap = this.createFingerprintMap(prIssues);

    // Step 3: Categorize issues
    const newIssuesInDiffLines: StandardizedFinding[] = [];
    const newIssuesInChangedFiles: StandardizedFinding[] = [];
    const existingIssues: StandardizedFinding[] = [];
    const movedIssues: Array<{ original: StandardizedFinding; current: StandardizedFinding; confidence: number }> = [];
    const matchedMainIssues = new Set<string>();

    // Check each PR issue
    for (const prIssue of prIssues) {
      const fingerprint = this.getFingerprint(prIssue);
      
      // Check if issue exists in main branch
      const existsInMain = mainFingerprintMap.has(fingerprint) || 
                          this.findSimilarIssue(prIssue, mainIssues, gitDiff);
      
      if (existsInMain) {
        // Issue exists in both branches - it's an existing issue
        existingIssues.push(prIssue);
        if (typeof existsInMain === 'object') {
          matchedMainIssues.add(this.getFingerprint(existsInMain.original));
        } else {
          matchedMainIssues.add(fingerprint);
        }
      } else {
        // New issue - categorize based on location
        const isInChangedFile = this.isInChangedFile(prIssue, gitDiff);
        
        if (isInChangedFile) {
          // Check if it's in the actual diff lines
          const isInDiffLines = this.isInDiffLines(prIssue, gitDiff);
          
          if (isInDiffLines) {
            // User directly introduced this issue
            newIssuesInDiffLines.push(prIssue);
          } else {
            // Issue is in a file the user modified but not in the changed lines
            // User should have cleaned this up while working on the file
            newIssuesInChangedFiles.push(prIssue);
          }
        }
        // If not in changed files at all, we ignore it (not relevant to this PR)
      }
    }

    // Step 4: Find resolved issues (in main but not in PR, only in changed files)
    const resolvedIssues = mainIssues.filter(mainIssue => {
      // Only consider issues in changed files
      if (!this.isInChangedFile(mainIssue, gitDiff)) {
        return false;
      }
      
      // Check if this issue still exists in PR
      const fingerprint = this.getFingerprint(mainIssue);
      return !matchedMainIssues.has(fingerprint) && !prFingerprintMap.has(fingerprint);
    });

    // Step 5: Generate summary with recommendations
    const summary = this.generateEnhancedSummary(
      resolvedIssues,
      existingIssues,
      newIssuesInDiffLines,
      newIssuesInChangedFiles,
      movedIssues
    );

    return {
      resolvedIssues,
      existingIssues,
      newIssues: {
        inDiffLines: newIssuesInDiffLines,
        inChangedFiles: newIssuesInChangedFiles,
        all: [...newIssuesInDiffLines, ...newIssuesInChangedFiles]
      },
      movedIssues,
      summary
    };
  }

  /**
   * Filter issues to only include those in changed files
   */
  private filterByChangedFiles(
    issues: StandardizedFinding[],
    gitDiff: GitDiffResult
  ): StandardizedFinding[] {
    const changedFilesSet = new Set(gitDiff.changedFiles);
    
    // Also consider renamed files
    gitDiff.renamedFiles?.forEach(rename => {
      changedFilesSet.add(rename.from);
      changedFilesSet.add(rename.to);
    });

    return issues.filter(issue => {
      const filePath = this.normalizeFilePath(issue.location.file);
      
      // Check if file was changed
      if (!changedFilesSet.has(filePath)) {
        // Check if it's a partial match (for relative paths)
        const isChanged = Array.from(changedFilesSet).some(
          changedFile => changedFile.endsWith(filePath) || filePath.endsWith(changedFile)
        );
        if (!isChanged) return false;
      }

      // For modified files, check if issue is in changed lines
      const fileChanges = gitDiff.fileChanges?.get(filePath);
      if (fileChanges) {
        return this.isInChangedLines(issue, fileChanges.changes);
      }

      return true;
    });
  }

  /**
   * Check if issue is in a changed file
   */
  private isInChangedFile(issue: StandardizedFinding, gitDiff: GitDiffResult): boolean {
    const filePath = this.normalizeFilePath(issue.location.file);
    const changedFilesSet = new Set(gitDiff.changedFiles.map(f => this.normalizeFilePath(f)));
    
    // Also consider renamed files
    gitDiff.renamedFiles?.forEach(rename => {
      changedFilesSet.add(this.normalizeFilePath(rename.from));
      changedFilesSet.add(this.normalizeFilePath(rename.to));
    });
    
    // Check exact match or partial match
    if (changedFilesSet.has(filePath)) {
      return true;
    }
    
    // Check if it's a partial match (for relative paths)
    return Array.from(changedFilesSet).some(
      changedFile => changedFile.endsWith(filePath) || filePath.endsWith(changedFile)
    );
  }

  /**
   * Check if issue is in the actual diff lines (not just in the file)
   */
  private isInDiffLines(issue: StandardizedFinding, gitDiff: GitDiffResult): boolean {
    const filePath = this.normalizeFilePath(issue.location.file);
    
    // Find the file changes
    let fileChanges = gitDiff.fileChanges?.get(filePath);
    
    if (!fileChanges) {
      // Try to find with partial match
      for (const [file, changes] of gitDiff.fileChanges?.entries() || []) {
        if (file.endsWith(filePath) || filePath.endsWith(file)) {
          fileChanges = changes;
          break;
        }
      }
    }
    
    if (!fileChanges || !fileChanges.changes) {
      return false; // No detailed change info, assume not in diff
    }
    
    const issueLine = issue.location.startLine;
    
    // Check if issue line is within any changed range
    return fileChanges.changes.some(change => 
      issueLine >= change.startLine - this.LINE_TOLERANCE &&
      issueLine <= change.endLine + this.LINE_TOLERANCE
    );
  }

  /**
   * Find similar issue (for fuzzy matching)
   */
  private findSimilarIssue(
    prIssue: StandardizedFinding,
    mainIssues: StandardizedFinding[],
    gitDiff: GitDiffResult
  ): { original: StandardizedFinding } | null {
    const movedMatch = this.findMovedIssue(prIssue, mainIssues, gitDiff);
    return movedMatch ? { original: movedMatch.original } : null;
  }

  /**
   * Check if issue is within changed line ranges (deprecated - use isInDiffLines)
   */
  private isInChangedLines(
    issue: StandardizedFinding,
    changes: Array<{ type: string; startLine: number; endLine: number }>
  ): boolean {
    const issueLine = issue.location.startLine;
    
    return changes.some(change => 
      issueLine >= change.startLine - this.LINE_TOLERANCE &&
      issueLine <= change.endLine + this.LINE_TOLERANCE
    );
  }

  /**
   * Find if an issue moved to a different location
   */
  private findMovedIssue(
    prIssue: StandardizedFinding,
    mainIssues: StandardizedFinding[],
    gitDiff: GitDiffResult
  ): { original: StandardizedFinding; confidence: number } | null {
    let bestMatch: { issue: StandardizedFinding; confidence: number } | null = null;

    for (const mainIssue of mainIssues) {
      // Skip if different type or severity
      if (mainIssue.type !== prIssue.type || mainIssue.severity !== prIssue.severity) {
        continue;
      }

      // Check for renamed files
      const wasRenamed = this.checkFileRename(mainIssue.location.file, prIssue.location.file, gitDiff);
      
      // Calculate similarity
      const similarity = this.calculateSimilarity(mainIssue, prIssue, wasRenamed);
      
      if (similarity > this.SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.confidence) {
          bestMatch = { issue: mainIssue, confidence: similarity };
        }
      }
    }

    return bestMatch ? { original: bestMatch.issue, confidence: bestMatch.confidence } : null;
  }

  /**
   * Check if file was renamed
   */
  private checkFileRename(oldFile: string, newFile: string, gitDiff: GitDiffResult): boolean {
    return gitDiff.renamedFiles?.some(
      rename => rename.from === oldFile && rename.to === newFile
    ) || false;
  }

  /**
   * Calculate similarity between two issues
   */
  private calculateSimilarity(
    issue1: StandardizedFinding,
    issue2: StandardizedFinding,
    wasRenamed: boolean
  ): number {
    let score = 0;
    let weights = 0;

    // Title similarity (40% weight)
    const titleSim = this.stringSimilarity(issue1.title, issue2.title);
    score += titleSim * 0.4;
    weights += 0.4;

    // Description similarity (30% weight)
    if (issue1.description && issue2.description) {
      const descSim = this.stringSimilarity(issue1.description, issue2.description);
      score += descSim * 0.3;
      weights += 0.3;
    }

    // Line proximity (20% weight) - allow for code movement
    const lineDiff = Math.abs(issue1.location.startLine - issue2.location.startLine);
    const lineScore = Math.max(0, 1 - (lineDiff / 100)); // Decay over 100 lines
    score += lineScore * 0.2;
    weights += 0.2;

    // File match (10% weight) - bonus if same file or renamed
    if (issue1.location.file === issue2.location.file || wasRenamed) {
      score += 0.1;
    }
    weights += 0.1;

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create fingerprint for exact matching
   */
  private getFingerprint(issue: StandardizedFinding): string {
    return `${issue.location.file}:${issue.location.startLine}:${issue.type}:${issue.title}`;
  }

  /**
   * Create a map of fingerprints for fast lookup
   */
  private createFingerprintMap(issues: StandardizedFinding[]): Map<string, StandardizedFinding> {
    const map = new Map<string, StandardizedFinding>();
    issues.forEach(issue => {
      map.set(this.getFingerprint(issue), issue);
    });
    return map;
  }

  /**
   * Normalize file paths for comparison
   */
  private normalizeFilePath(path: string): string {
    // Remove leading ./ or / and trailing spaces
    return path.replace(/^\.?\//, '').trim();
  }

  /**
   * Generate enhanced summary with recommendations
   */
  private generateEnhancedSummary(
    resolvedIssues: StandardizedFinding[],
    existingIssues: StandardizedFinding[],
    newIssuesInDiffLines: StandardizedFinding[],
    newIssuesInChangedFiles: StandardizedFinding[],
    movedIssues: Array<{ original: StandardizedFinding; current: StandardizedFinding; confidence: number }>
  ): ComparisonResult['summary'] {
    // Count critical and high severity issues
    const criticalInDiff = newIssuesInDiffLines.filter(i => i.severity === 'critical').length;
    const highInDiff = newIssuesInDiffLines.filter(i => i.severity === 'high').length;
    const criticalInFiles = newIssuesInChangedFiles.filter(i => i.severity === 'critical').length;
    const highInFiles = newIssuesInChangedFiles.filter(i => i.severity === 'high').length;
    
    // Simple decision: BLOCK if any NEW critical/high issues, APPROVE otherwise
    // IMPORTANT: Existing issues (in both branches) do NOT block
    let severity: 'approve' | 'block' = 'approve';
    let message = '';
    const reasoning: string[] = [];
    
    // Check for NEW critical or high severity issues only (not existing ones)
    const hasNewCriticalOrHigh = (criticalInDiff > 0 || highInDiff > 0 || criticalInFiles > 0 || highInFiles > 0);
    
    if (hasNewCriticalOrHigh) {
      severity = 'block';
      message = '🚫 PR blocked due to NEW critical/high severity issues';
      
      // List all critical/high issues
      if (criticalInDiff > 0) {
        reasoning.push(`${criticalInDiff} CRITICAL issue(s) introduced in changed lines`);
      }
      if (highInDiff > 0) {
        reasoning.push(`${highInDiff} HIGH severity issue(s) introduced in changed lines`);
      }
      if (criticalInFiles > 0) {
        reasoning.push(`${criticalInFiles} CRITICAL issue(s) in modified files not addressed`);
      }
      if (highInFiles > 0) {
        reasoning.push(`${highInFiles} HIGH severity issue(s) in modified files not addressed`);
      }
      reasoning.push('All NEW critical and high severity issues must be resolved');
    } else {
      severity = 'approve';
      message = '✅ PR approved - no NEW critical/high severity issues';
      
      // Positive feedback
      reasoning.push('No NEW critical or high severity issues introduced');
      if (resolvedIssues.length > 0) {
        reasoning.push(`Fixed ${resolvedIssues.length} existing issue(s)`);
      }
      if (newIssuesInDiffLines.length === 0) {
        reasoning.push('No new issues introduced');
      }
      if (newIssuesInChangedFiles.length > 0) {
        reasoning.push(`${newIssuesInChangedFiles.length} medium/low issue(s) in modified files (non-blocking)`);
      }
    }
    
    // Initialize categories and severities
    const byCategory: Record<string, any> = {};
    const bySeverity: Record<string, any> = {};
    
    const allIssues = [
      ...resolvedIssues,
      ...existingIssues,
      ...newIssuesInDiffLines,
      ...newIssuesInChangedFiles
    ];
    
    const categories = new Set(allIssues.map(i => i.type));
    const severities = new Set(allIssues.map(i => i.severity));
    
    categories.forEach(cat => {
      byCategory[cat] = {
        resolved: 0,
        existing: 0,
        newInDiff: 0,
        newInFiles: 0
      };
    });
    
    severities.forEach(sev => {
      bySeverity[sev] = {
        resolved: 0,
        existing: 0,
        newInDiff: 0,
        newInFiles: 0
      };
    });
    
    // Count by category and severity
    resolvedIssues.forEach(issue => {
      byCategory[issue.type].resolved++;
      bySeverity[issue.severity].resolved++;
    });
    
    existingIssues.forEach(issue => {
      byCategory[issue.type].existing++;
      bySeverity[issue.severity].existing++;
    });
    
    newIssuesInDiffLines.forEach(issue => {
      byCategory[issue.type].newInDiff++;
      bySeverity[issue.severity].newInDiff++;
    });
    
    newIssuesInChangedFiles.forEach(issue => {
      byCategory[issue.type].newInFiles++;
      bySeverity[issue.severity].newInFiles++;
    });
    
    return {
      totalResolved: resolvedIssues.length,
      totalExisting: existingIssues.length,
      totalNewInDiff: newIssuesInDiffLines.length,
      totalNewInFiles: newIssuesInChangedFiles.length,
      totalMoved: movedIssues.length,
      recommendation: {
        severity,
        message,
        reasoning
      },
      byCategory,
      bySeverity
    };
  }

  /**
   * Generate comparison summary (deprecated - use generateEnhancedSummary)
   */
  private generateSummary(
    newIssues: StandardizedFinding[],
    resolvedIssues: StandardizedFinding[],
    existingIssues: StandardizedFinding[],
    movedIssues: Array<{ original: StandardizedFinding; current: StandardizedFinding; confidence: number }>
  ): ComparisonResult['summary'] {
    const byCategory: Record<string, { resolved: number; existing: number; newInDiff: number; newInFiles: number }> = {};
    const bySeverity: Record<string, { resolved: number; existing: number; newInDiff: number; newInFiles: number }> = {};

    // Initialize categories and severities
    const allIssues = [...newIssues, ...resolvedIssues, ...existingIssues];
    const categories = new Set(allIssues.map(i => i.type));
    const severities = new Set(allIssues.map(i => i.severity));

    categories.forEach(cat => {
      byCategory[cat] = { resolved: 0, existing: 0, newInDiff: 0, newInFiles: 0 };
    });

    severities.forEach(sev => {
      bySeverity[sev] = { resolved: 0, existing: 0, newInDiff: 0, newInFiles: 0 };
    });

    // Count by category and severity
    newIssues.forEach(issue => {
      byCategory[issue.type].newInDiff++;  // Simplified - treating all as newInDiff
      bySeverity[issue.severity].newInDiff++;
    });

    resolvedIssues.forEach(issue => {
      byCategory[issue.type].resolved++;
      bySeverity[issue.severity].resolved++;
    });

    existingIssues.forEach(issue => {
      byCategory[issue.type].existing++;
      bySeverity[issue.severity].existing++;
    });

    return {
      totalResolved: resolvedIssues.length,
      totalExisting: existingIssues.length,
      totalNewInDiff: newIssues.length, // Simplified
      totalNewInFiles: 0, // Simplified
      totalMoved: movedIssues.length,
      recommendation: {
        severity: newIssues.length > 0 ? 'block' : 'approve',
        message: newIssues.length > 0 ? 'New issues found' : 'No new issues',
        reasoning: []
      },
      byCategory,
      bySeverity
    };
  }
}