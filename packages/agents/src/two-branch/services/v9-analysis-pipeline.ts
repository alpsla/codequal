/**
 * V9 Analysis Pipeline
 *
 * Unified pipeline for PR/repository analysis across ALL languages.
 * This is the single entry point for:
 * - API service
 * - CLI tools
 * - Integration tests
 *
 * Flow:
 * 1. Tool Orchestration → Issues
 * 2. ScanFixExecutor → Fix Results (recommendations or applied fixes)
 * 3. Merge Fix Results → Enriched Issues with correctedCode
 * 4. Report Generation → V9 Report with LSP data
 *
 * Supports: Python, Java, TypeScript, Go, Rust, Ruby, PHP
 *
 * @module two-branch/services/v9-analysis-pipeline
 */

import { ScanFixExecutor, DetectedIssue, ScanFixResult } from '../../fix-agent/scan-fix-executor';
import { V9GroupedReportFormatter, EnrichedIssue } from '../analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../standard/orchestrator/model-config-resolver';
import { groupIssues, IssueGroup } from '../utils/issue-grouping';
import { LanguageDetector } from '../utils/language-detector';
import { V9RepositoryManager } from './v9-repository-manager';
import * as fs from 'fs';

// Re-export EnrichedIssue for consumers
export { EnrichedIssue } from '../analyzers/v9-grouped-report-formatter';

// ============================================================================
// TYPES
// ============================================================================

export type SupportedLanguage = 'python' | 'java' | 'typescript' | 'go' | 'rust' | 'ruby' | 'php';
export type UserTier = 'basic' | 'pro';
export type RepoSize = 'small' | 'medium' | 'large' | 'enterprise';

export interface PipelineConfig {
  /** Repository URL (GitHub) - will be cloned automatically */
  repoUrl?: string;

  /** Repository path (local) - alternative to repoUrl */
  repoPath?: string;

  /** PR number for two-branch comparison */
  prNumber?: number;

  /** Programming language (auto-detected if not provided) */
  language?: SupportedLanguage;

  /** User tier: basic (recommendations) or pro (apply fixes) */
  userTier: UserTier;

  /** Repository size for model selection */
  repoSize?: RepoSize;

  /**
   * Maximum issues to process through fix flow.
   *
   * FOR TESTING ONLY - In production, process ALL issues.
   * Our value is completeness. Pattern caching handles cost optimization.
   *
   * If not set, defaults to processing all issues (no limit).
   */
  maxIssuesToFix?: number;

  /** Main branch path for two-branch comparison (optional) */
  mainBranchPath?: string;

  /** PR metadata (optional) */
  prMetadata?: {
    prNumber?: number;
    prTitle?: string;
    prAuthor?: string;
    baseBranch?: string;
    headBranch?: string;
    repoUrl?: string;
    organizationName?: string;
  };

  /** Progress callback */
  onProgress?: (update: PipelineProgress) => void;

  /** Verbose logging */
  verbose?: boolean;
}

export interface PipelineProgress {
  phase: 'orchestration' | 'categorization' | 'fixing' | 'enrichment' | 'reporting' | 'complete';
  current: number;
  total: number;
  message: string;
}

// EnrichedIssue is imported from v9-grouped-report-formatter

export interface PipelineResult {
  success: boolean;

  /** Analysis summary */
  summary: {
    totalIssues: number;
    newIssues: number;
    existingIssues: number;
    fixedIssues: number;
    recommendedFixes: number;
    issueGroups: number;
    language: SupportedLanguage;
    userTier: UserTier;
  };

  /** Enriched issues with correctedCode */
  issues: EnrichedIssue[];

  /** Issue groups for cost optimization */
  groups: IssueGroup[];

  /** Fix execution results */
  fixResults: ScanFixResult;

  /** Generated V9 report */
  report: {
    markdown: string;
    decision: 'APPROVED' | 'DECLINED';
    blockingCount: number;
  };

  /** LSP/IDE integration data */
  lspData: {
    /** Issues with correctedCode (available for Code Actions) */
    fixableIssues: EnrichedIssue[];
    /** Total count of LSP-ready fixes */
    codeActionCount: number;
  };

  /** Performance metrics */
  metrics: {
    totalDurationMs: number;
    orchestrationMs: number;
    fixingMs: number;
    reportingMs: number;
  };
}

// ============================================================================
// TOOL ORCHESTRATOR FACTORY
// ============================================================================

/**
 * Tool orchestrator interface for type safety
 */
interface ToolOrchestrator {
  orchestrate(repoPath: string, branch: string, options?: any): Promise<any>;
}

/**
 * Get the appropriate tool orchestrator for the language
 *
 * Currently calibrated languages with patterns in Supabase:
 * - Java (515+ patterns)
 * - TypeScript (patterns available)
 * - Python (17+ patterns)
 */
async function getToolOrchestrator(language: SupportedLanguage): Promise<ToolOrchestrator> {
  switch (language) {
    case 'python': {
      const { PythonToolOrchestrator } = await import('../tools/python/python-tool-orchestrator');
      return new PythonToolOrchestrator();
    }
    case 'typescript': {
      const { TypeScriptToolOrchestrator } = await import('../tools/typescript/typescript-tool-orchestrator');
      return new TypeScriptToolOrchestrator();
    }
    case 'java': {
      const { JavaToolOrchestrator } = await import('../tools/java/java-tool-orchestrator');
      return new JavaToolOrchestrator();
    }
    case 'go':
    case 'rust':
    case 'ruby':
    case 'php':
    default: {
      // For languages without specialized orchestrator or patterns,
      // warn and use TypeScript orchestrator as fallback
      // TODO: Create language-specific orchestrators and calibrate patterns
      console.warn(`[Pipeline] Language '${language}' not yet calibrated. Using TypeScript orchestrator as fallback.`);
      console.warn(`[Pipeline] To add support: 1) Create orchestrator 2) Run pattern calibration`);
      const { TypeScriptToolOrchestrator } = await import('../tools/typescript/typescript-tool-orchestrator');
      return new TypeScriptToolOrchestrator();
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge fix results into issues
 *
 * This is the critical function that connects ScanFixExecutor output
 * to the report formatter input, ensuring correctedCode flows through.
 */
export function mergeFixResultsIntoIssues<T extends { file: string; line?: number; rule: string; fixSuggestion?: any }>(
  issues: T[],
  fixResults: ScanFixResult
): T[] {
  // Create a map of fix results by file:line:rule key
  const fixMap = new Map<string, { correctedCode: string; confidence?: number }>();

  // Add fixes from fixedButNeedsReview (Tier 3 AI fixes)
  if (fixResults.fixedButNeedsReview) {
    for (const fix of fixResults.fixedButNeedsReview) {
      if (fix.correctedCode) {
        const key = `${fix.file}::${fix.line}::${fix.rule}`;
        fixMap.set(key, {
          correctedCode: fix.correctedCode,
          confidence: fix.confidence,
        });
      }
    }
  }

  // Add fixes from details (Tier 1/2 tool fixes)
  // These don't have correctedCode in the current structure,
  // but we track the files that were fixed
  const fixedFiles = new Set<string>();
  for (const detail of fixResults.details) {
    if (detail.success) {
      for (const file of detail.filesFixed) {
        fixedFiles.add(file);
      }
    }
  }

  // Merge into issues
  return issues.map(issue => {
    const key = `${issue.file}::${issue.line}::${issue.rule}`;
    const fixData = fixMap.get(key);

    if (fixData?.correctedCode) {
      // We have a specific fix for this issue
      return {
        ...issue,
        fixSuggestion: {
          fix: issue.fixSuggestion?.fix || 'Apply the recommended fix',
          correctedCode: fixData.correctedCode,
          explanation: issue.fixSuggestion?.explanation ||
            `Automatically generated fix for ${issue.rule}`,
          bestPractices: issue.fixSuggestion?.bestPractices || [],
        },
      };
    }

    // Return issue unchanged if no fix available
    return issue;
  });
}

/**
 * Normalize severity to allowed values
 */
function normalizeSeverity(severity: string | undefined): 'critical' | 'high' | 'medium' | 'low' {
  const s = (severity || 'medium').toLowerCase();
  if (s === 'critical' || s === 'error') return 'critical';
  if (s === 'high' || s === 'warning') return 'high';
  if (s === 'low' || s === 'info') return 'low';
  return 'medium';
}

/**
 * Detect issue category based on tool and rule
 */
function detectIssueCategory(tool: string, rule?: string): string {
  // Security tools
  if (tool === 'bandit' || tool === 'semgrep' || tool === 'gosec') return 'Security';
  if (tool === 'ruff' && rule?.startsWith('S')) return 'Security';

  // Dependency tools
  if (tool === 'safety' || tool === 'pip-audit' || tool === 'npm-audit' ||
      tool === 'dependency-check' || tool === 'snyk') return 'Dependencies';

  // Type checking
  if (tool === 'mypy' || tool === 'typescript' || tool === 'tsc') return 'Type Safety';

  // Linting/Quality
  if (tool === 'pylint' || tool === 'ruff' || tool === 'eslint' ||
      tool === 'golangci-lint' || tool === 'clippy') return 'Code Quality';

  // Performance
  if (rule?.toLowerCase().includes('perf') || rule?.toLowerCase().includes('performance')) {
    return 'Performance';
  }

  return 'Code Quality';
}

/**
 * Categorize issues as NEW vs EXISTING based on main branch comparison
 */
function categorizeIssues(
  prIssues: any[],
  mainIssues: any[]
): { categorizedIssues: any[]; newCount: number; existingCount: number } {
  // Create fingerprints for main branch issues
  const mainFingerprints = new Set(
    mainIssues.map(i => `${i.file}::${i.tool}::${i.rule || 'no-rule'}`)
  );

  let newCount = 0;
  let existingCount = 0;

  const categorizedIssues = prIssues.map(issue => {
    const fp = `${issue.file}::${issue.tool}::${issue.rule || 'no-rule'}`;
    const isNew = !mainFingerprints.has(fp);

    if (isNew) newCount++;
    else existingCount++;

    return {
      ...issue,
      category: isNew ? 'NEW' : 'EXISTING_REST',
    };
  });

  return { categorizedIssues, newCount, existingCount };
}

// ============================================================================
// V9 ANALYSIS PIPELINE
// ============================================================================

/**
 * V9 Analysis Pipeline
 *
 * Unified entry point for repository/PR analysis across all languages.
 * Handles the complete flow from tool execution to report generation.
 *
 * Input: repoUrl + tier (language auto-detected)
 * Output: Report + LSP data with correctedCode
 */
export class V9AnalysisPipeline {
  private config: PipelineConfig;
  private repoManager: V9RepositoryManager;
  private clonedRepoPath?: string;  // Track if we cloned (for cleanup)
  private detectedLanguage?: SupportedLanguage;

  constructor(config: PipelineConfig) {
    // Validate: must have either repoUrl or repoPath
    if (!config.repoUrl && !config.repoPath) {
      throw new Error('Pipeline requires either repoUrl or repoPath');
    }

    this.repoManager = new V9RepositoryManager();
    this.config = {
      repoSize: 'medium',
      // No default limit - process ALL issues in production
      // maxIssuesToFix is only set explicitly for testing
      mainBranchPath: '',
      prMetadata: {},
      onProgress: () => { /* Default no-op progress handler */ },
      verbose: false,
      ...config,
    };

  }

  /**
   * Run the complete analysis pipeline
   */
  async analyze(): Promise<PipelineResult> {
    const startTime = Date.now();
    const metrics = {
      totalDurationMs: 0,
      orchestrationMs: 0,
      fixingMs: 0,
      reportingMs: 0,
    };

    try {
      // ========== STEP 0: Setup (clone if needed, detect language) ==========
      this.report('orchestration', 0, 5, 'Initializing pipeline...');

      // Clone repository if URL provided (use V9RepositoryManager for cloning)
      let repoPath = this.config.repoPath;
      if (this.config.repoUrl && !repoPath) {
        // Generate unique temp path
        const timestamp = Date.now();
        const repoName = this.config.repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
        repoPath = `/tmp/v9-pipeline-${repoName}-${timestamp}`;

        // Use V9RepositoryManager.prepareRepository for cloning
        // Note: This handles cleanup of existing path, cloning, and branch setup
        await this.repoManager.prepareRepository(
          this.config.repoUrl,
          repoPath,
          { base: 'main', pr: 'HEAD' },  // Default branches
          { depth: 10, timeoutSeconds: 300 }
        );
        this.clonedRepoPath = repoPath;  // Track for cleanup
      }

      if (!repoPath || !fs.existsSync(repoPath)) {
        throw new Error(`Repository path not found: ${repoPath}`);
      }

      // Auto-detect language if not provided
      let language = this.config.language;
      if (!language) {
        this.report('orchestration', 1, 5, 'Detecting language...');
        const detected = await LanguageDetector.detectLanguage(repoPath);
        language = this.mapToSupportedLanguage(detected);
        this.detectedLanguage = language;
        this.report('orchestration', 1, 5, `Detected language: ${language}`);
      }

      // ========== STEP 1: Tool Orchestration ==========
      this.report('orchestration', 2, 5, 'Starting tool orchestration...');
      const orchestrationStart = Date.now();

      const orchestrator = await getToolOrchestrator(language);

      // Scan entire repository (no file selection - scan everything)
      const prResult = await orchestrator.orchestrate(
        repoPath,
        'base',
        {
          analysisMode: 'complete',
          userTier: this.config.userTier,
        }
      );

      const prIssues = prResult.toolResults?.flatMap((tr: any) => tr.issues || []) || [];

      // Scan main branch if provided (for two-branch comparison)
      let mainIssues: any[] = [];
      if (this.config.mainBranchPath) {
        this.report('orchestration', 3, 5, 'Scanning main branch for comparison...');
        const mainResult = await orchestrator.orchestrate(
          this.config.mainBranchPath,
          'base',
          { analysisMode: 'complete' }
        );
        mainIssues = mainResult.toolResults?.flatMap((tr: any) => tr.issues || []) || [];
      }

      metrics.orchestrationMs = Date.now() - orchestrationStart;

      if (this.config.verbose) {
        console.log(`[Pipeline] Orchestration: ${prIssues.length} PR issues, ${mainIssues.length} main issues`);
      }

      // ========== STEP 2: Issue Categorization ==========
      this.report('categorization', 0, 1, 'Categorizing issues...');

      const { categorizedIssues, newCount, existingCount } = categorizeIssues(prIssues, mainIssues);

      // ========== STEP 3: Fix Execution ==========
      // In production: process ALL issues (no limit)
      // maxIssuesToFix is only set for testing to speed up iteration
      const maxToFix = this.config.maxIssuesToFix;  // undefined = no limit
      const issueCountToProcess = maxToFix ? Math.min(categorizedIssues.length, maxToFix) : categorizedIssues.length;
      this.report('fixing', 0, 1, `Processing ${issueCountToProcess} issues through fix flow...`);
      const fixingStart = Date.now();

      // Prioritize fixable tools (process most fixable first)
      const toolPriority: Record<string, number> = {
        'ruff': 1, 'eslint': 1, 'mypy': 2, 'typescript': 2,
        'semgrep': 3, 'pip-audit': 4, 'npm-audit': 4, 'bandit': 5
      };

      const sortedIssues = [...categorizedIssues].sort((a, b) =>
        (toolPriority[a.tool] || 99) - (toolPriority[b.tool] || 99)
      );

      // Apply limit only if explicitly set (testing mode)
      const issuesToFix: DetectedIssue[] = (maxToFix ? sortedIssues.slice(0, maxToFix) : sortedIssues)
        .map(issue => ({
          file: issue.file,
          line: issue.line,
          column: issue.column || 1,
          rule: issue.rule || 'unknown',
          tool: issue.tool,
          message: issue.message,
          severity: issue.severity || 'medium',
          category: issue.category,
        }));

      const fixExecutor = new ScanFixExecutor({
        workingDir: repoPath,
        language: language,
        outputMode: 'patch',
        dryRun: this.config.userTier === 'basic',  // BASIC = recommendations, PRO = apply
        userTier: this.config.userTier,
        fixWithReview: true,
        verbose: this.config.verbose,
      });

      const fixResults = await fixExecutor.executeFixes(issuesToFix);

      metrics.fixingMs = Date.now() - fixingStart;

      if (this.config.verbose) {
        console.log(`[Pipeline] Fix results: ${fixResults.summary.fixedIssues} fixed, ` +
          `${fixResults.fixedButNeedsReview?.length || 0} with correctedCode`);
      }

      // ========== STEP 4: Create Enriched Issues ==========
      this.report('enrichment', 0, 1, 'Enriching issues with fix data...');

      // Format issues for report
      const formattedIssues: EnrichedIssue[] = categorizedIssues.map(issue => ({
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        tool: issue.tool || 'unknown',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        column: issue.column,
        message: issue.message || '',
        severity: normalizeSeverity(issue.severity),
        category: issue.category || 'NEW',
        detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : undefined),
        snippet: issue.snippet,
      }));

      // Merge fix results into issues (the critical step!)
      const enrichedIssues = mergeFixResultsIntoIssues(formattedIssues, fixResults);

      // Count issues with correctedCode (available for LSP Code Actions)
      const fixableIssues = enrichedIssues.filter(i => i.fixSuggestion?.correctedCode);

      if (this.config.verbose) {
        console.log(`[Pipeline] Enriched issues: ${fixableIssues.length} with correctedCode`);
      }

      // ========== STEP 5: Issue Grouping ==========
      // Cast to the groupIssues expected type (we ensure line is always set above)
      const issuesForGrouping = enrichedIssues.map(i => ({
        ...i,
        line: i.line ?? 0,  // Ensure line is always a number
      }));
      const groupingResult = groupIssues(issuesForGrouping);

      // ========== STEP 6: Report Generation ==========
      this.report('reporting', 0, 1, 'Generating V9 report...');
      const reportingStart = Date.now();

      // Use PRO tier for AI enrichment or null for BASIC ($0 cost)
      const modelConfigResolver = this.config.userTier === 'pro'
        ? new ModelConfigResolver()
        : null;

      const formatter = new V9GroupedReportFormatter(
        modelConfigResolver,
        language,  // Use local variable (auto-detected or provided)
        this.config.repoSize
      );

      const blockingIssues = enrichedIssues.filter(
        i => i.category === 'NEW' && (i.severity === 'critical' || i.severity === 'high')
      );

      const metadata = {
        repository: this.config.prMetadata?.organizationName || 'unknown',
        repoUrl: this.config.prMetadata?.repoUrl || '',
        repoPath: repoPath,  // Use local variable (cloned or provided)
        prNumber: this.config.prMetadata?.prNumber || 0,
        prTitle: this.config.prMetadata?.prTitle || 'Analysis Report',
        branch: this.config.prMetadata?.headBranch || 'unknown',
        baseBranch: this.config.prMetadata?.baseBranch || 'main',
        prAuthor: this.config.prMetadata?.prAuthor || 'unknown',
        prAuthorEmail: '',
        organizationName: this.config.prMetadata?.organizationName || 'unknown',
        totalFiles: 0,
        totalLinesOfCode: 0,
        filesModified: 0,
        linesAdded: 0,
        linesDeleted: 0,
        decision: blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED',
        blockingCount: blockingIssues.length,
        totalDuration: Date.now() - startTime,
        cloneTime: 0,
        analysisTime: metrics.orchestrationMs + metrics.fixingMs,
        reportGenerationTime: 0,
        analyzedAt: new Date().toISOString(),
        analyzerVersion: '9.0.0',
        toolPerformance: prResult.toolPerformance,
        agentPerformance: prResult.agentPerformance,
        // SESSION 91 FIX: Pass user tier for tier-specific report content (BASIC vs PRO)
        userTier: this.config.userTier,
      };

      const reportResult = await formatter.generateGroupedReport(
        enrichedIssues,
        groupingResult.groups,
        metadata
      );

      metrics.reportingMs = Date.now() - reportingStart;
      metrics.totalDurationMs = Date.now() - startTime;

      this.report('complete', 1, 1,
        `Complete: ${enrichedIssues.length} issues, ${fixableIssues.length} with fixes`);

      // ========== RETURN RESULT ==========
      return {
        success: true,
        summary: {
          totalIssues: enrichedIssues.length,
          newIssues: newCount,
          existingIssues: existingCount,
          fixedIssues: fixResults.summary.fixedIssues,
          recommendedFixes: fixableIssues.length,
          issueGroups: groupingResult.groups.length,
          language: language,  // Use local variable (auto-detected or provided)
          userTier: this.config.userTier,
        },
        issues: enrichedIssues,
        groups: groupingResult.groups,
        fixResults,
        report: {
          markdown: reportResult.markdown,
          decision: blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED',
          blockingCount: blockingIssues.length,
        },
        lspData: {
          fixableIssues,
          codeActionCount: fixableIssues.length,
        },
        metrics,
      };
    } finally {
      // Cleanup cloned repository
      await this.cleanup();
    }
  }

  /**
   * Report progress
   */
  private report(
    phase: PipelineProgress['phase'],
    current: number,
    total: number,
    message: string
  ): void {
    this.config.onProgress?.({ phase, current, total, message });
    if (this.config.verbose) {
      console.log(`[Pipeline:${phase}] ${message}`);
    }
  }

  // NOTE: cloneRepository() and cleanup shell commands removed
  // Now using V9RepositoryManager for consistent behavior:
  // - prepareRepository() for cloning (with safety checks, caching support)
  // - cleanup() for deletion (with safety checks, cross-platform support)

  /**
   * Map detected language to SupportedLanguage type
   */
  private mapToSupportedLanguage(detected: string | null): SupportedLanguage {
    if (!detected) {
      console.warn('[Pipeline] Could not detect language, defaulting to typescript');
      return 'typescript';
    }

    const languageMap: Record<string, SupportedLanguage> = {
      'python': 'python',
      'java': 'java',
      'typescript': 'typescript',
      'javascript': 'typescript',  // Use TypeScript tools for JavaScript
      'go': 'go',
      'rust': 'rust',
      'ruby': 'ruby',
      'php': 'php',
    };

    const mapped = languageMap[detected.toLowerCase()];
    if (!mapped) {
      console.warn(`[Pipeline] Unknown language '${detected}', defaulting to typescript`);
      return 'typescript';
    }

    return mapped;
  }

  /**
   * Cleanup cloned repository
   * Reuses the comprehensive cleanup service with safety checks
   */
  private async cleanup(): Promise<void> {
    // Cleanup cloned repository
    if (this.clonedRepoPath) {
      try {
        if (this.config.verbose) {
          console.log(`[Pipeline] Cleaning up: ${this.clonedRepoPath}`);
        }
        // Use V9RepositoryManager.cleanup() - handles safety checks and cross-platform cleanup
        await this.repoManager.cleanup(this.clonedRepoPath);
      } catch (error) {
        console.error(`[Pipeline] Cleanup failed: ${error}`);
      }
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick analysis helper
 */
export async function analyzeRepository(
  repoPath: string,
  language: SupportedLanguage,
  userTier: UserTier = 'basic',
  options?: Partial<PipelineConfig>
): Promise<PipelineResult> {
  const pipeline = new V9AnalysisPipeline({
    repoPath,
    language,
    userTier,
    ...options,
  });

  return pipeline.analyze();
}

/**
 * Quick PR analysis helper
 */
export async function analyzePR(
  repoPath: string,
  mainBranchPath: string,
  language: SupportedLanguage,
  userTier: UserTier = 'basic',
  prMetadata?: PipelineConfig['prMetadata'],
  options?: Partial<PipelineConfig>
): Promise<PipelineResult> {
  const pipeline = new V9AnalysisPipeline({
    repoPath,
    mainBranchPath,
    language,
    userTier,
    prMetadata,
    ...options,
  });

  return pipeline.analyze();
}
