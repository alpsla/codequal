import { Issue } from '../types/analysis-types';

export interface IssueGroup {
  pattern: string;
  category: string;
  severity: string;
  occurrences: IssueOccurrence[];
  totalCount: number;
  affectedFiles: string[];
}

export interface IssueOccurrence {
  issue: Issue;
  file: string;
  line?: number;
  column?: number;
  codeSnippet?: string;
  confidence?: number;
}

/**
 * Groups similar issues while preserving all occurrences
 * This is better than deduplication - we want to show ALL instances
 */
export class IssueGrouper {
  
  /**
   * Group issues by pattern while preserving all occurrences
   */
  groupIssues(issues: Issue[]): IssueGroup[] {
    const groups = new Map<string, IssueGroup>();
    
    for (const issue of issues) {
      const groupKey = this.createGroupKey(issue);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          pattern: this.extractPattern(issue),
          category: issue.category || 'Unknown',
          severity: issue.severity || 'medium',
          occurrences: [],
          totalCount: 0,
          affectedFiles: []
        });
      }
      
      const group = groups.get(groupKey)!;
      const file = issue.location?.file || 'unknown';
      
      group.occurrences.push({
        issue,
        file,
        line: issue.location?.line,
        column: issue.location?.column,
        codeSnippet: issue.codeSnippet,
        confidence: (issue as any).locationConfidence
      });
      
      group.totalCount++;
      
      if (!group.affectedFiles.includes(file)) {
        group.affectedFiles.push(file);
      }
    }
    
    return Array.from(groups.values());
  }
  
  /**
   * Create a key for grouping similar issues
   */
  private createGroupKey(issue: Issue): string {
    // Group by category, severity, and general pattern
    const category = (issue.category || 'unknown').toLowerCase();
    const severity = (issue.severity || 'medium').toLowerCase();
    const pattern = this.extractPattern(issue);
    
    return `${category}::${severity}::${pattern}`;
  }
  
  /**
   * Extract a pattern that identifies the type of issue
   */
  private extractPattern(issue: Issue): string {
    const description = issue.description || issue.title || '';
    
    // Common security patterns
    if (description.match(/SQL\s+injection/i)) return 'sql-injection';
    if (description.match(/XSS|cross-site/i)) return 'xss';
    if (description.match(/CSRF/i)) return 'csrf';
    if (description.match(/hardcoded|secret|password|api.?key/i)) return 'hardcoded-secret';
    if (description.match(/missing\s+validation/i)) return 'missing-validation';
    if (description.match(/missing\s+authentication/i)) return 'missing-auth';
    if (description.match(/missing\s+authorization/i)) return 'missing-authz';
    if (description.match(/rate\s+limit/i)) return 'missing-rate-limit';
    
    // Performance patterns
    if (description.match(/N\+1|n plus 1/i)) return 'n-plus-one-query';
    if (description.match(/memory\s+leak/i)) return 'memory-leak';
    if (description.match(/infinite\s+loop/i)) return 'infinite-loop';
    
    // Code quality patterns
    if (description.match(/duplicate|DRY/i)) return 'code-duplication';
    if (description.match(/complexity/i)) return 'high-complexity';
    if (description.match(/dead\s+code/i)) return 'dead-code';
    
    // Extract first significant words as pattern
    const words = description.toLowerCase().split(/\s+/).slice(0, 3);
    return words.join('-');
  }
  
  /**
   * Format grouped issues for reporting
   */
  formatGroupedIssues(groups: IssueGroup[]): string {
    let report = '';
    
    for (const group of groups) {
      report += `\n### ${group.category} - ${group.pattern}\n`;
      report += `**Severity:** ${group.severity}\n`;
      report += `**Total Occurrences:** ${group.totalCount}\n`;
      report += `**Affected Files:** ${group.affectedFiles.length}\n\n`;
      
      if (group.totalCount <= 5) {
        // Show all occurrences if 5 or fewer
        group.occurrences.forEach((occ, idx) => {
          report += `${idx + 1}. ${occ.file}`;
          if (occ.line) report += `:${occ.line}`;
          if (occ.column) report += `:${occ.column}`;
          if (occ.confidence) report += ` (${occ.confidence}% confidence)`;
          report += '\n';
          
          if (occ.codeSnippet) {
            report += '   ```\n';
            report += '   ' + occ.codeSnippet.split('\n').join('\n   ');
            report += '\n   ```\n';
          }
        });
      } else {
        // Show first 3 and summary for many occurrences
        group.occurrences.slice(0, 3).forEach((occ, idx) => {
          report += `${idx + 1}. ${occ.file}`;
          if (occ.line) report += `:${occ.line}`;
          report += '\n';
        });
        report += `... and ${group.totalCount - 3} more occurrences\n`;
        report += `\nAll affected files: ${group.affectedFiles.join(', ')}\n`;
      }
      
      report += '\n---\n';
    }
    
    return report;
  }
}

/**
 * Example usage in report:
 * 
 * SQL Injection - sql-injection
 * Severity: critical
 * Total Occurrences: 8
 * Affected Files: 3
 * 
 * 1. src/api/users.ts:45:12 (95% confidence)
 *    ```
 *    const query = `SELECT * FROM users WHERE id = ${userId}`;
 *    ```
 * 2. src/api/users.ts:67:8 (92% confidence)
 *    ```
 *    db.query(`DELETE FROM users WHERE email = '${email}'`);
 *    ```
 * 3. src/api/products.ts:23:15 (88% confidence)
 *    ```
 *    const sql = "SELECT * FROM products WHERE name = '" + name + "'";
 *    ```
 * ... and 5 more occurrences
 * 
 * All affected files: src/api/users.ts, src/api/products.ts, src/api/orders.ts
 */