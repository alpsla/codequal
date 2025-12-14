/**
 * Two-Branch Services - Centralized Export
 * 
 * All service components for two-branch analysis
 */

export { MCPOrchestrationService } from './mcp-orchestration-service';
export type { MCPToolResults, BranchAnalysisOptions } from './mcp-orchestration-service';

export { IssueComparisonService } from './issue-comparison-service';
export type { 
  ComparisonResult,
  GitDiffResult
} from './issue-comparison-service';

export { EnhancedComparisonService } from './enhanced-comparison-service';
export type {
  EnhancedIssue,
  EnhancedComparisonResult,
  SpecializedAgentReports
} from './enhanced-comparison-service';

export { GitDiffService } from './git-diff-service';
export type {
  GitHubPRInfo
} from './git-diff-service';

// V9 Analysis Pipeline - Unified analysis flow for all languages
export {
  V9AnalysisPipeline,
  mergeFixResultsIntoIssues,
  analyzeRepository,
  analyzePR
} from './v9-analysis-pipeline';
export type {
  SupportedLanguage,
  UserTier,
  RepoSize,
  PipelineConfig,
  PipelineProgress,
  PipelineResult
} from './v9-analysis-pipeline';
export { EnrichedIssue } from './v9-analysis-pipeline';