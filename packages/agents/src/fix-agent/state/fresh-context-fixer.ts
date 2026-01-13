/**
 * Fresh Context Fix Service
 *
 * Ralph-inspired "fresh context per attempt" pattern.
 * Each fix attempt spawns a completely new AI API call with full context,
 * rather than appending failure feedback to the same conversation.
 *
 * Benefits:
 * - No context bloat (full 200K tokens available each attempt)
 * - Fresh reasoning (AI doesn't get stuck in wrong patterns)
 * - Resumable (state persisted to disk)
 * - Structured failure summaries (not raw feedback)
 *
 * Created: Session 82
 */

import { PRFixStateManager, FixStory } from './pr-fix-state';
import { StoryDecomposer, IssueForGrouping, FixStoryGroup } from './story-decomposer';

// ============================================================================
// Types
// ============================================================================

export interface FreshContextIssue {
  id: string;
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;
  language: string;
  tool: string;
}

export interface FixAttempt {
  attemptNumber: number;
  fixCode: string;
  passed: boolean;
  failureReason?: string;
  regressions?: Array<{ rule: string; message: string }>;
  timestamp: string;
}

export interface StoryFixContext {
  story: FixStory;
  issues: FreshContextIssue[];
  priorAttempts: FixAttempt[];
  priorFixesInFiles: string; // For cross-fix awareness
  learnings: string;         // Within-PR learnings
}

export interface FixResult {
  storyId: number;
  success: boolean;
  fixCode?: string;
  error?: string;
  regressions?: Array<{ rule: string; message: string }>;
  attemptNumber: number;
}

export interface FreshContextConfig {
  maxAttemptsPerStory?: number;
  stateDir?: string;
  generateFix: (context: StoryFixContext) => Promise<{
    fixCode: string;
    confidence: number;
  }>;
  validateFix: (fixCode: string, issues: FreshContextIssue[]) => Promise<{
    passed: boolean;
    regressions?: Array<{ rule: string; message: string }>;
    error?: string;
  }>;
}

// ============================================================================
// Fresh Context Fix Service
// ============================================================================

/**
 * Service that implements Ralph's "fresh context per attempt" pattern.
 *
 * Instead of appending failure feedback to the same AI conversation,
 * each attempt spawns a completely new API call with:
 * - Full system prompt with KB guidance
 * - Structured summary of what didn't work (not raw failures)
 * - Cross-fix awareness from prior completed fixes
 * - Within-PR learnings accumulated so far
 */
export class FreshContextFixService {
  private stateManager: PRFixStateManager;
  private decomposer: StoryDecomposer;
  private config: Required<FreshContextConfig>;
  private issueMap: Map<string, FreshContextIssue> = new Map();

  constructor(
    prUrl: string,
    prNumber: number,
    repository: string,
    language: string,
    config: FreshContextConfig
  ) {
    this.stateManager = new PRFixStateManager(
      prUrl,
      prNumber,
      repository,
      language,
      config.stateDir
    );

    this.decomposer = new StoryDecomposer({
      maxIssuesPerStory: 5,
      groupByFileThenRule: true,
      maxLineSpan: 100,
      prioritizeBySeverity: true,
    });

    this.config = {
      maxAttemptsPerStory: config.maxAttemptsPerStory ?? 3,
      stateDir: config.stateDir ?? process.cwd(),
      generateFix: config.generateFix,
      validateFix: config.validateFix,
    };
  }

  // --------------------------------------------------------------------------
  // Main API
  // --------------------------------------------------------------------------

  /**
   * Initialize the service with issues to fix
   */
  initialize(issues: FreshContextIssue[]): void {
    // Store issues for lookup
    for (const issue of issues) {
      this.issueMap.set(issue.id, issue);
    }

    // Convert to grouping format
    const forGrouping: IssueForGrouping[] = issues.map(i => ({
      id: i.id,
      ruleId: i.ruleId,
      file: i.file,
      line: i.line,
      severity: i.severity,
      message: i.message,
    }));

    // Decompose into stories
    const groups = this.decomposer.decompose(forGrouping);

    // Initialize state manager with stories
    this.stateManager.initializeStories(groups);

    console.log(`[FreshContextFixer] Initialized with ${issues.length} issues in ${groups.length} stories`);
  }

  /**
   * Process all stories with fresh context per attempt
   *
   * This is the main entry point. It will:
   * 1. Get next pending story
   * 2. Build fresh context for attempt
   * 3. Generate fix with completely new AI call
   * 4. Validate fix
   * 5. If failed, mark and move to next iteration
   * 6. Repeat until all stories processed
   */
  async processAllStories(): Promise<{
    completed: number;
    failed: number;
    skipped: number;
    totalAttempts: number;
  }> {
    let totalAttempts = 0;

    while (!this.stateManager.isComplete()) {
      const story = this.stateManager.getNextStory();
      if (!story) {
        break; // No more pending stories
      }

      console.log(`[FreshContextFixer] Processing story ${story.id}: "${story.groupName}"`);

      const result = await this.processStory(story.id);
      totalAttempts += result.attemptNumber;

      if (result.success) {
        console.log(`[FreshContextFixer] ✅ Story ${story.id} fixed`);
      } else {
        console.log(`[FreshContextFixer] ⚠️ Story ${story.id} attempt ${story.attempts + 1} failed`);

        // Check if max attempts reached
        if (story.attempts + 1 >= this.config.maxAttemptsPerStory) {
          console.log(`[FreshContextFixer] ❌ Story ${story.id} failed after ${this.config.maxAttemptsPerStory} attempts`);
        }
      }
    }

    // Mark complete
    this.stateManager.markComplete();

    const state = this.stateManager.getState();
    return {
      completed: state.progress.storiesFixed,
      failed: state.progress.storiesFailed,
      skipped: state.fixStories.filter(s => s.status === 'skipped').length,
      totalAttempts,
    };
  }

  /**
   * Process a single story with fresh context
   *
   * Each call to this method is a completely fresh attempt.
   * The state is read from disk, so this is resumable.
   */
  async processStory(storyId: number): Promise<FixResult> {
    const story = this.stateManager.getStory(storyId);
    if (!story) {
      return {
        storyId,
        success: false,
        error: 'Story not found',
        attemptNumber: 0,
      };
    }

    // Mark as in progress (increments attempt counter)
    this.stateManager.startStory(storyId);

    // Build FRESH context for this attempt
    const context = this.buildFreshContext(story);

    try {
      // Generate fix with COMPLETELY NEW AI call
      // The AI gets fresh 200K context, not appended conversation
      console.log(`[FreshContextFixer] Generating fix (attempt ${story.attempts + 1}/${this.config.maxAttemptsPerStory})`);

      const { fixCode, confidence } = await this.config.generateFix(context);

      // Validate the fix
      const validation = await this.config.validateFix(fixCode, context.issues);

      if (validation.passed) {
        // Success! Mark story as complete
        this.stateManager.completeStory(storyId, fixCode);

        // Add learning about what worked
        this.stateManager.addLearning(
          `Story ${storyId}: ${story.groupName}`,
          `Fix succeeded for ${story.ruleIds.join(', ')} with confidence ${confidence}%`,
          'success'
        );

        return {
          storyId,
          success: true,
          fixCode,
          attemptNumber: story.attempts + 1,
        };
      }

      // Validation failed
      const failureReason = validation.error || 'Validation failed';

      // Add learning about what didn't work
      if (validation.regressions && validation.regressions.length > 0) {
        this.stateManager.addLearning(
          `Story ${storyId}: ${story.groupName}`,
          `Avoid patterns that trigger: ${validation.regressions.map(r => r.rule).join(', ')}`,
          'regression'
        );
      }

      // Mark as failed (will reset to pending if < max attempts)
      this.stateManager.failStory(storyId, failureReason, validation.regressions);

      return {
        storyId,
        success: false,
        error: failureReason,
        regressions: validation.regressions,
        attemptNumber: story.attempts + 1,
      };

    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      this.stateManager.failStory(storyId, errorMsg);

      return {
        storyId,
        success: false,
        error: errorMsg,
        attemptNumber: story.attempts + 1,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Fresh Context Building
  // --------------------------------------------------------------------------

  /**
   * Build completely fresh context for a fix attempt
   *
   * This is the key Ralph pattern: instead of appending failures,
   * we build a fresh context with STRUCTURED summaries of what didn't work.
   */
  private buildFreshContext(story: FixStory): StoryFixContext {
    // Get the actual issues for this story
    const issues = story.issueIds
      .map(id => this.issueMap.get(id))
      .filter((i): i is FreshContextIssue => !!i);

    // Build structured summary of prior attempts (not raw feedback)
    const priorAttempts = this.buildPriorAttemptsSummary(story);

    // Get cross-fix awareness for files in this story
    let priorFixesInFiles = '';
    for (const file of story.files) {
      const priorFixes = this.stateManager.getPriorFixesForPrompt(file);
      if (priorFixes) {
        priorFixesInFiles += priorFixes;
      }
    }

    // Get accumulated learnings from this PR session
    const learnings = this.stateManager.getLearningsForPrompt();

    return {
      story,
      issues,
      priorAttempts,
      priorFixesInFiles,
      learnings,
    };
  }

  /**
   * Build structured summary of prior attempts
   *
   * Instead of raw "here's what you tried", we provide:
   * - What patterns failed
   * - What regressions were triggered
   * - What to avoid
   *
   * This is concise and actionable, not verbose.
   */
  private buildPriorAttemptsSummary(story: FixStory): FixAttempt[] {
    const attempts: FixAttempt[] = [];

    // If we have regressions from previous attempt, create summary
    if (story.regressions && story.regressions.length > 0) {
      attempts.push({
        attemptNumber: story.attempts,
        fixCode: story.fixCode || '// Previous fix code not available',
        passed: false,
        regressions: story.regressions,
        failureReason: story.lastError,
        timestamp: new Date().toISOString(),
      });
    }

    return attempts;
  }

  // --------------------------------------------------------------------------
  // State Access
  // --------------------------------------------------------------------------

  /**
   * Get current progress summary
   */
  getProgress(): string {
    return this.stateManager.getSummary();
  }

  /**
   * Get full state for inspection
   */
  getState() {
    return this.stateManager.getState();
  }

  /**
   * Check if all stories are processed
   */
  isComplete(): boolean {
    return this.stateManager.isComplete();
  }

  /**
   * Clean up state files (after successful PR merge)
   */
  cleanup(): void {
    this.stateManager.cleanup();
  }
}

// ============================================================================
// Helper: Build AI Prompt Section for Prior Attempts
// ============================================================================

/**
 * Format prior attempts for inclusion in AI prompt
 *
 * This provides structured guidance about what NOT to do,
 * rather than overwhelming the AI with raw failure data.
 */
export function formatPriorAttemptsForPrompt(attempts: FixAttempt[]): string {
  if (attempts.length === 0) {
    return '';
  }

  let prompt = '\n\n=== PREVIOUS ATTEMPTS (AVOID THESE PATTERNS) ===\n';

  for (const attempt of attempts) {
    prompt += `\nAttempt ${attempt.attemptNumber}:\n`;

    if (attempt.regressions && attempt.regressions.length > 0) {
      prompt += `❌ AVOID - This fix triggered new issues:\n`;
      for (const reg of attempt.regressions) {
        prompt += `   • ${reg.rule}: ${reg.message}\n`;
      }
    }

    if (attempt.failureReason) {
      prompt += `❌ FAILED: ${attempt.failureReason}\n`;
    }
  }

  prompt += '\n=== YOUR FIX MUST AVOID ALL PATTERNS LISTED ABOVE ===\n';

  return prompt;
}

// ============================================================================
// Export
// ============================================================================

export default FreshContextFixService;
