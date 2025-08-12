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
export { ComparisonAgentComplete } from './comparison/comparison-agent-complete';
export { ComparisonAgentStandalone } from './comparison/comparison-agent-standalone';
export { ReportGeneratorV7Fixed as ReportGenerator } from './comparison/report-generator-v7-fixed';
// export { ReportGeneratorV7 } from './comparison/report-generator-v7'; // File doesn't exist
export { ReportGeneratorV7Fixed } from './comparison/report-generator-v7-fixed';
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