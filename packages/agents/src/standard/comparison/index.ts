/**
 * Comparison Module Exports
 */

export { ComparisonAgent } from './comparison-agent';
export { ComparisonAgentProduction } from './comparison-agent-production';
export { ReportGeneratorV7EnhancedComplete as ReportGenerator } from './report-generator-v7-enhanced-complete';
export { ReportGeneratorV7Fixed } from './report-generator-v7-fixed';
export { SkillCalculator } from './skill-calculator';
export type {
  IComparisonAgent,
  IReportingComparisonAgent,
  AIComparisonAnalysis,
  ComparisonIssue,
  ModifiedIssue,
  SeverityBreakdown
} from './interfaces/comparison-agent.interface';
export type {
  SkillAdjustment,
  SkillUpdate
} from './skill-calculator';