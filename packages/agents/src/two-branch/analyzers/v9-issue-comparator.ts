/**
 * V9 Issue Comparator Module
 * 
 * Handles issue comparison, categorization, and grouping
 */

import { Issue, IssueGroup } from './v9-types';

export class V9IssueComparator {
  /**
   * Compare issues between branches and categorize them
   */
  compareIssues(
    mainIssues: Issue[],
    prIssues: Issue[],
    modifiedFiles: string[]
  ): {
    newIssues: Issue[];
    existingIssues: Issue[];
    resolvedIssues: Issue[];
  } {
    const newIssues: Issue[] = [];
    const existingIssues: Issue[] = [];
    const resolvedIssues: Issue[] = [];
    
    // Create issue signature for comparison
    const getIssueSignature = (issue: Issue) => 
      `${issue.category}-${issue.file}-${issue.line}-${issue.title}`;
    
    const mainSignatures = new Set(mainIssues.map(getIssueSignature));
    const prSignatures = new Set(prIssues.map(getIssueSignature));
    
    // Categorize PR issues
    for (const issue of prIssues) {
      const signature = getIssueSignature(issue);
      const isInModifiedFile = modifiedFiles.some(f => 
        issue.file.includes(f) || f.includes(issue.file)
      );
      
      issue.inModifiedFile = isInModifiedFile;
      
      if (mainSignatures.has(signature)) {
        issue.status = 'existing';
        existingIssues.push(issue);
      } else {
        issue.status = 'new';
        newIssues.push(issue);
      }
    }
    
    // Find resolved issues
    for (const issue of mainIssues) {
      const signature = getIssueSignature(issue);
      if (!prSignatures.has(signature)) {
        issue.status = 'resolved';
        resolvedIssues.push(issue);
      }
    }
    
    return { newIssues, existingIssues, resolvedIssues };
  }

  /**
   * Categorize issues into blocking and backlog
   */
  categorizeByPriority(
    newIssues: Issue[],
    existingIssues: Issue[]
  ): {
    blockingIssues: Issue[];
    backlogIssues: Issue[];
  } {
    const blockingIssues: Issue[] = [];
    const backlogIssues: Issue[] = [];
    
    // New issues in modified files are blocking
    for (const issue of newIssues) {
      if (issue.inModifiedFile && (issue.severity === 'critical' || issue.severity === 'high')) {
        blockingIssues.push(issue);
      } else {
        backlogIssues.push(issue);
      }
    }
    
    // Existing critical issues in modified files are blocking
    for (const issue of existingIssues) {
      if (issue.inModifiedFile && issue.severity === 'critical') {
        blockingIssues.push(issue);
      } else {
        backlogIssues.push(issue);
      }
    }
    
    return { blockingIssues, backlogIssues };
  }

  /**
   * Group similar issues together for batch training
   */
  groupSimilarIssues(issues: Issue[]): Map<string, IssueGroup> {
    const groups = new Map<string, IssueGroup>();
    
    // Define patterns for grouping
    const patterns = [
      { pattern: 'unused.*variable', group: 'Unused Variables' },
      { pattern: 'unused.*import', group: 'Unused Imports' },
      { pattern: 'missing.*documentation', group: 'Missing Documentation' },
      { pattern: 'error.*handling', group: 'Error Handling' },
      { pattern: 'potential.*null', group: 'Null Reference' },
      { pattern: 'security.*vulnerability', group: 'Security Issues' },
      { pattern: 'memory.*leak', group: 'Memory Management' },
      { pattern: 'performance.*issue', group: 'Performance' },
      { pattern: 'deprecated.*usage', group: 'Deprecated APIs' },
      { pattern: 'hardcoded.*secret', group: 'Hardcoded Secrets' },
      { pattern: 'sql.*injection', group: 'SQL Injection' },
      { pattern: 'cross.*site.*scripting', group: 'XSS Vulnerabilities' },
      { pattern: 'insecure.*random', group: 'Cryptographic Issues' },
      { pattern: 'race.*condition', group: 'Concurrency Issues' },
      { pattern: 'infinite.*loop', group: 'Infinite Loops' },
      { pattern: 'resource.*leak', group: 'Resource Management' },
      { pattern: 'type.*mismatch', group: 'Type Errors' },
      { pattern: 'unreachable.*code', group: 'Dead Code' },
      { pattern: 'circular.*dependency', group: 'Dependency Issues' },
      { pattern: 'missing.*test', group: 'Test Coverage' }
    ];
    
    for (const issue of issues) {
      let grouped = false;
      const searchText = `${issue.title} ${issue.description}`.toLowerCase();
      
      for (const { pattern, group } of patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(searchText)) {
          if (!groups.has(group)) {
            groups.set(group, {
              pattern: group,
              issues: [],
              count: 0,
              training: []
            });
          }
          
          const issueGroup = groups.get(group)!;
          issueGroup.issues.push(issue);
          issueGroup.count++;
          grouped = true;
          break;
        }
      }
      
      // If no pattern matched, group by category and severity
      if (!grouped) {
        const defaultGroup = `${issue.category}-${issue.severity}`;
        if (!groups.has(defaultGroup)) {
          groups.set(defaultGroup, {
            pattern: defaultGroup,
            issues: [],
            count: 0,
            training: []
          });
        }
        
        const issueGroup = groups.get(defaultGroup)!;
        issueGroup.issues.push(issue);
        issueGroup.count++;
      }
    }
    
    return groups;
  }

  /**
   * Find similar issues across different files
   */
  findSimilarIssues(
    issue: Issue,
    allIssues: Issue[],
    threshold = 0.8
  ): Issue[] {
    const similar: Issue[] = [];
    const issueText = `${issue.title} ${issue.description}`.toLowerCase();
    
    for (const other of allIssues) {
      if (other.id === issue.id) continue;
      
      const otherText = `${other.title} ${other.description}`.toLowerCase();
      const similarity = this.calculateSimilarity(issueText, otherText);
      
      if (similarity >= threshold) {
        similar.push(other);
      }
    }
    
    return similar;
  }

  /**
   * Calculate text similarity using simple token overlap
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.split(/\s+/));
    const tokens2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  /**
   * Deduplicate issues based on signature
   */
  deduplicateIssues(issues: Issue[]): Issue[] {
    const seen = new Map<string, Issue>();
    
    for (const issue of issues) {
      const signature = `${issue.category}-${issue.file}-${issue.line}-${issue.title}`;
      
      if (!seen.has(signature)) {
        seen.set(signature, issue);
      } else {
        // Keep the issue with higher severity
        const existing = seen.get(signature)!;
        if (this.getSeverityPriority(issue.severity) > this.getSeverityPriority(existing.severity)) {
          seen.set(signature, issue);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Get numeric priority for severity levels
   */
  private getSeverityPriority(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Sort issues by priority
   */
  sortByPriority(issues: Issue[]): Issue[] {
    return [...issues].sort((a, b) => {
      // First sort by severity
      const severityDiff = this.getSeverityPriority(b.severity) - this.getSeverityPriority(a.severity);
      if (severityDiff !== 0) return severityDiff;
      
      // Then by whether it's in a modified file
      if (a.inModifiedFile !== b.inModifiedFile) {
        return a.inModifiedFile ? -1 : 1;
      }
      
      // Finally by file and line
      const fileDiff = a.file.localeCompare(b.file);
      if (fileDiff !== 0) return fileDiff;
      
      return a.line - b.line;
    });
  }

  /**
   * Filter issues by criteria
   */
  filterIssues(
    issues: Issue[],
    criteria: {
      severity?: string[];
      category?: string[];
      status?: string[];
      inModifiedFile?: boolean;
      tool?: string[];
    }
  ): Issue[] {
    return issues.filter(issue => {
      if (criteria.severity && !criteria.severity.includes(issue.severity)) {
        return false;
      }
      if (criteria.category && !criteria.category.includes(issue.category)) {
        return false;
      }
      if (criteria.status && !criteria.status.includes(issue.status)) {
        return false;
      }
      if (criteria.inModifiedFile !== undefined && issue.inModifiedFile !== criteria.inModifiedFile) {
        return false;
      }
      if (criteria.tool && !criteria.tool.includes(issue.tool)) {
        return false;
      }
      return true;
    });
  }
}