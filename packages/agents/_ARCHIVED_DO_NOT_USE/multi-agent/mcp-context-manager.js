"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPContextManager = void 0;
const utils_1 = require("@codequal/core/utils");
/**
 * Main MCP Context Manager class
 * Implements Model Context Protocol for multi-agent coordination
 */
class MCPContextManager {
    constructor(authenticatedUser, repositoryContext) {
        this.authenticatedUser = authenticatedUser;
        this.repositoryContext = repositoryContext;
        this.logger = (0, utils_1.createLogger)('MCPContextManager');
        this.messageQueue = [];
        this.coordinationStrategies = {};
        this.activeSubscriptions = new Map();
        this.context = this.initializeContext();
        this.setupDefaultCoordinationStrategies();
    }
    /**
     * Initialize MCP context with user and repository information
     */
    initializeContext() {
        return {
            session_id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_context: {
                user_id: this.authenticatedUser.id,
                role: this.authenticatedUser.role,
                permissions: Array.isArray(this.authenticatedUser.permissions) ? this.authenticatedUser.permissions : [],
                organization_id: this.authenticatedUser.organizationId
            },
            repository_context: {
                repository_url: this.repositoryContext.repositoryId, // Note: This should be the actual URL
                repository_id: this.repositoryContext.repositoryId,
                primary_language: 'unknown', // This should be extracted from repository data
                size_category: 'medium', // This should be determined from repository analysis
                analysis_history: this.repositoryContext.recentAnalysis,
                recent_findings: []
            },
            agent_context: {
                active_agents: [],
                completed_agents: [],
                agent_results: {},
                coordination_strategy: 'adaptive'
            },
            shared_findings: {
                cross_agent_insights: [],
                deduplicated_issues: [],
                confidence_scores: {}
            },
            metadata: {
                created_at: new Date(),
                updated_at: new Date(),
                version: '1.0.0',
                mcp_version: '0.1.0'
            }
        };
    }
    /**
     * Set up default coordination strategies
     */
    setupDefaultCoordinationStrategies() {
        // Quick Analysis Strategy
        this.coordinationStrategies.quick = {
            name: 'Quick Analysis',
            description: 'Fast parallel execution for time-sensitive analysis',
            execution_order: ['security', 'codeQuality'],
            dependency_graph: {},
            parallel_groups: [['security', 'codeQuality']],
            timeout_per_agent: 30000, // 30 seconds
            fallback_strategy: 'partial_results'
        };
        // Comprehensive Analysis Strategy  
        this.coordinationStrategies.comprehensive = {
            name: 'Comprehensive Analysis',
            description: 'Thorough analysis with intelligent agent coordination',
            execution_order: ['security', 'codeQuality', 'performance', 'dependency', 'architecture'],
            dependency_graph: {
                'codeQuality': ['security'], // Code quality depends on security findings
                'performance': ['security', 'codeQuality'], // Performance depends on security and code quality
                'dependency': ['security'], // Dependency analysis depends on security
                'architecture': ['security', 'codeQuality'] // Architecture depends on security and code quality
            },
            parallel_groups: [
                ['security'], // Security first
                ['codeQuality', 'dependency'], // Then these in parallel
                ['performance', 'architecture'] // Finally performance and architecture
            ],
            timeout_per_agent: 120000, // 2 minutes
            fallback_strategy: 'progressive_timeout'
        };
        // Deep Analysis Strategy
        this.coordinationStrategies.deep = {
            name: 'Deep Analysis',
            description: 'Extensive analysis with cross-agent collaboration',
            execution_order: ['security', 'codeQuality', 'performance', 'dependency', 'architecture', 'educational', 'reporting'],
            dependency_graph: {
                'codeQuality': ['security'], // Code quality depends on security
                'performance': ['security', 'codeQuality'], // Performance depends on both
                'dependency': ['security'], // Dependency depends on security
                'architecture': ['security', 'codeQuality'], // Architecture depends on security and code quality
                'educational': ['security', 'codeQuality', 'performance', 'dependency', 'architecture'], // Educational needs all findings
                'reporting': ['security', 'codeQuality', 'performance', 'dependency', 'architecture', 'educational'] // Reporting needs everything
            },
            parallel_groups: [
                ['security'], // Security first (everything depends on it)
                ['codeQuality', 'dependency'], // These can run after security
                ['performance', 'architecture'], // These depend on earlier results
                ['educational'], // Educational analysis after all specialized agents
                ['reporting'] // Final reporting
            ],
            timeout_per_agent: 300000, // 5 minutes
            fallback_strategy: 'best_effort_completion'
        };
    }
    /**
     * Get current MCP context
     */
    getContext() {
        return { ...this.context }; // Return a copy to prevent mutations
    }
    /**
     * Update repository context with new information
     */
    updateRepositoryContext(repositoryUrl, primaryLanguage, sizeCategory) {
        this.context.repository_context.repository_url = repositoryUrl;
        this.context.repository_context.primary_language = primaryLanguage;
        this.context.repository_context.size_category = sizeCategory;
        this.context.metadata.updated_at = new Date();
        this.broadcastMessage({
            id: `ctx_update_${Date.now()}`,
            type: 'context_update',
            source_agent: 'mcp_manager',
            payload: {
                type: 'repository_context_update',
                repository_context: this.context.repository_context
            },
            timestamp: new Date(),
            priority: 'medium'
        });
        this.logger.info('Repository context updated', {
            repositoryUrl,
            primaryLanguage,
            sizeCategory
        });
    }
    /**
     * Register agent as active
     */
    registerAgent(agentName) {
        if (!this.context.agent_context.active_agents.includes(agentName)) {
            this.context.agent_context.active_agents.push(agentName);
            this.context.metadata.updated_at = new Date();
            this.logger.info('Agent registered', { agentName });
        }
    }
    /**
     * Mark agent as completed and store results
     */
    completeAgent(agentName, results) {
        // Move from active to completed
        this.context.agent_context.active_agents = this.context.agent_context.active_agents.filter(a => a !== agentName);
        if (!this.context.agent_context.completed_agents.includes(agentName)) {
            this.context.agent_context.completed_agents.push(agentName);
        }
        // Store results
        this.context.agent_context.agent_results[agentName] = {
            results,
            completed_at: new Date(),
            success: true
        };
        this.context.metadata.updated_at = new Date();
        // Broadcast completion to other agents
        this.broadcastMessage({
            id: `agent_complete_${Date.now()}`,
            type: 'agent_result',
            source_agent: agentName,
            payload: {
                type: 'agent_completion',
                agent_name: agentName,
                results: results,
                completed_at: new Date()
            },
            timestamp: new Date(),
            priority: 'high'
        });
        this.logger.info('Agent completed', { agentName, resultsCount: results?.insights?.length || 0 });
    }
    /**
     * Get coordination strategy for analysis mode
     */
    getCoordinationStrategy(analysisMode) {
        const strategy = this.coordinationStrategies[analysisMode] || this.coordinationStrategies.quick;
        this.logger.info('Selected coordination strategy', {
            analysisMode,
            strategyName: strategy.name,
            agentCount: strategy.execution_order.length
        });
        return strategy;
    }
    /**
     * Get next agents to execute based on strategy and dependencies
     */
    getNextAgentsToExecute(strategy) {
        const completed = this.context.agent_context.completed_agents;
        const active = this.context.agent_context.active_agents;
        // Find agents whose dependencies are satisfied
        const readyAgents = [];
        for (const agent of strategy.execution_order) {
            // Skip if already completed or active
            if (completed.includes(agent) || active.includes(agent)) {
                continue;
            }
            // Check if dependencies are satisfied
            const dependencies = strategy.dependency_graph[agent] || [];
            const dependenciesSatisfied = dependencies.every(dep => completed.includes(dep));
            if (dependenciesSatisfied) {
                readyAgents.push(agent);
            }
        }
        this.logger.info('Next agents to execute', {
            readyAgents,
            completed,
            active
        });
        return readyAgents;
    }
    /**
     * Add cross-agent insight for deduplication and correlation
     */
    addCrossAgentInsight(sourceAgent, targetAgent, insight) {
        this.context.shared_findings.cross_agent_insights.push({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            source_agent: sourceAgent,
            target_agent: targetAgent,
            insight,
            created_at: new Date()
        });
        // Notify target agent
        if (targetAgent !== 'all') {
            this.sendMessage(targetAgent, {
                id: `cross_insight_${Date.now()}`,
                type: 'context_update',
                source_agent: sourceAgent,
                target_agent: targetAgent,
                payload: {
                    type: 'cross_agent_insight',
                    insight
                },
                timestamp: new Date(),
                priority: 'medium'
            });
        }
        this.logger.info('Cross-agent insight added', {
            sourceAgent,
            targetAgent,
            insightType: insight.type
        });
    }
    /**
     * Subscribe to MCP messages
     */
    subscribe(agentName, callback) {
        this.activeSubscriptions.set(agentName, callback);
        this.logger.info('Agent subscribed to MCP messages', { agentName });
    }
    /**
     * Unsubscribe from MCP messages
     */
    unsubscribe(agentName) {
        this.activeSubscriptions.delete(agentName);
        this.logger.info('Agent unsubscribed from MCP messages', { agentName });
    }
    /**
     * Send message to specific agent
     */
    sendMessage(targetAgent, message) {
        const callback = this.activeSubscriptions.get(targetAgent);
        if (callback) {
            try {
                callback(message);
            }
            catch (error) {
                this.logger.error('Error delivering message to agent', {
                    targetAgent,
                    messageId: message.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }
    /**
     * Broadcast message to all subscribed agents
     */
    broadcastMessage(message) {
        for (const [agentName, callback] of this.activeSubscriptions) {
            if (agentName !== message.source_agent) { // Don't send back to source
                try {
                    callback(message);
                }
                catch (error) {
                    this.logger.error('Error broadcasting message to agent', {
                        agentName,
                        messageId: message.id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        }
    }
    /**
     * Get analysis progress summary
     */
    getProgressSummary() {
        const strategy = this.getCoordinationStrategy(this.context.agent_context.coordination_strategy);
        const totalAgents = strategy.execution_order.length;
        const completedAgents = this.context.agent_context.completed_agents.length;
        const activeAgents = this.context.agent_context.active_agents.length;
        const pendingAgents = totalAgents - completedAgents - activeAgents;
        return {
            total_agents: totalAgents,
            completed_agents: completedAgents,
            active_agents: activeAgents,
            pending_agents: pendingAgents,
            completion_percentage: Math.round((completedAgents / totalAgents) * 100),
            estimated_remaining_time: pendingAgents * (strategy.timeout_per_agent / 1000) // in seconds
        };
    }
    /**
     * Clean up resources
     */
    cleanup() {
        this.activeSubscriptions.clear();
        this.messageQueue = [];
        this.logger.info('MCP Context Manager cleaned up');
    }
}
exports.MCPContextManager = MCPContextManager;
