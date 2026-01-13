/**
 * Pattern-Aware Fix Service
 *
 * Unified KB-first + pattern propagation flow:
 * 1. Check KB for existing pattern with high success rate
 * 2. If found → try lightweight "apply pattern" call (cheaper)
 * 3. If validates → propagate to all issues in story (0 additional AI calls)
 * 4. If no KB or fails → full AI generation
 * 5. If AI succeeds → save pattern to KB → propagate
 *
 * Session 83: Implements user's insight that we should check KB first
 * and propagate successful patterns to similar issues.
 */

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
   * Process a story with KB-first + pattern propagation
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
   * Propagate a successful pattern to all issues in the story
   */
  private async propagatePatternToStory(
    story: FixStory,
    issues: FreshContextIssue[],
    pattern: PatternExample,
    kbGuidance?: FixGuidance
  ): Promise<PatternAwareResult> {
    console.log(`[PatternAwareFixer] Propagating pattern to ${issues.length} issues`);

    let successCount = 1; // First issue already succeeded
    let aiCallsSaved = 0;
    const allFixes: string[] = [pattern.fixedCode];

    // Apply pattern to remaining issues
    for (let i = 1; i < issues.length; i++) {
      const issue = issues[i];

      if (this.patternConfig.applyPattern) {
        try {
          console.log(`[PatternAwareFixer] Applying pattern to issue ${i + 1}/${issues.length}`);

          const applied = await this.patternConfig.applyPattern(pattern, issue, kbGuidance);

          if (applied.success) {
            // Validate the applied fix
            const validation = await this.patternConfig.validateFix(applied.fixCode, [issue]);

            if (validation.passed) {
              allFixes.push(applied.fixCode);
              successCount++;
              aiCallsSaved++; // Saved one full AI generation call
              console.log(`[PatternAwareFixer] Pattern applied successfully to issue ${i + 1}`);
              continue;
            }
          }

          // Pattern didn't work - fall back to AI for this issue
          console.log(`[PatternAwareFixer] Pattern failed for issue ${i + 1}, using AI`);
          const fallbackResult = await this.generateSingleIssueFix(issue);

          if (fallbackResult.success) {
            allFixes.push(fallbackResult.fixCode || '');
            successCount++;
          }
        } catch (error: any) {
          console.log(`[PatternAwareFixer] Error applying pattern: ${error.message}`);
          // Try AI fallback
          const fallbackResult = await this.generateSingleIssueFix(issue);
          if (fallbackResult.success) {
            allFixes.push(fallbackResult.fixCode || '');
            successCount++;
          }
        }
      } else {
        // No applyPattern callback - use AI for each issue
        const aiResult = await this.generateSingleIssueFix(issue);
        if (aiResult.success) {
          allFixes.push(aiResult.fixCode || '');
          successCount++;
        }
      }
    }

    const allSuccess = successCount === issues.length;

    console.log(`[PatternAwareFixer] Propagation complete: ${successCount}/${issues.length} issues fixed, ${aiCallsSaved} AI calls saved`);

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
   * Get session statistics
   */
  getPatternStats(): {
    patternsUsed: number;
    aiCallsSaved: number;
    kbHits: number;
  } {
    return {
      patternsUsed: this.successfulPatterns.size,
      aiCallsSaved: 0, // TODO: Track across session
      kbHits: 0, // TODO: Track KB pattern successes
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export default PatternAwareFixService;
