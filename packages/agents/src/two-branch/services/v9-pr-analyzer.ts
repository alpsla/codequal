/**
 * V9 PR Analyzer - Production-Ready Orchestrator
 * 
 * Main service for V9 two-branch PR analysis.
 * Orchestrates the complete V9 Canonical Architecture flow.
 * 
 * Flow:
 * 1. Repository management (clone, checkout)
 * 2. Tool execution (both branches)
 * 3. Agent processing (5 specialized agents)
 * 4. Issue categorization (NEW/RESOLVED/EXISTING)
 * 5. AI enrichment (fixes, education)
 * 6. Report generation
 * 
 * Usage:
 *   const analyzer = new V9PRAnalyzer();
 *   const result = await analyzer.analyzePR({
 *     repositoryUrl: 'https://github.com/org/repo',
 *     prNumber: 123,
 *     baseBranch: 'main'
 *   });
 */

import { V9RepositoryManager } from './v9-repository-manager';
import { AIResponseNormalizer, type NormalizedIssue } from './ai-response-normalizer';
import { V9CleanupService, type CleanupConfig } from './v9-cleanup-service';

export interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  baseBranch?: string;
  prBranch?: string;
  language?: 'java' | 'typescript' | 'python' | 'go';
  outputDir?: string;
  skipCache?: boolean;
  /**
   * Cleanup configuration for post-analysis cleanup
   * @default { cleanupAfterDelivery: true, cleanupDelaySeconds: 300 }
   */
  cleanupConfig?: Partial<CleanupConfig>;
}

export interface PRAnalysisResult {
  success: boolean;
  reportPath?: string;
  metadata: {
    repositoryUrl: string;
    prNumber: number;
    duration: string;
    totalIssues: number;
    newIssues: number;
    resolvedIssues: number;
    cost: number;
  };
  error?: string;
}

export interface IssueCategory {
  NEW: NormalizedIssue[];
  EXISTING_MODIFIED: NormalizedIssue[];
  RESOLVED: NormalizedIssue[];
  EXISTING_REST: NormalizedIssue[];
}

export class V9PRAnalyzer {
  private repoManager: V9RepositoryManager;
  private aiNormalizer: AIResponseNormalizer;
  private cleanupService: V9CleanupService;

  constructor(cleanupConfig?: Partial<CleanupConfig>) {
    this.repoManager = new V9RepositoryManager();
    this.aiNormalizer = new AIResponseNormalizer();
    this.cleanupService = new V9CleanupService(cleanupConfig);
  }

  /**
   * Main entry point: Analyze a PR using V9 Canonical Architecture
   */
  async analyzePR(request: PRAnalysisRequest): Promise<PRAnalysisResult> {
    const startTime = Date.now();
    const analysisId = `${request.repositoryUrl.split('/').pop()}-pr${request.prNumber}-${Date.now()}`;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 V9 PR Analysis Started`);
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Repository: ${request.repositoryUrl}`);
    console.log(`   PR: #${request.prNumber}`);
    console.log(`   Language: ${request.language || 'auto-detect'}`);
    console.log(`${'='.repeat(80)}\n`);

    const repoName = this.extractRepoName(request.repositoryUrl);
    const repoPath = `/tmp/${repoName}-repo`;
    const outputDir = request.outputDir || `/tmp/v9-reports/${repoName}`;

    try {
      // Step 1: Prepare repository
      const repoInfo = await this.prepareRepository(request);

      // Step 2: Run analysis (implement in subclasses or delegates)
      // This is the orchestration point - actual implementation will be
      // delegated to language-specific analyzers
      throw new Error('Analysis implementation pending - use test-v9-e2e-complete.ts for now');

      // NOTE: When analysis is complete, cleanup will be scheduled automatically
      // See scheduleCleanupAfterDelivery() method

    } catch (error: any) {
      const duration = this.formatDuration(Date.now() - startTime);
      console.error(`\n❌ Analysis failed: ${error.message}`);

      // Schedule cleanup even on failure
      this.scheduleCleanupAfterDelivery(analysisId, {
        repository: repoPath,
        outputDir
      });

      return {
        success: false,
        metadata: {
          repositoryUrl: request.repositoryUrl,
          prNumber: request.prNumber,
          duration,
          totalIssues: 0,
          newIssues: 0,
          resolvedIssues: 0,
          cost: 0
        },
        error: error.message
      };
    }
  }

  /**
   * Schedule cleanup after report delivery
   * Called automatically after analysis completes
   */
  private scheduleCleanupAfterDelivery(analysisId: string, targets: {
    repository: string;
    outputDir: string;
  }): void {
    this.cleanupService.scheduleCleanup(analysisId, {
      repository: targets.repository,
      outputDir: targets.outputDir,
      ideFixFilesDir: targets.outputDir // IDE fix files are in same directory
    });
  }

  /**
   * Step 1: Prepare repository for analysis
   */
  private async prepareRepository(request: PRAnalysisRequest): Promise<any> {
    const repoName = this.extractRepoName(request.repositoryUrl);
    const localPath = `/tmp/${repoName}-repo`;

    // Detect branches
    const baseBranch = request.baseBranch || 'main';
    const prBranch = request.prBranch || `pr-${request.prNumber}`;

    console.log(`📦 Step 1: Repository Setup`);
    console.log(`   Local path: ${localPath}`);
    console.log(`   Base branch: ${baseBranch}`);
    console.log(`   PR branch: ${prBranch}`);

    // Use V9RepositoryManager for all repo operations
    const repoInfo = await this.repoManager.prepareRepository(
      request.repositoryUrl,
      localPath,
      { base: baseBranch, pr: prBranch },
      { skipCache: request.skipCache }
    );

    // Get modified files
    const modifiedFiles = this.repoManager.getModifiedFiles(
      localPath,
      baseBranch,
      prBranch
    );

    console.log(`   ✅ Repository prepared`);
    console.log(`   Modified files: ${modifiedFiles.length}`);

    return {
      ...repoInfo,
      modifiedFiles
    };
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(url: string): string {
    const match = url.match(/\/([^/]+)\.git$/) || url.match(/\/([^/]+)$/);
    return match ? match[1].toLowerCase() : 'repo';
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Cleanup after analysis
   */
  async cleanup(localPath: string): Promise<void> {
    await this.repoManager.cleanup(localPath);
  }
}

