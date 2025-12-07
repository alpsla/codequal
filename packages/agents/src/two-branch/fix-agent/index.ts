/**
 * Fix Agent Module
 *
 * Three-Tier Auto-Fix System for CodeQual.
 *
 * Architecture:
 * - Tier 1: Native tool fixes (eslint --fix, ruff --fix, etc.)
 * - Tier 2: Dedicated fixer tools (Sorald, pyupgrade, etc.)
 * - Tier 3: AI-generated fixes (fallback when no tool support)
 *
 * Usage:
 *   import { fixRouter, issueClassifier, toolFixRegistry } from './fix-agent';
 *
 *   // Route issues to appropriate fixer
 *   const result = fixRouter.routeAndBatch(issues);
 *
 *   // Get execution plan (ordered by speed)
 *   const plan = fixRouter.getExecutionPlan(result);
 *
 *   // Execute fixes (implementation in tool-fixers/)
 *   for (const batch of plan) {
 *     await executeBatch(batch);
 *   }
 */

// Tool Fix Registry - defines which tools support auto-fix
export {
  ToolFixRegistry,
  toolFixRegistry,
  FixTier,
  ToolFixCapability,
  TIER1_NATIVE_FIXERS,
  TIER2_DEDICATED_FIXERS,
  TIER3_AI_REQUIRED,
} from './tool-fix-registry';

// Issue Classifier - maps rule IDs to issue types
export {
  IssueClassifier,
  issueClassifier,
  IssueType,
  ClassifiedIssue,
} from './issue-classifier';

// Fix Router - routes issues to appropriate tier
export {
  FixRouter,
  fixRouter,
  IssueToFix,
  FixRoute,
  FixBatch,
  RoutingResult,
} from './fix-router';

/**
 * Quick classification example:
 *
 * ```typescript
 * import { issueClassifier } from './fix-agent';
 *
 * const classified = issueClassifier.classify('no-unused-vars', 'eslint');
 * // => { issueType: 'unused_code', fixTier: 1, fixCommand: 'eslint --fix', ... }
 *
 * const classified2 = issueClassifier.classify('AvoidDuplicateLiterals', 'pmd');
 * // => { issueType: 'bugs', fixTier: 2, fixerTool: 'sorald', ... }
 * ```
 */

/**
 * Quick routing example:
 *
 * ```typescript
 * import { fixRouter } from './fix-agent';
 *
 * const issues = [
 *   { id: '1', ruleId: 'no-unused-vars', toolId: 'eslint', file: 'src/app.ts', line: 10, message: '...', severity: 'medium' },
 *   { id: '2', ruleId: 'S1135', toolId: 'semgrep', file: 'src/utils.ts', line: 25, message: '...', severity: 'high' },
 * ];
 *
 * const result = fixRouter.routeAndBatch(issues);
 * // result.tier1 = [{ fixer: 'eslint', issues: [...], ... }]
 * // result.tier2 = []
 * // result.tier3 = [{ fixer: 'ai', issues: [...], ... }]
 *
 * fixRouter.printSummary(result);
 * // => Shows breakdown by tier, safe for auto-apply count, estimated cost
 * ```
 */
