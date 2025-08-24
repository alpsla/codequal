/**
 * Core Module
 *
 * Export all core modules for use in other packages
 */
export * as logging from './utils/logger';
export { createLogger } from './utils/logger';
export type { Logger } from './utils/logger';
export * as deepwiki from './deepwiki';
export type { Agent, AnalysisResult, Insight, Suggestion, EducationalContent, Resource } from './types/agent';
export type { RepositoryContext, AnalysisResultType, AnalysisSeverity, PullRequestContext, PRFile, RepositoryType } from './types/repository';
export * from './types/evaluation';
export type { ModelTier, ModelCapabilities, ModelPricing, ModelVersionInfo, ModelProviderPlugin, } from './services/model-selection/ModelVersionSync';
export { ModelVersionSync, createDeepWikiModelConfig } from './services/model-selection/ModelVersionSync';
export type { RepositorySizeCategory, TestingStatus, RepositoryModelConfig, RepositoryProvider } from './config/models/repository-model-config';
export * from './config/models/model-versions';
export * from './services/model-selection/RepositoryModelSelectionService';
export * from './services/model-selection/RepositoryCalibrationService';
export * from './services/model-selection/ModelConfigStore';
export { AgentProvider, AgentRole, type AgentSelection } from './config/agent-registry';
export * from './services/pr-review-service';
export * from './monitoring/production-monitoring';
export * from './monitoring/enhanced-monitoring-service';
export * from './monitoring/supabase-alert-storage';
export * from './auth/system-auth';
export type { AuthenticatedUser } from './services/rag/authenticated-rag-service';
