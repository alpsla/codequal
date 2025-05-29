/**
 * Model Selection Services
 * 
 * This module exports the services for selecting optimal models for
 * repository analysis based on context, calibrating untested configurations,
 * managing model configurations, and synchronizing model versions.
 */

export * from './RepositoryModelSelectionService';
// Export specific enums for better compatibility
export { AnalysisTier, ModelSelectionStrategy } from './RepositoryModelSelectionService';
export * from './RepositoryCalibrationService';
export * from './ModelConfigStore';

// Export specific items from ModelVersionSync to avoid naming conflicts
export {
  ModelVersionSync,
  createDeepWikiModelConfig
} from './ModelVersionSync';

// Export types from ModelVersionSync
export type {
  ModelVersionInfo,
  ModelCapabilities,
  ModelPricing,
  ModelTier,
  ModelProviderPlugin
} from './ModelVersionSync';

// Export Dynamic Model Configuration Matrix services
export * from './ModelConfigurationMatrix';
export * from './MatrixBasedOrchestrator';
export * from './ResearchAgent';
export * from './MatrixFiller';
export * from './MaintenanceScheduler';
export * from './PRAnalysisStrategy';
