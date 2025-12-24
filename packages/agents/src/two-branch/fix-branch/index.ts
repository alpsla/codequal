/**
 * Fix Branch Module
 *
 * Creates a new git branch with all applicable fixes from CodeQual analysis.
 * This provides a safe way for users to review and merge fixes without
 * automatic changes to their PR.
 *
 * Features:
 * - Collects fixes from all tiers (native, dedicated, cloud API, pattern, AI)
 * - Categorizes by confidence and criticality
 * - Creates new branch with applied fixes
 * - Generates review document (CODEQUAL_FIXES.md)
 * - Provides recommendations for unfixable issues
 *
 * Usage:
 *   import { FixBranchOrchestrator } from './fix-branch';
 *
 *   const orchestrator = new FixBranchOrchestrator({
 *     repoUrl: 'https://github.com/org/repo',
 *     prNumber: 123,
 *     workingDir: '/tmp/repo',
 *     currentBranch: 'feature/my-pr'
 *   });
 *
 *   // Register tier-specific fixers
 *   orchestrator.registerTier1Fixer(async (batch) => { ... });
 *   orchestrator.registerTier2_5Fixer(async (issues) => { ... });
 *
 *   // Orchestrate
 *   const result = await orchestrator.orchestrate(issues);
 *
 * @since Session 60
 */

// Main Orchestrator - integrates fix-agent with fix-branch
export {
  FixBranchOrchestrator,
  FixBranchOrchestrationConfig,
  FixOrchestrationResult,
  TierFixerCallback,
  PatternLookupResult,
  PatternStoreCallback,
  createFixBranchOrchestrator
} from './fix-branch-orchestrator';

// Branch Generator
export { FixBranchGenerator, FixBranchConfig, FixBranchResult } from './fix-branch-generator';

// Fix Applicator
export { FixApplicator, ApplyResult, FixApplication, ApplyOptions } from './fix-applicator';

// Review Document Generator
export { ReviewDocumentGenerator, ReviewDocument, ReviewDocumentOptions } from './review-document-generator';

// Fix Collector
export { FixCollector, CollectedFixes, FixSource, RawFix } from './fix-collector';

// Fix Categorizer
export {
  FixConfidenceCategory,
  FixTier,
  CategorizedFix,
  FixRecommendation,
  categorizeByConfidence,
  isReviewRequired,
  generateReviewNotes,
  getUnfixableReason,
  getCategoryEmoji,
  CRITICAL_CATEGORIES,
  SAFE_CATEGORIES
} from './fix-categorizer';

// Fix Verifier - Re-scans to confirm fixes work
export {
  FixVerifier,
  FixVerificationResult,
  BatchVerificationResult,
  ToolScannerCallback,
  VerificationOptions,
  createFixVerifier
} from './fix-verifier';

// Unfixed Issue Handler - Communicates failures to users
export {
  UnfixedIssueHandler,
  UnfixedIssue,
  UnfixedReason,
  UnfixedSummary,
  AuthorAction,
  createUnfixedIssueHandler
} from './unfixed-issue-handler';
