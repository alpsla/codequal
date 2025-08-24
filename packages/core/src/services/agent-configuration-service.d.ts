/**
 * Agent Configuration Service
 *
 * Provides optimal agent configurations using the dynamic RESEARCHER system.
 *
 * Architecture:
 * - Vector DB: Contains existing model configurations
 * - Researcher Agent: Searches web for new models when configs missing
 * - Quarterly Scheduler: Refreshes all configs every 3 months to stay current
 * - Dynamic Fallback: Uses progressively broader Vector DB searches as last resort
 */
import { AgentRole, AgentProvider, AgentSelection } from '../config/agent-registry';
import { RepositoryContext } from './model-selection/ModelVersionSync';
/**
 * Get optimal agent configuration for a specific role and context
 */
export declare function getOptimalAgent(role: AgentRole, context: RepositoryContext): Promise<AgentProvider>;
/**
 * Get optimal agent selection for all roles given a repository context
 */
export declare function getOptimalAgentSelection(context: RepositoryContext): Promise<AgentSelection>;
/**
 * Get optimal agent selection with sensible defaults
 */
export declare function getDefaultAgentSelection(): Promise<AgentSelection>;
/**
 * Check if a specific agent provider is available for a role
 */
export declare function isAgentAvailable(role: AgentRole, provider: AgentProvider, context: RepositoryContext): Promise<boolean>;
/**
 * Get cost estimate for using a specific agent configuration
 */
export declare function getAgentCostEstimate(role: AgentRole, context: RepositoryContext): Promise<{
    inputCost: number;
    outputCost: number;
} | null>;
