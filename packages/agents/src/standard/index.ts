/**
 * Standard Framework Exports
 * 
 * Main entry point for the Standard framework components
 * NOTE: Many legacy components have been removed. Use V9 architecture instead.
 */

// NOTE: ComparisonOrchestrator has been removed - use V9PRAnalyzer instead

// Services
// The codebase uses MCP tools and the two-branch analysis system

// Model Research Service
export { ModelResearcherService } from '../two-branch/research-services/model-researcher-service';

// Factory (many methods deprecated - see factory.ts)
export { 
  StandardAgentFactory,
  MockConfigProvider,
  MockSkillProvider,
  MockDataStore
} from './infrastructure/factory';

// Note: createTestOrchestrator is deprecated and no longer exported

// NOTE: ComparisonAgent has been removed - use V9 architecture

// NOTE: ReportGeneratorV8Final has been removed - use V9 report generation

// V7 generators have been removed - use V8 only

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

// DeepWiki API interface (stub for backward compatibility)
export interface IDeepWikiApi {
  analyze(repoUrl: string, options?: any): Promise<any>;
}