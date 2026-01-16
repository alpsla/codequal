/**
 * Pattern-Aware Fix Service
 *
 * Session 84: TRUE AI call savings via caching + templates
 *
 * Priority order for each issue:
 * 1. Check FIX CACHE (hash of rule+code) → 0 AI calls
 * 2. Check TEMPLATE TRANSFORMS (simple rules) → 0 AI calls
 * 3. Check KB pattern + apply → 1 AI call (lightweight)
 * 4. Fall back to full AI generation → 1 AI call (full)
 *
 * For story propagation:
 * - First issue: AI generates fix
 * - Remaining issues with SAME code: Reuse fix directly (0 AI calls)
 * - Remaining issues with DIFFERENT code: Apply template or AI
 *
 * Session 83: KB-first pattern propagation
 * Session 84: Fix caching + template transforms for true AI savings
 */

import * as crypto from 'crypto';
import {
  FreshContextFixService,
  FreshContextIssue,
  FreshContextConfig,
  StoryFixContext,
  FixResult,
} from './fresh-context-fixer';
import { FixStory } from './pr-fix-state';
import {
  getFixGuidance,
  FixGuidance,
  fixPatternGuidance,
} from '../fix-pattern-registry/fix-pattern-guidance';
import { getFixPatternRegistry } from '../fix-pattern-registry/fix-pattern-registry';
// Session 89: Import complexity detection from dedicated module
import {
  IssueComplexity,
  getFixComplexity,
  getModelForComplexity,
  getComplexityStats,
  resetComplexityStats,
  KB_SUCCESS_RATE_THRESHOLD,
} from './complexity-detection';

// ============================================================================
// Session 86: CRITICAL FIX - Prevent infinite loops and cost overruns
// ============================================================================

/**
 * Maximum retry attempts per story before skipping
 * Prevents infinite loops like Session 85's $25+ bug
 */
const MAX_STORY_ATTEMPTS = 3;

/**
 * Maximum total API calls per analysis run
 * Safety limit to prevent runaway costs
 * Session 86: Reduced from 50 to 30 (~$3 limit)
 */
const MAX_API_CALLS_PER_ANALYSIS = 30;

// ============================================================================
// Session 88: Complexity-Based Model Selection (Haiku vs Sonnet)
// Session 89: Moved to dedicated complexity-detection.ts module
// Re-export for backwards compatibility
// ============================================================================

export { IssueComplexity, getFixComplexity, getModelForComplexity } from './complexity-detection';

/**
 * Session 87: Parallel processing configuration
 * Process multiple stories concurrently to reduce total time
 * Default: 4 concurrent workers (reduces 20 min → 5 min for 21 stories)
 */
const PARALLEL_WORKERS = parseInt(process.env.PARALLEL_FIX_WORKERS || '4', 10);

/**
 * Session 86: Failed story report for final output
 * Tracks why stories failed and provides recommendations
 */
export interface FailedStoryReport {
  storyId: number;
  storyName: string;
  ruleIds: string[];
  files: string[];
  failureReason: 'max_attempts' | 'api_limit' | 'validation_failed' | 'error';
  attempts: number;
  lastError?: string;
  recommendation: string;
}

// ============================================================================
// Session 84: Fix Cache & Template Transforms
// ============================================================================

/**
 * Generate hash for fix caching
 */
function hashCode(ruleId: string, codeContext: string): string {
  const normalized = codeContext.trim().replace(/\s+/g, ' ');
  return crypto.createHash('md5').update(`${ruleId}:${normalized}`).digest('hex').substring(0, 16);
}

/**
 * Template transforms for simple rules that don't need AI
 * Returns null if no template available for the rule
 *
 * Session 85: Expanded template coverage to reduce AI costs
 */
function applyTemplateTransform(
  ruleId: string,
  codeContext: string,
  language: string
): { fixedCode: string; transformed: boolean } | null {
  const normalizedRule = ruleId.toLowerCase();

  // UnnecessarySemicolon - Remove semicolons after class/interface/enum bodies
  if (normalizedRule.includes('unnecessarysemicolon') || normalizedRule.includes('unnecessary_semicolon')) {
    // Pattern: }; at end of class/interface/enum → }
    const fixed = codeContext.replace(/}\s*;(\s*(?:\/\/.*)?$)/gm, '}$1');
    if (fixed !== codeContext) {
      return { fixedCode: fixed, transformed: true };
    }
  }

  // MissingOverride - Add @Override annotation
  if (normalizedRule.includes('missingoverride') || normalizedRule.includes('missing_override')) {
    // Look for method that should have @Override
    // Pattern: public/protected method without @Override before it
    const lines = codeContext.split('\n');
    const result: string[] = [];
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if this line is a method declaration that should have @Override
      if (/^(public|protected)\s+\w+.*\(.*\)\s*(\{|throws)/.test(trimmed)) {
        // Check if previous non-empty line is NOT @Override
        let prevIdx = i - 1;
        while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx--;

        if (prevIdx < 0 || !lines[prevIdx].trim().includes('@Override')) {
          // Get indentation from current line
          const indent = line.match(/^(\s*)/)?.[1] || '';
          result.push(`${indent}@Override`);
          modified = true;
        }
      }
      result.push(line);
    }

    if (modified) {
      return { fixedCode: result.join('\n'), transformed: true };
    }
  }

  // SESSION 85: Additional template transforms to reduce AI costs

  // SimplifyBooleanReturns - return condition instead of if/else true/false
  if (normalizedRule.includes('simplifybooleanreturns') || normalizedRule.includes('simplify_boolean')) {
    // Pattern: if (condition) return true; else return false; → return condition;
    let fixed = codeContext;
    fixed = fixed.replace(
      /if\s*\(([^)]+)\)\s*\{\s*return\s+true\s*;\s*\}\s*else\s*\{\s*return\s+false\s*;\s*\}/g,
      'return $1;'
    );
    fixed = fixed.replace(
      /if\s*\(([^)]+)\)\s*return\s+true\s*;\s*else\s*return\s+false\s*;/g,
      'return $1;'
    );
    fixed = fixed.replace(
      /if\s*\(([^)]+)\)\s*\{\s*return\s+false\s*;\s*\}\s*else\s*\{\s*return\s+true\s*;\s*\}/g,
      'return !($1);'
    );
    if (fixed !== codeContext) {
      return { fixedCode: fixed, transformed: true };
    }
  }

  // EmptyCatchBlock - Add logging or comment to empty catch
  if (normalizedRule.includes('emptycatchblock') || normalizedRule.includes('empty_catch')) {
    const fixed = codeContext.replace(
      /catch\s*\((\w+)\s+(\w+)\)\s*\{\s*\}/g,
      'catch ($1 $2) {\n    // TODO: Handle exception or add logging\n    $2.printStackTrace();\n}'
    );
    if (fixed !== codeContext) {
      return { fixedCode: fixed, transformed: true };
    }
  }

  // AvoidCatchingThrowable - Replace Throwable with Exception
  if (normalizedRule.includes('avoidcatchingthrowable') || normalizedRule.includes('catching_throwable')) {
    const fixed = codeContext.replace(/catch\s*\(\s*Throwable\s+/g, 'catch (Exception ');
    if (fixed !== codeContext) {
      return { fixedCode: fixed, transformed: true };
    }
  }

  // DoubleBraceInitialization - Convert to standard initialization
  if (normalizedRule.includes('doublebraceinitialization') || normalizedRule.includes('double_brace')) {
    // This is complex, but we can handle simple cases
    // Pattern: new ArrayList<>() {{ add(x); }} → Arrays.asList(x) or List.of(x)
    let fixed = codeContext;
    // Simple case: single add
    fixed = fixed.replace(
      /new\s+ArrayList<[^>]*>\(\)\s*\{\{\s*add\(([^)]+)\);\s*\}\}/g,
      'new ArrayList<>(List.of($1))'
    );
    if (fixed !== codeContext) {
      return { fixedCode: fixed, transformed: true };
    }
  }

  // ArrayTypeStyleCheck - Move brackets from variable to type
  if (normalizedRule.includes('arraytypestyle') || normalizedRule.includes('array_type')) {
    // Pattern: String args[] → String[] args
    const fixed = codeContext.replace(/(\w+)\s+(\w+)\[\]/g, '$1[] $2');
    if (fixed !== codeContext) {
      return { fixedCode: fixed, transformed: true };
    }
  }

  // NoPackage - Add package declaration (simple case)
  if (normalizedRule.includes('nopackage') && language === 'java') {
    // Only if it's a class file without package
    if (!codeContext.includes('package ') && codeContext.includes('class ')) {
      // Can't determine package from context, suggest placeholder
      const fixed = `// TODO: Add appropriate package declaration\n// package com.example;\n\n${codeContext}`;
      return { fixedCode: fixed, transformed: true };
    }
  }

  // UnusedFormalParameter - Prefix with underscore (Java convention)
  if (normalizedRule.includes('unusedformalparameter') || normalizedRule.includes('unused_parameter')) {
    // Pattern: void method(String unused) → void method(String _unused)
    // This is tricky without knowing which param is unused, skip for now
  }

  // UseUtilityClass - Add private constructor
  if (normalizedRule.includes('useutilityclass') || normalizedRule.includes('utility_class')) {
    // Add private constructor if class has only static methods and no constructor
    if (codeContext.includes('static ') && !codeContext.includes('private ') &&
        !codeContext.match(/\b\w+\s*\([^)]*\)\s*\{/)) {
      // Simple case: add private constructor suggestion
      const classMatch = codeContext.match(/class\s+(\w+)/);
      if (classMatch) {
        const className = classMatch[1];
        const insertPoint = codeContext.indexOf('{') + 1;
        const fixed = codeContext.slice(0, insertPoint) +
          `\n    private ${className}() {\n        // Utility class - prevent instantiation\n    }\n` +
          codeContext.slice(insertPoint);
        return { fixedCode: fixed, transformed: true };
      }
    }
  }

  // CloseResource - Add try-with-resources (simple case)
  if (normalizedRule.includes('closeresource') || normalizedRule.includes('close_resource')) {
    // Pattern: InputStream is = new FileInputStream(f); → try (InputStream is = new FileInputStream(f)) {
    // This is complex, needs context awareness - skip for now
  }

  // UseLocaleWithCaseConversions - Add Locale.ROOT
  if (normalizedRule.includes('uselocalewithcaseconversions') || normalizedRule.includes('locale')) {
    let fixed = codeContext;
    // .toLowerCase() → .toLowerCase(Locale.ROOT)
    fixed = fixed.replace(/\.toLowerCase\(\)/g, '.toLowerCase(Locale.ROOT)');
    // .toUpperCase() → .toUpperCase(Locale.ROOT)
    fixed = fixed.replace(/\.toUpperCase\(\)/g, '.toUpperCase(Locale.ROOT)');

    if (fixed !== codeContext) {
      // Add import if not present
      if (!fixed.includes('import java.util.Locale') && !fixed.includes('Locale.ROOT')) {
        // Can't add import here, but the fix is valid
      }
      return { fixedCode: fixed, transformed: true };
    }
  }

  // UnusedPrivateMethod - Comment out or mark for removal
  // (This is more complex, skip for now - needs semantic analysis)

  // UnusedImport - Remove the import line
  if (normalizedRule.includes('unusedimport') || normalizedRule.includes('unused_import')) {
    // If the code context is just an import line, return empty or comment
    if (codeContext.trim().startsWith('import ')) {
      return { fixedCode: `// REMOVED: ${codeContext.trim()}`, transformed: true };
    }
  }

  return null;
}

/**
 * Check if two code contexts are semantically identical
 * (ignoring whitespace differences)
 */
function isIdenticalCode(code1: string, code2: string): boolean {
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');
  return normalize(code1) === normalize(code2);
}

/**
 * Cached fix entry
 */
interface CachedFix {
  fixCode: string;
  confidence: number;
  source: 'ai' | 'template' | 'propagation';
  timestamp: number;
}

// ============================================================================
// Types
// ============================================================================

export interface PatternExample {
  ruleId: string;
  language: string;
  tool: string;
  /** The original problematic code */
  originalCode: string;
  /** The fixed code */
  fixedCode: string;
  /** How it was derived */
  source: 'kb' | 'ai';
  /** Confidence score 0-100 */
  confidence: number;
}

export interface PatternAwareConfig extends FreshContextConfig {
  /**
   * Apply a known pattern to an issue (lightweight AI call)
   * This should be CHEAPER than full generateFix - just pattern application
   */
  applyPattern?: (
    pattern: PatternExample,
    issue: FreshContextIssue,
    kbGuidance?: FixGuidance
  ) => Promise<{
    fixCode: string;
    success: boolean;
  }>;

  /**
   * Minimum KB success rate to try KB pattern first (default: 60%)
   */
  minKBSuccessRate?: number;

  /**
   * Enable pattern propagation for remaining issues (default: true)
   */
  enablePropagation?: boolean;

  /**
   * Session 88: Enable complexity-based model selection (Haiku vs Sonnet)
   * When true, simple issues use Haiku, complex issues use Sonnet
   * Default: true
   */
  enableComplexityRouting?: boolean;

  /**
   * Session 88: Generate fix with specific model override
   * Called instead of generateFix when complexity routing is enabled
   */
  generateFixWithModel?: (
    context: StoryFixContext,
    modelId: string
  ) => Promise<{
    fixCode: string;
    confidence: number;
  }>;

  /**
   * Session 88: Enable batch fixing (multiple issues in one AI call)
   * When true, all issues in a story are fixed in a single AI request
   * This reduces API calls and processing time: 180s → 75s for 3 issues
   * Default: true
   */
  enableBatchFix?: boolean;

  /**
   * Session 88: Generate batch fix for multiple issues
   * Returns an array of fixes corresponding to each input issue
   */
  generateBatchFix?: (
    context: StoryFixContext,
    issues: FreshContextIssue[]
  ) => Promise<{
    fixes: Array<{ fixCode: string; confidence: number }>;
    totalConfidence: number;
  }>;
}

export interface PatternAwareResult extends FixResult {
  /** How the fix was derived */
  source: 'kb_pattern' | 'ai_generation' | 'pattern_propagation';
  /** Pattern used (if propagated) */
  patternUsed?: PatternExample;
  /** Number of AI calls saved */
  aiCallsSaved: number;
}

// ============================================================================
// Pattern-Aware Fix Service
// ============================================================================

export class PatternAwareFixService extends FreshContextFixService {
  private patternConfig: PatternAwareConfig;
  private successfulPatterns: Map<string, PatternExample> = new Map();

  // Session 84: Fix cache by hash(ruleId + codeContext)
  private fixCache: Map<string, CachedFix> = new Map();

  // Session 84: Statistics tracking
  // Session 88: Added complexity routing and batch fixing stats
  // Session 89: Added KB-based routing stats
  private stats = {
    cacheHits: 0,
    templateTransforms: 0,
    directPropagation: 0,
    aiCalls: 0,
    totalIssues: 0,
    // Session 88: Track model selection by complexity
    haikuCalls: 0,
    sonnetCalls: 0,
    // Session 88: Track batch fixing
    batchFixCalls: 0,
    issuesFixedInBatch: 0,
    // Session 89: Track KB-based routing
    kbRoutedToSimple: 0,
  };

  // Session 86: CRITICAL - Prevent infinite loops
  private processedStories: Set<number> = new Set();
  private storyAttempts: Map<number, number> = new Map();
  private storyErrors: Map<number, string> = new Map();
  private globalApiCalls = 0;
  private aborted = false;
  private failedStoryReports: FailedStoryReport[] = [];

  // Session 86: AbortController support
  private abortSignal?: AbortSignal;
  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(
    prUrl: string,
    prNumber: number,
    repository: string,
    language: string,
    config: PatternAwareConfig
  ) {
    // Session 88: Wrap generateFix with complexity routing if enabled
    const enableComplexityRouting = config.enableComplexityRouting ?? true;
    let wrappedConfig = config;

    if (enableComplexityRouting && config.generateFixWithModel) {
      const originalGenerateFix = config.generateFix;
      const generateFixWithModel = config.generateFixWithModel;

      // Create a wrapped generateFix that uses complexity routing
      wrappedConfig = {
        ...config,
        generateFix: async (context: StoryFixContext) => {
          const primaryRule = context.story.ruleIds[0] || context.issues[0]?.ruleId || 'unknown';
          const complexity = getFixComplexity(primaryRule);
          const modelId = getModelForComplexity(complexity);

          console.log(`[PatternAwareFixer] Session 88: Complexity routing - ${complexity} issue, using ${complexity === 'simple' ? 'Haiku' : 'Sonnet'}`);

          return generateFixWithModel(context, modelId);
        },
      };
    }

    super(prUrl, prNumber, repository, language, wrappedConfig);
    this.patternConfig = {
      minKBSuccessRate: config.minKBSuccessRate ?? 60,
      enablePropagation: config.enablePropagation ?? true,
      enableComplexityRouting,
      // Session 88: Enable batch fixing by default
      enableBatchFix: config.enableBatchFix ?? true,
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // Session 84: Cache & Template Methods
  // --------------------------------------------------------------------------

  /**
   * Try to fix an issue WITHOUT AI (cache or template)
   * Returns null if AI is required
   */
  private tryFixWithoutAI(
    issue: FreshContextIssue
  ): { fixCode: string; source: 'cache' | 'template' } | null {
    const codeContext = issue.codeContext || '';

    // 1. Check fix cache first
    const cacheKey = hashCode(issue.ruleId, codeContext);
    const cached = this.fixCache.get(cacheKey);
    if (cached) {
      console.log(`[PatternAwareFixer] ✨ CACHE HIT for ${issue.ruleId} (hash: ${cacheKey})`);
      this.stats.cacheHits++;
      return { fixCode: cached.fixCode, source: 'cache' };
    }

    // 2. Try template transform
    const templateResult = applyTemplateTransform(issue.ruleId, codeContext, issue.language);
    if (templateResult?.transformed) {
      console.log(`[PatternAwareFixer] ⚡ TEMPLATE TRANSFORM for ${issue.ruleId}`);
      this.stats.templateTransforms++;

      // Cache the template result
      this.fixCache.set(cacheKey, {
        fixCode: templateResult.fixedCode,
        confidence: 90,
        source: 'template',
        timestamp: Date.now(),
      });

      return { fixCode: templateResult.fixedCode, source: 'template' };
    }

    return null;
  }

  /**
   * Cache a fix for future reuse
   */
  private cacheFixResult(
    issue: FreshContextIssue,
    fixCode: string,
    source: 'ai' | 'template' | 'propagation'
  ): void {
    const cacheKey = hashCode(issue.ruleId, issue.codeContext || '');
    this.fixCache.set(cacheKey, {
      fixCode,
      confidence: source === 'ai' ? 85 : 90,
      source,
      timestamp: Date.now(),
    });
  }

  /**
   * Session 86: Set abort signal for cancellation
   */
  setAbortSignal(signal: AbortSignal): void {
    this.abortSignal = signal;
    signal.addEventListener('abort', () => {
      console.log(`[PatternAwareFixer] ⛔ ABORT SIGNAL received - stopping processing`);
      this.aborted = true;
    });
  }

  /**
   * Session 86: Start processing with automatic timeout
   * @param timeoutMs Timeout in milliseconds (default: 10 minutes)
   */
  async processAllStoriesWithTimeout(
    timeoutMs: number = 10 * 60 * 1000
  ): Promise<ReturnType<typeof this.processAllStories>> {
    const controller = new AbortController();
    this.setAbortSignal(controller.signal);

    // Set up timeout
    this.timeoutId = setTimeout(() => {
      console.error(`[PatternAwareFixer] ⏱️ TIMEOUT (${timeoutMs}ms) - aborting all processing`);
      controller.abort();
    }, timeoutMs);

    try {
      const result = await this.processAllStories();
      return result;
    } finally {
      // Clean up timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = undefined;
      }
    }
  }

  /**
   * Session 86: Check if we can make another API call
   * Throws error if limit exceeded or abort signal received
   */
  private checkAndTrackApiCall(context: string): void {
    // Check abort signal
    if (this.abortSignal?.aborted || this.aborted) {
      throw new Error(`API processing aborted - abort signal received`);
    }
    if (this.globalApiCalls >= MAX_API_CALLS_PER_ANALYSIS) {
      this.aborted = true;
      throw new Error(`API call limit reached (${MAX_API_CALLS_PER_ANALYSIS}). Context: ${context}`);
    }
    this.globalApiCalls++;
    this.stats.aiCalls++;
    console.log(`[PatternAwareFixer] 🤖 API call ${this.globalApiCalls}/${MAX_API_CALLS_PER_ANALYSIS}: ${context}`);
  }

  /**
   * Session 88: Generate fix with complexity-based model selection
   *
   * Uses Haiku for simple issues (formatting, unused, style)
   * Uses Sonnet for complex issues (security, injection, auth)
   *
   * This provides ~54% cost savings on average:
   * - Haiku: $0.001/call (60% of issues)
   * - Sonnet: $0.01/call (40% of issues)
   */
  private async generateFixWithComplexityRouting(
    context: StoryFixContext,
    kbSuccessRate?: number
  ): Promise<{ fixCode: string; confidence: number; modelUsed: string }> {
    const primaryRule = context.story.ruleIds[0] || context.issues[0]?.ruleId || 'unknown';

    // Determine complexity and select model
    const complexity = getFixComplexity(primaryRule, kbSuccessRate);
    const modelId = getModelForComplexity(complexity);

    // Track model usage
    if (complexity === 'simple') {
      this.stats.haikuCalls++;
      console.log(`[PatternAwareFixer] 🐰 Using Haiku for simple issue: ${primaryRule}`);
    } else {
      this.stats.sonnetCalls++;
      console.log(`[PatternAwareFixer] 🎵 Using Sonnet for complex issue: ${primaryRule}`);
    }

    // Use model-aware generation if available, otherwise fall back to default
    if (this.patternConfig.generateFixWithModel) {
      const result = await this.patternConfig.generateFixWithModel(context, modelId);
      return { ...result, modelUsed: modelId };
    } else {
      // Fall back to default generation (model selection happens at AIFixerAgent level)
      const result = await this.patternConfig.generateFix(context);
      return { ...result, modelUsed: 'default' };
    }
  }

  /**
   * Session 88: Process multiple issues in a single AI call (batch fixing)
   *
   * Instead of: Issue1→AI→Validate→Issue2→AI→Validate (180s for 3 issues)
   * Uses: Issue1,2,3→AI(batch)→Validate once (75s for 3 issues, 58% faster)
   *
   * Benefits:
   * - Reduced API calls (1 instead of N)
   * - Reduced total latency
   * - AI can see all issues at once for better context
   * - Single validation pass
   *
   * @returns Array of fixes, one per issue
   */
  private async processBatchFix(
    story: FixStory,
    issues: FreshContextIssue[],
    kbGuidance?: FixGuidance | null
  ): Promise<PatternAwareResult> {
    console.log(`[PatternAwareFixer] 📦 Session 88: Batch fixing ${issues.length} issues in single AI call`);

    // Track this as a single batch API call
    this.checkAndTrackApiCall(`batch fix for story ${story.id} (${issues.length} issues)`);
    this.stats.batchFixCalls++;

    if (!this.patternConfig.generateBatchFix) {
      // Fall back to sequential processing if batch is not available
      console.log(`[PatternAwareFixer] ⚠️ Batch fix callback not available, falling back to sequential`);
      return this.generateWithAIAndPropagate(story, issues, kbGuidance);
    }

    try {
      // Build context for batch
      const context: StoryFixContext = {
        story,
        issues,
        priorAttempts: [],
        priorFixesInFiles: '',
        learnings: '',
        repositoryLearnings: '',
      };

      // Generate all fixes in one AI call
      const startTime = Date.now();
      const batchResult = await this.patternConfig.generateBatchFix(context, issues);
      const elapsedMs = Date.now() - startTime;

      console.log(`[PatternAwareFixer] 📦 Batch fix completed in ${elapsedMs}ms (${issues.length} issues)`);

      // Validate each fix
      let successCount = 0;
      const allFixes: string[] = [];

      for (let i = 0; i < issues.length && i < batchResult.fixes.length; i++) {
        const fix = batchResult.fixes[i];
        const issue = issues[i];

        // Validate this individual fix
        const validation = await this.patternConfig.validateFix(fix.fixCode, [issue]);

        if (validation.passed) {
          successCount++;
          allFixes.push(fix.fixCode);
          this.cacheFixResult(issue, fix.fixCode, 'ai');
          this.stats.issuesFixedInBatch++;
          console.log(`[PatternAwareFixer] ✅ Batch issue ${i + 1}/${issues.length} validated (confidence: ${fix.confidence}%)`);
        } else {
          console.log(`[PatternAwareFixer] ⚠️ Batch issue ${i + 1}/${issues.length} validation failed: ${validation.error}`);
          allFixes.push(''); // Placeholder for failed fix
        }
      }

      const allSuccess = successCount === issues.length;

      if (allSuccess) {
        // Record success in KB
        const primaryRule = story.ruleIds[0] || issues[0].ruleId;
        if (kbGuidance) {
          await fixPatternGuidance.recordFixAttempt(
            primaryRule,
            issues[0].language,
            issues[0].tool,
            true
          );
        }

        // Create and save pattern from first issue
        const pattern: PatternExample = {
          ruleId: primaryRule,
          language: issues[0].language,
          tool: issues[0].tool,
          originalCode: issues[0].codeContext || '',
          fixedCode: allFixes[0],
          source: 'ai',
          confidence: batchResult.totalConfidence,
        };

        await this.savePatternToKB(pattern, kbGuidance, issues[0].file, issues[0].line);
      }

      // Calculate AI calls saved: batch used 1 call instead of N
      const aiCallsSaved = issues.length - 1;

      return {
        storyId: story.id,
        success: allSuccess,
        fixCode: allFixes.join('\n\n// --- Next Issue Fix ---\n\n'),
        attemptNumber: 1,
        source: 'ai_generation',
        aiCallsSaved,
        patternUsed: undefined,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[PatternAwareFixer] ❌ Batch fix failed: ${errorMessage}`);

      // Fall back to sequential processing
      console.log(`[PatternAwareFixer] Falling back to sequential processing...`);
      return this.generateWithAIAndPropagate(story, issues, kbGuidance);
    }
  }

  /**
   * Get statistics about AI call savings
   * Session 88: Includes complexity routing and batch fixing stats
   * Session 89: Added KB-based routing stats
   */
  getAICallStats(): {
    cacheHits: number;
    templateTransforms: number;
    directPropagation: number;
    aiCalls: number;
    totalIssues: number;
    aiCallsSaved: number;
    savingsRate: string;
    // Session 88: Complexity routing stats
    haikuCalls: number;
    sonnetCalls: number;
    complexityRoutingSavings: string;
    // Session 88: Batch fixing stats
    batchFixCalls: number;
    issuesFixedInBatch: number;
    batchEfficiency: string;
    // Session 89: KB-based routing stats
    kbRoutedToSimple: number;
  } {
    const saved = this.stats.cacheHits + this.stats.templateTransforms + this.stats.directPropagation;
    const rate = this.stats.totalIssues > 0
      ? Math.round((saved / this.stats.totalIssues) * 100)
      : 0;

    // Session 88: Calculate cost savings from complexity routing
    // Haiku: ~$0.001/call, Sonnet: ~$0.01/call
    // If all were Sonnet: totalCost = aiCalls * $0.01
    // With routing: totalCost = haikuCalls * $0.001 + sonnetCalls * $0.01
    const allSonnetCost = this.stats.aiCalls * 0.01;
    const routedCost = this.stats.haikuCalls * 0.001 + this.stats.sonnetCalls * 0.01;
    const costSavings = allSonnetCost > 0
      ? Math.round(((allSonnetCost - routedCost) / allSonnetCost) * 100)
      : 0;

    // Session 88: Calculate batch efficiency
    // If we fixed N issues with M batch calls, efficiency = N/M
    const batchEfficiency = this.stats.batchFixCalls > 0
      ? `${(this.stats.issuesFixedInBatch / this.stats.batchFixCalls).toFixed(1)} issues/call`
      : 'N/A';

    // Session 89: Get KB routing stats from complexity detection module
    const complexityStats = getComplexityStats();

    return {
      ...this.stats,
      kbRoutedToSimple: complexityStats.kbRoutedToSimple,
      aiCallsSaved: saved,
      savingsRate: `${rate}%`,
      complexityRoutingSavings: `${costSavings}% (~$${(allSonnetCost - routedCost).toFixed(3)} saved)`,
      batchEfficiency,
    };
  }

  // --------------------------------------------------------------------------
  // Override: Process All Stories with Pattern Awareness
  // --------------------------------------------------------------------------

  /**
   * Override processAllStories to use KB-first + pattern propagation
   *
   * Session 86: CRITICAL FIX - Prevent infinite loops
   * - Track processed stories to prevent re-processing
   * - Enforce MAX_STORY_ATTEMPTS per story
   * - Enforce MAX_API_CALLS_PER_ANALYSIS globally
   * - Mark stories as completed/failed/skipped after processing
   */
  async processAllStories(): Promise<{
    completed: number;
    failed: number;
    skipped: number;
    totalAttempts: number;
    aiCallsSaved?: number;
    failedStories?: FailedStoryReport[];
  }> {
    let totalAttempts = 0;
    let totalAiCallsSaved = 0;
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    // Reset tracking for new run
    this.processedStories.clear();
    this.storyAttempts.clear();
    this.storyErrors.clear();
    this.globalApiCalls = 0;
    this.aborted = false;
    this.failedStoryReports = [];

    const state = this.getState();
    const allStories = [...state.fixStories];

    console.log(`[PatternAwareFixer] Processing ${allStories.length} stories (max ${MAX_STORY_ATTEMPTS} attempts each, max ${MAX_API_CALLS_PER_ANALYSIS} API calls total)`);
    console.log(`[PatternAwareFixer] Session 87: Parallel processing with ${PARALLEL_WORKERS} workers`);

    // Session 87: Process stories in parallel batches
    // Group stories by files to prevent parallel edits to the same file
    const storyGroups = this.groupStoriesByFile(allStories);
    console.log(`[PatternAwareFixer] Stories grouped into ${storyGroups.length} file-based batches`);

    // Process each group of independent stories in parallel
    for (const batch of storyGroups) {
      // Process up to PARALLEL_WORKERS stories at once within each batch
      const chunks = this.chunkArray(batch, PARALLEL_WORKERS);

      for (const chunk of chunks) {
        // Check abort before processing chunk
        if (this.abortSignal?.aborted || this.aborted) {
          console.log(`[PatternAwareFixer] ⛔ Processing aborted - skipping remaining stories`);
          for (const story of chunk) {
            story.status = 'skipped';
            skipped++;
            this.failedStoryReports.push({
              storyId: story.id,
              storyName: story.groupName,
              ruleIds: story.ruleIds,
              files: story.files,
              failureReason: 'api_limit',
              attempts: 0,
              recommendation: `Processing was aborted. Consider running analysis again.`,
            });
          }
          continue;
        }

        // Process chunk in parallel
        const results = await Promise.all(
          chunk.map(story => this.processStoryWithSafetyChecks(story))
        );

        // Aggregate results
        for (const result of results) {
          totalAttempts += result.attempts;
          totalAiCallsSaved += result.aiCallsSaved || 0;
          if (result.status === 'completed') completed++;
          else if (result.status === 'failed') failed++;
          else if (result.status === 'skipped') skipped++;
        }
      }
    }

    /* Session 87: Replaced sequential loop with parallel processing above
    for (const story of allStories) {
      // Session 86: Check abort signal first
      if (this.abortSignal?.aborted || this.aborted) {
        console.log(`[PatternAwareFixer] ⛔ Processing aborted - skipping remaining stories`);
        story.status = 'skipped';
        skipped++;
        this.failedStoryReports.push({
          storyId: story.id,
          storyName: story.groupName,
          ruleIds: story.ruleIds,
          files: story.files,
          failureReason: 'api_limit',
          attempts: 0,
          recommendation: `Processing was aborted (timeout or manual). Consider running analysis again or adding KB patterns for: ${story.ruleIds.join(', ')}`,
        });
        continue;
      }

      // Session 86: Check if already processed
      if (this.processedStories.has(story.id)) {
        console.log(`[PatternAwareFixer] ⏭️ Story ${story.id} already processed - skipping`);
        continue;
      }

      // Session 86: Check global API limit
      if (this.globalApiCalls >= MAX_API_CALLS_PER_ANALYSIS) {
        console.error(`[PatternAwareFixer] ⛔ GLOBAL API LIMIT REACHED (${MAX_API_CALLS_PER_ANALYSIS}). Aborting remaining stories.`);
        this.aborted = true;
        // Mark remaining stories as skipped with report
        story.status = 'skipped';
        skipped++;
        this.failedStoryReports.push({
          storyId: story.id,
          storyName: story.groupName,
          ruleIds: story.ruleIds,
          files: story.files,
          failureReason: 'api_limit',
          attempts: this.storyAttempts.get(story.id) || 0,
          recommendation: `API call limit (${MAX_API_CALLS_PER_ANALYSIS}) reached. Consider increasing limit or reviewing KB patterns for rules: ${story.ruleIds.join(', ')}`,
        });
        this.processedStories.add(story.id);
        continue;
      }

      // Session 86: Check story attempt limit
      const attempts = this.storyAttempts.get(story.id) || 0;
      if (attempts >= MAX_STORY_ATTEMPTS) {
        console.error(`[PatternAwareFixer] ❌ Story ${story.id} exceeded max attempts (${MAX_STORY_ATTEMPTS}) - skipping`);
        story.status = 'skipped';
        skipped++;
        const lastError = this.storyErrors.get(story.id);
        this.failedStoryReports.push({
          storyId: story.id,
          storyName: story.groupName,
          ruleIds: story.ruleIds,
          files: story.files,
          failureReason: 'max_attempts',
          attempts,
          lastError,
          recommendation: this.generateRecommendation(story, lastError),
        });
        this.processedStories.add(story.id);
        continue;
      }

      // Increment attempt counter
      this.storyAttempts.set(story.id, attempts + 1);
      console.log(`[PatternAwareFixer] Processing story ${story.id}: "${story.groupName}" (attempt ${attempts + 1}/${MAX_STORY_ATTEMPTS})`);

      try {
        const result = await this.processStoryWithPatterns(story.id);
        totalAttempts++;
        totalAiCallsSaved += result.aiCallsSaved || 0;

        if (result.success) {
          console.log(`[PatternAwareFixer] ✅ Story ${story.id} fixed (source: ${result.source}, AI calls saved: ${result.aiCallsSaved})`);
          story.status = 'fixed';
          completed++;
          this.processedStories.add(story.id);
        } else {
          // Track the error for reporting
          this.storyErrors.set(story.id, result.error || 'Validation failed');

          // Check if we should retry or give up
          const currentAttempts = this.storyAttempts.get(story.id) || 0;
          if (currentAttempts >= MAX_STORY_ATTEMPTS) {
            console.log(`[PatternAwareFixer] ⚠️ Story ${story.id} failed after ${currentAttempts} attempts - marking as failed`);
            story.status = 'failed';
            failed++;
            this.failedStoryReports.push({
              storyId: story.id,
              storyName: story.groupName,
              ruleIds: story.ruleIds,
              files: story.files,
              failureReason: 'validation_failed',
              attempts: currentAttempts,
              lastError: result.error,
              recommendation: this.generateRecommendation(story, result.error),
            });
            this.processedStories.add(story.id);
          } else {
            console.log(`[PatternAwareFixer] ⚠️ Story ${story.id} failed (attempt ${currentAttempts}/${MAX_STORY_ATTEMPTS})`);
            // Don't mark as processed - allow retry on next loop
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PatternAwareFixer] ❌ Story ${story.id} threw error: ${errorMessage}`);
        story.status = 'failed';
        failed++;
        this.storyErrors.set(story.id, errorMessage);
        this.failedStoryReports.push({
          storyId: story.id,
          storyName: story.groupName,
          ruleIds: story.ruleIds,
          files: story.files,
          failureReason: 'error',
          attempts: this.storyAttempts.get(story.id) || 1,
          lastError: errorMessage,
          recommendation: this.generateRecommendation(story, errorMessage),
        });
        this.processedStories.add(story.id);
      }
    }
    // End of Session 87 commented-out sequential loop */

    console.log(`[PatternAwareFixer] Processing complete: ${completed} completed, ${failed} failed, ${skipped} skipped`);
    console.log(`[PatternAwareFixer] API calls made: ${this.globalApiCalls}/${MAX_API_CALLS_PER_ANALYSIS}`);

    // Log failed story summary for report
    if (this.failedStoryReports.length > 0) {
      console.log(`[PatternAwareFixer] Failed stories summary:`);
      for (const report of this.failedStoryReports) {
        console.log(`  - Story ${report.storyId} (${report.storyName}): ${report.failureReason}`);
        console.log(`    Rules: ${report.ruleIds.join(', ')}`);
        console.log(`    Recommendation: ${report.recommendation}`);
      }
    }

    return {
      completed,
      failed,
      skipped,
      totalAttempts,
      aiCallsSaved: totalAiCallsSaved,
      failedStories: this.failedStoryReports.length > 0 ? this.failedStoryReports : undefined,
    };
  }

  /**
   * Session 86: Get failed stories report for final output
   */
  getFailedStoriesReport(): FailedStoryReport[] {
    return [...this.failedStoryReports];
  }

  /**
   * Session 86: Generate recommendation for failed story
   */
  private generateRecommendation(story: FixStory, lastError?: string): string {
    const rules = story.ruleIds.join(', ');

    // Check for common error patterns
    if (lastError?.includes('syntax') || lastError?.includes('parse')) {
      return `Fix has syntax issues. Manual review recommended for ${story.files[0]}. Consider adding KB pattern for rules: ${rules}`;
    }

    if (lastError?.includes('validation')) {
      return `AI-generated fix failed validation. The fix may introduce new issues. Manual review of ${story.files.join(', ')} recommended.`;
    }

    if (lastError?.includes('timeout') || lastError?.includes('abort')) {
      return `Operation timed out. Consider splitting into smaller fixes or adding KB patterns for: ${rules}`;
    }

    if (lastError?.includes('API call limit')) {
      return `API budget exhausted. Consider adding KB patterns for frequently occurring rules: ${rules}`;
    }

    // Default recommendation
    return `Manual fix recommended for ${story.files[0]}. Rules: ${rules}. Consider adding a KB pattern after manual fix.`;
  }

  // ==========================================================================
  // Session 87: Parallel Processing Helper Methods
  // ==========================================================================

  /**
   * Group stories by files to prevent parallel edits to the same file
   * Stories editing the same file are placed in the same group
   */
  private groupStoriesByFile(stories: FixStory[]): FixStory[][] {
    const fileToStories = new Map<string, FixStory[]>();

    for (const story of stories) {
      // Use first file as the key (stories typically edit one file)
      const primaryFile = story.files[0] || `story-${story.id}`;
      const existing = fileToStories.get(primaryFile) || [];
      existing.push(story);
      fileToStories.set(primaryFile, existing);
    }

    // Return as array of story groups
    // Each group contains stories that CAN'T run in parallel (same file)
    // Different groups CAN run in parallel
    return Array.from(fileToStories.values());
  }

  /**
   * Split array into chunks for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Process a single story with all safety checks
   * Returns a result object for aggregation
   */
  private async processStoryWithSafetyChecks(story: FixStory): Promise<{
    status: 'completed' | 'failed' | 'skipped';
    attempts: number;
    aiCallsSaved?: number;
  }> {
    // Check abort signal
    if (this.abortSignal?.aborted || this.aborted) {
      story.status = 'skipped';
      this.failedStoryReports.push({
        storyId: story.id,
        storyName: story.groupName,
        ruleIds: story.ruleIds,
        files: story.files,
        failureReason: 'api_limit',
        attempts: 0,
        recommendation: `Processing was aborted.`,
      });
      return { status: 'skipped', attempts: 0 };
    }

    // Check if already processed
    if (this.processedStories.has(story.id)) {
      return { status: 'skipped', attempts: 0 };
    }

    // Check global API limit
    if (this.globalApiCalls >= MAX_API_CALLS_PER_ANALYSIS) {
      this.aborted = true;
      story.status = 'skipped';
      this.failedStoryReports.push({
        storyId: story.id,
        storyName: story.groupName,
        ruleIds: story.ruleIds,
        files: story.files,
        failureReason: 'api_limit',
        attempts: 0,
        recommendation: `API call limit (${MAX_API_CALLS_PER_ANALYSIS}) reached.`,
      });
      this.processedStories.add(story.id);
      return { status: 'skipped', attempts: 0 };
    }

    // Check story attempt limit
    const attempts = this.storyAttempts.get(story.id) || 0;
    if (attempts >= MAX_STORY_ATTEMPTS) {
      story.status = 'skipped';
      const lastError = this.storyErrors.get(story.id);
      this.failedStoryReports.push({
        storyId: story.id,
        storyName: story.groupName,
        ruleIds: story.ruleIds,
        files: story.files,
        failureReason: 'max_attempts',
        attempts,
        lastError,
        recommendation: this.generateRecommendation(story, lastError),
      });
      this.processedStories.add(story.id);
      return { status: 'skipped', attempts: 0 };
    }

    // Increment attempt counter
    this.storyAttempts.set(story.id, attempts + 1);
    console.log(`[PatternAwareFixer] Processing story ${story.id}: "${story.groupName}" (attempt ${attempts + 1}/${MAX_STORY_ATTEMPTS})`);

    try {
      const result = await this.processStoryWithPatterns(story.id);

      if (result.success) {
        console.log(`[PatternAwareFixer] ✅ Story ${story.id} fixed (source: ${result.source}, AI calls saved: ${result.aiCallsSaved})`);
        story.status = 'fixed';
        this.processedStories.add(story.id);
        return { status: 'completed', attempts: 1, aiCallsSaved: result.aiCallsSaved };
      } else {
        this.storyErrors.set(story.id, result.error || 'Validation failed');
        const currentAttempts = this.storyAttempts.get(story.id) || 0;

        if (currentAttempts >= MAX_STORY_ATTEMPTS) {
          story.status = 'failed';
          this.failedStoryReports.push({
            storyId: story.id,
            storyName: story.groupName,
            ruleIds: story.ruleIds,
            files: story.files,
            failureReason: 'validation_failed',
            attempts: currentAttempts,
            lastError: result.error,
            recommendation: this.generateRecommendation(story, result.error),
          });
          this.processedStories.add(story.id);
          return { status: 'failed', attempts: 1 };
        }

        return { status: 'failed', attempts: 1 };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[PatternAwareFixer] ❌ Story ${story.id} threw error: ${errorMessage}`);
      story.status = 'failed';
      this.storyErrors.set(story.id, errorMessage);
      this.failedStoryReports.push({
        storyId: story.id,
        storyName: story.groupName,
        ruleIds: story.ruleIds,
        files: story.files,
        failureReason: 'error',
        attempts: this.storyAttempts.get(story.id) || 1,
        lastError: errorMessage,
        recommendation: this.generateRecommendation(story, errorMessage),
      });
      this.processedStories.add(story.id);
      return { status: 'failed', attempts: 1 };
    }
  }

  /**
   * Session 84: Process story with TRUE AI savings
   *
   * Priority order:
   * 1. Try cache/template for ALL issues first (0 AI calls)
   * 2. Then KB pattern for first issue
   * 3. Then AI for first issue
   * 4. Propagate to remaining issues
   */
  async processStoryWithPatterns(storyId: number): Promise<PatternAwareResult> {
    const story = this.getStoryById(storyId);
    if (!story) {
      return {
        storyId,
        success: false,
        error: 'Story not found',
        attemptNumber: 0,
        source: 'ai_generation',
        aiCallsSaved: 0,
      };
    }

    const issues = this.getIssuesForStory(story);
    if (issues.length === 0) {
      return {
        storyId,
        success: false,
        error: 'No issues in story',
        attemptNumber: 0,
        source: 'ai_generation',
        aiCallsSaved: 0,
      };
    }

    console.log(`[PatternAwareFixer] Processing story ${storyId} with ${issues.length} issues`);

    // Get the primary rule for this story
    const primaryRule = story.ruleIds[0] || issues[0].ruleId;
    const language = issues[0].language;
    const tool = issues[0].tool;

    // Session 84: Try fixing ALL issues without AI first
    const fixedWithoutAI: Map<number, { fixCode: string; source: string }> = new Map();
    let aiCallsSavedSoFar = 0;

    for (let i = 0; i < issues.length; i++) {
      this.stats.totalIssues++;
      const noAIResult = this.tryFixWithoutAI(issues[i]);
      if (noAIResult) {
        // Validate without AI fix
        const validation = await this.patternConfig.validateFix(noAIResult.fixCode, [issues[i]]);
        if (validation.passed) {
          fixedWithoutAI.set(i, { fixCode: noAIResult.fixCode, source: noAIResult.source });
          aiCallsSavedSoFar++;
          console.log(`[PatternAwareFixer] ✅ Issue ${i + 1}/${issues.length} fixed via ${noAIResult.source} (0 AI)`);
        }
      }
    }

    // If ALL issues fixed without AI, we're done!
    if (fixedWithoutAI.size === issues.length) {
      const allFixes = issues.map((_, i) => fixedWithoutAI.get(i)!.fixCode);
      console.log(`[PatternAwareFixer] 🎉 ALL ${issues.length} issues fixed WITHOUT AI!`);

      return {
        storyId,
        success: true,
        fixCode: allFixes.join('\n\n'),
        attemptNumber: 1,
        source: 'pattern_propagation',
        aiCallsSaved: aiCallsSavedSoFar,
      };
    }

    // Find first issue that needs AI
    const firstAINeededIdx = issues.findIndex((_, i) => !fixedWithoutAI.has(i));
    const firstAINeededIssue = issues[firstAINeededIdx];

    console.log(`[PatternAwareFixer] ${fixedWithoutAI.size}/${issues.length} fixed without AI, need AI for issue ${firstAINeededIdx + 1}`);

    // Step 1: Check KB for existing pattern
    const kbGuidance = await getFixGuidance(primaryRule, language, tool);

    if (kbGuidance && this.shouldTryKBPattern(kbGuidance)) {
      console.log(`[PatternAwareFixer] KB pattern found for ${primaryRule} (success rate: ${kbGuidance.successRate}%)`);

      const kbResult = await this.tryKBPattern(issues[0], kbGuidance);

      if (kbResult.success) {
        console.log(`[PatternAwareFixer] KB pattern validated for ${primaryRule}`);

        // Create pattern from KB success
        const pattern: PatternExample = {
          ruleId: primaryRule,
          language,
          tool,
          originalCode: issues[0].codeContext || '',
          fixedCode: kbResult.fixCode!,
          source: 'kb',
          confidence: kbGuidance.successRate,
        };

        // Propagate to remaining issues
        return this.propagatePatternToStory(story, issues, pattern, kbGuidance);
      }

      console.log(`[PatternAwareFixer] KB pattern failed validation, falling back to AI`);
      // Record failure to update success rate
      await fixPatternGuidance.recordFixAttempt(primaryRule, language, tool, false, kbResult.error);
    }

    // Step 2: No KB pattern or it failed - use AI generation
    // Session 88: Use batch fixing if enabled and multiple issues remain
    const issuesNeedingAI = issues.filter((_, i) => !fixedWithoutAI.has(i));

    if (this.patternConfig.enableBatchFix &&
        this.patternConfig.generateBatchFix &&
        issuesNeedingAI.length > 1) {
      console.log(`[PatternAwareFixer] 📦 Session 88: Using batch fix for ${issuesNeedingAI.length} remaining issues`);
      return this.processBatchFix(story, issuesNeedingAI, kbGuidance);
    }

    // Fall back to sequential propagation
    return this.generateWithAIAndPropagate(story, issues, kbGuidance);
  }

  // --------------------------------------------------------------------------
  // KB Pattern Handling
  // --------------------------------------------------------------------------

  /**
   * Check if we should try KB pattern first
   */
  private shouldTryKBPattern(guidance: FixGuidance): boolean {
    // Must have correct patterns with examples
    if (!guidance.correctPatterns || guidance.correctPatterns.length === 0) {
      return false;
    }

    // Must have at least one example
    const hasExample = guidance.correctPatterns.some(p => p.example && p.example.length > 0);
    if (!hasExample) {
      return false;
    }

    // Check success rate threshold
    const minRate = this.patternConfig.minKBSuccessRate ?? 60;

    // If never used, give it a chance (new patterns should be tried)
    if (guidance.usageCount === 0) {
      return true;
    }

    return guidance.successRate >= minRate;
  }

  /**
   * Try to apply KB pattern
   *
   * Session 86: COST-SAVING FLOW
   * ALWAYS try direct pattern application first, regardless of confidence.
   * Validation is cheap, AI calls are expensive.
   * Even if only 50% of low-confidence patterns work, we save money.
   *
   * Priority:
   * 1. Try direct pattern application (0 AI calls)
   * 2. If validation passes → done, we saved an AI call
   * 3. If validation fails → fall back to AI
   */
  private async tryKBPattern(
    issue: FreshContextIssue,
    guidance: FixGuidance
  ): Promise<{ success: boolean; fixCode?: string; error?: string; skippedAI?: boolean }> {
    // Find the best example from KB
    const bestExample = this.findBestKBExample(guidance, issue);
    if (!bestExample) {
      return { success: false, error: 'No suitable example in KB' };
    }

    // Create pattern from KB
    const pattern: PatternExample = {
      ruleId: guidance.ruleId,
      language: guidance.language,
      tool: guidance.tool,
      originalCode: '', // KB doesn't store original code
      fixedCode: bestExample.example,
      source: 'kb',
      confidence: guidance.successRate,
    };

    // SESSION 86: ALWAYS TRY DIRECT APPLICATION FIRST
    // Even low-confidence patterns should be tried - validation is cheaper than AI
    // If 50% of 60% confidence patterns work, we still save money on those
    console.log(`[PatternAwareFixer] 💰 Trying KB pattern (${guidance.successRate}% confidence, ${guidance.usageCount} uses) - 0 AI calls if validation passes`);

    // Try direct template application from the pattern
    const directResult = this.tryDirectPatternApplication(issue, guidance, bestExample);

    if (directResult) {
      // Validate the direct fix
      const validation = await this.patternConfig.validateFix(directResult, [issue]);

      if (validation.passed) {
        console.log(`[PatternAwareFixer] ✅ KB pattern succeeded - 0 AI calls (saved ~$0.10)`);
        this.stats.directPropagation++;
        // Update KB success rate
        await fixPatternGuidance.recordFixAttempt(guidance.ruleId, guidance.language, guidance.tool, true);
        return { success: true, fixCode: directResult, skippedAI: true };
      } else {
        console.log(`[PatternAwareFixer] ⚠️ KB pattern validation failed (${validation.error}), falling back to AI`);
        // Record failure to update KB success rate
        await fixPatternGuidance.recordFixAttempt(guidance.ruleId, guidance.language, guidance.tool, false, validation.error);
      }
    } else {
      console.log(`[PatternAwareFixer] ⚠️ KB pattern could not be applied directly, trying AI`);
    }

    // If no applyPattern callback, fall back to full generation
    if (!this.patternConfig.applyPattern) {
      console.log(`[PatternAwareFixer] No applyPattern callback, using full generation`);
      return { success: false, error: 'No pattern application callback' };
    }

    try {
      // Use lightweight pattern application (1 AI call)
      this.checkAndTrackApiCall(`applyPattern for ${issue.ruleId}`);
      const result = await this.patternConfig.applyPattern(pattern, issue, guidance);

      if (!result.success) {
        return { success: false, error: 'Pattern application failed' };
      }

      // Validate the applied fix
      const validation = await this.patternConfig.validateFix(result.fixCode, [issue]);

      if (!validation.passed) {
        return {
          success: false,
          error: validation.error || 'Validation failed',
        };
      }

      return { success: true, fixCode: result.fixCode };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * SESSION 85: Try direct pattern application without AI
   *
   * Uses the fix_template from DB patterns to apply fixes directly.
   * Returns null if direct application not possible.
   */
  private tryDirectPatternApplication(
    issue: FreshContextIssue,
    guidance: FixGuidance,
    bestExample: { pattern: string; example: string }
  ): string | null {
    const codeContext = issue.codeContext || '';

    // If the example contains a direct replacement pattern, use it
    if (bestExample.example && bestExample.example.length > 10) {
      // Check if this is a simple replacement pattern
      // Many KB patterns store the fixed code directly

      // For patterns with clear before/after, try to apply
      const normalizedRule = guidance.ruleId.toLowerCase();

      // Check if we have a template transform for this rule
      const templateResult = applyTemplateTransform(guidance.ruleId, codeContext, issue.language);
      if (templateResult?.transformed) {
        return templateResult.fixedCode;
      }

      // For patterns where the example IS the fix (no context needed)
      // e.g., "Add @Override annotation" → just return the annotated version
      if (this.isDirectReplacementPattern(normalizedRule)) {
        // The example code IS the fix - return it if it looks valid
        if (this.validatePatternStructure(bestExample.example, issue)) {
          return bestExample.example;
        }
      }
    }

    return null;
  }

  /**
   * Check if a rule type can use direct replacement
   */
  private isDirectReplacementPattern(normalizedRule: string): boolean {
    const directPatternRules = [
      'unnecessarysemicolon',
      'simplifybooleanreturns',
      'emptycatchblock',
      'avoidcatchingthrowable',
      'arraytypestyle',
      'missingoverride',
      'uselocalewithcaseconversions',
      'unusedimport',
    ];

    return directPatternRules.some(r => normalizedRule.includes(r));
  }

  /**
   * Basic structure validation for pattern application
   */
  private validatePatternStructure(fixCode: string, issue: FreshContextIssue): boolean {
    if (!fixCode || fixCode.length < 5) return false;

    // Check that the fix is syntactically reasonable
    // (balanced braces, no obvious truncation)
    const openBraces = (fixCode.match(/\{/g) || []).length;
    const closeBraces = (fixCode.match(/\}/g) || []).length;

    if (Math.abs(openBraces - closeBraces) > 2) return false;

    // Check that it doesn't look like an error message
    if (fixCode.includes('Error:') || fixCode.includes('Exception:')) return false;

    return true;
  }

  /**
   * Find the best KB example for an issue
   */
  private findBestKBExample(
    guidance: FixGuidance,
    issue: FreshContextIssue
  ): { pattern: string; example: string } | null {
    if (!guidance.correctPatterns || guidance.correctPatterns.length === 0) {
      return null;
    }

    // For now, return the first pattern with an example
    // In the future, we could do smarter matching based on issue context
    for (const pattern of guidance.correctPatterns) {
      if (pattern.example && pattern.example.length > 0) {
        return pattern;
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // AI Generation with Pattern Propagation
  // --------------------------------------------------------------------------

  /**
   * Generate fix with AI and propagate to remaining issues
   */
  private async generateWithAIAndPropagate(
    story: FixStory,
    issues: FreshContextIssue[],
    kbGuidance?: FixGuidance | null
  ): Promise<PatternAwareResult> {
    const firstIssue = issues[0];
    const primaryRule = story.ruleIds[0] || firstIssue.ruleId;

    // Generate fix for first issue using full AI
    // Session 86: Track this as an AI call
    this.checkAndTrackApiCall(`generateFix for story ${story.id} first issue`);

    // Build context for first issue only (for pattern extraction)
    const singleIssueStory = { ...story, issueIds: [firstIssue.id] };

    // Use parent's processStory for the first issue
    const result = await super.processStory(story.id);

    if (!result.success) {
      return {
        ...result,
        source: 'ai_generation',
        aiCallsSaved: 0,
      };
    }

    // AI succeeded - record success in KB
    if (kbGuidance) {
      await fixPatternGuidance.recordFixAttempt(
        primaryRule,
        firstIssue.language,
        firstIssue.tool,
        true
      );
    }

    // Create pattern from successful fix
    const pattern: PatternExample = {
      ruleId: primaryRule,
      language: firstIssue.language,
      tool: firstIssue.tool,
      originalCode: firstIssue.codeContext || '',
      fixedCode: result.fixCode || '',
      source: 'ai',
      confidence: 85, // High confidence from successful validation
    };

    // Save pattern for future use (Session 87: include file info for Supabase)
    await this.savePatternToKB(pattern, kbGuidance, firstIssue.file, firstIssue.line);

    // If only one issue, we're done
    if (issues.length === 1) {
      return {
        ...result,
        source: 'ai_generation',
        patternUsed: pattern,
        aiCallsSaved: 0,
      };
    }

    // Propagate to remaining issues
    if (this.patternConfig.enablePropagation) {
      return this.propagatePatternToStory(story, issues, pattern, kbGuidance || undefined);
    }

    return {
      ...result,
      source: 'ai_generation',
      patternUsed: pattern,
      aiCallsSaved: 0,
    };
  }

  // --------------------------------------------------------------------------
  // Pattern Propagation
  // --------------------------------------------------------------------------

  /**
   * Session 84: Propagate pattern with TRUE AI savings
   *
   * Priority for each remaining issue:
   * 1. Check if IDENTICAL CODE to first issue → reuse fix directly (0 AI)
   * 2. Check fix CACHE → reuse cached fix (0 AI)
   * 3. Try TEMPLATE TRANSFORM → apply without AI (0 AI)
   * 4. Use applyPattern → lightweight AI call (1 AI)
   * 5. Fall back to full AI generation (1 AI)
   */
  private async propagatePatternToStory(
    story: FixStory,
    issues: FreshContextIssue[],
    pattern: PatternExample,
    kbGuidance?: FixGuidance
  ): Promise<PatternAwareResult> {
    console.log(`[PatternAwareFixer] Propagating pattern to ${issues.length} issues (Session 84: TRUE AI savings)`);

    let successCount = 1; // First issue already succeeded
    let aiCallsSaved = 0;
    const allFixes: string[] = [pattern.fixedCode];
    const firstIssueCode = issues[0].codeContext || '';

    // Cache the first issue's fix
    this.cacheFixResult(issues[0], pattern.fixedCode, pattern.source === 'kb' ? 'propagation' : 'ai');

    // Apply pattern to remaining issues
    for (let i = 1; i < issues.length; i++) {
      const issue = issues[i];
      const issueCode = issue.codeContext || '';
      this.stats.totalIssues++;

      // PRIORITY 1: Check if IDENTICAL code to first issue → direct reuse
      if (isIdenticalCode(firstIssueCode, issueCode)) {
        console.log(`[PatternAwareFixer] ♻️  IDENTICAL CODE for issue ${i + 1}/${issues.length} → reusing fix directly`);
        allFixes.push(pattern.fixedCode);
        successCount++;
        aiCallsSaved++;
        this.stats.directPropagation++;
        continue;
      }

      // PRIORITY 2 & 3: Check cache or try template (0 AI calls)
      const noAIResult = this.tryFixWithoutAI(issue);
      if (noAIResult) {
        // Validate the non-AI fix
        const validation = await this.patternConfig.validateFix(noAIResult.fixCode, [issue]);
        if (validation.passed) {
          allFixes.push(noAIResult.fixCode);
          successCount++;
          aiCallsSaved++;
          console.log(`[PatternAwareFixer] ✅ Issue ${i + 1} fixed via ${noAIResult.source} (0 AI calls)`);
          continue;
        } else {
          console.log(`[PatternAwareFixer] ${noAIResult.source} fix failed validation, trying AI`);
        }
      }

      // PRIORITY 4: Try applyPattern callback (lightweight AI)
      if (this.patternConfig.applyPattern) {
        try {
          this.checkAndTrackApiCall(`pattern for issue ${i + 1}/${issues.length}`);

          const applied = await this.patternConfig.applyPattern(pattern, issue, kbGuidance);

          if (applied.success) {
            const validation = await this.patternConfig.validateFix(applied.fixCode, [issue]);

            if (validation.passed) {
              allFixes.push(applied.fixCode);
              successCount++;
              // Cache this fix for future identical issues
              this.cacheFixResult(issue, applied.fixCode, 'ai');
              console.log(`[PatternAwareFixer] ✅ Issue ${i + 1} fixed via AI pattern application`);
              continue;
            }
          }

          // Pattern didn't work - fall back to full AI
          console.log(`[PatternAwareFixer] Pattern failed for issue ${i + 1}, using full AI`);
          this.checkAndTrackApiCall(`fallback for issue ${i + 1}`);
          const fallbackResult = await this.generateSingleIssueFix(issue);

          if (fallbackResult.success) {
            allFixes.push(fallbackResult.fixCode || '');
            successCount++;
            this.cacheFixResult(issue, fallbackResult.fixCode || '', 'ai');
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Check if this was an abort due to limit
          if (this.aborted || errorMessage.includes('API call limit')) {
            console.log(`[PatternAwareFixer] ⛔ Aborting due to API limit`);
            break;
          }
          console.log(`[PatternAwareFixer] Error applying pattern: ${errorMessage}`);
          this.checkAndTrackApiCall(`error fallback for issue ${i + 1}`);
          const fallbackResult = await this.generateSingleIssueFix(issue);
          if (fallbackResult.success) {
            allFixes.push(fallbackResult.fixCode || '');
            successCount++;
            this.cacheFixResult(issue, fallbackResult.fixCode || '', 'ai');
          }
        }
      } else {
        // PRIORITY 5: No applyPattern callback - use full AI
        this.checkAndTrackApiCall(`full AI for issue ${i + 1}`);
        const aiResult = await this.generateSingleIssueFix(issue);
        if (aiResult.success) {
          allFixes.push(aiResult.fixCode || '');
          successCount++;
          this.cacheFixResult(issue, aiResult.fixCode || '', 'ai');
        }
      }
    }

    const allSuccess = successCount === issues.length;
    const stats = this.getAICallStats();

    console.log(`[PatternAwareFixer] Propagation complete:`);
    console.log(`  - Issues fixed: ${successCount}/${issues.length}`);
    console.log(`  - AI calls saved: ${aiCallsSaved} (${stats.savingsRate} savings rate)`);
    console.log(`  - Breakdown: ${stats.cacheHits} cache, ${stats.templateTransforms} template, ${stats.directPropagation} direct, ${stats.aiCalls} AI`);

    return {
      storyId: story.id,
      success: allSuccess,
      fixCode: allFixes.join('\n\n'),
      attemptNumber: 1,
      source: pattern.source === 'kb' ? 'kb_pattern' : 'pattern_propagation',
      patternUsed: pattern,
      aiCallsSaved,
    };
  }

  /**
   * Generate fix for a single issue (fallback when pattern fails)
   */
  private async generateSingleIssueFix(
    issue: FreshContextIssue
  ): Promise<{ success: boolean; fixCode?: string; error?: string }> {
    try {
      const context: StoryFixContext = {
        story: {
          id: 0,
          groupName: `Single issue: ${issue.ruleId}`,
          issueIds: [issue.id],
          ruleIds: [issue.ruleId],
          files: [issue.file],
          status: 'in_progress',
          attempts: 0,
        },
        issues: [issue],
        priorAttempts: [],
        priorFixesInFiles: '',
        learnings: '',
        repositoryLearnings: '',
      };

      const result = await this.patternConfig.generateFix(context);
      const validation = await this.patternConfig.validateFix(result.fixCode, [issue]);

      if (validation.passed) {
        return { success: true, fixCode: result.fixCode };
      }

      return { success: false, error: validation.error || 'Validation failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // KB Pattern Saving
  // --------------------------------------------------------------------------

  /**
   * Save a successful pattern to the KB for future use
   * Session 87: Actually persist to Supabase for cross-session reuse
   */
  private async savePatternToKB(
    pattern: PatternExample,
    existingGuidance?: FixGuidance | null,
    filePath?: string,
    lineNumber?: number
  ): Promise<void> {
    console.log(`[PatternAwareFixer] Saving pattern to KB: ${pattern.ruleId}`);

    if (existingGuidance) {
      // Update existing guidance with new success
      await fixPatternGuidance.recordFixAttempt(
        pattern.ruleId,
        pattern.language,
        pattern.tool,
        true
      );
    }

    // Store the pattern for session-level reuse
    const key = `${pattern.ruleId}:${pattern.language}:${pattern.tool}`;
    this.successfulPatterns.set(key, pattern);

    // SESSION 87: Actually persist to Supabase for cross-session reuse
    // Only save patterns from AI generation (not KB patterns we already have)
    if (pattern.source === 'ai' && pattern.originalCode && pattern.fixedCode) {
      try {
        const registry = getFixPatternRegistry();
        const response = await registry.submitAIFix(
          {
            ruleId: pattern.ruleId,
            tool: pattern.tool, // Required field - will be rejected if null
            filePath: filePath || 'unknown',
            beforeCode: pattern.originalCode,
            afterCode: pattern.fixedCode,
            lineNumber: lineNumber || 1,
            issueMessage: `Fix for ${pattern.ruleId}`,
            aiModel: 'claude-3-5-sonnet-20241022',
            aiConfidence: pattern.confidence,
          },
          { verified: true } // Validated fix goes directly to active
        );

        if (response.success) {
          console.log(`[PatternAwareFixer] ✅ Pattern persisted to Supabase: ${response.patternId?.substring(0, 8) || 'new'}`);
        } else {
          console.log(`[PatternAwareFixer] ⚠️ Pattern save failed: ${response.message}`);
        }
      } catch (err) {
        // Don't fail the whole operation if persistence fails
        console.warn(`[PatternAwareFixer] Failed to persist pattern to Supabase: ${(err as Error).message}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Get a story by ID (exposes parent's private method)
   */
  private getStoryById(storyId: number): FixStory | null {
    const state = this.getState();
    return state.fixStories.find(s => s.id === storyId) || null;
  }

  /**
   * Get issues for a story
   */
  private getIssuesForStory(story: FixStory): FreshContextIssue[] {
    const state = this.getState();
    // Access issueMap through state
    return story.issueIds
      .map(id => (this as any).issueMap?.get(id))
      .filter((i): i is FreshContextIssue => !!i);
  }

  /**
   * Get session statistics (Session 84: Updated with real tracking)
   * Session 88: Added complexity routing and batch fixing stats
   * Session 89: Added KB-based routing stats
   */
  getPatternStats(): {
    patternsUsed: number;
    aiCallsSaved: number;
    kbHits: number;
    cacheHits: number;
    templateTransforms: number;
    directPropagation: number;
    aiCalls: number;
    totalIssues: number;
    savingsRate: string;
    // Session 88: Complexity routing
    haikuCalls: number;
    sonnetCalls: number;
    complexityRoutingSavings: string;
    // Session 88: Batch fixing
    batchFixCalls: number;
    issuesFixedInBatch: number;
    batchEfficiency: string;
    // Session 89: KB-based routing
    kbRoutedToSimple: number;
  } {
    const fullStats = this.getAICallStats();
    return {
      patternsUsed: this.successfulPatterns.size,
      aiCallsSaved: fullStats.aiCallsSaved,
      kbHits: 0, // TODO: Track KB pattern successes
      cacheHits: fullStats.cacheHits,
      templateTransforms: fullStats.templateTransforms,
      directPropagation: fullStats.directPropagation,
      aiCalls: fullStats.aiCalls,
      totalIssues: fullStats.totalIssues,
      savingsRate: fullStats.savingsRate,
      // Session 88: Complexity routing
      haikuCalls: fullStats.haikuCalls,
      sonnetCalls: fullStats.sonnetCalls,
      complexityRoutingSavings: fullStats.complexityRoutingSavings,
      // Session 88: Batch fixing
      batchFixCalls: fullStats.batchFixCalls,
      issuesFixedInBatch: fullStats.issuesFixedInBatch,
      batchEfficiency: fullStats.batchEfficiency,
      // Session 89: KB-based routing
      kbRoutedToSimple: fullStats.kbRoutedToSimple,
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default PatternAwareFixService;
