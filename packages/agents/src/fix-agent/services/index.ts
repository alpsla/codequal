/**
 * Fix Agent Services Index
 *
 * Exports all service classes and singleton instances for fix report management.
 */

export { FixReportService, fixReportService } from './fix-report-service';

// PRO Tier Report Generation
export {
  PROReportGenerator,
  createPROReportGenerator,
  generatePROReport,
  applyPROSelection,
  type PROUserSelection,
  type PROReportOutput,
  type UnfixableExplanation,
  type UnfixableReason,
  type SelectionOption,
  type CommitPreview,
} from './pro-report-generator';

// Framework Issue Classification
export {
  FrameworkIssueClassifier,
  createFrameworkIssueClassifier,
  classifyIssuesForFramework,
  type RawIssue,
  type ClassificationOptions,
} from './framework-issue-classifier';

// PRO Tier Setup Prompt
export {
  PROTierSetupPromptService,
  createPROTierSetupPrompt,
  analyzeAndPromptForSetup,
  getSetupStatus,
  type UserTierChoice,
  type SetupPromptResult,
  type SetupPromptContent,
} from './pro-tier-setup-prompt';
