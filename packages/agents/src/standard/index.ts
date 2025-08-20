/**
 * Standard Framework Exports
 * 
 * Main entry point for the Standard framework components
 */

// Orchestrator
export { ComparisonOrchestrator } from './orchestrator/comparison-orchestrator';

// Services
export { 
  DeepWikiService, 
  MockDeepWikiService, 
  createDeepWikiService,
  IDeepWikiService 
} from './services/deepwiki-service';

export {
  registerDeepWikiApi,
  getDeepWikiApi,
  IDeepWikiApi,
  DeepWikiApiWrapper,
  MockDeepWikiApiWrapper
} from './services/deepwiki-api-wrapper';

export { registerRealDeepWikiApi } from './services/register-deepwiki';

// Model Research Service
export { ModelResearcherService } from './services/model-researcher-service';

// Factory
export { 
  StandardAgentFactory,
  createTestOrchestrator,
  MockConfigProvider,
  MockSkillProvider,
  MockDataStore
} from './infrastructure/factory';

// Comparison Agent
export { ComparisonAgent } from './comparison/comparison-agent';
export { ReportGeneratorV7EnhancedComplete as ReportGenerator } from './comparison/report-generator-v7-enhanced-complete';
export { ReportGeneratorV7EnhancedComplete } from './comparison/report-generator-v7-enhanced-complete';
export { SkillCalculator } from './comparison/skill-calculator';

// Types
export * from './types/analysis-types';

// Interfaces - Export specific items to avoid conflicts
export type { 
  IConfigProvider, 
  AnalysisConfig, 
  ModelSelection,
  CategoryWeights 
} from './orchestrator/interfaces/config-provider.interface';

export type { 
  ISkillProvider, 
  SkillUpdate,
  TeamSkills,
  HistoryParams,
  SkillHistory,
  CategoryScores
} from './orchestrator/interfaces/skill-provider.interface';

export type { 
  IDataStore, 
  AnalysisReport 
} from './services/interfaces/data-store.interface';

export type { 
  ILogger 
} from './services/interfaces/logger.interface';

export * from './comparison/interfaces/comparison-agent.interface';