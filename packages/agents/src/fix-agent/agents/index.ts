/**
 * Fix Agent - Agents Module
 *
 * Exports specialized agents for the Two-Tier Fix System:
 * - AIFixerAgent: Handles Tier 2 issues (<60% confidence)
 */

// AI-Fixer Agent
export {
  AIFixerAgent,
  getAIFixerAgent,
  processIssuesWithAIFixer,
  // Types
  type AIFixerIssue,
  type AIFixRecommendation,
  type EnrichedIssue,
  type AIFixerBatchResult,
} from './ai-fixer-agent';
