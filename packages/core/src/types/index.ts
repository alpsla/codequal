/**
 * Type exports
 */

// Re-export specific agent types
export type { 
  Agent, 
  AnalysisResult, 
  Insight, 
  Suggestion, 
  EducationalContent, 
  Resource 
} from './agent';

// Re-export specific repository types
export type {
  RepositoryContext,
  AnalysisResultType,
  AnalysisSeverity,
  PullRequestContext,
  PRFile,
  RepositoryType
} from './repository';

// Evaluation types don't overlap with others so we can export all
export * from './evaluation';

// Re-export authentication types
export type {
  AuthenticatedUser,
  UserSkillProfile,
  UserRepository,
  AuthenticatedSearchOptions
} from '../services/rag/authenticated-rag-service';

// Re-export researcher types
export type {
  IResearcherAgent,
  ResearchParams,
  ResearchResult,
  ResearchCapabilities,
  ResearchSchedule
} from './researcher';
