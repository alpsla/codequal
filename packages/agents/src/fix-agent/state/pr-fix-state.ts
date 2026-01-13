/**
 * PR Fix State Management
 *
 * Ralph-inspired explicit state tracking for PR fix operations.
 * Provides resumable, inspectable, and debuggable fix state.
 *
 * Created: Session 82
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface FixStory {
  id: number;
  /** Group name (e.g., "CloseResource fixes", "Exception handling") */
  groupName: string;
  /** Issue IDs in this story */
  issueIds: string[];
  /** Rule IDs for these issues */
  ruleIds: string[];
  /** Files affected */
  files: string[];
  /** Current status */
  status: 'pending' | 'in_progress' | 'fixed' | 'failed' | 'skipped';
  /** Number of fix attempts */
  attempts: number;
  /** Last error if failed */
  lastError?: string;
  /** Regressions encountered */
  regressions?: Array<{ rule: string; message: string }>;
  /** Timestamp when completed */
  completedAt?: string;
  /** The final fix code (if successful) */
  fixCode?: string;
}

export interface PRLearning {
  /** When this was learned */
  timestamp: string;
  /** What story/issue triggered this learning */
  source: string;
  /** The learning itself */
  insight: string;
  /** Category of learning */
  category: 'pattern' | 'codebase' | 'tool' | 'regression' | 'success';
}

export interface PRFixState {
  /** Version of this state format */
  version: '1.0';
  /** PR identifier */
  pr: {
    url: string;
    number: number;
    repository: string;
  };
  /** Language being analyzed */
  language: string;
  /** Total issues found */
  totalIssues: number;
  /** Issues grouped into fix stories */
  fixStories: FixStory[];
  /** Learnings accumulated during this PR fix session */
  learnings: PRLearning[];
  /** Overall progress */
  progress: {
    storiesTotal: number;
    storiesFixed: number;
    storiesFailed: number;
    storiesPending: number;
    issuesFixed: number;
    issuesFailed: number;
  };
  /** Timestamps */
  startedAt: string;
  lastUpdatedAt: string;
  completedAt?: string;
  /** Current iteration (for fresh context tracking) */
  currentIteration: number;
}

// ============================================================================
// State Manager
// ============================================================================

export class PRFixStateManager {
  private state: PRFixState;
  private statePath: string;
  private learningsPath: string;

  constructor(
    prUrl: string,
    prNumber: number,
    repository: string,
    language: string,
    workDir?: string
  ) {
    const baseDir = workDir || process.cwd();
    this.statePath = path.join(baseDir, 'pr-fix-state.json');
    this.learningsPath = path.join(baseDir, 'pr-learnings.json');

    // Try to load existing state or create new
    if (fs.existsSync(this.statePath)) {
      const existing = JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
      // Verify it's for the same PR
      if (existing.pr?.url === prUrl && existing.pr?.number === prNumber) {
        this.state = existing;
        console.log(`[PRFixState] Resumed existing state for PR #${prNumber}`);
        return;
      }
    }

    // Initialize new state
    this.state = {
      version: '1.0',
      pr: { url: prUrl, number: prNumber, repository },
      language,
      totalIssues: 0,
      fixStories: [],
      learnings: [],
      progress: {
        storiesTotal: 0,
        storiesFixed: 0,
        storiesFailed: 0,
        storiesPending: 0,
        issuesFixed: 0,
        issuesFailed: 0,
      },
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      currentIteration: 0,
    };

    console.log(`[PRFixState] Created new state for PR #${prNumber}`);
  }

  // --------------------------------------------------------------------------
  // Story Management
  // --------------------------------------------------------------------------

  /**
   * Initialize fix stories from grouped issues
   */
  initializeStories(groups: Array<{
    groupName: string;
    issueIds: string[];
    ruleIds: string[];
    files: string[];
  }>): void {
    this.state.fixStories = groups.map((group, index) => ({
      id: index + 1,
      groupName: group.groupName,
      issueIds: group.issueIds,
      ruleIds: [...new Set(group.ruleIds)],
      files: [...new Set(group.files)],
      status: 'pending',
      attempts: 0,
    }));

    this.state.totalIssues = groups.reduce((sum, g) => sum + g.issueIds.length, 0);
    this.updateProgress();
    this.save();

    console.log(`[PRFixState] Initialized ${this.state.fixStories.length} fix stories for ${this.state.totalIssues} issues`);
  }

  /**
   * Get the next pending story
   */
  getNextStory(): FixStory | null {
    return this.state.fixStories.find(s => s.status === 'pending') || null;
  }

  /**
   * Get story by ID
   */
  getStory(storyId: number): FixStory | null {
    return this.state.fixStories.find(s => s.id === storyId) || null;
  }

  /**
   * Mark story as in progress
   */
  startStory(storyId: number): void {
    const story = this.state.fixStories.find(s => s.id === storyId);
    if (story) {
      story.status = 'in_progress';
      story.attempts++;
      this.state.currentIteration++;
      this.updateProgress();
      this.save();
      console.log(`[PRFixState] Started story ${storyId}: "${story.groupName}" (attempt ${story.attempts})`);
    }
  }

  /**
   * Mark story as fixed
   */
  completeStory(storyId: number, fixCode: string): void {
    const story = this.state.fixStories.find(s => s.id === storyId);
    if (story) {
      story.status = 'fixed';
      story.completedAt = new Date().toISOString();
      story.fixCode = fixCode;
      this.updateProgress();
      this.save();
      console.log(`[PRFixState] ✅ Completed story ${storyId}: "${story.groupName}"`);
    }
  }

  /**
   * Mark story as failed
   */
  failStory(storyId: number, error: string, regressions?: Array<{ rule: string; message: string }>): void {
    const story = this.state.fixStories.find(s => s.id === storyId);
    if (story) {
      story.status = story.attempts >= 3 ? 'failed' : 'pending'; // Reset to pending for retry if < 3 attempts
      story.lastError = error;
      story.regressions = regressions;
      this.updateProgress();
      this.save();

      if (story.attempts >= 3) {
        console.log(`[PRFixState] ❌ Story ${storyId} failed after 3 attempts: "${story.groupName}"`);
      } else {
        console.log(`[PRFixState] ⚠️ Story ${storyId} attempt ${story.attempts} failed, will retry`);
      }
    }
  }

  /**
   * Skip a story (e.g., no fix possible)
   */
  skipStory(storyId: number, reason: string): void {
    const story = this.state.fixStories.find(s => s.id === storyId);
    if (story) {
      story.status = 'skipped';
      story.lastError = reason;
      this.updateProgress();
      this.save();
      console.log(`[PRFixState] ⏭️ Skipped story ${storyId}: ${reason}`);
    }
  }

  // --------------------------------------------------------------------------
  // Learnings Management
  // --------------------------------------------------------------------------

  /**
   * Add a learning from this PR fix session
   */
  addLearning(
    source: string,
    insight: string,
    category: PRLearning['category']
  ): void {
    this.state.learnings.push({
      timestamp: new Date().toISOString(),
      source,
      insight,
      category,
    });
    this.save();
    this.saveLearnings();
    console.log(`[PRFixState] 💡 Learned: ${insight}`);
  }

  /**
   * Get learnings for prompt injection
   */
  getLearningsForPrompt(): string {
    if (this.state.learnings.length === 0) {
      return '';
    }

    let prompt = '\n\n=== LEARNINGS FROM THIS PR ===\n';
    prompt += 'Apply these insights from earlier fixes in this PR:\n\n';

    for (const learning of this.state.learnings) {
      prompt += `• [${learning.category}] ${learning.insight}\n`;
    }

    return prompt;
  }

  /**
   * Get codebase-specific learnings (for this repo)
   */
  getCodebaseLearnings(): PRLearning[] {
    return this.state.learnings.filter(l => l.category === 'codebase');
  }

  // --------------------------------------------------------------------------
  // Cross-Fix Awareness
  // --------------------------------------------------------------------------

  /**
   * Get completed fixes for cross-fix awareness
   */
  getCompletedFixes(): Array<{
    storyId: number;
    files: string[];
    fixCode: string;
    ruleIds: string[];
  }> {
    return this.state.fixStories
      .filter(s => s.status === 'fixed' && s.fixCode)
      .map(s => ({
        storyId: s.id,
        files: s.files,
        fixCode: s.fixCode!,
        ruleIds: s.ruleIds,
      }));
  }

  /**
   * Get prior fixes for a specific file (for cross-fix awareness)
   */
  getPriorFixesForFile(filePath: string): Array<{
    storyId: number;
    ruleIds: string[];
    fixCode: string;
  }> {
    return this.state.fixStories
      .filter(s => s.status === 'fixed' && s.files.includes(filePath) && s.fixCode)
      .map(s => ({
        storyId: s.id,
        ruleIds: s.ruleIds,
        fixCode: s.fixCode!,
      }));
  }

  /**
   * Format prior fixes for prompt injection
   */
  getPriorFixesForPrompt(filePath: string): string {
    const priorFixes = this.getPriorFixesForFile(filePath);
    if (priorFixes.length === 0) {
      return '';
    }

    let prompt = '\n\n=== PRIOR FIXES IN THIS FILE ===\n';
    prompt += 'The following fixes have already been applied to this file.\n';
    prompt += 'Your fix MUST be compatible with these changes:\n\n';

    for (const fix of priorFixes) {
      prompt += `--- Fix for ${fix.ruleIds.join(', ')} ---\n`;
      prompt += '```\n' + fix.fixCode + '\n```\n\n';
    }

    return prompt;
  }

  // --------------------------------------------------------------------------
  // Progress & State
  // --------------------------------------------------------------------------

  private updateProgress(): void {
    const stories = this.state.fixStories;
    this.state.progress = {
      storiesTotal: stories.length,
      storiesFixed: stories.filter(s => s.status === 'fixed').length,
      storiesFailed: stories.filter(s => s.status === 'failed').length,
      storiesPending: stories.filter(s => s.status === 'pending' || s.status === 'in_progress').length,
      issuesFixed: stories.filter(s => s.status === 'fixed').reduce((sum, s) => sum + s.issueIds.length, 0),
      issuesFailed: stories.filter(s => s.status === 'failed').reduce((sum, s) => sum + s.issueIds.length, 0),
    };
    this.state.lastUpdatedAt = new Date().toISOString();
  }

  /**
   * Check if all stories are processed
   */
  isComplete(): boolean {
    return this.state.fixStories.every(s =>
      s.status === 'fixed' || s.status === 'failed' || s.status === 'skipped'
    );
  }

  /**
   * Mark the PR fix session as complete
   */
  markComplete(): void {
    this.state.completedAt = new Date().toISOString();
    this.save();
    console.log(`[PRFixState] ✅ PR fix session complete: ${this.state.progress.storiesFixed}/${this.state.progress.storiesTotal} fixed`);
  }

  /**
   * Get current state
   */
  getState(): PRFixState {
    return { ...this.state };
  }

  /**
   * Get summary for logging
   */
  getSummary(): string {
    const p = this.state.progress;
    return `Stories: ${p.storiesFixed}/${p.storiesTotal} fixed, ${p.storiesFailed} failed | Issues: ${p.issuesFixed}/${this.state.totalIssues} fixed`;
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  private save(): void {
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  private saveLearnings(): void {
    // Also save learnings to separate file for easy access
    fs.writeFileSync(this.learningsPath, JSON.stringify(this.state.learnings, null, 2));
  }

  /**
   * Load state from file
   */
  static load(statePath: string): PRFixStateManager | null {
    if (!fs.existsSync(statePath)) {
      return null;
    }

    try {
      const state: PRFixState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const manager = new PRFixStateManager(
        state.pr.url,
        state.pr.number,
        state.pr.repository,
        state.language,
        path.dirname(statePath)
      );
      return manager;
    } catch (e) {
      console.error(`[PRFixState] Failed to load state: ${e}`);
      return null;
    }
  }

  /**
   * Clean up state files
   */
  cleanup(): void {
    if (fs.existsSync(this.statePath)) {
      fs.unlinkSync(this.statePath);
    }
    if (fs.existsSync(this.learningsPath)) {
      fs.unlinkSync(this.learningsPath);
    }
    console.log(`[PRFixState] Cleaned up state files`);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default PRFixStateManager;
