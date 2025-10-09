/**
 * Smart Issue Filter - Cost-Aware Issue Prioritization
 * 
 * Filters issues to a reviewable number while keeping costs low.
 * AI analysis only applied to issues users will actually see.
 * 
 * Strategy:
 * - If issues <= 20: Show all with full AI analysis
 * - If issues 21-50: Show only critical/high with AI analysis
 * - If issues > 50: Show only blockers with AI analysis
 * - Rest: Keep metadata only (no AI, no code snippets)
 */

export interface IssueFilterConfig {
  maxIssuesForFullAnalysis: number;  // Default: 20
  maxIssuesForHighPriority: number;  // Default: 50
  alwaysShowBlockers: boolean;       // Default: true
  costPerAIAnalysis: number;         // Default: $0.003
}

export interface FilteredIssues<T> {
  displayed: T[];              // Issues to show with AI analysis
  summarized: T[];             // Issues to show metadata only
  totalCount: number;          // Total issues found
  estimatedCost: number;       // Estimated AI cost
  filterReason: string;        // Why filtering was applied
}

export const DEFAULT_FILTER_CONFIG: IssueFilterConfig = {
  maxIssuesForFullAnalysis: 20,
  maxIssuesForHighPriority: 50,
  alwaysShowBlockers: true,
  costPerAIAnalysis: 0.003
};

export function filterIssuesForDisplay<T extends { severity: string; category?: string }>(
  issues: T[],
  config: Partial<IssueFilterConfig> = {}
): FilteredIssues<T> {
  const cfg = { ...DEFAULT_FILTER_CONFIG, ...config };
  
  // Categorize by severity
  const critical = issues.filter(i => i.severity === 'critical');
  const high = issues.filter(i => i.severity === 'high');
  const medium = issues.filter(i => i.severity === 'medium');
  const low = issues.filter(i => i.severity === 'low');
  
  // Determine blocker status (critical issues in NEW or EXISTING_MODIFIED)
  const blockers = critical.filter(i => 
    i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'
  );

  let displayed: T[] = [];
  let summarized: T[] = [];
  let filterReason = '';

  // Strategy 1: Few issues - show all
  if (issues.length <= cfg.maxIssuesForFullAnalysis) {
    displayed = issues;
    filterReason = `All ${issues.length} issues shown (under ${cfg.maxIssuesForFullAnalysis} threshold)`;
  }
  
  // Strategy 2: Moderate issues - show critical + high only
  else if (issues.length <= cfg.maxIssuesForHighPriority) {
    displayed = [...critical, ...high].slice(0, cfg.maxIssuesForFullAnalysis);
    summarized = [...medium, ...low];
    filterReason = `Showing ${displayed.length} critical/high issues. ${summarized.length} medium/low issues summarized (no AI analysis)`;
  }
  
  // Strategy 3: Many issues - show blockers only
  else {
    displayed = blockers.slice(0, cfg.maxIssuesForFullAnalysis);
    summarized = issues.filter(i => !displayed.includes(i));
    filterReason = `Showing ${displayed.length} blocking issues (critical in modified code). ${summarized.length} other issues summarized (no AI analysis)`;
    
    // If no blockers, fall back to critical issues
    if (displayed.length === 0) {
      displayed = critical.slice(0, cfg.maxIssuesForFullAnalysis);
      summarized = issues.filter(i => !displayed.includes(i));
      filterReason = `No blockers found. Showing ${displayed.length} critical issues. ${summarized.length} other issues summarized (no AI analysis)`;
    }
  }

  const estimatedCost = displayed.length * cfg.costPerAIAnalysis;

  return {
    displayed,
    summarized,
    totalCount: issues.length,
    estimatedCost,
    filterReason
  };
}

/**
 * Get issue summary statistics without AI analysis
 */
export function getIssueSummary<T extends { severity: string; tool?: string; category?: string }>(
  issues: T[]
): {
  total: number;
  bySeverity: Record<string, number>;
  byTool: Record<string, number>;
  byCategory: Record<string, number>;
} {
  return {
    total: issues.length,
    bySeverity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    },
    byTool: issues.reduce((acc, i) => {
      const tool = i.tool || 'unknown';
      acc[tool] = (acc[tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byCategory: issues.reduce((acc, i) => {
      const cat = i.category || 'unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * Cost-aware issue processing decision
 */
export function shouldProcessWithAI(
  issue: { severity: string; category?: string },
  totalIssues: number,
  config: Partial<IssueFilterConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_FILTER_CONFIG, ...config };
  
  // Always process if under threshold
  if (totalIssues <= cfg.maxIssuesForFullAnalysis) {
    return true;
  }
  
  // Process blockers
  if (cfg.alwaysShowBlockers && 
      issue.severity === 'critical' && 
      (issue.category === 'NEW' || issue.category === 'EXISTING_MODIFIED')) {
    return true;
  }
  
  // Process critical/high if moderate issues
  if (totalIssues <= cfg.maxIssuesForHighPriority && 
      (issue.severity === 'critical' || issue.severity === 'high')) {
    return true;
  }
  
  return false;
}

