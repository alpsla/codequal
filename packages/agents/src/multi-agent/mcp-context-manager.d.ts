import { AuthenticatedUser } from './types';
import { VectorSearchResult, RepositoryVectorContext } from './enhanced-executor';
/**
 * MCP (Model Context Protocol) Context Manager
 * Manages context sharing and coordination between agents using MCP standards
 */
export interface MCPContext {
    session_id: string;
    user_context: {
        user_id: string;
        role: string;
        permissions: string[];
        organization_id?: string;
    };
    repository_context: {
        repository_url: string;
        repository_id: string;
        primary_language: string;
        size_category: 'small' | 'medium' | 'large';
        analysis_history: VectorSearchResult[];
        recent_findings: any[];
    };
    agent_context: {
        active_agents: string[];
        completed_agents: string[];
        agent_results: Record<string, any>;
        coordination_strategy: 'parallel' | 'sequential' | 'adaptive';
    };
    shared_findings: {
        cross_agent_insights: any[];
        deduplicated_issues: any[];
        confidence_scores: Record<string, number>;
    };
    metadata: {
        created_at: Date;
        updated_at: Date;
        version: string;
        mcp_version: string;
    };
}
export interface MCPMessage {
    id: string;
    type: 'context_update' | 'agent_result' | 'coordination_request' | 'error';
    source_agent: string;
    target_agent?: string;
    payload: any;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface MCPCoordinationStrategy {
    name: string;
    description: string;
    execution_order: string[];
    dependency_graph: Record<string, string[]>;
    parallel_groups: string[][];
    timeout_per_agent: number;
    fallback_strategy: string;
}
/**
 * Main MCP Context Manager class
 * Implements Model Context Protocol for multi-agent coordination
 */
export declare class MCPContextManager {
    private authenticatedUser;
    private repositoryContext;
    private logger;
    private context;
    private messageQueue;
    private coordinationStrategies;
    private activeSubscriptions;
    constructor(authenticatedUser: AuthenticatedUser, repositoryContext: RepositoryVectorContext);
    /**
     * Initialize MCP context with user and repository information
     */
    private initializeContext;
    /**
     * Set up default coordination strategies
     */
    private setupDefaultCoordinationStrategies;
    /**
     * Get current MCP context
     */
    getContext(): MCPContext;
    /**
     * Update repository context with new information
     */
    updateRepositoryContext(repositoryUrl: string, primaryLanguage: string, sizeCategory: 'small' | 'medium' | 'large'): void;
    /**
     * Register agent as active
     */
    registerAgent(agentName: string): void;
    /**
     * Mark agent as completed and store results
     */
    completeAgent(agentName: string, results: any): void;
    /**
     * Get coordination strategy for analysis mode
     */
    getCoordinationStrategy(analysisMode: string): MCPCoordinationStrategy;
    /**
     * Get next agents to execute based on strategy and dependencies
     */
    getNextAgentsToExecute(strategy: MCPCoordinationStrategy): string[];
    /**
     * Add cross-agent insight for deduplication and correlation
     */
    addCrossAgentInsight(sourceAgent: string, targetAgent: string, insight: any): void;
    /**
     * Subscribe to MCP messages
     */
    subscribe(agentName: string, callback: (message: MCPMessage) => void): void;
    /**
     * Unsubscribe from MCP messages
     */
    unsubscribe(agentName: string): void;
    /**
     * Send message to specific agent
     */
    private sendMessage;
    /**
     * Broadcast message to all subscribed agents
     */
    private broadcastMessage;
    /**
     * Get analysis progress summary
     */
    getProgressSummary(): {
        total_agents: number;
        completed_agents: number;
        active_agents: number;
        pending_agents: number;
        completion_percentage: number;
        estimated_remaining_time?: number;
    };
    /**
     * Clean up resources
     */
    cleanup(): void;
}
