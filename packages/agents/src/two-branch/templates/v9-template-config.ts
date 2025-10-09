/**
 * V9 Template Configuration
 * 
 * Defines the blocking logic, scoring rules, and report structure
 * for the V9 analyzer system
 * 
 * KEY RULES:
 * - SCORING: ALL issues (new, existing) affect the score with same weights
 * - BLOCKING: Only Critical/High that are NEW or in MODIFIED files block PR
 * - EXISTING IN UNMODIFIED: Affect score but never block (technical debt)
 */

/**
 * Severity Overrides Configuration
 * 
 * Allows users to customize severity mappings for specific rules.
 * These overrides take precedence over default severity mapping logic.
 * 
 * Use cases:
 * - Adjust tool-reported severities to match team standards
 * - Override specific rules based on project context
 * - Test and refine severity mappings with real PRs
 * 
 * Format: { 'tool:rule': 'severity' }
 * Example: { 'pmd:AvoidUsingVolatile': 'medium', 'semgrep:unsafe-reflection': 'high' }
 * 
 * Future: Users can manage these via Settings UI or API
 */
export interface SeverityOverrides {
  [key: string]: 'critical' | 'high' | 'medium' | 'low';
}

export interface V9TemplateConfig {
  version: string;
  blockingCriteria: BlockingCriteria;
  scoringRules: ScoringRules;
  reportSections: ReportSection[];
  educationalConfig: EducationalConfig;
  businessImpactConfig: BusinessImpactConfig;
  severityOverrides?: SeverityOverrides;  // NEW: User-customizable severity mappings
}

interface BlockingCriteria {
  // New issues that block merge
  newIssues: {
    critical: boolean;  // true = blocking
    high: boolean;      // true = blocking
    medium: boolean;    // false = non-blocking
    low: boolean;       // false = non-blocking
  };
  
  // Existing issues in modified files that block merge
  existingInModifiedFiles: {
    critical: boolean;  // true = blocking
    high: boolean;      // true = blocking
    medium: boolean;    // false = non-blocking
    low: boolean;       // false = non-blocking
  };
  
  // Existing issues in unmodified files (never block, only affect score)
  existingInUnmodifiedFiles: {
    critical: boolean;  // false = score only
    high: boolean;      // false = score only
    medium: boolean;    // false = score only
    low: boolean;       // false = score only
  };
}

interface ScoringRules {
  // Consistent weights for all issue states
  weights: {
    critical: number;  // 5 points
    high: number;      // 3 points
    medium: number;    // 1 point
    low: number;       // 0.5 points
  };
  
  // Starting score
  baseScore: number;  // 100
  
  // Grade thresholds
  gradeThresholds: {
    A: number;  // 90
    B: number;  // 80
    C: number;  // 70
    D: number;  // 60
    F: number;  // Below 60
  };
  
  // Passing score for PR approval
  passingScore: number;  // 70
}

interface ReportSection {
  id: string;
  title: string;
  required: boolean;
  order: number;
}

interface EducationalConfig {
  // Resource types to include
  includeTypes: string[];
  // Group similar issues
  groupByPattern: boolean;
  // Maximum resources per issue type
  maxResourcesPerType: number;
}

interface BusinessImpactConfig {
  // Hourly rate for fix cost calculations
  hourlyRate: number;
  // Multipliers for risk calculations
  exploitCostMultiplier: number;
  // Include financial projections
  includeFinancialProjections: boolean;
  // Include risk matrix
  includeRiskMatrix: boolean;
}

/**
 * Default V9 Template Configuration
 */
export const V9_DEFAULT_CONFIG: V9TemplateConfig = {
  version: '9.0.0',
  
  blockingCriteria: {
    newIssues: {
      critical: true,   // Block on new critical
      high: true,       // Block on new high
      medium: false,    // Don't block on medium
      low: false        // Don't block on low
    },
    existingInModifiedFiles: {
      critical: true,   // Block on existing critical in modified files
      high: true,       // Block on existing high in modified files
      medium: false,    // Don't block on medium
      low: false        // Don't block on low
    },
    existingInUnmodifiedFiles: {
      critical: false,  // Never block (score only)
      high: false,      // Never block (score only)
      medium: false,    // Never block (score only)
      low: false        // Never block (score only)
    }
  },
  
  scoringRules: {
    weights: {
      critical: 5,
      high: 3,
      medium: 1,
      low: 0.5
    },
    baseScore: 100,
    gradeThresholds: {
      A: 90,
      B: 80,
      C: 70,
      D: 60,
      F: 0  // Anything below 60
    },
    passingScore: 70
  },
  
  reportSections: [
    { id: 'header', title: 'Header', required: true, order: 1 },
    { id: 'decision', title: 'Decision', required: true, order: 2 },
    { id: 'score', title: 'Overall Score', required: true, order: 3 },
    { id: 'blocking', title: 'Blocking Issues', required: true, order: 4 },
    { id: 'newCritical', title: 'Critical Issues - NEW', required: false, order: 5 },
    { id: 'existingCriticalModified', title: 'Critical Issues - EXISTING IN MODIFIED', required: false, order: 6 },
    { id: 'existingCriticalUnmodified', title: 'Critical Issues - EXISTING IN UNMODIFIED', required: false, order: 7 },
    { id: 'newHigh', title: 'High Priority Issues - NEW', required: false, order: 8 },
    { id: 'existingHighModified', title: 'High Priority Issues - EXISTING IN MODIFIED', required: false, order: 9 },
    { id: 'existingHighUnmodified', title: 'High Priority Issues - EXISTING IN UNMODIFIED', required: false, order: 10 },
    { id: 'medium', title: 'Medium Priority Issues', required: false, order: 11 },
    { id: 'low', title: 'Low Priority Issues', required: false, order: 12 },
    { id: 'resolved', title: 'Resolved Issues', required: true, order: 13 },
    { id: 'distribution', title: 'Issue Distribution Analysis', required: true, order: 14 },
    { id: 'educational', title: 'Educational Insights', required: true, order: 15 },
    { id: 'businessImpact', title: 'Business Impact Analysis', required: true, order: 16 },
    { id: 'skillsTracking', title: 'Individual & Team Skills Tracking', required: true, order: 17 },
    { id: 'metadata', title: 'Analysis Metadata', required: true, order: 18 },
    { id: 'recommendations', title: 'Recommended Actions', required: true, order: 19 },
    { id: 'prComment', title: 'PR Comment', required: true, order: 20 },
    { id: 'metrics', title: 'Resolution Metrics', required: true, order: 21 }
  ],
  
  educationalConfig: {
    includeTypes: [
      'courses',
      'youtube',
      'documentation',
      'stackoverflow',
      'reddit',
      'discord',
      'books',
      'tools',
      'labs'
    ],
    groupByPattern: true,
    maxResourcesPerType: 5
  },
  
  businessImpactConfig: {
    hourlyRate: 150,
    exploitCostMultiplier: 10,
    includeFinancialProjections: true,
    includeRiskMatrix: true
  }
};

/**
 * Get blocking status for an issue
 */
export function isBlocking(
  severity: 'critical' | 'high' | 'medium' | 'low',
  issueType: 'new' | 'existingInModified' | 'existingInUnmodified',
  config: V9TemplateConfig = V9_DEFAULT_CONFIG
): boolean {
  switch (issueType) {
    case 'new':
      return config.blockingCriteria.newIssues[severity];
    case 'existingInModified':
      return config.blockingCriteria.existingInModifiedFiles[severity];
    case 'existingInUnmodified':
      return config.blockingCriteria.existingInUnmodifiedFiles[severity];
    default:
      return false;
  }
}

/**
 * Calculate score impact for an issue
 */
export function getScoreImpact(
  severity: 'critical' | 'high' | 'medium' | 'low',
  config: V9TemplateConfig = V9_DEFAULT_CONFIG
): number {
  return config.scoringRules.weights[severity];
}

/**
 * Get grade from score
 */
export function getGrade(
  score: number,
  config: V9TemplateConfig = V9_DEFAULT_CONFIG
): string {
  const { gradeThresholds } = config.scoringRules;
  
  if (score >= gradeThresholds.A) return 'A';
  if (score >= gradeThresholds.B) return 'B';
  if (score >= gradeThresholds.C) return 'C';
  if (score >= gradeThresholds.D) return 'D';
  return 'F';
}

/**
 * Check if PR should be approved
 */
export function shouldApprove(
  score: number,
  hasBlockingIssues: boolean,
  config: V9TemplateConfig = V9_DEFAULT_CONFIG
): boolean {
  return !hasBlockingIssues && score >= config.scoringRules.passingScore;
}

/**
 * Get severity override for a specific tool:rule combination
 * 
 * @param tool - Tool name (e.g., 'pmd', 'semgrep')
 * @param rule - Rule ID (e.g., 'AvoidUsingVolatile', 'unsafe-reflection')
 * @param config - V9 template configuration with optional severity overrides
 * @returns Overridden severity or undefined if no override exists
 * 
 * @example
 * const severity = getSeverityOverride('pmd', 'AvoidUsingVolatile', config);
 * // Returns 'medium' if configured, undefined otherwise
 */
export function getSeverityOverride(
  tool: string,
  rule: string,
  config: V9TemplateConfig = V9_DEFAULT_CONFIG
): 'critical' | 'high' | 'medium' | 'low' | undefined {
  if (!config.severityOverrides) {
    return undefined;
  }
  
  // Try exact match: 'tool:rule'
  const exactKey = `${tool.toLowerCase()}:${rule.toLowerCase()}`;
  if (exactKey in config.severityOverrides) {
    return config.severityOverrides[exactKey];
  }
  
  // Try rule-only match (for backward compatibility)
  const ruleKey = rule.toLowerCase();
  if (ruleKey in config.severityOverrides) {
    return config.severityOverrides[ruleKey];
  }
  
  return undefined;
}