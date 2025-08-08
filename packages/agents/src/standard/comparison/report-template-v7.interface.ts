/**
 * V7 Report Template Interface
 * This defines the EXACT structure and requirements for all V7 reports
 */

export interface V7ReportTemplate {
  // Required sections in exact order
  sections: {
    header: ReportHeader;
    decision: DecisionSection;
    executiveSummary: ExecutiveSummary;
    breakingChanges?: BreakingChangesSection; // Optional
    categories: {
      1: SecurityAnalysis;
      2: PerformanceAnalysis;
      3: CodeQualityAnalysis;
      4: ArchitectureAnalysis;
      5: DependenciesAnalysis;
    };
    prIssues: PRIssuesSection;
    repositoryIssues?: RepositoryIssuesSection; // Optional
    educationalInsights: EducationalSection;
    skillsTracking: SkillsSection;
    businessImpact: BusinessImpactSection;
    actionItems: ActionItemsSection;
    prComment: PRCommentSection;
    scoreImpact: ScoreImpactSection;
    footnotes: FootnotesSection;
  };
}

export interface ReportHeader {
  repository: string;
  prNumber: string;
  title: string;
  author: string;
  analysisDate: string;
  modelUsed: string;
  scanDuration: string;
  // NO breaking changes count here
}

export interface DecisionSection {
  approved: boolean;
  confidence: number;
  blockingIssues: {
    critical: number;
    breakingChanges: number;
    high: number;
  };
  // Must show ALL blocking issues
}

export interface ExecutiveSummary {
  overallScore: number;
  grade: string;
  metrics: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    issuesResolved: number;
    newIssues: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    breakingChanges: {
      critical: number;
      high: number;
      medium: number;
    };
    preExistingIssues: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  visualDistribution: {
    newIssues: string; // Bar chart
    existingIssues: string; // Bar chart
  };
}

export interface CategoryAnalysis {
  score: number;
  grade: string;
  issues: Array<{
    status: 'new' | 'resolved' | 'existing';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    location?: {
      file: string;
      line: number;
    };
  }>;
  metrics: Record<string, any>; // Category-specific metrics
}

export interface SecurityAnalysis extends CategoryAnalysis {
  metrics: {
    vulnerabilities: number;
    sanitizationStatus: string;
    xssProtection: boolean;
    csrfProtection: boolean;
    sqlInjectionPrevention: boolean;
  };
}

export interface PerformanceAnalysis extends CategoryAnalysis {
  metrics: {
    responseTime: string;
    memoryUsage: string;
    cpuUsage: string;
    bundleSize: string;
  };
}

export interface CodeQualityAnalysis extends CategoryAnalysis {
  metrics: {
    cyclomaticComplexity: {
      max: number;
      average: number;
      threshold: number;
    };
    codeDuplication: number;
    testCoverage: number;
    typeCoverage: number;
    lintingIssues: {
      errors: number;
      warnings: number;
    };
  };
}

export interface ArchitectureAnalysis extends CategoryAnalysis {
  scoreBreakdown: {
    designPatterns: number;
    modularity: number;
    breakingChangesImpact: number;
    scalability: number;
    resilience: number;
    apiDesign: number;
  };
  diagrams: {
    before: string; // ASCII art
    after: string; // ASCII art
  };
}

export interface DependenciesAnalysis extends CategoryAnalysis {
  metrics: {
    total: number;
    direct: number;
    transitive: number;
    outdated: number;
    vulnerable: number;
    licenseIssues: number;
    bundleImpact: string;
  };
}

export interface PRIssuesSection {
  issues: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    message: string;
    location: {
      file: string;
      line: number;
    };
    impact: string;
    codeSnippet?: string;
    requiredFix: string; // NEVER TODO - always actual fix
  }>;
}

export interface PRCommentSection {
  decision: 'approved' | 'changesRequired';
  blockingIssuesSummary: string[];
  requiredActions: string[];
  statistics: {
    filesChanged: number;
    linesModified: string;
    issuesFixed: number;
    newIssues: number;
    qualityScore: number;
  };
}

// Missing interface definitions
export interface BreakingChangesSection {
  hasBreakingChanges: boolean;
  count: number;
  changes: Array<{
    severity: 'critical' | 'high' | 'medium';
    type: string;
    description: string;
    migration: string;
    files: string[];
  }>;
}

export interface RepositoryIssuesSection {
  existingIssues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    message: string;
    location: {
      file: string;
      line: number;
    };
  }>;
  totalCount: number;
}

export interface EducationalSection {
  insights: Array<{
    topic: string;
    description: string;
    recommendation: string;
  }>;
  bestPractices: string[];
  resources: Array<{
    title: string;
    url: string;
  }>;
}

export interface SkillsSection {
  before: {
    overall: number;
    categories: Record<string, number>;
  };
  after: {
    overall: number;
    categories: Record<string, number>;
  };
  improvements: Array<{
    skill: string;
    change: number;
    reason: string;
  }>;
}

export interface BusinessImpactSection {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: {
    users: string;
    revenue: string;
    performance: string;
  };
  recommendations: string[];
}

export interface ActionItemsSection {
  required: Array<{
    priority: 'critical' | 'high' | 'medium' | 'low';
    action: string;
    assignee?: string;
    deadline?: string;
  }>;
  recommended: string[];
}

export interface ScoreImpactSection {
  before: number;
  after: number;
  change: number;
  breakdown: Record<string, {
    before: number;
    after: number;
    change: number;
  }>;
}

export interface FootnotesSection {
  timestamp: string;
  analysisVersion: string;
  disclaimers: string[];
  supportLinks: Array<{
    label: string;
    url: string;
  }>;
}

// Issue Analysis Structure - Single Source of Truth
export interface IssueAnalysis {
  new: {
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
    total: number;
    byCategory: {
      security: any[];
      performance: any[];
      codeQuality: any[];
      dependencies: any[];
      testing: any[];
    };
  };
  resolved: {
    total: number;
    byCategory: Record<string, any[]>;
  };
  unchanged: {
    total: number;
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
  };
  breakingChanges: {
    critical: any[];
    high: any[];
    medium: any[];
    total: number;
  };
}