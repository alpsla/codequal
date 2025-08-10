/**
 * Smart Issue Matcher
 * 
 * Intelligently matches issues between branches using multiple strategies
 * Now enhanced with actual git diff analysis for accurate detection
 */

import { Issue } from '../types/analysis-types';
import { IssueIdGenerator } from '../services/issue-id-generator';
import { IDiffAnalyzer, GitDiff, ChangeAnalysis, IssueMapping } from '../services/interfaces/diff-analyzer.interface';

export interface MatchedIssues {
  resolved: Issue[];      // Issues in main but not in PR (actually fixed)
  new: Issue[];          // Issues in PR but not in main (actually introduced)
  unchanged: Issue[];    // Issues in both branches (not in changed code)
  modified: Issue[];     // Issues that changed between branches
  verificationDetails?: {
    usedDiffAnalysis: boolean;
    filesAnalyzed: number;
    confidence: number;
  };
}

export class SmartIssueMatcher {
  private static diffAnalyzer: IDiffAnalyzer | null = null;
  
  /**
   * Set the diff analyzer for enhanced matching
   */
  static setDiffAnalyzer(analyzer: IDiffAnalyzer): void {
    this.diffAnalyzer = analyzer;
  }
  
  /**
   * Match issues between main and PR branches
   * Enhanced version with optional diff-based analysis
   */
  static async matchIssuesWithDiff(
    mainIssues: Issue[], 
    prIssues: Issue[],
    repoPath?: string,
    baseBranch?: string,
    headBranch?: string
  ): Promise<MatchedIssues> {
    console.log('[SmartIssueMatcher] Starting enhanced match process with diff analysis');
    
    // If we have diff information, use enhanced matching
    if (this.diffAnalyzer && repoPath && baseBranch && headBranch) {
      try {
        const diff = await this.diffAnalyzer.fetchDiff(repoPath, baseBranch, headBranch);
        const changes = await this.diffAnalyzer.analyzeChanges(diff);
        
        // Map issues to actual code changes
        const mainMappings = await this.diffAnalyzer.mapIssuesToChanges(
          mainIssues.map(i => ({
            id: i.id || '',
            title: i.metadata?.title || i.message || '',
            severity: i.severity,
            location: `${i.location?.file || ''}:${i.location?.line || 0}`
          })),
          changes,
          diff
        );
        
        const prMappings = await this.diffAnalyzer.mapIssuesToChanges(
          prIssues.map(i => ({
            id: i.id || '',
            title: i.metadata?.title || i.message || '',
            severity: i.severity,
            location: `${i.location?.file || ''}:${i.location?.line || 0}`
          })),
          changes,
          diff
        );
        
        // Use mappings to categorize issues more accurately
        return this.matchWithDiffAnalysis(
          mainIssues, 
          prIssues, 
          mainMappings, 
          prMappings,
          diff.files.length
        );
      } catch (error) {
        console.warn('[SmartIssueMatcher] Diff analysis failed, falling back to basic matching:', error);
      }
    }
    
    // Fall back to basic matching
    return this.matchIssues(mainIssues, prIssues);
  }
  
  /**
   * Match issues using diff analysis results
   */
  private static matchWithDiffAnalysis(
    mainIssues: Issue[],
    prIssues: Issue[],
    mainMappings: IssueMapping[],
    prMappings: IssueMapping[],
    filesAnalyzed: number
  ): MatchedIssues {
    console.log('[SmartIssueMatcher] Using diff-based matching');
    
    const result: MatchedIssues = {
      resolved: [],
      new: [],
      unchanged: [],
      modified: [],
      verificationDetails: {
        usedDiffAnalysis: true,
        filesAnalyzed,
        confidence: 0.9
      }
    };
    
    // Create mapping lookups
    const mainMappingMap = new Map(mainMappings.map(m => [m.issue.id, m]));
    const prMappingMap = new Map(prMappings.map(m => [m.issue.id, m]));
    
    // Process main issues
    mainIssues.forEach(mainIssue => {
      const mainMapping = mainMappingMap.get(mainIssue.id || '');
      const matchingPrIssue = prIssues.find(pr => 
        this.calculateSimilarityScore(mainIssue, pr) > 0.7
      );
      
      if (!matchingPrIssue) {
        // Issue not found in PR
        if (mainMapping && mainMapping.verificationStatus === 'fixed') {
          // Confirmed fixed based on diff
          result.resolved.push({
            ...mainIssue,
            metadata: {
              ...mainIssue.metadata,
              resolution: 'Fixed in PR changes',
              confidence: mainMapping.confidence.toString()
            }
          });
        } else {
          // Might be fixed or in unchanged code
          result.resolved.push(mainIssue);
        }
      } else {
        const prMapping = prMappingMap.get(matchingPrIssue.id || '');
        
        if (prMapping && prMapping.verificationStatus === 'modified') {
          // Issue was modified in changed code
          result.modified.push({
            ...matchingPrIssue,
            metadata: {
              ...matchingPrIssue.metadata,
              previousSeverity: mainIssue.severity,
              changes: this.detectChanges(mainIssue, matchingPrIssue)
            }
          });
        } else if (prMapping && prMapping.verificationStatus === 'unrelated') {
          // Issue exists but not in changed code
          result.unchanged.push(matchingPrIssue);
        } else {
          // Default to unchanged
          result.unchanged.push(matchingPrIssue);
        }
      }
    });
    
    // Process new issues in PR
    prIssues.forEach(prIssue => {
      const isMatched = [...result.modified, ...result.unchanged].some(
        i => i.id === prIssue.id
      );
      
      if (!isMatched) {
        const prMapping = prMappingMap.get(prIssue.id || '');
        
        if (prMapping && prMapping.verificationStatus === 'introduced') {
          // Confirmed new issue in changed code
          result.new.push({
            ...prIssue,
            metadata: {
              ...prIssue.metadata,
              introduction: 'Introduced in PR changes',
              confidence: prMapping.confidence.toString()
            }
          });
        } else {
          // New issue (might be in unchanged code)
          result.new.push(prIssue);
        }
      }
    });
    
    console.log('[SmartIssueMatcher] Diff-based match results:', {
      resolved: result.resolved.length,
      new: result.new.length,
      unchanged: result.unchanged.length,
      modified: result.modified.length,
      confidence: result.verificationDetails?.confidence
    });
    
    return result;
  }
  
  /**
   * Match issues between main and PR branches (basic version)
   */
  static matchIssues(mainIssues: Issue[], prIssues: Issue[]): MatchedIssues {
    console.log('[SmartIssueMatcher] Starting match process');
    console.log('[SmartIssueMatcher] Main issues count:', mainIssues.length);
    console.log('[SmartIssueMatcher] PR issues count:', prIssues.length);
    
    const result: MatchedIssues = {
      resolved: [],
      new: [],
      unchanged: [],
      modified: []
    };
    
    // Create maps for quick lookup
    const mainMap = new Map<string, Issue>();
    const prMap = new Map<string, Issue>();
    
    // First pass: Map by ID
    mainIssues.forEach(issue => {
      if (issue.id) {
        mainMap.set(issue.id, issue);
      }
    });
    
    prIssues.forEach(issue => {
      if (issue.id) {
        prMap.set(issue.id, issue);
      }
    });
    
    // Track which issues have been matched
    const matchedMainIds = new Set<string>();
    const matchedPrIds = new Set<string>();
    
    // First strategy: Match by exact ID
    mainIssues.forEach(mainIssue => {
      if (mainIssue.id && prMap.has(mainIssue.id)) {
        const prIssue = prMap.get(mainIssue.id)!;
        
        // Check if the issue has been modified
        if (this.hasIssueChanged(mainIssue, prIssue)) {
          result.modified.push({
            ...prIssue,
            metadata: {
              ...prIssue.metadata,
              previousSeverity: mainIssue.severity,
              changes: this.detectChanges(mainIssue, prIssue)
            }
          });
        } else {
          result.unchanged.push(prIssue);
        }
        
        matchedMainIds.add(mainIssue.id);
        matchedPrIds.add(mainIssue.id);
      }
    });
    
    // Second strategy: Match by similarity for unmatched issues
    const unmatchedMain = mainIssues.filter(i => !i.id || !matchedMainIds.has(i.id));
    const unmatchedPr = prIssues.filter(i => !i.id || !matchedPrIds.has(i.id));
    
    unmatchedMain.forEach(mainIssue => {
      const match = this.findBestMatch(mainIssue, unmatchedPr);
      
      if (match) {
        // Check if the issue has been modified
        if (this.hasIssueChanged(mainIssue, match)) {
          result.modified.push({
            ...match,
            metadata: {
              ...match.metadata,
              previousSeverity: mainIssue.severity,
              changes: this.detectChanges(mainIssue, match)
            }
          });
        } else {
          result.unchanged.push(match);
        }
        
        // Remove from unmatched PR issues
        const index = unmatchedPr.indexOf(match);
        if (index > -1) {
          unmatchedPr.splice(index, 1);
        }
      } else {
        // No match found - issue was resolved
        result.resolved.push(mainIssue);
      }
    });
    
    // Remaining PR issues are new
    result.new.push(...unmatchedPr);
    
    console.log('[SmartIssueMatcher] Match results:', {
      resolved: result.resolved.length,
      new: result.new.length,
      unchanged: result.unchanged.length,
      modified: result.modified.length
    });
    
    return result;
  }
  
  /**
   * Find the best matching issue from a list
   */
  private static findBestMatch(targetIssue: Issue, candidates: Issue[]): Issue | null {
    let bestMatch: Issue | null = null;
    let highestScore = 0;
    
    candidates.forEach(candidate => {
      const score = this.calculateSimilarityScore(targetIssue, candidate);
      if (score > 0.7 && score > highestScore) { // 70% similarity threshold
        highestScore = score;
        bestMatch = candidate;
      }
    });
    
    return bestMatch;
  }
  
  /**
   * Calculate similarity score between two issues
   */
  private static calculateSimilarityScore(issue1: Issue, issue2: Issue): number {
    let score = 0;
    let factors = 0;
    
    // Category match (high weight)
    if (issue1.category === issue2.category) {
      score += 0.3;
    }
    factors += 0.3;
    
    // File location match (high weight)
    if (issue1.location?.file && issue2.location?.file) {
      const file1 = this.normalizeFilePath(issue1.location.file);
      const file2 = this.normalizeFilePath(issue2.location.file);
      if (file1 === file2) {
        score += 0.3;
      }
    }
    factors += 0.3;
    
    // Text similarity (medium weight)
    const text1 = (issue1.metadata?.title || issue1.message || '').toLowerCase();
    const text2 = (issue2.metadata?.title || issue2.message || '').toLowerCase();
    const textSimilarity = this.calculateTextSimilarity(text1, text2);
    score += textSimilarity * 0.3;
    factors += 0.3;
    
    // CWE match (low weight - might not always be present)
    const cwe1 = issue1.metadata?.cwe || issue1.metadata?.CWE;
    const cwe2 = issue2.metadata?.cwe || issue2.metadata?.CWE;
    if (cwe1 && cwe2 && cwe1 === cwe2) {
      score += 0.1;
    }
    factors += 0.1;
    
    return score / factors;
  }
  
  /**
   * Calculate text similarity using keyword overlap
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = this.extractKeywords(text1);
    const words2 = this.extractKeywords(text2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }
    
    const commonWords = words1.filter(w => words2.includes(w));
    const union = new Set([...words1, ...words2]);
    
    return commonWords.length / union.size;
  }
  
  /**
   * Extract meaningful keywords from text
   */
  private static extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
  
  /**
   * Normalize file paths for comparison
   */
  private static normalizeFilePath(filePath: string): string {
    // Take last 3 segments of the path
    const parts = filePath.split('/').filter(p => p.length > 0);
    return parts.slice(-3).join('/').toLowerCase();
  }
  
  /**
   * Check if an issue has changed between branches
   */
  private static hasIssueChanged(mainIssue: Issue, prIssue: Issue): boolean {
    // Check severity change
    if (mainIssue.severity !== prIssue.severity) {
      return true;
    }
    
    // Check location change (line number)
    if (mainIssue.location?.line !== prIssue.location?.line) {
      return true;
    }
    
    // Check message change
    const mainMessage = mainIssue.message || mainIssue.metadata?.title || '';
    const prMessage = prIssue.message || prIssue.metadata?.title || '';
    if (mainMessage !== prMessage) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Detect what changed between issues
   */
  private static detectChanges(mainIssue: Issue, prIssue: Issue): string[] {
    const changes: string[] = [];
    
    if (mainIssue.severity !== prIssue.severity) {
      changes.push(`Severity changed from ${mainIssue.severity} to ${prIssue.severity}`);
    }
    
    if (mainIssue.location?.line !== prIssue.location?.line) {
      changes.push(`Moved from line ${mainIssue.location?.line || 'unknown'} to ${prIssue.location?.line || 'unknown'}`);
    }
    
    const mainMessage = mainIssue.message || mainIssue.metadata?.title || '';
    const prMessage = prIssue.message || prIssue.metadata?.title || '';
    if (mainMessage !== prMessage) {
      changes.push('Description updated');
    }
    
    return changes;
  }
}