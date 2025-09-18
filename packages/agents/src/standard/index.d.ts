/**
 * Standard Framework Exports
 *
 * Main entry point for the Standard framework components
 */
export { ComparisonOrchestrator } from './orchestrator/comparison-orchestrator';
export { ModelResearcherService } from '../two-branch/research-services/model-researcher-service';
export { StandardAgentFactory, createTestOrchestrator, MockConfigProvider, MockSkillProvider, MockDataStore } from './infrastructure/factory';
export { ComparisonAgent } from './comparison/comparison-agent';
export { ReportGeneratorV8Final as ReportGenerator } from './comparison/report-generator-v8-final';
export { ReportGeneratorV8Final } from './comparison/report-generator-v8-final';
export { SkillCalculator } from './comparison/skill-calculator';
export * from './types/analysis-types';
export type { IConfigProvider, AnalysisConfig, ModelSelection, CategoryWeights } from './orchestrator/interfaces/config-provider.interface';
export type { ISkillProvider, SkillUpdate, TeamSkills, HistoryParams, SkillHistory, CategoryScores } from './orchestrator/interfaces/skill-provider.interface';
export type { IDataStore, AnalysisReport } from './services/interfaces/data-store.interface';
export type { ILogger } from './services/interfaces/logger.interface';
export * from './comparison/interfaces/comparison-agent.interface';
