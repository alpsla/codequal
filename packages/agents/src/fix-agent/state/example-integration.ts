/**
 * Example: Using FreshContextFixService with AIFixerAgent
 *
 * This shows how to integrate the Ralph-inspired state management
 * with the existing AI fix generation pipeline.
 *
 * Created: Session 82
 */

import {
  FreshContextFixService,
  FreshContextIssue,
  StoryFixContext,
  formatPriorAttemptsForPrompt,
} from './index';
import { AIFixerAgent, AIFixerIssue } from '../agents/ai-fixer-agent';
import { createAIFixerVerifier } from '../fix-pattern-registry';

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Process a PR's issues using the Ralph-inspired fresh context pattern
 *
 * This is the recommended approach for PRO tier where we want:
 * - Resumable state (PR fix session can span multiple invocations)
 * - Fresh context per attempt (no context bloat)
 * - Story-based grouping (related issues fixed together)
 * - Cross-fix awareness (later fixes know about earlier ones)
 * - Within-PR learnings (accumulated insights)
 */
export async function processPRWithFreshContext(
  prUrl: string,
  prNumber: number,
  repository: string,
  language: string,
  issues: FreshContextIssue[]
): Promise<{
  completed: number;
  failed: number;
  skipped: number;
}> {
  console.log(`[Example] Processing PR #${prNumber} with ${issues.length} issues`);

  // Create the AI Fixer Agent (existing component)
  const aiAgent = new AIFixerAgent({ submitToRegistry: true });
  aiAgent.enableRegistrySubmission();

  // Create the verifier for validation
  const verifier = createAIFixerVerifier({
    maxAttempts: 1, // We handle retries in FreshContextFixService
    minScore: 80,
    dryRun: false,
    skipToolRevalidation: false,
  });

  // Detect frameworks from file patterns
  const { getRepositoryLearningService } = await import('./repository-learnings');
  const repoLearnings = getRepositoryLearningService();
  const detectedFrameworks = repoLearnings.detectFrameworks(
    issues.map(i => i.file)
  );
  console.log(`[Example] Detected frameworks: ${detectedFrameworks.join(', ') || 'none'}`);

  // Extract organization from repository
  const orgMatch = repository.match(/github\.com\/([^/]+)/);
  const organization = orgMatch ? orgMatch[1] : 'unknown';

  // Create the Fresh Context Fix Service with repository info
  const fixService = new FreshContextFixService(
    prUrl,
    prNumber,
    repository,
    language,
    {
      maxAttemptsPerStory: 3,

      // Repository info for cross-repo learnings
      repositoryInfo: {
        organization,
        frameworks: detectedFrameworks,
      },

      // Generate fix using completely fresh AI context
      generateFix: async (context: StoryFixContext) => {
        // Convert to AIFixerIssue format
        const aiIssue: AIFixerIssue = {
          id: context.issues[0].id,
          validatorToolId: context.issues[0].tool,
          ruleId: context.issues[0].ruleId,
          file: context.issues[0].file,
          line: context.issues[0].line,
          message: context.issues[0].message,
          severity: context.issues[0].severity,
          codeContext: context.issues[0].codeContext,
          language: context.issues[0].language,
          originalConfidence: 50, // Tier 2

          // Include learnings and prior fixes in tool context
          toolContext: {
            bestPractices: [
              context.learnings,
              context.repositoryLearnings,  // Cross-repo learnings from KB
            ].filter(Boolean).join('\n') || undefined,
            toolSuggestion: context.priorFixesInFiles
              ? 'Prior fixes in this file:\n' + context.priorFixesInFiles
              : undefined,
          },
        };

        // Generate fix with fresh AI call
        const result = await aiAgent.processIssue(aiIssue);

        return {
          fixCode: result.fixRecommendation.correctedCode,
          confidence: result.fixRecommendation.confidence,
        };
      },

      // Validate fix using tool re-validation
      validateFix: async (fixCode: string, issues: FreshContextIssue[]) => {
        const issue = issues[0];

        try {
          const result = await verifier.verifyAndSubmit({
            ruleId: issue.ruleId,
            tool: issue.tool,
            filePath: issue.file,
            originalCode: issue.codeContext || '',
            fixedCode: fixCode,
            lineNumber: issue.line,
            issueMessage: issue.message,
            aiModel: 'fresh-context-fixer',
            attemptNumber: 1,
            language: issue.language,
          });

          if (result.success) {
            return { passed: true };
          }

          // Extract regressions if any
          const regressions: Array<{ rule: string; message: string }> = [];
          if (result.verificationHistory) {
            const lastAttempt = result.verificationHistory[result.verificationHistory.length - 1];
            if (lastAttempt?.toolRevalidation?.regressions) {
              for (const reg of lastAttempt.toolRevalidation.regressions) {
                regressions.push({
                  rule: reg.rule,
                  message: reg.message,
                });
              }
            }
          }

          return {
            passed: false,
            regressions,
            error: result.failureReason || 'Validation failed',
          };
        } catch (error: any) {
          return {
            passed: false,
            error: error.message,
          };
        }
      },
    }
  );

  // Initialize with issues
  fixService.initialize(issues);

  // Process all stories with fresh context per attempt
  const result = await fixService.processAllStories();

  console.log(`[Example] Complete: ${result.completed} fixed, ${result.failed} failed, ${result.skipped} skipped`);
  console.log(`[Example] Total attempts: ${result.totalAttempts}`);

  // Save valuable learnings to repository KB for future PRs
  // This enables cross-PR and cross-repo knowledge sharing
  const savedLearnings = await fixService.saveLearningsToRepository();
  console.log(`[Example] Saved ${savedLearnings} learnings to repository KB for future use`);

  return result;
}

// ============================================================================
// Simpler Usage: Just State Management
// ============================================================================

/**
 * Use just the state management without the full service
 *
 * This is useful if you want to:
 * - Integrate with a custom fix generation pipeline
 * - Use only story decomposition
 * - Track progress without fresh context pattern
 */
export async function useStateManagementOnly(
  prUrl: string,
  prNumber: number,
  repository: string,
  language: string,
  issues: FreshContextIssue[]
): Promise<void> {
  const { PRFixStateManager, StoryDecomposer } = await import('./index');

  // Create state manager
  const stateManager = new PRFixStateManager(
    prUrl,
    prNumber,
    repository,
    language
  );

  // Decompose issues into stories
  const decomposer = new StoryDecomposer({
    maxIssuesPerStory: 5,
    groupByFileThenRule: true,
  });

  const groups = decomposer.decompose(issues.map(i => ({
    id: i.id,
    ruleId: i.ruleId,
    file: i.file,
    line: i.line,
    severity: i.severity,
    message: i.message,
  })));

  // Initialize stories
  stateManager.initializeStories(groups);

  // Process each story (your custom logic here)
  while (!stateManager.isComplete()) {
    const story = stateManager.getNextStory();
    if (!story) break;

    stateManager.startStory(story.id);

    // ... your fix generation logic ...
    const success = Math.random() > 0.3; // Example

    if (success) {
      stateManager.completeStory(story.id, '// fixed code');
      stateManager.addLearning(
        `Story ${story.id}`,
        'Fix pattern worked well',
        'success'
      );
    } else {
      stateManager.failStory(story.id, 'Example failure');
    }
  }

  // Print summary
  console.log(stateManager.getSummary());
}

// ============================================================================
// Example: Building Fresh Context Prompt
// ============================================================================

/**
 * Example of how to build a fresh context prompt
 *
 * This shows the Ralph pattern: instead of appending raw failures,
 * we build a structured, concise summary.
 */
export function buildFreshContextPrompt(context: StoryFixContext): string {
  let prompt = `You are an expert code fixer. Generate a fix for the following issues.

=== ISSUE DETAILS ===
`;

  for (const issue of context.issues) {
    prompt += `
File: ${issue.file}
Line: ${issue.line}
Rule: ${issue.ruleId}
Message: ${issue.message}
`;

    if (issue.codeContext) {
      prompt += `
Code:
\`\`\`${issue.language}
${issue.codeContext}
\`\`\`
`;
    }
  }

  // Add prior attempts (structured, not raw)
  if (context.priorAttempts.length > 0) {
    prompt += formatPriorAttemptsForPrompt(context.priorAttempts);
  }

  // Add cross-fix awareness
  if (context.priorFixesInFiles) {
    prompt += context.priorFixesInFiles;
  }

  // Add within-PR learnings
  if (context.learnings) {
    prompt += context.learnings;
  }

  prompt += `
=== YOUR TASK ===
Generate a fix that:
1. Resolves all issues listed above
2. Does NOT introduce new issues
3. Follows the best practices from learnings
4. Is compatible with prior fixes in the same files

Output ONLY the corrected code.`;

  return prompt;
}

// ============================================================================
// Export
// ============================================================================

export default processPRWithFreshContext;
