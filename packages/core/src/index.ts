/**
 * Core Module
 * 
 * Export all core modules for use in other packages
 */

// Logging - temporarily disabled
// export * as logging from './utils';

// DeepWiki Integration - temporarily disabled due to module issues
// export * as deepwiki from './deepwiki';

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

export type { ModelVersion, AgentRoleEvaluationParameters } from './types/evaluation';

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

// Explicitly export model constants for better CI compatibility
export {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  DEEPSEEK_MODELS,
  DEEPSEEK_PRICING,
  GEMINI_MODELS,
  GEMINI_PRICING,
  OPENAI_PRICING,
  OPENROUTER_MODELS,
  MCP_MODELS,
  DEFAULT_MODELS_BY_PROVIDER,
  PREMIUM_MODELS_BY_PROVIDER
} from './config/models/model-versions';

// Export model selection services
export * from './services/model-selection/RepositoryModelSelectionService';
export * from './services/model-selection/RepositoryCalibrationService';
export * from './services/model-selection/ModelConfigStore';

// Explicitly export model selection enums for better CI compatibility
export { AnalysisTier, ModelSelectionStrategy } from './services/model-selection/RepositoryModelSelectionService';

// Services
// export * from './services/pr-review-service'; // Temporarily disabled due to database dependency

// Vector Database Configuration
export * from './config/vector-database.config';

// Explicitly export vector database functions for better CI compatibility
export {
  getVectorConfig,
  getEmbeddingConfig,
  getChunkingConfig,
  getEnhancementConfig,
  getSearchConfig,
  updateEmbeddingModel
} from './config/vector-database.config';

// Config exports
export * from './config/agent-registry';

// Explicitly export agent config for better CI compatibility
export { AgentProvider, AgentRole } from './config/agent-registry';

// Utils
export * from './utils';

// Explicitly export utils for better CI compatibility
export { createLogger } from './utils/logger';
export type { Logger, LoggableData } from './utils/logger';

// Other core modules will be exported here as they are added
