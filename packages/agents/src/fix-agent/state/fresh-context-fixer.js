"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreshContextFixService = void 0;
exports.formatPriorAttemptsForPrompt = formatPriorAttemptsForPrompt;
const pr_fix_state_1 = require("./pr-fix-state");
const story_decomposer_1 = require("./story-decomposer");
const repository_learnings_1 = require("./repository-learnings");
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
class FreshContextFixService {
    constructor(prUrl, prNumber, repository, language, config) {
        var _a, _b;
        this.issueMap = new Map();
        this.repository = repository;
        this.language = language;
        this.stateManager = new pr_fix_state_1.PRFixStateManager(prUrl, prNumber, repository, language, config.stateDir);
        this.decomposer = new story_decomposer_1.StoryDecomposer({
            maxIssuesPerStory: 5,
            groupByFileThenRule: true,
            maxLineSpan: 100,
            prioritizeBySeverity: true,
        });
        this.repoLearnings = (0, repository_learnings_1.getRepositoryLearningService)();
        this.config = {
            maxAttemptsPerStory: (_a = config.maxAttemptsPerStory) !== null && _a !== void 0 ? _a : 3,
            stateDir: (_b = config.stateDir) !== null && _b !== void 0 ? _b : process.cwd(),
            repositoryInfo: config.repositoryInfo,
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
    initialize(issues) {
        // Store issues for lookup
        for (const issue of issues) {
            this.issueMap.set(issue.id, issue);
        }
        // Convert to grouping format
        const forGrouping = issues.map(i => ({
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
    async processAllStories() {
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
            }
            else {
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
    async processStory(storyId) {
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
        const context = await this.buildFreshContext(story);
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
                this.stateManager.addLearning(`Story ${storyId}: ${story.groupName}`, `Fix succeeded for ${story.ruleIds.join(', ')} with confidence ${confidence}%`, 'success');
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
                this.stateManager.addLearning(`Story ${storyId}: ${story.groupName}`, `Avoid patterns that trigger: ${validation.regressions.map(r => r.rule).join(', ')}`, 'regression');
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
        }
        catch (error) {
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
    async buildFreshContext(story) {
        var _a, _b;
        // Get the actual issues for this story
        const issues = story.issueIds
            .map(id => this.issueMap.get(id))
            .filter((i) => !!i);
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
        // Get cross-repo learnings from KB
        const repositoryLearnings = await this.repoLearnings.formatLearningsForPrompt({
            repository: this.repository,
            organization: (_a = this.config.repositoryInfo) === null || _a === void 0 ? void 0 : _a.organization,
            language: this.language,
            frameworks: (_b = this.config.repositoryInfo) === null || _b === void 0 ? void 0 : _b.frameworks,
            ruleIds: story.ruleIds,
        });
        return {
            story,
            issues,
            priorAttempts,
            priorFixesInFiles,
            learnings,
            repositoryLearnings,
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
    buildPriorAttemptsSummary(story) {
        const attempts = [];
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
    getProgress() {
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
    isComplete() {
        return this.stateManager.isComplete();
    }
    /**
     * Clean up state files (after successful PR merge)
     */
    cleanup() {
        this.stateManager.cleanup();
    }
    /**
     * Save valuable learnings to repository KB for future use
     *
     * Call this after a successful PR fix session to persist
     * insights that could help future PRs in this and similar repos.
     */
    async saveLearningsToRepository() {
        var _a, _b;
        const state = this.stateManager.getState();
        // Filter learnings worth persisting (pattern and codebase categories)
        const worthSaving = state.learnings.filter(l => l.category === 'pattern' ||
            l.category === 'codebase' ||
            l.category === 'success');
        if (worthSaving.length === 0) {
            console.log('[FreshContextFixer] No learnings to persist to repository KB');
            return 0;
        }
        // Determine organization from repository path
        const orgMatch = this.repository.match(/github\.com\/([^/]+)/);
        const organization = ((_a = this.config.repositoryInfo) === null || _a === void 0 ? void 0 : _a.organization) ||
            (orgMatch ? orgMatch[1] : 'unknown');
        // Save to repository KB
        const saved = await this.repoLearnings.saveLearningsFromSession(this.repository, organization, this.language, ((_b = this.config.repositoryInfo) === null || _b === void 0 ? void 0 : _b.frameworks) || [], worthSaving.map(l => ({
            insight: l.insight,
            category: l.category === 'success' ? 'pattern' : l.category,
        })));
        console.log(`[FreshContextFixer] Saved ${saved} learnings to repository KB`);
        return saved;
    }
}
exports.FreshContextFixService = FreshContextFixService;
// ============================================================================
// Helper: Build AI Prompt Section for Prior Attempts
// ============================================================================
/**
 * Format prior attempts for inclusion in AI prompt
 *
 * This provides structured guidance about what NOT to do,
 * rather than overwhelming the AI with raw failure data.
 */
function formatPriorAttemptsForPrompt(attempts) {
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
exports.default = FreshContextFixService;
