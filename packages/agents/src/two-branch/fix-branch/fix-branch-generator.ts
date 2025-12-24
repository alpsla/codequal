/**
 * Fix Branch Generator
 *
 * Main orchestrator for creating a fix branch with all applicable fixes.
 * Creates a new git branch, applies fixes, and generates review documentation.
 *
 * @since Session 60
 */

import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

import { FixCollector, CollectedFixes } from './fix-collector';
import { FixApplicator, ApplyResult } from './fix-applicator';
import { ReviewDocumentGenerator, ReviewDocument } from './review-document-generator';
import { CategorizedFix, FixConfidenceCategory } from './fix-categorizer';

const execAsync = promisify(exec);

// ============================================================
// TYPES
// ============================================================

/**
 * Configuration for fix branch generation
 */
export interface FixBranchConfig {
  /** Repository URL */
  repoUrl: string;

  /** PR number */
  prNumber: number;

  /** Working directory (cloned repo path) */
  workingDir: string;

  /** Current branch name */
  currentBranch: string;

  /** Custom fix branch name (optional) */
  branchName?: string;

  /** Whether to auto-push the branch */
  autoPush?: boolean;

  /** Remote name for push */
  remoteName?: string;

  /** Whether to run in dry-run mode */
  dryRun?: boolean;

  /** Whether to validate syntax after each fix */
  validateSyntax?: boolean;

  /** Whether to include diffs in review document */
  includeDiffs?: boolean;

  /** Maximum recommendations in review document */
  maxRecommendations?: number;

  /** Commit message template */
  commitMessageTemplate?: string;
}

/**
 * Result of fix branch generation
 */
export interface FixBranchResult {
  /** Whether generation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Generated branch name */
  branchName: string;

  /** Apply results */
  applyResult: ApplyResult;

  /** Review document */
  reviewDocument: ReviewDocument;

  /** Collected fixes summary */
  collected: CollectedFixes;

  /** Git operations performed */
  gitOperations: {
    branchCreated: boolean;
    committed: boolean;
    pushed: boolean;
    commitHash?: string;
  };
}

// ============================================================
// FIX BRANCH GENERATOR
// ============================================================

export class FixBranchGenerator {
  private collector: FixCollector;
  private applicator: FixApplicator | null = null;
  private docGenerator: ReviewDocumentGenerator;
  private config: Required<FixBranchConfig>;

  constructor(config: FixBranchConfig) {
    this.config = {
      repoUrl: config.repoUrl,
      prNumber: config.prNumber,
      workingDir: config.workingDir,
      currentBranch: config.currentBranch,
      branchName: config.branchName || this.generateBranchName(config.prNumber),
      autoPush: config.autoPush ?? false,
      remoteName: config.remoteName ?? 'origin',
      dryRun: config.dryRun ?? false,
      validateSyntax: config.validateSyntax ?? true,
      includeDiffs: config.includeDiffs ?? true,
      maxRecommendations: config.maxRecommendations ?? 50,
      commitMessageTemplate: config.commitMessageTemplate ??
        'fix: Apply CodeQual automated fixes for PR #{{prNumber}}\n\n{{summary}}'
    };

    this.collector = new FixCollector();
    this.docGenerator = new ReviewDocumentGenerator();
  }

  /**
   * Get the fix collector for adding fixes
   */
  getCollector(): FixCollector {
    return this.collector;
  }

  /**
   * Generate the fix branch with all collected fixes
   */
  async generate(): Promise<FixBranchResult> {
    const gitOps = {
      branchCreated: false,
      committed: false,
      pushed: false,
      commitHash: undefined as string | undefined
    };

    try {
      // Collect and categorize fixes
      const collected = this.collector.collect();

      // Create applicator
      this.applicator = new FixApplicator({
        workingDir: this.config.workingDir,
        validateSyntax: this.config.validateSyntax,
        createBackups: true,
        dryRun: this.config.dryRun
      });

      // Determine which fixes to apply
      const fixesToApply = this.selectFixesToApply(collected);

      // Create fix branch
      if (!this.config.dryRun) {
        await this.createBranch();
        gitOps.branchCreated = true;
      }

      // Apply fixes
      const applyResult = await this.applicator.applyFixes(fixesToApply);

      // Generate review document
      const reviewDocument = this.docGenerator.generate(collected, applyResult, {
        repoUrl: this.config.repoUrl,
        prNumber: this.config.prNumber,
        branchName: this.config.branchName,
        originalBranch: this.config.currentBranch,
        includeDiffs: this.config.includeDiffs,
        maxRecommendations: this.config.maxRecommendations
      });

      // Write review document
      if (!this.config.dryRun) {
        await this.writeReviewDocument(reviewDocument);
      }

      // Commit changes
      if (!this.config.dryRun && applyResult.applied.length > 0) {
        const commitHash = await this.commitChanges(collected, applyResult);
        gitOps.committed = true;
        gitOps.commitHash = commitHash;
      }

      // Push if configured
      if (!this.config.dryRun && this.config.autoPush && gitOps.committed) {
        await this.pushBranch();
        gitOps.pushed = true;
      }

      return {
        success: true,
        branchName: this.config.branchName,
        applyResult,
        reviewDocument,
        collected,
        gitOperations: gitOps
      };

    } catch (error) {
      // Attempt rollback on failure
      if (gitOps.branchCreated && !this.config.dryRun) {
        try {
          await this.rollbackBranch();
        } catch {
          // Rollback failed - log but continue with error
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        branchName: this.config.branchName,
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
        gitOperations: gitOps
      };
    }
  }

  /**
   * Select which fixes to apply based on categorization
   */
  private selectFixesToApply(collected: CollectedFixes): CategorizedFix[] {
    // Auto-apply fixes are always included
    const fixes = [...collected.autoApply];

    // Include review-required fixes (they'll be documented for review)
    // These are applied but flagged in the review document
    fixes.push(...collected.reviewRequired);

    return fixes;
  }

  /**
   * Generate branch name
   */
  private generateBranchName(prNumber: number): string {
    const timestamp = Date.now();
    return `codequal/fixes-pr-${prNumber}-${timestamp}`;
  }

  /**
   * Create the fix branch
   */
  private async createBranch(): Promise<void> {
    const { workingDir, branchName, currentBranch } = this.config;

    // Ensure we're on the correct branch
    await execAsync(`git checkout ${currentBranch}`, { cwd: workingDir });

    // Create and checkout new branch
    await execAsync(`git checkout -b ${branchName}`, { cwd: workingDir });
  }

  /**
   * Write the review document to the repository
   */
  private async writeReviewDocument(doc: ReviewDocument): Promise<void> {
    const filePath = path.join(this.config.workingDir, doc.fileName);
    await fs.writeFile(filePath, doc.markdown, 'utf-8');
  }

  /**
   * Commit all changes
   */
  private async commitChanges(
    collected: CollectedFixes,
    applyResult: ApplyResult
  ): Promise<string> {
    const { workingDir, prNumber } = this.config;

    // Build summary for commit message
    const summary = [
      `Applied ${applyResult.applied.length} fixes:`,
      `- Auto-applied: ${collected.autoApply.length}`,
      `- Review required: ${collected.reviewRequired.length}`,
      `- Recommendations: ${collected.recommendations.length}`,
      '',
      'See CODEQUAL_FIXES.md for details.'
    ].join('\n');

    // Generate commit message
    const message = this.config.commitMessageTemplate
      .replace('{{prNumber}}', String(prNumber))
      .replace('{{summary}}', summary);

    // Stage all changes
    await execAsync('git add -A', { cwd: workingDir });

    // Commit
    const escapedMessage = message.replace(/"/g, '\\"');
    await execAsync(`git commit -m "${escapedMessage}"`, { cwd: workingDir });

    // Get commit hash
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: workingDir });
    return stdout.trim();
  }

  /**
   * Push the branch to remote
   */
  private async pushBranch(): Promise<void> {
    const { workingDir, branchName, remoteName } = this.config;
    await execAsync(`git push -u ${remoteName} ${branchName}`, { cwd: workingDir });
  }

  /**
   * Rollback to original branch
   */
  private async rollbackBranch(): Promise<void> {
    const { workingDir, currentBranch, branchName } = this.config;

    // Checkout original branch
    await execAsync(`git checkout ${currentBranch}`, { cwd: workingDir });

    // Delete fix branch
    await execAsync(`git branch -D ${branchName}`, { cwd: workingDir });
  }
}

/**
 * Create a new fix branch generator
 */
export function createFixBranchGenerator(config: FixBranchConfig): FixBranchGenerator {
  return new FixBranchGenerator(config);
}
