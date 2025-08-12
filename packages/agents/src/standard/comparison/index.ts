/**
 * Comparison Module Exports
 */

export { ComparisonAgent } from './comparison-agent';
export { ReportGeneratorV7EnhancedComplete as ReportGenerator } from './report-generator-v7-enhanced-complete';
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