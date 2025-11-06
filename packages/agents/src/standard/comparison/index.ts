/**
 * Comparison Module Exports
 */

// NOTE: ComparisonAgent, ComparisonAgentProduction, and ReportGeneratorV8Final have been removed
// These were part of the deprecated Standard framework
// Use V9 production architecture instead

// Skill calculator still available
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