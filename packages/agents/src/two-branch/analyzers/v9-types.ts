/**
 * V9 Analyzer Shared Types
 * 
 * Common type definitions used across all V9 analyzer modules
 */

// Issue categorization types
export type IssueCategory = 'Security' | 'Performance' | 'Architecture' | 'Dependency' | 'Quality';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueStatus = 'new' | 'existing' | 'resolved';

// Core issue interface
export interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  description: string;
  file: string;
  line: number;
  tool: string;
  agent: string;
  impact: string;
  businessImpact: string;
  codeSnippet?: string;
  suggestedFix?: string;
  suggestedCodeSnippet?: string;
  inModifiedFile?: boolean;
}

// Tool configuration
export interface ToolConfig {
  name: string;
  command: string;
  agent: string;
  supportsFileList?: boolean;
  parser: (output: string, workspacePath: string) => Promise<Issue[]>;
}

// Language configuration
export interface LanguageConfig {
  name: string;
  fileExtensions: string[];
  tools: ToolConfig[];
  suggestedFixPatterns: Record<string, string>;
}

// Business impact analysis
export interface BusinessImpact {
  summary: string;
  immediateRisk: string;
  futureRisk: string;
  financialImpact: {
    fixCost: string;
    exploitCost: string;
    roi: string;
  };
  riskMatrix: {
    category: string;
    blockingRisk: number;
    backlogRisk: number;
    score: string;
  }[];
}

// Developer skill tracking
export interface SkillScore {
  developer: string;
  score: number;
  trend: number[];
  categories: {
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    quality: number;
  };
  recommendations: string[];
}

// Analysis metadata
export interface AnalysisMetadata {
  repository: string;
  prNumber: number;
  branch: string;
  language: string;
  totalFiles: number;
  modifiedFiles: number;
  analysisTime: number;
  tools: string[];
  timestamp: string;
}

// Complete analysis result
export interface AnalysisResult {
  decision: 'approved' | 'rejected';
  confidence: number;
  reason: string;
  qualityScore: number;
  grade: string;
  newIssues: Issue[];
  existingIssues: Issue[];
  resolvedIssues: Issue[];
  blockingIssues: Issue[];
  backlogIssues: Issue[];
  modifiedFiles: string[];
  businessImpact: BusinessImpact;
  skillScore: SkillScore;
  educationalResources?: EducationalResource[];
  metadata: AnalysisMetadata & {
    analyzedAt: string;
    analyzer: string;
    repoUrl: string;
    executionTime: number;
    model?: any;
  };
}

// Educational resource
export interface EducationalResource {
  type: 'documentation' | 'tutorial' | 'example' | 'video';
  title: string;
  url: string;
  description: string;
}

// Grouped issues for training
export interface IssueGroup {
  pattern: string;
  issues: Issue[];
  count: number;
  training?: EducationalResource[];
}

// Model configuration from Supabase
export interface ModelConfig {
  id: string;
  agent_name: string;
  language: string;
  model_id: string;
  provider: string;
  temperature: number;
  max_tokens: number;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  last_updated: string;
}

// Scoring configuration
export interface ScoringConfig {
  weights: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  passingScore: number;
  gradeThresholds: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

// Report formatting options
export interface ReportOptions {
  format: 'markdown' | 'html' | 'json';
  includeCodeSnippets: boolean;
  includeEducationalResources: boolean;
  includeBusinessImpact: boolean;
  includeSkillScore: boolean;
  groupSimilarIssues: boolean;
}