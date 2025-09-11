import { createLogger } from '@codequal/core/utils';

/**
 * Interface for issue comparison
 */
export interface IssueComparison {
  issueId: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'fixed' | 'new' | 'unchanged';
  repository: string;
}

/**
 * Service to detect which repository issues were fixed in a PR
 */
export class IssueResolutionDetector {
  private readonly logger = createLogger('IssueResolutionDetector');

  /**
   * Compare PR analysis with existing repo issues to detect fixes
   */
  detectFixedIssues(
    prAnalysis: any,
    existingRepoIssues: {
      security?: any[];
      codeQuality?: any[];
      architecture?: any[];
      performance?: any[];
      dependencies?: any[];
    },
    repository: string,
    prNumber: number
  ): {
    fixedIssues: IssueComparison[];
    newIssues: IssueComparison[];
    unchangedIssues: IssueComparison[];
  } {
    this.logger.info('Detecting fixed issues in PR', {
      repository,
      prNumber
    });

    const fixedIssues: IssueComparison[] = [];
    const newIssues: IssueComparison[] = [];
    const unchangedIssues: IssueComparison[] = [];

    // Process each category
    const categories = [
      { name: 'security', prData: prAnalysis.security?.vulnerabilities, repoData: existingRepoIssues.security },
      { name: 'codeQuality', prData: prAnalysis.codeQuality?.issues, repoData: existingRepoIssues.codeQuality },
      { name: 'architecture', prData: prAnalysis.architecture?.issues, repoData: existingRepoIssues.architecture },
      { name: 'performance', prData: prAnalysis.performance?.issues, repoData: existingRepoIssues.performance },
      { name: 'dependency', prData: prAnalysis.dependency?.vulnerabilities, repoData: existingRepoIssues.dependencies }
    ];

    for (const category of categories) {
      const prIssueIds = new Set(
        (category.prData || []).map((issue: any) => this.generateIssueId(issue))
      );
      const repoIssueIds = new Map(
        (category.repoData || []).map((issue: any) => [this.generateIssueId(issue), issue])
      );

      // Find fixed issues (in repo but not in PR)
      for (const [issueId, issue] of repoIssueIds.entries()) {
        if (!prIssueIds.has(issueId)) {
          fixedIssues.push({
            issueId,
            category: category.name,
            severity: this.extractSeverity(issue),
            status: 'fixed',
            repository
          });
        } else {
          unchangedIssues.push({
            issueId,
            category: category.name,
            severity: this.extractSeverity(issue),
            status: 'unchanged',
            repository
          });
        }
      }

      // Find new issues (in PR but not in repo)
      for (const issue of (category.prData || [])) {
        const issueId = this.generateIssueId(issue);
        if (!repoIssueIds.has(issueId)) {
          newIssues.push({
            issueId,
            category: category.name,
            severity: this.extractSeverity(issue),
            status: 'new',
            repository
          });
        }
      }
    }

    this.logger.info('Issue detection complete', {
      fixedCount: fixedIssues.length,
      newCount: newIssues.length,
      unchangedCount: unchangedIssues.length
    });

    return { fixedIssues, newIssues, unchangedIssues };
  }

  /**
   * Generate a unique ID for an issue based on its properties
   */
  private generateIssueId(issue: any): string {
    // Create a deterministic ID based on issue properties
    const components = [
      issue.type || issue.rule || issue.vulnerability || 'unknown',
      issue.file || issue.location?.file || '',
      issue.line || issue.location?.line || '',
      issue.message || issue.description || ''
    ];

    // Simple hash function for consistency
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `issue_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Extract severity from issue object
   */
  private extractSeverity(issue: any): 'critical' | 'high' | 'medium' | 'low' {
    const severity = issue.severity || issue.level || 'medium';
    const normalizedSeverity = severity.toLowerCase();
    
    if (['critical', 'high', 'medium', 'low'].includes(normalizedSeverity)) {
      return normalizedSeverity as 'critical' | 'high' | 'medium' | 'low';
    }
    
    // Map common alternatives
    if (normalizedSeverity === 'error') return 'high';
    if (normalizedSeverity === 'warning') return 'medium';
    if (normalizedSeverity === 'info') return 'low';
    
    return 'medium'; // Default
  }

  /**
   * Group fixed issues by category and severity for reporting
   */
  groupFixedIssues(fixedIssues: IssueComparison[]): Record<string, {
    total: number;
    bySeverity: Record<string, number>;
  }> {
    const grouped: Record<string, {
      total: number;
      bySeverity: Record<string, number>;
    }> = {};

    for (const issue of fixedIssues) {
      if (!grouped[issue.category]) {
        grouped[issue.category] = {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }
        };
      }

      grouped[issue.category].total++;
      grouped[issue.category].bySeverity[issue.severity]++;
    }

    return grouped;
  }
}