/**
 * Provider Adapters Index
 *
 * Universal interface for delivering fix reports to different consumers.
 * The FixReport is the single source of truth - providers adapt it for their context.
 *
 * Supported Providers:
 * - Web: Interactive UI for reviewing and selecting fixes
 * - API: JSON API for programmatic access
 * - CI/CD: GitHub Actions, GitLab CI, Azure Pipelines
 * - IDE: VSCode, Cursor, JetBrains via LSP
 *
 * User Selection Options:
 * - SelectionMode: all_fixable, by_severity, by_category, specific_issues, review_each
 * - CommitStyle: single, grouped, per_file, per_issue
 */

// Types and Interfaces
export {
  // Core interfaces
  IProviderAdapter,
  ProviderOptions,
  ProviderOutput,

  // Universal data structures
  UniversalFixData,
  UniversalIssue,
  IssueGroupData,

  // Provider-specific outputs
  WebProviderOutput,
  APIProviderOutput,
  CICDProviderOutput,
  IDEProviderOutput,

  // Web types
  WebAction,

  // CI/CD types
  GithubAnnotation,

  // IDE types
  LSPCodeAction,
  LSPBatchAction,
  LSPDiagnostic,
  LSPWorkspaceEdit,
  LSPPosition,
  LSPTextEdit,

  // User selection types
  UserFixSelection,
  ApplyFixesResult,

  // Utility functions
  buildUniversalFixData,
} from './provider-adapter';

// Provider implementations
export { WebProvider, createWebProvider } from './web-provider';
export { IDEProvider, createIDEProvider } from './ide-provider';
export { CICDProvider, createCICDProvider } from './cicd-provider';

// ============================================================================
// Dedicated Output Format Generators
// ============================================================================

// SARIF Generator - GitHub Code Scanning
export {
  SARIFGenerator,
  createSARIFGenerator,
  generateSARIF,
  generateSARIFToFile,
  type SARIFGeneratorConfig,
  type SARIFReport,
  type SARIFRun,
  type SARIFRule,
  type SARIFResult,
  type SARIFLocation,
  type SARIFFix,
  type SARIFLevel,
} from './sarif-generator';

// GitLab Code Quality Generator
export {
  GitLabCodeQualityGenerator,
  createGitLabCodeQualityGenerator,
  generateGitLabCodeQuality,
  generateGitLabCodeQualityToFile,
  generateGitLabCIJobConfig,
  type GitLabCodeQualityConfig,
  type GitLabCodeQualityIssue,
  type GitLabSeverity,
  type GitLabCategory,
} from './gitlab-codequality-generator';

// Fix Summary Generator - User-facing reports (Markdown, HTML, JSON)
export {
  FixSummaryGenerator,
  createFixSummaryGenerator,
  generateFixSummaryMarkdown,
  generateFixSummaryHTML,
  generateFixSummaryJSON,
  type FixSummaryConfig,
  type FixSummaryStats,
  type FixSummaryReport,
  type ManualReviewGuidance,
  type CodeQualFixOptions,
} from './fix-summary-generator';

// ============================================================================
// Factory Functions
// ============================================================================

import { IProviderAdapter } from './provider-adapter';
import { WebProvider } from './web-provider';
import { IDEProvider } from './ide-provider';
import { CICDProvider } from './cicd-provider';

/**
 * Provider type enumeration
 */
export type ProviderType = 'web' | 'api' | 'cicd' | 'ide';

/**
 * Create a provider adapter based on type
 */
export function createProvider(type: ProviderType): IProviderAdapter {
  switch (type) {
    case 'web':
      return new WebProvider();
    case 'api':
      return new WebProvider(); // API uses same data structure as Web
    case 'cicd':
      return new CICDProvider();
    case 'ide':
      return new IDEProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Get all available provider types
 */
export function getAvailableProviders(): ProviderType[] {
  return ['web', 'api', 'cicd', 'ide'];
}

// ============================================================================
// Quick Access Functions
// ============================================================================

import {
  FixReport,
  FixReportIssue,
} from '../types/fix-report-types';
import { UniversalFixData, UserFixSelection, ApplyFixesResult } from './provider-adapter';

/**
 * Generate universal fix data from a fix report
 * This is the primary entry point for all providers
 */
export async function generateFixData(
  report: FixReport,
  issues: FixReportIssue[]
): Promise<UniversalFixData> {
  const { buildUniversalFixData } = await import('./provider-adapter');
  return buildUniversalFixData(report, issues);
}

/**
 * Generate output for a specific provider
 */
export async function generateProviderOutput(
  type: ProviderType,
  report: FixReport,
  issues: FixReportIssue[],
  options?: Record<string, unknown>
): Promise<ReturnType<IProviderAdapter['generateOutput']>> {
  const provider = createProvider(type);
  return provider.generateOutput(report, issues, options);
}

/**
 * Apply user selection using a specific provider
 */
export async function applyUserSelection(
  type: ProviderType,
  report: FixReport,
  issues: FixReportIssue[],
  selection: UserFixSelection
): Promise<ApplyFixesResult> {
  const provider = createProvider(type);
  return provider.applySelection(report, issues, selection);
}
