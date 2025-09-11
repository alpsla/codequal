/**
 * Issue Deduplicator Service
 * 
 * Removes duplicate issues from analysis results based on:
 * - Same title + same file + same line = duplicate
 * - Same title + similar code snippet = likely duplicate
 * - Same CVE/dependency issue = duplicate
 */

export interface Issue {
  title: string;
  severity: string;
  category: string;
  location: {
    file: string;
    line: number;
  };
  description?: string;
  codeSnippet?: string;
}

export class IssueDeduplicator {
  /**
   * Generate a unique key for an issue
   */
  private generateIssueKey(issue: Issue): string {
    // For dependency issues, use title only (they affect whole project)
    if (issue.category === 'dependency-vulnerability' || 
        issue.title.toLowerCase().includes('dependency') ||
        issue.title.toLowerCase().includes('package')) {
      return `dep:${issue.title.toLowerCase().trim()}`;
    }
    
    // For location-specific issues, use title + location
    return `${issue.title.toLowerCase().trim()}:${issue.location.file}:${issue.location.line}`;
  }

  /**
   * Check if two code snippets are similar (for fuzzy matching)
   */
  private areCodeSnippetsSimilar(snippet1?: string, snippet2?: string): boolean {
    if (!snippet1 || !snippet2) return false;
    
    // Normalize whitespace and compare
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    return normalize(snippet1) === normalize(snippet2);
  }

  /**
   * Deduplicate an array of issues
   */
  deduplicateIssues(issues: Issue[]): Issue[] {
    const seen = new Map<string, Issue>();
    const deduplicated: Issue[] = [];
    
    for (const issue of issues) {
      const key = this.generateIssueKey(issue);
      
      if (!seen.has(key)) {
        seen.set(key, issue);
        deduplicated.push(issue);
      } else {
        // Check if it's truly a duplicate or just similar
        const existing = seen.get(key)!;
        
        // If code snippets differ significantly, it might be different issue
        if (issue.codeSnippet && existing.codeSnippet && 
            !this.areCodeSnippetsSimilar(issue.codeSnippet, existing.codeSnippet)) {
          // Add with modified key to distinguish
          const modifiedKey = `${key}:variant-${deduplicated.length}`;
          seen.set(modifiedKey, issue);
          deduplicated.push(issue);
        }
        // Otherwise, skip as duplicate
      }
    }
    
    return deduplicated;
  }

  /**
   * Deduplicate categorized issues (new, fixed, unchanged)
   */
  deduplicateCategorizedIssues(categorized: {
    newIssues: Array<{ issue: Issue; [key: string]: any }>;
    fixedIssues: Array<{ issue: Issue; [key: string]: any }>;
    unchangedIssues: Array<{ issue: Issue; [key: string]: any }>;
  }): typeof categorized {
    // Track all seen issues across categories
    const globalSeen = new Set<string>();
    
    const deduplicateCategory = (
      items: Array<{ issue: Issue; [key: string]: any }>
    ): Array<{ issue: Issue; [key: string]: any }> => {
      const result: Array<{ issue: Issue; [key: string]: any }> = [];
      
      for (const item of items) {
        const key = this.generateIssueKey(item.issue);
        
        if (!globalSeen.has(key)) {
          globalSeen.add(key);
          result.push(item);
        }
      }
      
      return result;
    };
    
    // Process in priority order: new > unchanged > fixed
    // This ensures new issues take precedence
    return {
      newIssues: deduplicateCategory(categorized.newIssues),
      unchangedIssues: deduplicateCategory(categorized.unchangedIssues),
      fixedIssues: deduplicateCategory(categorized.fixedIssues)
    };
  }

  /**
   * Merge and deduplicate issues from multiple sources
   */
  mergeAndDeduplicate(...issueSets: Issue[][]): Issue[] {
    const allIssues = issueSets.flat();
    return this.deduplicateIssues(allIssues);
  }

  /**
   * Get duplicate statistics for debugging
   */
  getDuplicateStats(issues: Issue[]): {
    total: number;
    unique: number;
    duplicates: number;
    duplicateGroups: Array<{
      title: string;
      count: number;
      locations: Array<{ file: string; line: number }>;
    }>;
  } {
    const groups = new Map<string, Issue[]>();
    
    for (const issue of issues) {
      const key = this.generateIssueKey(issue);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(issue);
    }
    
    const duplicateGroups = Array.from(groups.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([_, items]) => ({
        title: items[0].title,
        count: items.length,
        locations: items.map(i => ({
          file: i.location.file,
          line: i.location.line
        }))
      }));
    
    const unique = groups.size;
    const duplicates = issues.length - unique;
    
    return {
      total: issues.length,
      unique,
      duplicates,
      duplicateGroups
    };
  }
}

export default IssueDeduplicator;