import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AgentRoleEvaluationParameters, RepositoryContext, PRContext, UserPreferences, SecondaryAgentDecisionCriteria } from './agent-evaluation-data';
import { AgentConfig } from '../types';
/**
 * Result from the agent selection process
 */
export interface AgentSelectionResult {
    primaryAgent: AgentConfig;
    secondaryAgents: AgentConfig[];
    fallbackAgents: AgentConfig[];
    useMCP: boolean;
    expectedCost: number;
    confidence: number;
    explanation: string;
}
/**
 * Agent Selection Service
 * Responsible for selecting the optimal agents based on context
 */
export declare class AgentSelector {
    private logger;
    private evaluationData;
    constructor(evaluationData?: Record<AgentProvider, Partial<AgentRoleEvaluationParameters>>);
    /**
     * Select the best agent for a specific role and context
     * @param role The role the agent will fulfill
     * @param repoContext Repository context
     * @param prContext PR context
     * @param preferences User preferences
     * @returns The selected agent configuration
     */
    selectAgent(role: AgentRole, repoContext: RepositoryContext, prContext: PRContext, preferences?: UserPreferences): AgentConfig;
    /**
     * Select multiple agents for a complete multi-agent setup
     * @param roles The roles required for analysis
     * @param repoContext Repository context
     * @param prContext PR context
     * @param preferences User preferences
     * @returns Complete agent selection result
     */
    selectMultiAgentConfiguration(roles: AgentRole[], repoContext: RepositoryContext, prContext: PRContext, preferences?: UserPreferences, secondaryAgentCriteria?: SecondaryAgentDecisionCriteria): AgentSelectionResult;
    /**
     * Calculate scores for each agent for a specific role and context
     * @param role Agent role
     * @param repoContext Repository context
     * @param prContext PR context
     * @param preferences User preferences
     * @returns Scores for each agent (0-100)
     */
    private calculateAgentScores;
    /**
     * Select a complementary agent that is different from the primary
     * @param role The role to fulfill
     * @param primaryProvider The primary provider to avoid
     * @param repoContext Repository context
     * @param prContext PR context
     * @param preferences User preferences
     * @returns A complementary agent configuration
     */
    private selectComplementaryAgent;
    /**
     * Select fallback agents for a role
     * @param role The role to fulfill
     * @param primaryProvider The primary provider to avoid
     * @param repoContext Repository context
     * @param prContext PR context
     * @param preferences User preferences
     * @returns Array of fallback agent configurations
     */
    private selectFallbackAgents;
    /**
     * Determine if MCP should be used based on context
     * @param repoContext Repository context
     * @param prContext PR context
     * @param preferences User preferences
     * @returns Whether to use MCP
     */
    private shouldUseMCP;
    /**
     * Optimize agent configuration for a specific language
     * @param config Agent configuration to optimize
     * @param language Target language
     */
    private optimizeForLanguage;
    /**
     * Apply user preferences to agent configuration
     * @param config Agent configuration to modify
     * @param preferences User preferences
     */
    private applyUserPreferences;
    /**
     * Calculate expected cost of an analysis
     * @param primaryAgents Primary agents
     * @param secondaryAgents Secondary agents
     * @param fallbackAgents Fallback agents
     * @param useMCP Whether MCP is used
     * @returns Expected cost in USD
     */
    private calculateExpectedCost;
    /**
     * Calculate confidence score for the selected configuration
     * @param primaryAgents Primary agents
     * @param secondaryAgents Secondary agents
     * @param repoContext Repository context
     * @param prContext PR context
     * @returns Confidence score (0-100)
     */
    private calculateConfidenceScore;
    /**
     * Generate explanation for agent selection
     * @param primaryAgent Primary agent
     * @param secondaryAgents Secondary agents
     * @param fallbackAgents Fallback agents
     * @param useMCP Whether MCP is used
     * @param repoContext Repository context
     * @param prContext PR context
     * @returns Explanation string
     */
    private generateSelectionExplanation;
    /**
     * Categorize repository size for performance evaluation
     * @param totalFiles Total number of files
     * @returns Size category
     */
    private categorizeSizePerformance;
    /**
     * Categorize repository complexity for performance evaluation
     * @param complexity Complexity score (0-100)
     * @returns Complexity category
     */
    private categorizeComplexityPerformance;
    /**
     * Get display name for a provider
     * @param provider Agent provider
     * @returns Display name
     */
    private getProviderDisplayName;
    /**
     * Get display name for a role
     * @param role Agent role
     * @returns Display name
     */
    private getRoleDisplayName;
}
