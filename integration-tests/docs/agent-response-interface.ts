// Standardized Agent Response Interface

export interface AgentAnalysisResult {
  // Required fields
  role: AgentRole;
  status: 'completed' | 'failed' | 'partial';
  confidence: number; // 0-1
  
  // Analysis results
  findings: Finding[];
  summary: AnalysisSummary;
  recommendations: Recommendation[];
  
  // Context tracking
  contextsUsed: {
    deepwiki: boolean;
    tools: string[];
    vectorDb: boolean;
    crossRepo: boolean;
  };
  
  // Timing
  duration: number;
  timestamp: string;
  
  // Optional specialized data
  roleSpecificData?: any;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
  };
  evidence?: any;
  remediation?: {
    immediate: string;
    longTerm?: string;
    effort: 'low' | 'medium' | 'high';
  };
}

export interface AnalysisSummary {
  overallAssessment: string;
  issueCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  keyInsights: string[];
  score?: number; // Role-specific score (0-10)
}

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  action: string;
  rationale: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  dependencies?: string[]; // Other recommendations that should be done first
}

// Example usage for each agent:

// Security Agent
const securityResult: AgentAnalysisResult = {
  role: 'security',
  status: 'completed',
  confidence: 0.92,
  findings: [
    {
      id: 'sec-001',
      severity: 'critical',
      category: 'injection',
      title: 'SQL Injection Vulnerability',
      description: 'User input not sanitized in query',
      location: { file: 'src/db/queries.ts', line: 134 },
      remediation: {
        immediate: 'Use parameterized queries',
        longTerm: 'Implement ORM',
        effort: 'medium'
      }
    }
  ],
  summary: {
    overallAssessment: 'Critical security issues found',
    issueCount: { critical: 1, high: 1, medium: 0, low: 0, info: 0 },
    keyInsights: [
      'SQL injection risk in database layer',
      'JWT secret hardcoded'
    ],
    score: 3.5 // Low score due to critical issues
  },
  recommendations: [
    {
      id: 'rec-sec-001',
      priority: 'critical',
      category: 'security',
      action: 'Fix SQL injection immediately',
      rationale: 'Prevents data breach',
      effort: 'medium',
      impact: 'high'
    }
  ],
  contextsUsed: {
    deepwiki: true,
    tools: ['semgrep', 'mcp-scan'],
    vectorDb: true,
    crossRepo: false
  },
  duration: 2340,
  timestamp: new Date().toISOString(),
  roleSpecificData: {
    securityScore: 3.5,
    complianceStatus: {
      OWASP: 'failing',
      PCI: 'at-risk'
    }
  }
};

// Educational Agent
const educationalResult: AgentAnalysisResult = {
  role: 'educational',
  status: 'completed',
  confidence: 0.85,
  findings: [], // Educational agent doesn't have "findings" in the same sense
  summary: {
    overallAssessment: 'Team would benefit from security training',
    issueCount: { critical: 0, high: 0, medium: 0, low: 0, info: 3 },
    keyInsights: [
      'SQL injection patterns suggest knowledge gap',
      'Team using outdated authentication patterns'
    ]
  },
  recommendations: [
    {
      id: 'rec-edu-001',
      priority: 'high',
      category: 'training',
      action: 'Conduct OWASP Top 10 workshop',
      rationale: 'Address security knowledge gaps',
      effort: 'low',
      impact: 'high'
    }
  ],
  contextsUsed: {
    deepwiki: true,
    tools: [],
    vectorDb: true,
    crossRepo: true
  },
  duration: 1200,
  timestamp: new Date().toISOString(),
  roleSpecificData: {
    learningPaths: [
      {
        topic: 'Secure Coding Practices',
        duration: '2 hours',
        modules: ['Input Validation', 'SQL Injection Prevention']
      }
    ],
    resources: [
      {
        type: 'documentation',
        title: 'OWASP SQL Injection Prevention',
        url: 'https://owasp.org/...'
      }
    ]
  }
};
