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
export type { 
  Agent, 
  AnalysisResult, 
  Insight, 
  Suggestion, 
  EducationalContent, 
  Resource 
} from './types/agent';

export type {
  RepositoryContext,
  AnalysisResultType,
  AnalysisSeverity,
  PullRequestContext,
  PRFile,
  RepositoryType
} from './types/repository';

export * from './types/evaluation';

// Export model selection types from ModelVersionSync
// These exports avoid duplicating types from repository-model-config.ts
export type {
  ModelTier,
  ModelCapabilities,
  ModelPricing,
  ModelVersionInfo,
  ModelProviderPlugin,
} from './services/model-selection/ModelVersionSync';

// Export regular exports from ModelVersionSync
export {
  ModelVersionSync,
  createDeepWikiModelConfig
} from './services/model-selection/ModelVersionSync';

// Export repository model config types
export type {
  RepositorySizeCategory,
  TestingStatus,
  RepositoryModelConfig,
  RepositoryProvider,
  ProviderModelConfig,
  ModelTestResults
} from './config/models/repository-model-config';

// Export model version constants
export * from './config/models/model-versions';

// Export model selection services
export * from './services/model-selection/RepositoryModelSelectionService';
export * from './services/model-selection/RepositoryCalibrationService';
export * from './services/model-selection/ModelConfigStore';

// Services
export * from './services/pr-review-service';

// Vector Database Configuration
export * from './config/vector-database.config';

// Other core modules will be exported here as they are added
