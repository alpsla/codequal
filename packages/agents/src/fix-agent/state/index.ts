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
} from './pattern-aware-fixer';

// Session 89: Complexity detection moved to dedicated module
export {
  type IssueComplexity,
  type ComplexityRoutingStats,
  getFixComplexity,
  getModelForComplexity,
  getComplexityStats,
  resetComplexityStats,
  isInherentlyComplex,
  isInherentlySimple,
  getComplexitySummary,
  KB_SUCCESS_RATE_THRESHOLD,
} from './complexity-detection';

export { default } from './pr-fix-state';
