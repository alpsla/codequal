/**
 * Comparison Module Exports
 */

export { ComparisonAgent } from './comparison-agent';
export { ComparisonAgentProduction } from './comparison-agent-production';

// V8 is the current report generator
export { ReportGeneratorV8Final as ReportGenerator } from './report-generator-v8-final';

// V7 generators have been removed - use V8 only
// Files archived to archived/v7-deprecated/
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