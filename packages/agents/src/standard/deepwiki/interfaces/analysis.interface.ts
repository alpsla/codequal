/**
 * DeepWiki Analysis Interfaces
 */

export interface CodeIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-quality' | 'best-practice' | 'maintainability';
  title: string;
  description: string;
  location: IssueLocation;
  codeSnippet?: string;
  suggestion?: string;
  recommendation?: string;
  confidence: number;
  tags?: string[];
}

export interface IssueLocation {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  functionName?: string;
  className?: string;
}

export interface AnalysisResult {
  repository: string;
  branch: string;
  commit?: string;
  timestamp: Date;
  issues: CodeIssue[];
  scores: QualityScores;
  summary: AnalysisSummary;
  fileStats?: FileStatistics;
  analysisTime?: number;
}

export interface QualityScores {
  overall: number;
  security: number;
  performance: number;
  maintainability: number;
  reliability: number;
  testCoverage?: number;
}

export interface AnalysisSummary {
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  byCategory: Record<string, number>;
}

export interface FileStatistics {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  fileTypes: Record<string, number>;
  largestFile?: string;
  mostIssuesFile?: string;
}

export interface PRAnalysisResult extends AnalysisResult {
  prNumber: number;
  newIssues: CodeIssue[];
  resolvedIssues: CodeIssue[];
  unchangedIssues: CodeIssue[];
  breakingChanges?: string[];
  performanceImpact?: 'positive' | 'neutral' | 'negative';
}