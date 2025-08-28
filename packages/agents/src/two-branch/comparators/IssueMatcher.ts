/**
 * Issue Matcher for Two-Branch Analysis
 * 
 * Adapted from DeepWiki's EnhancedIssueMatcher
 * Provides multi-strategy matching for comparing issues between branches
 * Removed AI-specific logic, focused on real tool results
 */

import { ToolIssue } from '../types';
import { createHash } from 'crypto';

export interface MatchResult {
  isMatch: boolean;
  confidence: number;
  matchType: 'exact' | 'line-shift' | 'content' | 'fuzzy' | 'moved' | 'none';
  details?: string;
}

export class IssueMatcher {
  private readonly LINE_SHIFT_THRESHOLD = 10; // Lines can move up to 10 lines
  private readonly CONTENT_SIMILARITY_THRESHOLD = 0.8;
  private readonly FUZZY_MATCH_THRESHOLD = 0.6;
  
  /**
   * Multi-strategy matching with fallback hierarchy
   * Optimized for real tool results with actual file locations
   */
  matchIssues(issue1: ToolIssue, issue2: ToolIssue): MatchResult {
    // Strategy 1: Exact location match (highest confidence)
    const exactMatch = this.exactLocationMatch(issue1, issue2);
    if (exactMatch.isMatch) return exactMatch;
    
    // Strategy 2: Small line shift match (code moved slightly)
    const lineShiftMatch = this.lineShiftMatch(issue1, issue2);
    if (lineShiftMatch.isMatch) return lineShiftMatch;
    
    // Strategy 3: Content-based match (same code, different location)
    const contentMatch = this.contentBasedMatch(issue1, issue2);
    if (contentMatch.isMatch) return contentMatch;
    
    // Strategy 4: Fuzzy match (similar issue, possibly refactored)
    const fuzzyMatch = this.fuzzyMatch(issue1, issue2);
    if (fuzzyMatch.isMatch) return fuzzyMatch;
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Check if issue moved to a different file
   * Used with DualBranchIndexer's file movement tracking
   */
  matchWithFileMovement(
    issue1: ToolIssue,
    issue2: ToolIssue,
    oldPath: string,
    newPath: string
  ): MatchResult {
    // Check if the issue was in the old file and is now in the new file
    if (issue1.file === oldPath && issue2.file === newPath) {
      // Check if it's the same type of issue
      if (issue1.ruleId === issue2.ruleId) {
        // High confidence if same rule and message
        if (issue1.message === issue2.message) {
          return {
            isMatch: true,
            confidence: 95,
            matchType: 'moved',
            details: `File moved from ${oldPath} to ${newPath}`
          };
        }
        
        // Medium confidence if same rule but different message
        const similarity = this.calculateStringSimilarity(issue1.message, issue2.message);
        if (similarity > 0.7) {
          return {
            isMatch: true,
            confidence: 80,
            matchType: 'moved',
            details: `File moved with slight message change`
          };
        }
      }
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Exact location match - same file, same line, same rule
   */
  private exactLocationMatch(issue1: ToolIssue, issue2: ToolIssue): MatchResult {
    if (issue1.file === issue2.file &&
        issue1.startLine === issue2.startLine &&
        issue1.ruleId === issue2.ruleId) {
      return {
        isMatch: true,
        confidence: 100,
        matchType: 'exact',
        details: 'Exact location and rule match'
      };
    }
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Line shift match - same file, nearby lines, same rule
   */
  private lineShiftMatch(issue1: ToolIssue, issue2: ToolIssue): MatchResult {
    if (issue1.file !== issue2.file || issue1.ruleId !== issue2.ruleId) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    const lineDiff = Math.abs(issue1.startLine - issue2.startLine);
    if (lineDiff <= this.LINE_SHIFT_THRESHOLD) {
      // Higher confidence for smaller shifts
      const confidence = 90 - (lineDiff * 2);
      return {
        isMatch: true,
        confidence,
        matchType: 'line-shift',
        details: `Line shifted by ${lineDiff} lines`
      };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Content-based match - same code content, possibly different location
   */
  private contentBasedMatch(issue1: ToolIssue, issue2: ToolIssue): MatchResult {
    // Must be same rule and category
    if (issue1.ruleId !== issue2.ruleId || issue1.category !== issue2.category) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    // Check code snippet similarity if available
    if (issue1.codeSnippet && issue2.codeSnippet) {
      const similarity = this.calculateCodeSimilarity(issue1.codeSnippet, issue2.codeSnippet);
      if (similarity >= this.CONTENT_SIMILARITY_THRESHOLD) {
        return {
          isMatch: true,
          confidence: Math.round(similarity * 80),
          matchType: 'content',
          details: `Code content ${Math.round(similarity * 100)}% similar`
        };
      }
    }
    
    // Check message similarity
    const messageSimilarity = this.calculateStringSimilarity(issue1.message, issue2.message);
    if (messageSimilarity >= this.CONTENT_SIMILARITY_THRESHOLD) {
      return {
        isMatch: true,
        confidence: Math.round(messageSimilarity * 70),
        matchType: 'content',
        details: `Message ${Math.round(messageSimilarity * 100)}% similar`
      };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Fuzzy match - similar issues, possibly refactored
   */
  private fuzzyMatch(issue1: ToolIssue, issue2: ToolIssue): MatchResult {
    // Calculate overall similarity score
    let totalScore = 0;
    let factors = 0;
    
    // Rule similarity
    if (issue1.ruleId === issue2.ruleId) {
      totalScore += 0.3;
    }
    factors += 0.3;
    
    // Category similarity
    if (issue1.category === issue2.category) {
      totalScore += 0.2;
    }
    factors += 0.2;
    
    // Severity similarity
    if (issue1.severity === issue2.severity) {
      totalScore += 0.1;
    }
    factors += 0.1;
    
    // Message similarity
    const messageSimilarity = this.calculateStringSimilarity(issue1.message, issue2.message);
    totalScore += messageSimilarity * 0.4;
    factors += 0.4;
    
    const overallSimilarity = totalScore / factors;
    
    if (overallSimilarity >= this.FUZZY_MATCH_THRESHOLD) {
      return {
        isMatch: true,
        confidence: Math.round(overallSimilarity * 60),
        matchType: 'fuzzy',
        details: `Fuzzy match with ${Math.round(overallSimilarity * 100)}% similarity`
      };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Calculate string similarity using word-based comparison
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const totalWords = Math.max(words1.length, words2.length);
    
    return totalWords > 0 ? commonWords / totalWords : 0;
  }
  
  /**
   * Calculate code snippet similarity
   */
  private calculateCodeSimilarity(code1: string, code2: string): number {
    // Normalize code by removing whitespace variations
    const normalize = (code: string) => 
      code.replace(/\s+/g, ' ')
          .replace(/[{()}]/g, '')
          .trim()
          .toLowerCase();
    
    const normalized1 = normalize(code1);
    const normalized2 = normalize(code2);
    
    if (normalized1 === normalized2) return 1;
    
    // Use token-based similarity
    const tokens1 = normalized1.split(' ');
    const tokens2 = normalized2.split(' ');
    
    const commonTokens = tokens1.filter(t => tokens2.includes(t)).length;
    const totalTokens = Math.max(tokens1.length, tokens2.length);
    
    return totalTokens > 0 ? commonTokens / totalTokens : 0;
  }
}

/**
 * Issue Deduplicator
 * Removes duplicate issues based on fingerprinting
 */
export class IssueDeduplicator {
  /**
   * Generate a fingerprint for an issue
   */
  generateFingerprint(issue: ToolIssue): string {
    const components = [
      issue.tool,
      issue.ruleId,
      issue.file,
      issue.startLine?.toString() || '0',
      this.normalizeMessage(issue.message)
    ];
    
    return createHash('md5')
      .update(components.join('|'))
      .digest('hex');
  }
  
  /**
   * Deduplicate a list of issues
   */
  deduplicateIssues(issues: ToolIssue[]): ToolIssue[] {
    const seen = new Map<string, ToolIssue>();
    const deduplicated: ToolIssue[] = [];
    
    for (const issue of issues) {
      const fingerprint = this.generateFingerprint(issue);
      
      if (!seen.has(fingerprint)) {
        seen.set(fingerprint, issue);
        deduplicated.push(issue);
      } else {
        // Keep the issue with more details
        const existing = seen.get(fingerprint)!;
        if (this.hasMoreDetails(issue, existing)) {
          // Replace with more detailed version
          const index = deduplicated.indexOf(existing);
          if (index !== -1) {
            deduplicated[index] = issue;
            seen.set(fingerprint, issue);
          }
        }
      }
    }
    
    return deduplicated;
  }
  
  /**
   * Check if issue1 has more details than issue2
   */
  private hasMoreDetails(issue1: ToolIssue, issue2: ToolIssue): boolean {
    let score1 = 0;
    let score2 = 0;
    
    // Check for presence of optional fields
    if (issue1.codeSnippet) score1 += 2;
    if (issue2.codeSnippet) score2 += 2;
    
    if (issue1.suggestion) score1 += 1;
    if (issue2.suggestion) score2 += 1;
    
    if (issue1.documentation) score1 += 1;
    if (issue2.documentation) score2 += 1;
    
    if (issue1.details) score1 += 1;
    if (issue2.details) score2 += 1;
    
    // Longer messages are usually more detailed
    score1 += issue1.message.length / 100;
    score2 += issue2.message.length / 100;
    
    return score1 > score2;
  }
  
  /**
   * Normalize message for fingerprinting
   */
  private normalizeMessage(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 50); // Use first 50 chars for fingerprint
  }
}

export default IssueMatcher;