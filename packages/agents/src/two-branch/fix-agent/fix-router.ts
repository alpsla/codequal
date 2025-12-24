/**
 * Fix Router
 *
 * Routes issues to the appropriate fixing tier based on tool capability.
 * Manages the Three-Tier Fix System execution flow.
 *
 * Tiers:
 * - Tier 1: Native tool fix (eslint --fix, ruff --fix, etc.)
 * - Tier 2: Dedicated fixer tool (Sorald for PMD, pyupgrade, etc.)
 * - Tier 2.5: Cloud API Fixers (Corgea, etc.) - PRO tier only (Session 60)
 * - Tier 3: AI generation (fallback when no tool support)
 */

import { issueClassifier, ClassifiedIssue, IssueType } from './issue-classifier';
import { toolFixRegistry, FixTier, ToolFixCapability } from './tool-fix-registry';

// ============================================================================
// TYPES
// ============================================================================

export interface IssueToFix {
  id: string;
  ruleId: string;
  toolId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;
}

export interface FixRoute {
  issue: IssueToFix;
  tier: FixTier;
  fixer: string;
  command?: string;
  confidence: number;
  safeForAutoApply: boolean;
  issueType: IssueType;
  estimatedTime: 'fast' | 'medium' | 'slow';
  requiresContext: boolean;
}

export interface FixBatch {
  fixer: string;
  tier: FixTier;
  command?: string;
  issues: FixRoute[];
  files: string[];
  estimatedTime: 'fast' | 'medium' | 'slow';
  safeForAutoApply: boolean;
}

export interface RoutingResult {
  tier1: FixBatch[];
  tier2: FixBatch[];
  tier2_5: FixBatch[];  // Cloud API Fixers (Session 60)
  tier3: FixBatch[];
  summary: {
    total: number;
    tier1Count: number;
    tier2Count: number;
    tier2_5Count: number;  // Cloud API Fixers (Session 60)
    tier3Count: number;
    safeForAutoApply: number;
    estimatedCost: number;
    cloudFixerEligible: number;  // Issues eligible for cloud fixers
  };
}

/**
 * Subscription tier for cloud fixer access (Session 60)
 */
export type SubscriptionTier = 'basic' | 'pro' | 'enterprise';

/**
 * Categories that Corgea can handle effectively (Session 60)
 * Based on Corgea's specialization in security and code quality issues
 */
export const CLOUD_FIXER_CATEGORIES = [
  'security',
  'code_quality',
  'bugs',
  'best_practices',
  'vulnerability',
] as const;

/**
 * Tools whose issues Corgea can fix (Session 60)
 * These tools output findings that Corgea understands well
 */
export const CLOUD_FIXER_COMPATIBLE_TOOLS = [
  'semgrep',
  'bandit',
  'gosec',
  'pmd',
  'eslint',
  'spotbugs',
  'pylint',
  'brakeman',
] as const;

// ============================================================================
// EXECUTION TIME CATEGORIES
// ============================================================================

const FIXER_SPEED: Record<string, 'fast' | 'medium' | 'slow'> = {
  // Fast tools (can process many files quickly)
  prettier: 'fast',
  'ruff check --fix': 'fast',
  'ruff format': 'fast',
  black: 'fast',
  isort: 'fast',
  autoflake: 'fast',
  gofmt: 'fast',
  goimports: 'fast',
  rustfmt: 'fast',

  // Medium tools (need some processing)
  'eslint --fix': 'medium',
  'biome check --apply': 'medium',
  'golangci-lint run --fix': 'medium',
  'rubocop -a': 'medium',
  'php-cs-fixer fix': 'medium',
  'ktlint -F': 'medium',
  'swiftlint --fix': 'medium',
  'npm audit fix': 'medium',

  // Slow tools (JVM startup, heavy processing)
  'java -jar sorald.jar repair': 'slow',
  'semgrep --autofix': 'slow',
  'cargo clippy --fix --allow-dirty': 'slow',
  pyupgrade: 'medium',
  'google-java-format': 'slow',
  renovate: 'slow',

  // AI is considered slow
  ai: 'slow',

  // Cloud API Fixers (Session 60) - slow due to async API calls
  corgea: 'slow',
  'cloud-api': 'slow',
};

// ============================================================================
// FIX ROUTER CLASS
// ============================================================================

export class FixRouter {
  /**
   * Check if an issue is eligible for cloud fixer processing (Session 60)
   *
   * Cloud fixers (Corgea) work best with:
   * - Security issues from compatible tools
   * - Code quality issues from compatible tools
   * - Medium to critical severity (skip low to save API calls)
   */
  isCloudFixerEligible(issue: IssueToFix): boolean {
    // Check tool compatibility
    const toolId = issue.toolId.toLowerCase();
    const isCompatibleTool = CLOUD_FIXER_COMPATIBLE_TOOLS.some(
      tool => toolId.includes(tool)
    );

    if (!isCompatibleTool) {
      return false;
    }

    // Skip low severity to optimize API usage
    if (issue.severity === 'low') {
      return false;
    }

    return true;
  }

  /**
   * Route a single issue to the appropriate fixer
   */
  routeIssue(issue: IssueToFix): FixRoute {
    // Classify the issue
    const classified = issueClassifier.classify(issue.ruleId, issue.toolId);

    // Get tool capability
    const capability = toolFixRegistry.getToolCapability(classified.toolId);

    // Determine fixer
    const fixer = this.determineFixer(classified, capability);

    // Get execution time estimate
    const estimatedTime = this.getEstimatedTime(fixer);

    return {
      issue,
      tier: classified.fixTier,
      fixer,
      command: classified.fixCommand,
      confidence: classified.confidence,
      safeForAutoApply: classified.safeForAutoApply,
      issueType: classified.issueType,
      estimatedTime,
      requiresContext: classified.fixTier === 3, // AI needs code context
    };
  }

  /**
   * Route multiple issues and batch by fixer
   *
   * @param issues - Issues to route
   * @param options - Optional routing options including subscription tier
   */
  routeAndBatch(
    issues: IssueToFix[],
    options?: { tier?: SubscriptionTier }
  ): RoutingResult {
    // Route all issues
    const routes = issues.map(issue => this.routeIssue(issue));

    // Group by tier
    const tier1Routes = routes.filter(r => r.tier === 1);
    const tier2Routes = routes.filter(r => r.tier === 2);
    const tier3Routes = routes.filter(r => r.tier === 3);

    // SESSION 60: Identify cloud fixer eligible issues from tier 3
    // Cloud fixers (Tier 2.5) can handle some tier 3 issues before AI fallback
    const cloudFixerEligible = tier3Routes.filter(r =>
      this.isCloudFixerEligible(r.issue)
    );

    // Determine if cloud fixers should be used based on subscription tier
    const userTier = options?.tier || 'basic';
    const canUseCloudFixers = userTier !== 'basic';

    // If PRO/ENTERPRISE tier, move eligible issues to tier 2.5
    let tier2_5Routes: FixRoute[] = [];
    let remainingTier3Routes = tier3Routes;

    if (canUseCloudFixers && cloudFixerEligible.length > 0) {
      tier2_5Routes = cloudFixerEligible.map(route => ({
        ...route,
        fixer: 'corgea',
        tier: 2.5 as any,  // Special tier for cloud fixers
        estimatedTime: 'slow' as const,
        requiresContext: true,
      }));

      // Remove cloud fixer eligible issues from tier 3
      const cloudFixerIssueIds = new Set(cloudFixerEligible.map(r => r.issue.id));
      remainingTier3Routes = tier3Routes.filter(r => !cloudFixerIssueIds.has(r.issue.id));
    }

    // Create batches for each tier
    const tier1Batches = this.createBatches(tier1Routes, 1);
    const tier2Batches = this.createBatches(tier2Routes, 2);
    const tier2_5Batches = canUseCloudFixers
      ? this.createCloudFixerBatches(tier2_5Routes)
      : [];
    const tier3Batches = this.createBatches(remainingTier3Routes, 3);

    // Calculate summary
    const safeCount = routes.filter(r => r.safeForAutoApply).length;
    const estimatedCost = this.estimateAICost(remainingTier3Routes.length);

    return {
      tier1: tier1Batches,
      tier2: tier2Batches,
      tier2_5: tier2_5Batches,
      tier3: tier3Batches,
      summary: {
        total: routes.length,
        tier1Count: tier1Routes.length,
        tier2Count: tier2Routes.length,
        tier2_5Count: tier2_5Routes.length,
        tier3Count: remainingTier3Routes.length,
        safeForAutoApply: safeCount,
        estimatedCost,
        cloudFixerEligible: cloudFixerEligible.length,
      },
    };
  }

  /**
   * Create batches for cloud API fixers (Session 60)
   *
   * Cloud fixers are batched by language for optimal API efficiency
   */
  private createCloudFixerBatches(routes: FixRoute[]): FixBatch[] {
    if (routes.length === 0) return [];

    // For cloud fixers, create a single batch per language
    // Corgea processes all issues in one API call
    const files = [...new Set(routes.map(r => r.issue.file))];

    return [{
      fixer: 'corgea',
      tier: 2.5 as any,
      command: undefined,  // Cloud API, no local command
      issues: routes,
      files,
      estimatedTime: 'slow',
      safeForAutoApply: false,  // Always needs review
    }];
  }

  /**
   * Determine the fixer to use
   */
  private determineFixer(classified: ClassifiedIssue, capability?: ToolFixCapability): string {
    // Tier 1: Use fix command
    if (classified.fixTier === 1 && classified.fixCommand) {
      return classified.fixCommand.split(' ')[0]; // Get tool name
    }

    // Tier 2: Use fixer tool
    if (classified.fixTier === 2 && classified.fixerTool) {
      return classified.fixerTool;
    }

    // Tier 2 fallback: check capability
    if (capability?.fixerTool) {
      return capability.fixerTool;
    }

    // Tier 3: AI fallback
    return 'ai';
  }

  /**
   * Get estimated execution time for a fixer
   */
  private getEstimatedTime(fixer: string): 'fast' | 'medium' | 'slow' {
    // Check exact match
    if (FIXER_SPEED[fixer]) {
      return FIXER_SPEED[fixer];
    }

    // Check partial matches
    for (const [key, speed] of Object.entries(FIXER_SPEED)) {
      if (fixer.includes(key) || key.includes(fixer)) {
        return speed;
      }
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Create batches from routes, grouped by fixer
   */
  private createBatches(routes: FixRoute[], tier: FixTier): FixBatch[] {
    // Group by fixer
    const groups = new Map<string, FixRoute[]>();
    for (const route of routes) {
      const existing = groups.get(route.fixer) || [];
      existing.push(route);
      groups.set(route.fixer, existing);
    }

    // Convert to batches
    const batches: FixBatch[] = [];
    for (const [fixer, issueRoutes] of groups) {
      // Collect unique files
      const files = [...new Set(issueRoutes.map(r => r.issue.file))];

      // Determine if safe for auto-apply (all issues must be safe)
      const safeForAutoApply = issueRoutes.every(r => r.safeForAutoApply);

      // Get command (from first route that has one)
      const command = issueRoutes.find(r => r.command)?.command;

      // Get slowest estimated time
      const estimatedTime = this.getSlowestTime(issueRoutes.map(r => r.estimatedTime));

      batches.push({
        fixer,
        tier,
        command,
        issues: issueRoutes,
        files,
        estimatedTime,
        safeForAutoApply,
      });
    }

    // Sort batches: fast first, then medium, then slow
    return batches.sort((a, b) => {
      const order = { fast: 0, medium: 1, slow: 2 };
      return order[a.estimatedTime] - order[b.estimatedTime];
    });
  }

  /**
   * Get the slowest time from a list
   */
  private getSlowestTime(times: ('fast' | 'medium' | 'slow')[]): 'fast' | 'medium' | 'slow' {
    if (times.includes('slow')) return 'slow';
    if (times.includes('medium')) return 'medium';
    return 'fast';
  }

  /**
   * Estimate AI cost for tier 3 issues
   */
  private estimateAICost(tier3Count: number): number {
    // Rough estimate: ~$0.01 per issue for AI fix generation
    // Based on ~500 tokens input + ~200 tokens output per issue
    const costPerIssue = 0.01;
    return tier3Count * costPerIssue;
  }

  /**
   * Get execution plan (ordered list of batches)
   */
  getExecutionPlan(routingResult: RoutingResult): FixBatch[] {
    // Execution order:
    // 1. Fast Tier 1 tools (parallel)
    // 2. Medium Tier 1 tools (limited parallel)
    // 3. Slow Tier 1 tools (sequential)
    // 4. Fast Tier 2 tools (parallel)
    // 5. Medium Tier 2 tools (limited parallel)
    // 6. Slow Tier 2 tools (sequential)
    // 7. Tier 2.5 Cloud API fixers (Corgea) - PRO tier only (Session 60)
    // 8. AI fixes (batched by file for context)

    const plan: FixBatch[] = [];

    // Tier 1 by speed
    plan.push(...routingResult.tier1.filter(b => b.estimatedTime === 'fast'));
    plan.push(...routingResult.tier1.filter(b => b.estimatedTime === 'medium'));
    plan.push(...routingResult.tier1.filter(b => b.estimatedTime === 'slow'));

    // Tier 2 by speed
    plan.push(...routingResult.tier2.filter(b => b.estimatedTime === 'fast'));
    plan.push(...routingResult.tier2.filter(b => b.estimatedTime === 'medium'));
    plan.push(...routingResult.tier2.filter(b => b.estimatedTime === 'slow'));

    // Tier 2.5: Cloud API fixers (Session 60)
    plan.push(...routingResult.tier2_5);

    // Tier 3 (AI)
    plan.push(...routingResult.tier3);

    return plan;
  }

  /**
   * Get recommended parallelism for a batch
   */
  getParallelism(batch: FixBatch): number {
    switch (batch.estimatedTime) {
      case 'fast':
        return 10; // Can run many in parallel
      case 'medium':
        return 4;  // Limited parallelism
      case 'slow':
        return 1;  // Sequential (JVM startup, AI calls)
      default:
        return 2;
    }
  }

  /**
   * Print routing summary
   */
  printSummary(result: RoutingResult): void {
    console.log('\n📊 FIX ROUTING SUMMARY');
    console.log('='.repeat(60));
    console.log(`   Total issues: ${result.summary.total}`);
    console.log('');
    console.log('   By Tier:');
    console.log(`     Tier 1 (Native fix):     ${result.summary.tier1Count} (${this.percent(result.summary.tier1Count, result.summary.total)}%)`);
    console.log(`     Tier 2 (Fixer tool):     ${result.summary.tier2Count} (${this.percent(result.summary.tier2Count, result.summary.total)}%)`);
    console.log(`     Tier 2.5 (Cloud API):    ${result.summary.tier2_5Count} (${this.percent(result.summary.tier2_5Count, result.summary.total)}%)`);
    console.log(`     Tier 3 (AI needed):      ${result.summary.tier3Count} (${this.percent(result.summary.tier3Count, result.summary.total)}%)`);
    console.log('');
    console.log(`   Safe for auto-apply: ${result.summary.safeForAutoApply} (${this.percent(result.summary.safeForAutoApply, result.summary.total)}%)`);
    console.log(`   Cloud fixer eligible: ${result.summary.cloudFixerEligible} issues`);
    console.log(`   Estimated AI cost:   $${result.summary.estimatedCost.toFixed(2)}`);
    console.log('');

    // Print batches
    console.log('   Tier 1 Batches:');
    for (const batch of result.tier1) {
      console.log(`     - ${batch.fixer}: ${batch.issues.length} issues, ${batch.files.length} files (${batch.estimatedTime})`);
    }

    console.log('   Tier 2 Batches:');
    for (const batch of result.tier2) {
      console.log(`     - ${batch.fixer}: ${batch.issues.length} issues, ${batch.files.length} files (${batch.estimatedTime})`);
    }

    // Session 60: Print Tier 2.5 cloud fixer batches
    if (result.tier2_5.length > 0) {
      console.log('   Tier 2.5 Batches (Cloud API - PRO tier):');
      for (const batch of result.tier2_5) {
        console.log(`     - ${batch.fixer}: ${batch.issues.length} issues, ${batch.files.length} files (async API)`);
      }
    }

    console.log('   Tier 3 Batches:');
    for (const batch of result.tier3) {
      console.log(`     - ${batch.fixer}: ${batch.issues.length} issues, ${batch.files.length} files (${batch.estimatedTime})`);
    }
  }

  private percent(part: number, total: number): string {
    if (total === 0) return '0';
    return ((part / total) * 100).toFixed(1);
  }
}

// Export singleton instance
export const fixRouter = new FixRouter();
