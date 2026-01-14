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
  private stats = {
    cacheHits: 0,
    templateTransforms: 0,
    directPropagation: 0,
    aiCalls: 0,
    totalIssues: 0,
  };

  constructor(
    prUrl: string,
    prNumber: number,
    repository: string,
    language: string,
    config: PatternAwareConfig
  ) {
    super(prUrl, prNumber, repository, language, config);
    this.patternConfig = {
      minKBSuccessRate: config.minKBSuccessRate ?? 60,
      enablePropagation: config.enablePropagation ?? true,
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
   * Get statistics about AI call savings
   */
  getAICallStats(): {
    cacheHits: number;
    templateTransforms: number;
    directPropagation: number;
    aiCalls: number;
    totalIssues: number;
    aiCallsSaved: number;
    savingsRate: string;
  } {
    const saved = this.stats.cacheHits + this.stats.templateTransforms + this.stats.directPropagation;
    const rate = this.stats.totalIssues > 0
      ? Math.round((saved / this.stats.totalIssues) * 100)
      : 0;

    return {
      ...this.stats,
      aiCallsSaved: saved,
      savingsRate: `${rate}%`,
    };
  }

  // --------------------------------------------------------------------------
  // Override: Process All Stories with Pattern Awareness
  // --------------------------------------------------------------------------

  /**
   * Override processAllStories to use KB-first + pattern propagation
   */
  async processAllStories(): Promise<{
    completed: number;
    failed: number;
    skipped: number;
    totalAttempts: number;
    aiCallsSaved?: number;
  }> {
    let totalAttempts = 0;
    let totalAiCallsSaved = 0;

    const state = this.getState();

    while (!this.isComplete()) {
      const pendingStories = state.fixStories.filter(s => s.status === 'pending');
      if (pendingStories.length === 0) break;

      const story = pendingStories[0];
      console.log(`[PatternAwareFixer] Processing story ${story.id}: "${story.groupName}"`);

      const result = await this.processStoryWithPatterns(story.id);
      totalAttempts += result.attemptNumber;
      totalAiCallsSaved += result.aiCallsSaved || 0;

      if (result.success) {
        console.log(`[PatternAwareFixer] ✅ Story ${story.id} fixed (source: ${result.source}, AI calls saved: ${result.aiCallsSaved})`);
      } else {
        console.log(`[PatternAwareFixer] ⚠️ Story ${story.id} failed`);
      }
    }

    const finalState = this.getState();
    return {
      completed: finalState.progress.storiesFixed,
      failed: finalState.progress.storiesFailed,
      skipped: finalState.fixStories.filter(s => s.status === 'skipped').length,
      totalAttempts,
      aiCallsSaved: totalAiCallsSaved,
    };
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

    // Step 2: No KB pattern or it failed - use full AI generation
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
   * Try to apply KB pattern using lightweight AI call
   */
  private async tryKBPattern(
    issue: FreshContextIssue,
    guidance: FixGuidance
  ): Promise<{ success: boolean; fixCode?: string; error?: string }> {
    // If no applyPattern callback, fall back to full generation
    if (!this.patternConfig.applyPattern) {
      console.log(`[PatternAwareFixer] No applyPattern callback, using full generation`);
      return { success: false, error: 'No pattern application callback' };
    }

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

    try {
      // Use lightweight pattern application
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
    console.log(`[PatternAwareFixer] Generating fix for first issue with AI`);

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

    // Save pattern for future use
    await this.savePatternToKB(pattern, kbGuidance);

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
          console.log(`[PatternAwareFixer] 🤖 Applying pattern to issue ${i + 1}/${issues.length} (AI call)`);
          this.stats.aiCalls++;

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
          this.stats.aiCalls++; // Another AI call for fallback
          const fallbackResult = await this.generateSingleIssueFix(issue);

          if (fallbackResult.success) {
            allFixes.push(fallbackResult.fixCode || '');
            successCount++;
            this.cacheFixResult(issue, fallbackResult.fixCode || '', 'ai');
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`[PatternAwareFixer] Error applying pattern: ${errorMessage}`);
          this.stats.aiCalls++;
          const fallbackResult = await this.generateSingleIssueFix(issue);
          if (fallbackResult.success) {
            allFixes.push(fallbackResult.fixCode || '');
            successCount++;
            this.cacheFixResult(issue, fallbackResult.fixCode || '', 'ai');
          }
        }
      } else {
        // PRIORITY 5: No applyPattern callback - use full AI
        console.log(`[PatternAwareFixer] 🤖 No pattern callback, using full AI for issue ${i + 1}`);
        this.stats.aiCalls++;
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
   */
  private async savePatternToKB(
    pattern: PatternExample,
    existingGuidance?: FixGuidance | null
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
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default PatternAwareFixService;
