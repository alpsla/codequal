/**
 * Type definitions for Two-Branch Analysis System
 */

// ===================================================================
// Core Types
// ===================================================================

export interface FileInfo {
  path: string;
  fullPath: string;
  size: number;
  extension: string;
  content: string;
  language: string;
}

export interface RepositoryInfo {
  url: string;
  owner: string;
  name: string;
  defaultBranch: string;
  clonePath?: string;
}

// ===================================================================
// Issue Types
// ===================================================================

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IssueCategory = 'security' | 'quality' | 'performance' | 'dependency' | 'architecture';
export type IssueStatus = 'new' | 'fixed' | 'unchanged';

export interface ToolIssue {
  // Identification
  id: string;
  fingerprint?: string; // Made optional for initial creation
  
  // Source
  tool: string | ToolName;
  toolVersion?: string;
  ruleId: string;
  category: IssueCategory;
  
  // Location
  file: string;
  startLine: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  
  // Details
  severity: IssueSeverity;
  message: string;
  details?: string;
  
  // Code context
  codeSnippet?: string;
  suggestion?: string;
  documentation?: string;
  
  // Metadata
  metadata?: {
    confidence?: number;
    likelihood?: string;
    impact?: string;
  };
  confidence?: number;
  falsePositive?: boolean;
  tags?: string[];
}

export interface EnhancedIssue extends ToolIssue {
  status: IssueStatus;
  
  // For new issues
  impact?: 'breaking' | 'degrading' | 'minor';
  introducedBy?: CommitInfo;
  requiresAction?: boolean;
  blocksPR?: boolean;
  
  // For fixed issues
  fixedBy?: CommitInfo;
  fixQuality?: 'complete' | 'partial' | 'workaround';
  credit?: number;
  
  // For unchanged issues
  age?: string;
  occurrences?: number;
  previousAttempts?: FixAttempt[];
  
  // AI enhancements
  recommendation?: string;
  explanation?: string;
  priority?: number;
  estimatedEffort?: 'minutes' | 'hours' | 'days';
}

// ===================================================================
// Analysis Types
// ===================================================================

export interface BranchAnalysisResult {
  branch: string;
  commitHash: string;
  repositoryUrl?: string;
  files: number;
  tools: number;
  issues: ToolIssue[];
  metrics: BranchMetrics;
  timestamp: Date;
  metadata?: {
    owner?: string;
    repo?: string;
    prNumber?: number;
  };
  cached?: boolean;
}

export interface ComparisonResult {
  newIssues: EnhancedIssue[];
  fixedIssues: EnhancedIssue[];
  unchangedIssues: EnhancedIssue[];
  metrics: AnalysisMetrics;
  trends?: TrendAnalysis;
}

export interface PRAnalysisReport {
  repository: string;
  prNumber: number;
  title?: string;
  author?: string;
  baseBranch: string;
  headBranch: string;
  
  newIssues: EnhancedIssue[];
  fixedIssues: EnhancedIssue[];
  unchangedIssues: EnhancedIssue[];
  
  metrics: AnalysisMetrics;
  summary: ExecutiveSummary;
  
  generatedAt: Date;
  version: string;
}

// ===================================================================
// Tool Types
// ===================================================================

export type ToolName = 
  | 'eslint'
  | 'semgrep'
  | 'npm-audit'
  | 'gitleaks'
  | 'trufflehog'
  | 'dependency-check'
  | 'bandit'
  | 'safety'
  | 'cargo-audit'
  | 'gosec'
  | 'checkov'
  | 'sonarjs'
  | 'madge'
  | 'dependency-cruiser'
  | 'complexity-report'
  | 'lighthouse'
  | 'webpack-analyzer';

// ===================================================================
// Metrics Types
// ===================================================================

export interface BranchMetrics {
  totalIssues: number;
  bySeverity: Record<IssueSeverity, number>;
  byCategory: Record<IssueCategory, number>;
  byTool: Record<string, number>;
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  categoryDistribution: Record<IssueCategory, number>;
  issuesPerFile: number;
  criticalityScore: number;
  duration: number;
  analyzedFiles: number;
}

export interface AnalysisMetrics {
  total: number;
  new: number;
  fixed: number;
  unchanged: number;
  
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  
  byCategory: Record<IssueCategory, number>;
  byTool: Record<string, number>;
  
  scores: {
    overall: number;      // 0-100
    security: number;     // 0-100
    quality: number;      // 0-100
    performance?: number; // 0-100
  };
  
  improvement: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrendAnalysis {
  improvementRate: number;
  fixVelocity: number;
  newIssueRate: number;
  predictedCompletion?: string;
}

// ===================================================================
// Tool Types
// ===================================================================

export interface ToolConfig {
  id: string;
  name?: string;
  priority: number;
  enabled: boolean;
  timeout?: number;
  retries?: number;
}

export interface ToolOutput {
  toolId: string;
  success: boolean;
  findings?: any[];
  metrics?: Record<string, any>;
  error?: string;
  executionTime?: number;
}

export interface ToolResult {
  tool: string;
  status: 'success' | 'failure' | 'timeout' | 'skipped';
  findings: ToolFinding[];
  metadata?: {
    executionTime: number;
    filesAnalyzed: number;
    version?: string;
  };
}

export interface ToolFinding {
  ruleId?: string;
  rule?: string;
  file?: string;
  path?: string;
  line?: number;
  startLine?: number;
  endLine?: number;
  column?: number;
  severity?: string;
  message?: string;
  description?: string;
  code?: string;
  snippet?: string;
  fix?: string;
  suggestion?: string;
}

// ===================================================================
// Cache Types
// ===================================================================

export interface CacheConfig {
  redisUrl?: string;
  ttl?: number;
  keyPrefix?: string;
  enableMetrics?: boolean;
  maxMemoryCacheSize?: number;
  compressionThreshold?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  avgHitTime: number;
  avgMissTime: number;
  memoryFallbacks: number;
  compressionSaves: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl?: number;
  hits?: number;
}

// ===================================================================
// GitHub Types
// ===================================================================

export interface PRInfo {
  repository: string;
  number: number;
  title: string;
  author: string;
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  state: 'open' | 'closed' | 'merged';
  createdAt: Date;
  updatedAt: Date;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: Date;
}

export interface FixAttempt {
  date: Date;
  commit: string;
  successful: boolean;
  notes?: string;
}

// ===================================================================
// Service Types
// ===================================================================

export interface AnalysisOptions {
  skipCache?: boolean;
  tools?: string[];
  timeout?: number;
  parallel?: boolean;
  includeAI?: boolean;
}

export interface ExecutiveSummary {
  headline: string;
  keyFindings: string[];
  recommendations: string[];
  riskAssessment: string;
  nextSteps: string[];
}

// ===================================================================
// Error Types
// ===================================================================

export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class CacheError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'CacheError';
  }
}

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public tool: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}