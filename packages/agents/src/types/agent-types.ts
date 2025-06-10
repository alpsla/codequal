// Agent role types
export type AgentRole = 
  | 'orchestrator'
  | 'security' 
  | 'codeQuality'
  | 'architecture'
  | 'performance'
  | 'dependency'
  | 'educational'
  | 'reporting';

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
