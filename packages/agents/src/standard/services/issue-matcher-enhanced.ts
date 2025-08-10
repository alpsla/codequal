import { Issue } from '../types/analysis-types';

export interface MatchResult {
  isMatch: boolean;
  confidence: number;
  matchType: 'exact' | 'line-shift' | 'content' | 'fuzzy' | 'none';
  details?: string;
}

/**
 * Enhanced issue matcher that handles large code shifts and refactoring
 */
export class EnhancedIssueMatcher {
  
  /**
   * Multi-strategy matching with fallback hierarchy
   */
  matchIssues(issue1: Issue, issue2: Issue): MatchResult {
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
   * Strategy 1: Exact or near-exact location match
   */
  private exactLocationMatch(issue1: Issue, issue2: Issue): MatchResult {
    if (!this.isSameFile(issue1, issue2)) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    if (!issue1.location?.line || !issue2.location?.line) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    const lineDiff = Math.abs(issue1.location.line - issue2.location.line);
    
    if (lineDiff === 0) {
      return {
        isMatch: this.isSameCategory(issue1, issue2),
        confidence: 100,
        matchType: 'exact',
        details: 'Exact line match'
      };
    }
    
    if (lineDiff <= 3) {
      return {
        isMatch: this.isSameCategory(issue1, issue2),
        confidence: 90,
        matchType: 'exact',
        details: `Line shifted by ${lineDiff}`
      };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Strategy 2: Handle small code shifts (3-20 lines)
   */
  private lineShiftMatch(issue1: Issue, issue2: Issue): MatchResult {
    if (!this.isSameFile(issue1, issue2) || !this.isSameCategory(issue1, issue2)) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    if (!issue1.location?.line || !issue2.location?.line) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    const lineDiff = Math.abs(issue1.location.line - issue2.location.line);
    
    if (lineDiff > 3 && lineDiff <= 20) {
      // Check if code snippet matches (if available)
      if (this.codeSnippetsMatch(issue1, issue2)) {
        return {
          isMatch: true,
          confidence: 80,
          matchType: 'line-shift',
          details: `Code shifted by ${lineDiff} lines but content matches`
        };
      }
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Strategy 3: Content-based matching for large shifts
   * This handles cases where code moved 100+ lines
   */
  private contentBasedMatch(issue1: Issue, issue2: Issue): MatchResult {
    if (!this.isSameFile(issue1, issue2) || !this.isSameCategory(issue1, issue2)) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    // Extract code fingerprints
    const fingerprint1 = this.extractCodeFingerprint(issue1);
    const fingerprint2 = this.extractCodeFingerprint(issue2);
    
    if (!fingerprint1 || !fingerprint2) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    // Check if fingerprints match (same code pattern)
    if (this.fingerprintsMatch(fingerprint1, fingerprint2)) {
      const lineDiff = Math.abs((issue1.location?.line || 0) - (issue2.location?.line || 0));
      
      return {
        isMatch: true,
        confidence: lineDiff > 100 ? 60 : 70,
        matchType: 'content',
        details: `Same code pattern found ${lineDiff} lines apart`
      };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Strategy 4: Fuzzy matching for refactored code
   */
  private fuzzyMatch(issue1: Issue, issue2: Issue): MatchResult {
    if (!this.isSameFile(issue1, issue2)) {
      return { isMatch: false, confidence: 0, matchType: 'none' };
    }
    
    // Calculate similarity score
    const categorySimilarity = this.calculateCategorySimilarity(issue1, issue2);
    const descriptionSimilarity = this.calculateDescriptionSimilarity(issue1, issue2);
    const severityMatch = issue1.severity === issue2.severity ? 1 : 0.5;
    
    const overallSimilarity = (categorySimilarity * 0.4 + 
                               descriptionSimilarity * 0.4 + 
                               severityMatch * 0.2);
    
    if (overallSimilarity >= 0.7) {
      return {
        isMatch: true,
        confidence: Math.round(overallSimilarity * 50), // Max 50% confidence for fuzzy
        matchType: 'fuzzy',
        details: 'Fuzzy match based on similarity'
      };
    }
    
    return { isMatch: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Extract a fingerprint from code snippet for matching
   */
  private extractCodeFingerprint(issue: Issue): string | null {
    const codeSnippet = issue.codeSnippet || (issue as any).evidence?.snippet;
    if (!codeSnippet) return null;
    
    // Remove whitespace and normalize
    const normalized = codeSnippet
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .trim();
    
    // Extract key patterns
    const patterns = [];
    
    // Function calls
    const funcCalls = normalized.match(/\b\w+\s*\(/g);
    if (funcCalls) patterns.push(...funcCalls);
    
    // Variable assignments
    const assignments = normalized.match(/\b\w+\s*=/g);
    if (assignments) patterns.push(...assignments);
    
    // SQL patterns
    if (issue.category?.toLowerCase().includes('sql')) {
      const sqlPatterns = normalized.match(/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/gi);
      if (sqlPatterns) patterns.push(...sqlPatterns);
    }
    
    return patterns.join('|');
  }
  
  private fingerprintsMatch(fp1: string, fp2: string): boolean {
    if (fp1 === fp2) return true;
    
    const tokens1 = new Set(fp1.split('|'));
    const tokens2 = new Set(fp2.split('|'));
    
    // Calculate Jaccard similarity
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    const similarity = intersection.size / union.size;
    return similarity >= 0.7; // 70% similarity threshold
  }
  
  private codeSnippetsMatch(issue1: Issue, issue2: Issue): boolean {
    const snippet1 = issue1.codeSnippet || (issue1 as any).evidence?.snippet;
    const snippet2 = issue2.codeSnippet || (issue2 as any).evidence?.snippet;
    
    if (!snippet1 || !snippet2) return false;
    
    // Normalize and compare
    const normalized1 = snippet1.replace(/\s+/g, ' ').trim();
    const normalized2 = snippet2.replace(/\s+/g, ' ').trim();
    
    return normalized1 === normalized2;
  }
  
  private isSameFile(issue1: Issue, issue2: Issue): boolean {
    const file1 = (issue1.location?.file || '').toLowerCase().replace(/\\/g, '/');
    const file2 = (issue2.location?.file || '').toLowerCase().replace(/\\/g, '/');
    return file1 === file2;
  }
  
  private isSameCategory(issue1: Issue, issue2: Issue): boolean {
    return (issue1.category || '').toLowerCase() === (issue2.category || '').toLowerCase();
  }
  
  private calculateCategorySimilarity(issue1: Issue, issue2: Issue): number {
    const cat1 = (issue1.category || '').toLowerCase();
    const cat2 = (issue2.category || '').toLowerCase();
    
    if (cat1 === cat2) return 1;
    
    // Check for partial matches
    if (cat1.includes(cat2) || cat2.includes(cat1)) return 0.8;
    
    // Check for common keywords
    const keywords1 = new Set(cat1.split(/\s+/));
    const keywords2 = new Set(cat2.split(/\s+/));
    const common = [...keywords1].filter(k => keywords2.has(k));
    
    return common.length / Math.max(keywords1.size, keywords2.size);
  }
  
  private calculateDescriptionSimilarity(issue1: Issue, issue2: Issue): number {
    const desc1 = (issue1.description || '').toLowerCase();
    const desc2 = (issue2.description || '').toLowerCase();
    
    if (!desc1 || !desc2) return 0;
    
    // Simple word overlap similarity
    const words1 = new Set(desc1.split(/\s+/));
    const words2 = new Set(desc2.split(/\s+/));
    const common = [...words1].filter(w => words2.has(w));
    
    return common.length / Math.max(words1.size, words2.size);
  }
}

/**
 * Deduplication service for handling issues that appear in multiple locations
 */
export class IssueDuplicator {
  private matcher: EnhancedIssueMatcher;
  
  constructor() {
    this.matcher = new EnhancedIssueMatcher();
  }
  
  /**
   * Deduplicate issues, keeping the best match for each unique issue
   */
  deduplicateIssues(issues: Issue[]): Issue[] {
    const deduplicated: Issue[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < issues.length; i++) {
      if (processed.has(i)) continue;
      
      const currentIssue = issues[i];
      const duplicates: { issue: Issue; index: number; match: MatchResult }[] = [];
      
      // Find all duplicates of current issue
      for (let j = i + 1; j < issues.length; j++) {
        if (processed.has(j)) continue;
        
        const match = this.matcher.matchIssues(currentIssue, issues[j]);
        if (match.isMatch) {
          duplicates.push({ issue: issues[j], index: j, match });
        }
      }
      
      if (duplicates.length === 0) {
        // No duplicates, keep the issue
        deduplicated.push(currentIssue);
        processed.add(i);
      } else {
        // Choose the best version (highest confidence)
        const allCandidates = [
          { issue: currentIssue, index: i, match: { confidence: 100 } as MatchResult },
          ...duplicates
        ];
        
        // Sort by confidence and prefer issues with line numbers
        allCandidates.sort((a, b) => {
          // Prefer issues with line numbers
          const aHasLine = !!a.issue.location?.line;
          const bHasLine = !!b.issue.location?.line;
          if (aHasLine && !bHasLine) return -1;
          if (!aHasLine && bHasLine) return 1;
          
          // Then by confidence
          return b.match.confidence - a.match.confidence;
        });
        
        // Keep the best one
        deduplicated.push(allCandidates[0].issue);
        
        // Mark all as processed
        allCandidates.forEach(c => processed.add(c.index));
      }
    }
    
    return deduplicated;
  }
}