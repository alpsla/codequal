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
 *
 * Security Priority (Session 59):
 * - Secrets (Gitleaks, TruffleHog): ALWAYS blocker regardless of severity
 * - IaC Critical (Checkov): Blocker if critical/high severity
 * - Container Critical (Trivy, Grype): Blocker if CVE has known exploits
 */

/**
 * Security categories that should ALWAYS be treated as blockers
 * These represent immediate security risks that must be addressed
 */
export const ALWAYS_BLOCKER_CATEGORIES = [
  'Secrets',           // Exposed credentials - ALWAYS block
  'secrets',           // Alternative casing
];

/**
 * Security categories that are blockers when critical/high severity
 */
export const SECURITY_BLOCKER_CATEGORIES = [
  'Security',          // Code security (XSS, SQLi, etc.)
  'Infrastructure',    // IaC misconfigurations
  'Container Security', // Container vulnerabilities
  'iac_security',      // Alternative naming
  'container_security', // Alternative naming
  // P1 Tools (Session 59)
  'API Design',        // API security issues (auth, CORS, etc.)
  'api_design',        // Alternative naming
  'GraphQL Security',  // GraphQL security misconfigurations
  'graphql_security',  // Alternative naming
];

export interface IssueFilterConfig {
  maxIssuesForFullAnalysis: number;  // Default: 20
  maxIssuesForHighPriority: number;  // Default: 50
  alwaysShowBlockers: boolean;       // Default: true
  costPerAIAnalysis: number;         // Default: $0.003
  /** Treat secrets as always blocking regardless of severity */
  secretsAlwaysBlock: boolean;       // Default: true
  /**
   * Critical security issues block regardless of code location
   * When true: ALL critical security/IaC/container issues block
   * When false: Only issues in NEW/EXISTING_MODIFIED code block
   * Default: true - security issues are too important to ignore
   */
  securityCriticalAlwaysBlocks: boolean;  // Default: true
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
  costPerAIAnalysis: 0.003,
  secretsAlwaysBlock: true,
  securityCriticalAlwaysBlocks: true  // Critical security issues block regardless of code location
};

/**
 * Determine if an issue should be treated as a blocker
 * Security categories have special handling
 */
export function isBlockerIssue<T extends { severity: string; category?: string; tool?: string }>(
  issue: T,
  config: Partial<IssueFilterConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_FILTER_CONFIG, ...config };
  const category = issue.category?.toLowerCase() || '';
  const tool = (issue as any).tool?.toLowerCase() || '';

  // Secrets ALWAYS block regardless of severity (Session 59)
  if (cfg.secretsAlwaysBlock) {
    if (ALWAYS_BLOCKER_CATEGORIES.some(c => c.toLowerCase() === category)) {
      return true;
    }
    // Also check by tool name
    if (['gitleaks', 'trufflehog'].includes(tool)) {
      return true;
    }
  }

  // Security categories - check if it's a security-related issue
  const isSecurityCategory = SECURITY_BLOCKER_CATEGORIES.some(c => c.toLowerCase() === category);
  const isSecurityTool = [
    'checkov', 'trivy', 'grype', 'semgrep', 'codeql', 'snyk',
    // P1 Tools (Session 59)
    'spectral', 'graphql-cop', 'graphql-scanner', 'graphql-static'
  ].includes(tool);

  if (isSecurityCategory || isSecurityTool) {
    // Critical security issues ALWAYS block when securityCriticalAlwaysBlocks is true
    if (cfg.securityCriticalAlwaysBlocks && issue.severity === 'critical') {
      return true;
    }
    // High security issues block only in new/modified code
    if (issue.severity === 'high') {
      const codeStatus = (issue as any).codeStatus?.toLowerCase() || '';
      if (codeStatus === 'new' || codeStatus === 'existing_modified' ||
          issue.category === 'NEW' || issue.category === 'EXISTING_MODIFIED') {
        return true;
      }
    }
  }

  // Standard blocker: critical severity in NEW or EXISTING_MODIFIED code
  if (issue.severity === 'critical') {
    const codeStatus = (issue as any).codeStatus?.toLowerCase() || '';
    if (codeStatus === 'new' || codeStatus === 'existing_modified' ||
        issue.category === 'NEW' || issue.category === 'EXISTING_MODIFIED') {
      return true;
    }
  }

  return false;
}

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

  // Determine blockers using new security-aware logic
  const blockers = issues.filter(i => isBlockerIssue(i, cfg));

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
 * Check if issue is from a recommendation-only security tool
 * These always need AI processing for remediation guidance
 */
export function isRecommendationOnlyIssue<T extends { category?: string; tool?: string }>(
  issue: T
): boolean {
  const category = issue.category?.toLowerCase() || '';
  const tool = (issue as any).tool?.toLowerCase() || '';

  // Recommendation-only categories
  if (ALWAYS_BLOCKER_CATEGORIES.some(c => c.toLowerCase() === category)) {
    return true;
  }

  // GraphQL security is recommendation-only (Session 59 P1)
  if (category === 'graphql security' || category === 'graphql_security') {
    return true;
  }

  // Check by tool name
  const recommendationTools = [
    'gitleaks', 'trufflehog', 'trivy', 'grype', 'checkov',
    // P1 GraphQL tools - recommendation only (Session 59)
    'graphql-cop', 'graphql-scanner', 'graphql-static'
  ];
  return recommendationTools.includes(tool);
}

/**
 * Cost-aware issue processing decision
 * Security issues always get AI processing for recommendations
 */
export function shouldProcessWithAI(
  issue: { severity: string; category?: string; tool?: string },
  totalIssues: number,
  config: Partial<IssueFilterConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_FILTER_CONFIG, ...config };

  // Security issues ALWAYS get AI processing for recommendations (Session 59)
  // Even if we can't auto-fix, we provide remediation guidance
  if (isRecommendationOnlyIssue(issue)) {
    return true;
  }

  // Blockers always get AI processing
  if (cfg.alwaysShowBlockers && isBlockerIssue(issue, cfg)) {
    return true;
  }

  // Always process if under threshold
  if (totalIssues <= cfg.maxIssuesForFullAnalysis) {
    return true;
  }

  // Process critical/high if moderate issues
  if (totalIssues <= cfg.maxIssuesForHighPriority &&
      (issue.severity === 'critical' || issue.severity === 'high')) {
    return true;
  }

  return false;
}

/**
 * Get blocking issues summary for report integration
 * Returns categorized blockers for PR decision making
 *
 * Decision options (V9 standard - ONLY 2):
 * - APPROVED: PR can be merged
 * - DECLINED: PR needs changes (any blocker = decline)
 */
export function getBlockerSummary<T extends { severity: string; category?: string; tool?: string }>(
  issues: T[],
  config: Partial<IssueFilterConfig> = {}
): {
  hasBlockers: boolean;
  blockerCount: number;
  secretsCount: number;
  securityBlockerCount: number;
  criticalBlockerCount: number;
  blockersByCategory: Record<string, number>;
  decision: 'APPROVED' | 'DECLINED';
  declineReason?: 'secrets' | 'security' | 'critical';
  summary: string;
} {
  const cfg = { ...DEFAULT_FILTER_CONFIG, ...config };
  const blockers = issues.filter(i => isBlockerIssue(i, cfg));

  // Categorize blockers
  const secretsBlockers = blockers.filter(i => {
    const tool = (i as any).tool?.toLowerCase() || '';
    return ['gitleaks', 'trufflehog'].includes(tool) ||
           ALWAYS_BLOCKER_CATEGORIES.some(c => c.toLowerCase() === (i.category?.toLowerCase() || ''));
  });

  const securityBlockers = blockers.filter(i => {
    const category = i.category?.toLowerCase() || '';
    return SECURITY_BLOCKER_CATEGORIES.some(c => c.toLowerCase() === category) &&
           !secretsBlockers.includes(i);
  });

  const criticalBlockers = blockers.filter(i =>
    !secretsBlockers.includes(i) && !securityBlockers.includes(i)
  );

  // Group blockers by category
  const blockersByCategory = blockers.reduce((acc, i) => {
    const cat = i.category || 'unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Determine decision (V9: only APPROVED or DECLINED)
  let decision: 'APPROVED' | 'DECLINED';
  let declineReason: 'secrets' | 'security' | 'critical' | undefined;
  let summary: string;

  if (secretsBlockers.length > 0) {
    decision = 'DECLINED';
    declineReason = 'secrets';
    summary = `CRITICAL: ${secretsBlockers.length} secret(s) detected. PR declined - credentials must be rotated and removed from git history.`;
  } else if (securityBlockers.length > 0) {
    decision = 'DECLINED';
    declineReason = 'security';
    summary = `SECURITY: ${securityBlockers.length} security issue(s) require immediate attention. PR declined until resolved.`;
  } else if (criticalBlockers.length > 0) {
    decision = 'DECLINED';
    declineReason = 'critical';
    summary = `${criticalBlockers.length} critical issue(s) found in modified code. PR declined until resolved.`;
  } else {
    decision = 'APPROVED';
    declineReason = undefined;
    summary = 'No blocking issues found.';
  }

  return {
    hasBlockers: blockers.length > 0,
    blockerCount: blockers.length,
    secretsCount: secretsBlockers.length,
    securityBlockerCount: securityBlockers.length,
    criticalBlockerCount: criticalBlockers.length,
    blockersByCategory,
    decision,
    declineReason,
    summary
  };
}
