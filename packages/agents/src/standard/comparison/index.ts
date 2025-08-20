/**
 * Comparison Module Exports
 */

export { ComparisonAgent } from './comparison-agent';
export { ComparisonAgentProduction } from './comparison-agent-production';

// V8 is the current report generator
export { ReportGeneratorV8Final as ReportGenerator } from './report-generator-v8-final';

// DEPRECATED: V7 generators - DO NOT USE
// These exports are maintained temporarily for backward compatibility only
// See DEPRECATED_V7_WARNING.md for migration instructions
export { ReportGeneratorV7EnhancedComplete } from './report-generator-v7-enhanced-complete'; // @deprecated
export { ReportGeneratorV7Fixed } from './report-generator-v7-fixed'; // @deprecated
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