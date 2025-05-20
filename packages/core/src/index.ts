/**
 * Core Module
 * 
 * Export all core modules for use in other packages
 */

// Logging
export * as logging from './utils/logger';

// DeepWiki Integration
export * as deepwiki from './deepwiki';

// Re-export types directly from their respective files
export { 
  Agent, 
  AnalysisResult, 
  Insight, 
  Suggestion, 
  EducationalContent, 
  Resource 
} from './types/agent';

export {
  RepositoryContext,
  AnalysisResultType,
  AnalysisSeverity,
  PullRequestContext,
  PRFile,
  RepositoryType
} from './types/repository';

export * from './types/evaluation';

// Export model selection types
export {
  ModelTier,
  RepositorySizeCategory,
  TestingStatus,
  ModelCapabilities,
  ModelPricing,
  ModelVersionInfo
} from './services/model-selection/ModelVersionSync';

export {
  RepositoryModelConfig
} from './config/models/repository-model-config';

// Other non-overlapping exports
export * from './services/model-selection';
export * from './config/models/model-versions';

// Services
export * from './services/pr-review-service';

// Other core modules will be exported here as they are added
