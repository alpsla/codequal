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
  // SESSION 19 FIX: Add rule and cwe fields for compatibility with RawIssue
  rule?: string;  // Specific rule ID (e.g., "java.lang.security.audit.sql-injection")
  cwe?: string;   // CWE identifier
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
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
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
  decision: 'APPROVED' | 'DECLINED';
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
  // NEW: Category-specific scores for V9 reporting
  categoryScores?: Record<string, number>;
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

// Two-branch analysis types
export interface ToolPerformance {
  name: string;
  executionTime: string;
  issuesFound: number;
  filesAnalyzed?: number;
}

export interface BranchAnalysis {
  branch: string;
  issues: Issue[];
  filesAnalyzed: number;
  executionTime: number;
  toolPerformance: ToolPerformance[];
}

export interface IssueComparison {
  newIssues: Issue[];
  existingInModified: Issue[];
  existingInUnmodified: Issue[];
  resolvedIssues: Issue[];
}

export interface ExecutionMetadata {
  totalExecutionTime: number;
  mainBranchIssueCount: number;
  prBranchIssueCount: number;
  modifiedFiles: string[];
  toolsUsed: string[];
  modelsUsed: Array<{
    agent: string;
    model: string;
    provider: string;
  }>;
  totalCost: number;
}

export interface TwoBranchAnalysisResult {
  repository: string;
  prNumber: number;
  language: string;
  mainBranchAnalysis: BranchAnalysis;
  prBranchAnalysis: BranchAnalysis;
  comparison: IssueComparison;
  decision: 'APPROVED' | 'DECLINED';
  decisionReason: string;
  qualityScore: number;
  prComment: string;
  metadata: ExecutionMetadata;
}

// ============================================================
// SESSION 112 - REPORT UI DATA STRUCTURES
// ============================================================

/**
 * Report tier - distinguishes BASIC vs PRO reports
 */
export type ReportTier = 'basic' | 'pro';

/**
 * Fix summary for PRO tier reports
 * Shows what was fixed and by which tier
 */
export interface FixSummary {
  overview: {
    totalAttempted: number;
    totalSuccessful: number;
    totalRequiringReview: number;
    totalRolledBack: number;
    successRate: number;
  };
  byTier: {
    tier: 'tier1_native' | 'tier2_dedicated' | 'tier3_ai';
    description: string;
    count: number;
    cost: number;
    duration: number;
  }[];
  byRule: {
    ruleId: string;
    count: number;
    tier: string;
    tool: string;
    files: string[];
  }[];
}

/**
 * Commit info for PRO tier (after fixes applied)
 */
export interface CommitInfo {
  branch: string;
  commitSha: string;
  filesModified: number;
  changedFiles: {
    path: string;
    additions: number;
    deletions: number;
  }[];
  timestamp: string;
}

/**
 * Gamification - XP system
 */
export interface XPData {
  earned: number;          // XP earned in this PR
  total: number;           // Cumulative XP
  toNextLevel: number;     // XP needed for next level
  level: number;           // Current level (1-10+)
  levelName: string;       // Level name (e.g., "Apprentice", "Expert")
}

/**
 * Gamification - Badge/Achievement
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;       // 0-100 for partial progress
  requirement: string;
}

/**
 * Structured author action for unfixed issues
 */
export interface AuthorAction {
  type: 'review_and_fix' | 'investigate' | 'refactor' | 'upgrade_dependency' | 'accept_risk';
  description: string;
  steps: string[];
  blocksMerge: boolean;
  estimatedEffort: 'trivial' | 'minor' | 'moderate' | 'significant';
}

/**
 * Extended unfixed issue with structured guidance
 */
export interface UnfixedIssueDetail {
  issueId: string;
  ruleId: string;
  tool: string;
  file: string;
  line: number;
  severity: IssueSeverity;
  reason: string;             // Why not fixed
  explanation: string;        // Human-readable explanation
  authorAction: AuthorAction;
  reviewPriority: 'critical' | 'high' | 'medium' | 'low';
  documentationLinks?: string[];
}

/**
 * User rank title based on strengths
 */
export type UserRankTitle =
  | 'Security Champion'
  | 'Performance Expert'
  | 'Architecture Master'
  | 'Dependency Guardian'
  | 'Quality Advocate'
  | 'Rising Star'
  | 'Full Stack Guardian';

/**
 * Community impact for BASIC tier (opt-in sharing)
 */
export interface CommunityImpactBasic {
  patternsAvailable: number;       // Patterns user could share
  potentialImpact: number;         // Est. developers who could benefit
  sharePromptShown: boolean;       // Track if user saw prompt
}

/**
 * Enhanced analysis metadata with tier
 */
export interface EnhancedAnalysisMetadata extends AnalysisMetadata {
  tier: ReportTier;
  fixSummary?: FixSummary;
  commitInfo?: CommitInfo;
}

/**
 * Enhanced skill score with gamification
 */
export interface EnhancedSkillScore extends SkillScore {
  xp: XPData;
  badges: Badge[];
  rankTitle: UserRankTitle;
}