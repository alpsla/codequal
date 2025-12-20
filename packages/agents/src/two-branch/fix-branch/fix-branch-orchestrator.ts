/**
 * Fix Branch Orchestrator
 *
 * Integrates fix-agent (routing) with fix-branch (application).
 * Orchestrates the complete fix workflow from issue routing to branch creation.
 *
 * Optimized Tier Flow (Session 60 revision):
 * 1. Tier 1: Native tool fixes (eslint --fix, ruff --fix, etc.)
 * 2. Tier 2: Dedicated fixer tools (Sorald, pyupgrade, etc.)
 * 3. Tier 2.5A: Pattern Registry - check Supabase patterns FIRST (instant, free)
 * 4. Tier 2.5B: Cloud API (Corgea) - only for unmatched issues
 *    - Store successful Corgea fixes as new patterns for future use
 * 5. Tier 3: AI generation (fallback when no tool/pattern/cloud support)
 *    - Store successful AI fixes as patterns
 *
 * Why Pattern before Cloud API:
 * - Pattern lookup is instant (local Supabase query)
 * - Corgea requires network latency
 * - One Corgea fix stored as pattern saves N future API calls
 * - Reduces dependency on external service availability
 *
 * @since Session 60
 */

import { FixRouter, RoutingResult, IssueToFix, FixBatch } from '../fix-agent/fix-router';
import { FixBranchGenerator, FixBranchConfig, FixBranchResult } from './fix-branch-generator';
import { FixCollector } from './fix-collector';
import { FixVerifier, ToolScannerCallback, BatchVerificationResult } from './fix-verifier';
import { UnfixedIssueHandler, UnfixedReason } from './unfixed-issue-handler';
import { CategorizedFix } from './fix-categorizer';
import { Issue } from '../analyzers/v9-types';
import { CorgeaFix } from '../tools/cloud-api/corgea-fixer';
import { GeneratedFix } from '../tools/cloud-api/base-api-tool';

// ============================================================
// TYPES
// ============================================================

/**
 * Configuration for fix branch orchestration
 */
export interface FixBranchOrchestrationConfig {
  /** Repository URL */
  repoUrl: string;

  /** PR number */
  prNumber: number;

  /** Working directory (cloned repo path) */
  workingDir: string;

  /** Current branch name */
  currentBranch: string;

  /** User's subscription tier */
  subscriptionTier?: 'basic' | 'pro' | 'enterprise';

  /** Whether to include Cloud API fixes (Corgea) */
  enableCloudFixer?: boolean;

  /** Maximum cost allowed for AI fixes */
  maxAICost?: number;

  /** Whether to run in dry-run mode */
  dryRun?: boolean;

  /** Whether to auto-push the branch */
  autoPush?: boolean;

  /** Whether to verify fixes by re-scanning (recommended) */
  verifyFixes?: boolean;

  /** Tools to skip during verification */
  skipVerificationTools?: string[];
}

/**
 * Result of fix orchestration
 */
export interface FixOrchestrationResult {
  /** Whether orchestration succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Routing result from fix-agent */
  routing: RoutingResult;

  /** Fix branch generation result */
  branchResult: FixBranchResult;

  /** Execution summary */
  execution: {
    tier1Executed: number;
    tier2Executed: number;
    tier2_5Executed: number;
    tier3Executed: number;
    totalFixesApplied: number;
    totalCost: number;
  };

  /** Verification results (if verification was enabled) */
  verification?: {
    performed: boolean;
    passed: number;
    failed: number;
    regressions: number;
    details?: BatchVerificationResult;
  };

  /** Unfixed issues summary */
  unfixedIssues: {
    total: number;
    byReason: Record<string, number>;
    mergeBlockers: number;
    markdown: string;
  };
}

/**
 * Callback for tier-specific fix execution
 */
export type TierFixerCallback = (
  batch: FixBatch
) => Promise<Array<{
  issueId: string;
  file: string;
  line: number;
  column?: number;
  originalCode: string;
  fixedCode: string;
  ruleId: string;
  tool: string;
  message?: string;
  confidence?: number;
}>>;

/**
 * Result from pattern lookup
 */
export interface PatternLookupResult {
  issueId: string;
  matched: boolean;
  patternId?: string;
  fix?: {
    file: string;
    line: number;
    column?: number;
    originalCode: string;
    fixedCode: string;
    ruleId: string;
    tool: string;
    explanation: string;
    confidence: number;
  };
}

/**
 * Callback for pattern store operations
 */
export type PatternStoreCallback = (fixes: Array<{
  ruleId: string;
  tool: string;
  language: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  confidence: number;
  source: 'corgea' | 'ai';
}>) => Promise<void>;

// ============================================================
// FIX BRANCH ORCHESTRATOR
// ============================================================

export class FixBranchOrchestrator {
  private router: FixRouter;
  private config: FixBranchOrchestrationConfig;

  // Tier-specific fixer callbacks (to be set by caller)
  private tier1Fixer?: TierFixerCallback;
  private tier2Fixer?: TierFixerCallback;

  // Tier 2.5A: Pattern lookup (runs BEFORE cloud API)
  private patternLookup?: (issues: IssueToFix[]) => Promise<PatternLookupResult[]>;

  // Tier 2.5B: Cloud API fixer (Corgea)
  private cloudApiFixer?: (issues: IssueToFix[]) => Promise<CorgeaFix[] | GeneratedFix[]>;

  // Tier 3: AI generation
  private tier3AIFixer?: TierFixerCallback;

  // Pattern store callback - stores successful fixes as patterns for future use
  private patternStore?: PatternStoreCallback;

  // Tool scanner for verification
  private toolScanner?: ToolScannerCallback;

  // Language for pattern storage
  private language = 'unknown';

  constructor(config: FixBranchOrchestrationConfig) {
    this.config = config;
    this.router = new FixRouter();
  }

  /**
   * Register tier-specific fixers
   */
  registerTier1Fixer(fixer: TierFixerCallback): this {
    this.tier1Fixer = fixer;
    return this;
  }

  registerTier2Fixer(fixer: TierFixerCallback): this {
    this.tier2Fixer = fixer;
    return this;
  }

  /**
   * Register Tier 2.5A: Pattern lookup (runs BEFORE cloud API)
   * This should check Supabase for existing fix patterns
   */
  registerPatternLookup(
    lookup: (issues: IssueToFix[]) => Promise<PatternLookupResult[]>
  ): this {
    this.patternLookup = lookup;
    return this;
  }

  /**
   * Register Tier 2.5B: Cloud API fixer (Corgea)
   * Only called for issues that didn't match patterns
   */
  registerCloudApiFixer(
    fixer: (issues: IssueToFix[]) => Promise<CorgeaFix[] | GeneratedFix[]>
  ): this {
    this.cloudApiFixer = fixer;
    return this;
  }

  /**
   * Register Tier 3: AI fixer (fallback)
   */
  registerTier3AIFixer(fixer: TierFixerCallback): this {
    this.tier3AIFixer = fixer;
    return this;
  }

  /**
   * Register pattern store callback
   * Called to store successful Corgea/AI fixes as patterns for future use
   */
  registerPatternStore(store: PatternStoreCallback): this {
    this.patternStore = store;
    return this;
  }

  /**
   * Set language for pattern storage
   */
  setLanguage(language: string): this {
    this.language = language;
    return this;
  }

  /**
   * Register tool scanner for verification
   * This should call the same tools that found the original issues
   */
  registerToolScanner(scanner: ToolScannerCallback): this {
    this.toolScanner = scanner;
    return this;
  }

  /**
   * Orchestrate the complete fix workflow
   */
  async orchestrate(issues: IssueToFix[]): Promise<FixOrchestrationResult> {
    const execution = {
      tier1Executed: 0,
      tier2Executed: 0,
      tier2_5Executed: 0,
      tier3Executed: 0,
      totalFixesApplied: 0,
      totalCost: 0
    };

    try {
      // Step 1: Route issues to appropriate tiers
      console.log(`\n📌 Step 1: Routing ${issues.length} issues to fix tiers...`);
      const routing = this.router.routeAndBatch(issues, {
        tier: this.config.subscriptionTier || 'basic'
      });

      this.router.printSummary(routing);

      // Step 2: Create fix branch generator with collector
      const branchConfig: FixBranchConfig = {
        repoUrl: this.config.repoUrl,
        prNumber: this.config.prNumber,
        workingDir: this.config.workingDir,
        currentBranch: this.config.currentBranch,
        dryRun: this.config.dryRun,
        autoPush: this.config.autoPush
      };

      const generator = new FixBranchGenerator(branchConfig);
      const collector = generator.getCollector();

      // Step 3: Execute Tier 1 fixes (native --fix)
      if (routing.tier1.length > 0 && this.tier1Fixer) {
        console.log(`\n🔧 Step 3a: Executing Tier 1 native fixes...`);
        for (const batch of routing.tier1) {
          try {
            const fixes = await this.tier1Fixer(batch);
            collector.addNativeFixes(fixes);
            execution.tier1Executed += fixes.length;
          } catch (error) {
            console.warn(`  ⚠️ Tier 1 batch failed: ${error}`);
          }
        }
        console.log(`  ✅ Applied ${execution.tier1Executed} Tier 1 fixes`);
      }

      // Step 4: Execute Tier 2 fixes (dedicated fixers)
      if (routing.tier2.length > 0 && this.tier2Fixer) {
        console.log(`\n🔧 Step 3b: Executing Tier 2 dedicated fixer fixes...`);
        for (const batch of routing.tier2) {
          try {
            const fixes = await this.tier2Fixer(batch);
            collector.addDedicatedFixes(
              fixes.map(f => ({
                ...f,
                fixerTool: batch.fixer
              }))
            );
            execution.tier2Executed += fixes.length;
          } catch (error) {
            console.warn(`  ⚠️ Tier 2 batch failed: ${error}`);
          }
        }
        console.log(`  ✅ Applied ${execution.tier2Executed} Tier 2 fixes`);
      }

      // ================================================================
      // OPTIMIZED TIER 2.5 FLOW: Pattern FIRST, then Cloud API
      // ================================================================

      // Extract all tier 2.5 eligible issues
      const tier2_5Issues: IssueToFix[] = routing.tier2_5.flatMap(
        b => b.issues.map(r => r.issue)
      );

      // Track issues that need cloud API (those without pattern match)
      let unmatchedIssues: IssueToFix[] = [...tier2_5Issues];
      const patternFixCount = { matched: 0 };

      // Step 5a: Tier 2.5A - Check Pattern Registry FIRST (instant, free)
      if (tier2_5Issues.length > 0 && this.patternLookup) {
        console.log(`\n📋 Step 3c: Checking Pattern Registry (Tier 2.5A)...`);
        try {
          const patternResults = await this.patternLookup(tier2_5Issues);

          // Collect matched patterns
          for (const result of patternResults) {
            if (result.matched && result.fix) {
              collector.addPatternFixes([{
                issueId: result.issueId,
                ruleId: result.fix.ruleId,
                tool: result.fix.tool,
                file: result.fix.file,
                line: result.fix.line,
                column: result.fix.column,
                originalCode: result.fix.originalCode,
                fixedCode: result.fix.fixedCode,
                explanation: result.fix.explanation,
                confidence: result.fix.confidence,
                category: 'security',
                severity: 'high',
                patternId: result.patternId
              }]);
              patternFixCount.matched++;
            }
          }

          // Filter out matched issues - only unmatched go to Corgea
          const matchedIds = new Set(
            patternResults.filter(r => r.matched).map(r => r.issueId)
          );
          unmatchedIssues = tier2_5Issues.filter(i => !matchedIds.has(i.id));

          console.log(`  ✅ Pattern matches: ${patternFixCount.matched}`);
          console.log(`  📤 Issues for Cloud API: ${unmatchedIssues.length}`);
        } catch (error) {
          console.warn(`  ⚠️ Pattern lookup failed: ${error}`);
          // Continue with all issues going to Corgea
        }
      }

      // Step 5b: Tier 2.5B - Cloud API (Corgea) for UNMATCHED issues only
      const corgeaFixes: Array<CorgeaFix | GeneratedFix> = [];
      if (
        unmatchedIssues.length > 0 &&
        this.cloudApiFixer &&
        this.config.enableCloudFixer
      ) {
        console.log(`\n☁️ Step 3d: Fetching Cloud API fixes (Tier 2.5B - Corgea)...`);
        try {
          const fixes = await this.cloudApiFixer(unmatchedIssues);
          corgeaFixes.push(...fixes);
          collector.addCloudFixes(fixes);
          execution.tier2_5Executed = fixes.length;
          console.log(`  ✅ Received ${execution.tier2_5Executed} Cloud API fixes`);

          // Store successful Corgea fixes as patterns for future use
          if (this.patternStore && fixes.length > 0) {
            console.log(`  💾 Storing ${fixes.length} Corgea fixes as patterns...`);
            try {
              await this.patternStore(
                fixes.map(f => ({
                  ruleId: f.ruleId,
                  tool: 'corgea',
                  language: this.language,
                  originalCode: f.originalCode,
                  fixedCode: f.fixedCode,
                  explanation: f.explanation,
                  confidence: f.confidence,
                  source: 'corgea' as const
                }))
              );
              console.log(`  ✅ Patterns stored successfully`);
            } catch (storeError) {
              console.warn(`  ⚠️ Pattern storage failed: ${storeError}`);
            }
          }
        } catch (error) {
          console.warn(`  ⚠️ Cloud API fixes failed: ${error}`);
        }
      }

      // Total Tier 2.5 = patterns + cloud
      execution.tier2_5Executed += patternFixCount.matched;

      // ================================================================
      // TIER 3: AI Generation (fallback for remaining issues)
      // ================================================================

      // Step 6: Execute Tier 3 AI fixes
      if (routing.tier3.length > 0 && this.tier3AIFixer) {
        console.log(`\n🤖 Step 3e: Generating Tier 3 AI fixes...`);
        const aiBatches = routing.tier3.filter(b => b.fixer === 'ai');

        // Use total estimated cost from routing summary, divided by number of AI batches
        const totalAICost = routing.summary.estimatedCost || 0;
        const costPerBatch = aiBatches.length > 0 ? totalAICost / aiBatches.length : 0;

        const aiFixes: Array<{
          issueId: string;
          file: string;
          line: number;
          originalCode: string;
          fixedCode: string;
          ruleId: string;
          tool: string;
          message?: string;
          confidence?: number;
        }> = [];

        for (const batch of aiBatches) {
          // Check cost limit
          if (
            this.config.maxAICost !== undefined &&
            execution.totalCost + costPerBatch > this.config.maxAICost
          ) {
            console.log(`  ⚠️ Skipping AI batch - would exceed cost limit`);
            continue;
          }

          try {
            const fixes = await this.tier3AIFixer(batch);
            aiFixes.push(...fixes);
            collector.addAIFixes(
              fixes.map(f => ({
                ...f,
                issueId: f.issueId || `ai-${f.file}-${f.line}`,
                explanation: f.message || 'AI-generated fix',
                confidence: f.confidence || 60,
                category: 'code_quality',
                severity: 'medium' as const
              }))
            );
            execution.tier3Executed += fixes.length;
            execution.totalCost += costPerBatch;
          } catch (error) {
            console.warn(`  ⚠️ AI fix generation failed: ${error}`);
          }
        }

        // Store successful AI fixes as patterns for future use
        if (this.patternStore && aiFixes.length > 0) {
          console.log(`  💾 Storing ${aiFixes.length} AI fixes as patterns...`);
          try {
            await this.patternStore(
              aiFixes.map(f => ({
                ruleId: f.ruleId,
                tool: f.tool,
                language: this.language,
                originalCode: f.originalCode,
                fixedCode: f.fixedCode,
                explanation: f.message || 'AI-generated fix',
                confidence: f.confidence || 60,
                source: 'ai' as const
              }))
            );
            console.log(`  ✅ AI patterns stored successfully`);
          } catch (storeError) {
            console.warn(`  ⚠️ AI pattern storage failed: ${storeError}`);
          }
        }

        console.log(`  ✅ Applied ${execution.tier3Executed} Tier 3 fixes`);
      }

      // ================================================================
      // STEP 7: Generate fix branch (applies fixes to files)
      // ================================================================
      console.log(`\n🌿 Step 4: Generating fix branch...`);
      const branchResult = await generator.generate();

      execution.totalFixesApplied =
        branchResult.applyResult.summary.successCount;

      // ================================================================
      // STEP 8: VERIFICATION - Re-scan to confirm fixes work
      // ================================================================
      let verificationResult: FixOrchestrationResult['verification'];
      const unfixedHandler = new UnfixedIssueHandler();

      if (this.config.verifyFixes && this.toolScanner && branchResult.applyResult.applied.length > 0) {
        console.log(`\n🔍 Step 5: Verifying fixes (re-scanning)...`);

        const verifier = new FixVerifier({
          workingDir: this.config.workingDir,
          skipTools: this.config.skipVerificationTools
        });
        verifier.registerScanner(this.toolScanner);

        // Get the categorized fixes that were applied
        const appliedFixes = branchResult.applyResult.applied.map(a => a.fix);
        const batchResult = await verifier.verifyBatch(appliedFixes);

        verificationResult = {
          performed: true,
          passed: batchResult.summary.passed,
          failed: batchResult.summary.failed,
          regressions: batchResult.summary.regressions,
          details: batchResult
        };

        console.log(`  ✅ Verified: ${batchResult.summary.passed}`);
        console.log(`  ❌ Failed: ${batchResult.summary.failed}`);
        console.log(`  ⚠️ Regressions: ${batchResult.summary.regressions}`);

        // Record failed verifications as unfixed issues
        for (const failure of batchResult.failedFixes) {
          unfixedHandler.recordVerificationFailure(
            failure.fix,
            batchResult.results.find(r => r.fix.id === failure.fix.id)!
          );
        }
      }

      // ================================================================
      // STEP 9: Collect all unfixed issues
      // ================================================================

      // Add issues that couldn't be fixed at any tier
      const unfixableIssues = this.getUnfixableIssues(routing);
      for (const issue of unfixableIssues) {
        unfixedHandler.recordUnfixed(
          {
            id: issue.id,
            ruleId: issue.rule || 'unknown',
            toolId: issue.tool,
            file: issue.file,
            line: issue.line,
            message: issue.description,
            severity: issue.severity as 'critical' | 'high' | 'medium' | 'low'
          },
          'no_pattern_match' as UnfixedReason,
          { attemptedTiers: [] }
        );
      }

      // Also add failed applications
      for (const failed of branchResult.applyResult.failed) {
        unfixedHandler.recordUnfixed(
          {
            id: failed.fix.id,
            ruleId: failed.fix.ruleId,
            toolId: failed.fix.tool,
            file: failed.fix.file,
            line: failed.fix.line,
            message: failed.fix.explanation,
            severity: failed.fix.severity
          },
          'unknown' as UnfixedReason,
          {
            attemptedTiers: [failed.fix.tier],
            tierFailures: [{
              tier: failed.fix.tier,
              error: failed.error,
              attemptedFix: failed.fix.fixedCode
            }]
          }
        );
      }

      // Add unfixable issues to collector for recommendations
      if (unfixableIssues.length > 0) {
        collector.addUnfixableIssues(unfixableIssues);
      }

      const unfixedSummary = unfixedHandler.getSummary();
      const unfixedMarkdown = unfixedHandler.generateMarkdown();

      // Log final results
      if (branchResult.success) {
        console.log(`\n✅ Fix branch created successfully!`);
        console.log(`   Branch: ${branchResult.branchName}`);
        console.log(`   Fixes applied: ${execution.totalFixesApplied}`);
        console.log(`   Files modified: ${branchResult.applyResult.modifiedFiles.length}`);

        if (unfixedSummary.total > 0) {
          console.log(`\n⚠️ Unfixed Issues: ${unfixedSummary.total}`);
          console.log(`   Merge blockers: ${unfixedSummary.mergeBlockers}`);
          console.log(`   Requires author action: ${unfixedSummary.requiresAuthorAction}`);
        }
      }

      return {
        success: branchResult.success,
        routing,
        branchResult,
        execution,
        verification: verificationResult,
        unfixedIssues: {
          total: unfixedSummary.total,
          byReason: unfixedSummary.byReason as Record<string, number>,
          mergeBlockers: unfixedSummary.mergeBlockers,
          markdown: unfixedMarkdown
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        routing: {
          tier1: [],
          tier2: [],
          tier2_5: [],
          tier3: [],
          summary: {
            total: 0,
            tier1Count: 0,
            tier2Count: 0,
            tier2_5Count: 0,
            tier3Count: 0,
            safeForAutoApply: 0,
            estimatedCost: 0,
            cloudFixerEligible: 0
          }
        },
        branchResult: {
          success: false,
          error: 'Orchestration failed before branch generation',
          branchName: '',
          applyResult: {
            applied: [],
            failed: [],
            modifiedFiles: [],
            summary: {
              totalAttempted: 0,
              successCount: 0,
              failCount: 0,
              filesModified: 0
            }
          },
          reviewDocument: {
            markdown: '',
            summary: '',
            fileName: 'CODEQUAL_FIXES.md',
            generatedAt: new Date(),
            stats: {
              totalIssues: 0,
              autoApplied: 0,
              needsReview: 0,
              recommendations: 0,
              filesModified: 0
            }
          },
          collected: {
            autoApply: [],
            reviewRequired: [],
            recommendations: [],
            summary: {
              totalIssues: 0,
              totalFixes: 0,
              autoApplyCount: 0,
              reviewRequiredCount: 0,
              recommendationCount: 0,
              byTier: {
                tier1_native: 0,
                tier2_dedicated: 0,
                tier2_5_cloud: 0,
                tier3_pattern: 0,
                tier3_ai: 0
              },
              byCategory: {}
            }
          },
          gitOperations: {
            branchCreated: false,
            committed: false,
            pushed: false
          }
        },
        execution,
        unfixedIssues: {
          total: 0,
          byReason: {},
          mergeBlockers: 0,
          markdown: ''
        }
      };
    }
  }

  /**
   * Extract issues that couldn't be fixed
   */
  private getUnfixableIssues(routing: RoutingResult): Issue[] {
    // Issues in tier3 with fixer='ai' but no AI fixer registered
    // Or issues that were skipped due to cost limits
    // For now, return empty - the caller can provide these separately
    return [];
  }
}

/**
 * Create a new fix branch orchestrator
 */
export function createFixBranchOrchestrator(
  config: FixBranchOrchestrationConfig
): FixBranchOrchestrator {
  return new FixBranchOrchestrator(config);
}
