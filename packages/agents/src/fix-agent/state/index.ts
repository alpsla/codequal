/**
 * PR Fix State Management
 *
 * Ralph-inspired state tracking for PR fix operations.
 */

export {
  PRFixStateManager,
  type PRFixState,
  type FixStory,
  type PRLearning,
} from './pr-fix-state';

export {
  StoryDecomposer,
  type IssueForGrouping,
  type FixStoryGroup,
  type DecompositionConfig,
} from './story-decomposer';

export {
  FreshContextFixService,
  formatPriorAttemptsForPrompt,
  type FreshContextIssue,
  type FixAttempt,
  type StoryFixContext,
  type FixResult,
  type FreshContextConfig,
} from './fresh-context-fixer';

export {
  RepositoryLearningService,
  getRepositoryLearningService,
  type RepositoryLearning,
  type LearningQuery,
  type RelevantLearning,
} from './repository-learnings';

export {
  PatternAwareFixService,
  type PatternExample,
  type PatternAwareConfig,
  type PatternAwareResult,
  type FailedStoryReport,
  // Session 88: Complexity detection for model selection
  type IssueComplexity,
  getFixComplexity,
  getModelForComplexity,
} from './pattern-aware-fixer';

export { default } from './pr-fix-state';
