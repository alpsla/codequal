/**
 * Two-Tier Fix Pipeline
 *
 * Orchestrates the complete fix flow from validators to role agents:
 *
 * 1. Validators detect issues
 * 2. SupabaseFixRouter routes issues based on confidence:
 *    - Tier 1 (≥60%): Direct to Role Agents with tool fix
 *    - Tier 2 (<60%): Via AI-Fixer Agent, then to Role Agents
 * 3. Role Agents receive (not generate) fix recommendations
 * 4. Report Orchestrator compiles final report with dual output (files + URLs)
 *
 * Key Design Decisions:
 * - 60% confidence threshold for Tier 1 vs Tier 2 routing
 * - Tool context is passed as "prep work" even for Tier 2 issues
 * - Role Agents don't generate fixes - they categorize and enhance
 * - Dependency issues are report-only (not auto-fixed)
 */

import {
  SupabaseFixRouter,
  getSupabaseFixRouter,
  type IssueToRoute,
  type RoutedIssue,
  type RoutingResult,
} from '../infrastructure/supabase';

import {
  AIFixerAgent,
  getAIFixerAgent,
  type AIFixerIssue,
  type EnrichedIssue,
  type AIFixerBatchResult,
} from '../agents';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'java' | 'typescript' | 'javascript' | 'python' | 'go' | 'rust';

/**
 * Validator issue from analysis tools
 */
export interface ValidatorIssue {
  id: string;
  validatorToolId: string;
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;
  originalFix?: string; // Tool's original fix suggestion
}

/**
 * Issue ready for Role Agent processing
 */
export interface RoleAgentIssue {
  // Original issue data
  id: string;
  validatorToolId: string;
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;

  // Routing info
  tier: 1 | 2;
  fixerName: string;
  confidence: number;
  safeForAutoApply: boolean;

  // Fix recommendation (from tool or AI)
  fixRecommendation: {
    fix: string;
    correctedCode: string;
    explanation?: string;
    issueDescription?: {
      what: string;
      why: string;
      causes: string[];
      impact: string;
    };
    bestPractices?: string[];
    source: 'tool' | 'ai';
    model?: string;
  };

  // Category for role agent routing
  category: 'security' | 'performance' | 'architecture' | 'codequality' | 'dependency';
}

/**
 * Pipeline result after processing all issues
 */
export interface PipelineResult {
  // Issues ready for role agents (grouped by category)
  issuesByCategory: Record<string, RoleAgentIssue[]>;

  // Summary statistics
  summary: {
    total: number;
    tier1Count: number;
    tier2Count: number;
    tier1AutoFixable: number;
    tier2AIProcessed: number;
    byCategory: Record<string, number>;
    totalCost: number;
    processingTimeMs: number;
  };

  // Failed issues
  failed: {
    issue: ValidatorIssue;
    error: string;
  }[];
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  language: SupportedLanguage;
  parallel?: number;
  verbose?: boolean;
  skipDependencyFixes?: boolean; // Dependency issues are report-only
}

// ============================================================================
// TWO-TIER FIX PIPELINE
// ============================================================================

export class TwoTierFixPipeline {
  private router: SupabaseFixRouter;
  private aiFixerAgent: AIFixerAgent;

  constructor() {
    this.router = getSupabaseFixRouter();
    this.aiFixerAgent = getAIFixerAgent();
  }

  // ==========================================================================
  // MAIN PIPELINE
  // ==========================================================================

  /**
   * Process all issues through the two-tier fix pipeline
   */
  async process(
    issues: ValidatorIssue[],
    config: PipelineConfig
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    console.log('\n🔄 TWO-TIER FIX PIPELINE');
    console.log('='.repeat(60));
    console.log(`   Language: ${config.language}`);
    console.log(`   Issues: ${issues.length}`);
    console.log('');

    // Step 1: Route issues through SupabaseFixRouter
    console.log('📍 Step 1: Routing issues...');
    const routingResult = await this.routeIssues(issues);
    console.log(
      `   Tier 1: ${routingResult.summary.tier1Count} (≥60% confidence)`
    );
    console.log(
      `   Tier 2: ${routingResult.summary.tier2Count} (<60% confidence, needs AI)`
    );
    console.log('');

    // Step 2: Process Tier 2 issues through AI-Fixer
    console.log('🤖 Step 2: AI-Fixer processing Tier 2 issues...');
    const aiResult = await this.processWithAIFixer(
      routingResult.tier2Batch?.issues || [],
      config
    );
    console.log(`   Processed: ${aiResult.summary.processed}`);
    console.log(`   Failed: ${aiResult.summary.failed}`);
    console.log(`   Cost: $${aiResult.summary.totalCost.toFixed(4)}`);
    console.log('');

    // Step 3: Combine and prepare for Role Agents
    console.log('📦 Step 3: Preparing issues for Role Agents...');
    const roleAgentIssues = this.prepareForRoleAgents(
      routingResult,
      aiResult,
      config
    );

    // Group by category
    const issuesByCategory = this.groupByCategory(roleAgentIssues);
    for (const [category, categoryIssues] of Object.entries(issuesByCategory)) {
      console.log(`   ${category}: ${categoryIssues.length} issues`);
    }
    console.log('');

    // Calculate summary
    const processingTimeMs = Date.now() - startTime;
    const failed = aiResult.failed.map((f) => ({
      issue: issues.find((i) => i.id === f.issue.id)!,
      error: f.error,
    }));

    const result: PipelineResult = {
      issuesByCategory,
      summary: {
        total: issues.length,
        tier1Count: routingResult.summary.tier1Count,
        tier2Count: routingResult.summary.tier2Count,
        tier1AutoFixable: routingResult.summary.safeForAutoApply,
        tier2AIProcessed: aiResult.summary.processed,
        byCategory: Object.fromEntries(
          Object.entries(issuesByCategory).map(([k, v]) => [k, v.length])
        ),
        totalCost: aiResult.summary.totalCost,
        processingTimeMs,
      },
      failed,
    };

    console.log('='.repeat(60));
    console.log(`✅ Pipeline Complete: ${processingTimeMs}ms`);
    console.log(`   Auto-fixable (Tier 1): ${result.summary.tier1AutoFixable}`);
    console.log(`   AI-enhanced (Tier 2): ${result.summary.tier2AIProcessed}`);
    console.log(`   Total cost: $${result.summary.totalCost.toFixed(4)}`);

    return result;
  }

  // ==========================================================================
  // ROUTING
  // ==========================================================================

  /**
   * Route issues through SupabaseFixRouter
   */
  private async routeIssues(issues: ValidatorIssue[]): Promise<RoutingResult> {
    const issueToRoute: IssueToRoute[] = issues.map((issue) => ({
      id: issue.id,
      validatorToolId: issue.validatorToolId,
      ruleId: issue.ruleId,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: issue.severity,
      codeContext: issue.codeContext,
      originalFix: issue.originalFix,
    }));

    return this.router.routeAndBatch(issueToRoute);
  }

  // ==========================================================================
  // AI-FIXER PROCESSING
  // ==========================================================================

  /**
   * Process Tier 2 issues through AI-Fixer Agent
   */
  private async processWithAIFixer(
    routedIssues: RoutedIssue[],
    config: PipelineConfig
  ): Promise<AIFixerBatchResult> {
    if (routedIssues.length === 0) {
      return {
        enrichedIssues: [],
        failed: [],
        summary: {
          total: 0,
          processed: 0,
          failed: 0,
          totalCost: 0,
          avgConfidence: 0,
          processingTimeMs: 0,
        },
      };
    }

    // Convert to AIFixerIssue format
    const aiFixerIssues: AIFixerIssue[] = routedIssues.map((issue) => ({
      id: issue.id,
      validatorToolId: issue.validatorToolId,
      ruleId: issue.ruleId,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: issue.severity,
      codeContext: issue.codeContext,
      language: config.language,
      toolContext: issue.toolContext,
      originalConfidence: issue.confidence,
    }));

    return this.aiFixerAgent.processBatch(aiFixerIssues, {
      parallel: config.parallel || 3,
      verbose: config.verbose,
    });
  }

  // ==========================================================================
  // ROLE AGENT PREPARATION
  // ==========================================================================

  /**
   * Prepare all issues for Role Agent processing
   */
  private prepareForRoleAgents(
    routingResult: RoutingResult,
    aiResult: AIFixerBatchResult,
    config: PipelineConfig
  ): RoleAgentIssue[] {
    const roleAgentIssues: RoleAgentIssue[] = [];

    // Process Tier 1 issues (from tool fixers)
    for (const batch of routingResult.tier1Batches) {
      for (const issue of batch.issues) {
        roleAgentIssues.push(
          this.convertToRoleAgentIssue(issue, 'tool', config)
        );
      }
    }

    // Process Tier 2 issues (from AI-Fixer)
    for (const enrichedIssue of aiResult.enrichedIssues) {
      roleAgentIssues.push(
        this.convertEnrichedToRoleAgentIssue(enrichedIssue, config)
      );
    }

    return roleAgentIssues;
  }

  /**
   * Convert routed issue to RoleAgentIssue (Tier 1)
   */
  private convertToRoleAgentIssue(
    issue: RoutedIssue,
    source: 'tool' | 'ai',
    config: PipelineConfig
  ): RoleAgentIssue {
    return {
      id: issue.id,
      validatorToolId: issue.validatorToolId,
      ruleId: issue.ruleId,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: issue.severity,
      codeContext: issue.codeContext,
      tier: issue.tier,
      fixerName: issue.fixerName,
      confidence: issue.confidence,
      safeForAutoApply: issue.safeForAutoApply,
      fixRecommendation: {
        fix: issue.toolContext?.toolSuggestion || `Apply ${issue.fixerName} fix`,
        correctedCode: issue.codeContext || '',
        explanation: issue.reason,
        bestPractices: issue.toolContext?.bestPractices
          ? [issue.toolContext.bestPractices]
          : [],
        source,
      },
      category: this.categorizeIssue(issue),
    };
  }

  /**
   * Convert AI-enriched issue to RoleAgentIssue (Tier 2)
   */
  private convertEnrichedToRoleAgentIssue(
    issue: EnrichedIssue,
    config: PipelineConfig
  ): RoleAgentIssue {
    return {
      id: issue.id,
      validatorToolId: issue.validatorToolId,
      ruleId: issue.ruleId,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: issue.severity,
      codeContext: issue.codeContext,
      tier: 2,
      fixerName: 'AI Fixer',
      confidence: issue.fixRecommendation.confidence,
      safeForAutoApply: false, // Tier 2 always requires review
      fixRecommendation: {
        fix: issue.fixRecommendation.fix,
        correctedCode: issue.fixRecommendation.correctedCode,
        explanation: issue.fixRecommendation.explanation,
        issueDescription: issue.fixRecommendation.issueDescription,
        bestPractices: issue.fixRecommendation.bestPractices,
        source: 'ai',
        model: issue.fixRecommendation.model,
      },
      category: this.categorizeIssue(issue),
    };
  }

  /**
   * Categorize issue for role agent routing
   */
  private categorizeIssue(
    issue: RoutedIssue | EnrichedIssue
  ): RoleAgentIssue['category'] {
    const toolId = issue.validatorToolId.toLowerCase();
    const ruleId = issue.ruleId.toLowerCase();
    const message = issue.message.toLowerCase();

    // Security detection
    if (
      toolId.includes('semgrep') ||
      toolId.includes('bandit') ||
      toolId.includes('gosec') ||
      ruleId.includes('security') ||
      ruleId.includes('injection') ||
      ruleId.includes('xss') ||
      ruleId.includes('sql') ||
      message.includes('vulnerability') ||
      message.includes('security')
    ) {
      return 'security';
    }

    // Dependency detection
    if (
      toolId.includes('dependency') ||
      toolId.includes('npm-audit') ||
      toolId.includes('pip-audit') ||
      toolId.includes('snyk') ||
      ruleId.includes('cve') ||
      message.includes('outdated') ||
      message.includes('vulnerable package')
    ) {
      return 'dependency';
    }

    // Performance detection
    if (
      ruleId.includes('performance') ||
      ruleId.includes('complexity') ||
      ruleId.includes('memory') ||
      message.includes('performance') ||
      message.includes('inefficient')
    ) {
      return 'performance';
    }

    // Architecture detection
    if (
      ruleId.includes('architecture') ||
      ruleId.includes('coupling') ||
      ruleId.includes('god') ||
      message.includes('design') ||
      message.includes('coupling')
    ) {
      return 'architecture';
    }

    // Default to code quality
    return 'codequality';
  }

  /**
   * Group issues by category for role agent routing
   */
  private groupByCategory(
    issues: RoleAgentIssue[]
  ): Record<string, RoleAgentIssue[]> {
    const grouped: Record<string, RoleAgentIssue[]> = {
      security: [],
      performance: [],
      architecture: [],
      codequality: [],
      dependency: [],
    };

    for (const issue of issues) {
      grouped[issue.category].push(issue);
    }

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(grouped).filter(([, v]) => v.length > 0)
    );
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

let pipelineInstance: TwoTierFixPipeline | null = null;

export function getTwoTierFixPipeline(): TwoTierFixPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new TwoTierFixPipeline();
  }
  return pipelineInstance;
}

/**
 * Process issues through the two-tier fix pipeline
 */
export async function processIssuesThroughPipeline(
  issues: ValidatorIssue[],
  config: PipelineConfig
): Promise<PipelineResult> {
  const pipeline = getTwoTierFixPipeline();
  return pipeline.process(issues, config);
}
