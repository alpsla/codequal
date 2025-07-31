/**
 * Comparison Agent Module
 * 
 * Exports all components related to comparison analysis
 */

// Export the main comparison agent (logic-based)
export { ComparisonAgent } from './comparison-agent';
export type { ComparisonAgentInput } from './comparison-agent';

// Export the AI-powered comparison agent
export { AIComparisonAgent } from './ai-comparison-agent';
export type { AIComparisonInput, AIComparisonConfig, AIComparisonAnalysis } from './ai-comparison-agent';

// Export supporting components
export { RepositoryAnalyzer } from './repository-analyzer';
export { SkillTracker, SkillProfile } from './skill-tracker';
export { ComparisonReportGenerator } from './report-generator';

// Export types (avoid conflicts by explicit exports)
export type { 
  ComparisonAnalysis,
  RepositoryAnalysis,
  EducationalRecommendation,
  BaseComparisonInput 
} from './types';