/**
 * Type definitions for DeepWiki simplified implementation
 */

export interface DeepWikiIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
  cwe?: {
    id: string;
    name: string;
  };
  cvss?: {
    score: number;
    vector: string;
  };
  impact?: string;
  evidence?: {
    snippet: string;
  };
  remediation?: {
    immediate: string;
    steps: string[];
  };
}

export interface DeepWikiRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact?: string;
  effort?: string;
  estimated_hours?: number;
  steps?: string[];
}

export interface DeepWikiScores {
  overall: number;
  security: number;
  performance: number;
  maintainability: number;
  [key: string]: number;
}

export interface DeepWikiMetadata {
  analyzed_at: Date;
  duration_ms: number;
  commit_hash?: string;
  branch?: string;
  files_analyzed?: number;
  language_breakdown?: Record<string, number>;
  languages?: Record<string, number>;
  quality_metrics?: {
    cyclomatic_complexity: number;
    cognitive_complexity: number;
    maintainability_index: number;
  };
  test_coverage?: number;
  dependencies?: {
    total: number;
    direct: number;
    vulnerable: number;
    outdated: number;
    deprecated: number;
  };
  model_used?: string;
  error?: string;
}

export interface DeepWikiAnalysisResult {
  repository_url: string;
  analysis_id: string;
  issues: DeepWikiIssue[];
  recommendations: DeepWikiRecommendation[];
  scores: DeepWikiScores;
  metadata: DeepWikiMetadata;
  statistics?: {
    files_analyzed: number;
    total_issues: number;
    issues_by_severity?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    languages?: Record<string, number>;
  };
  quality?: {
    metrics?: {
      cyclomatic_complexity: number;
      cognitive_complexity: number;
      maintainability_index: number;
    };
    duplicated_lines_percent?: number;
    technical_debt_hours?: number;
  };
  testing?: {
    coverage_percent?: number;
    missing_tests?: number;
  };
}

export interface ActiveAnalysis {
  path: string;
  startTime: number;
  repositoryUrl: string;
  type: 'repository' | 'pr';
}

export interface TempSpaceMetrics {
  totalGB: number;
  usedGB: number;
  availableGB: number;
  percentUsed: number;
  activeAnalyses: number;
  avgAnalysisSizeMB: number;
  maxConcurrentCapacity: number;
  cleanupSuccessCount?: number;
  cleanupFailedCount?: number;
  autoscaleSuccessCount?: number;
  autoscaleFailureCount?: number;
}

export interface EstimateResult {
  queuedAnalyses: number;
  averageSizeGB: number;
  requiredGB: number;
  currentAvailableGB: number;
  canHandleAll: boolean;
  canHandleCount: number;
  needsScaling: boolean;
  suggestedScaleGB?: number;
}

export interface RepositoryAnalysisOptions {
  branch?: string;
  commit?: string;
  depth?: number;
  includeEducational?: boolean;
}

export interface PullRequestAnalysisOptions {
  baseRef?: string;
  headRef?: string;
  includeEducational?: boolean;
}

export interface AnalysisJob {
  jobId: string;
  repositoryUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
}

export interface DiskMetrics {
  usedGB: number;
  availableGB: number;
  percentUsed: number;
}