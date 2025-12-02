/**
 * Report Output Module
 *
 * Provides dual output (files + URLs) for CodeQual analysis reports.
 */

export {
  ReportOutputService,
  getReportOutputService,
  generateReportOutputs,
  // Types
  type OutputFormat,
  type DualOutput,
  type ReportOutputConfig,
  type ReportOutputResult,
  type GitLabCodeQualityIssue,
} from './report-output-service';
