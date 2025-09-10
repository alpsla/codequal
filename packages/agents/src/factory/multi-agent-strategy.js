"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecializedMultiAgent = exports.SequentialMultiAgent = exports.ParallelMultiAgent = exports.MultiAgent = exports.MultiAgentManager = exports.MultiAgentStrategy = void 0;
const agent_registry_1 = require("@codequal/core/config/agent-registry");
const agent_factory_1 = require("./agent-factory");
const utils_1 = require("@codequal/core/utils");
/**
 * Multi-agent strategy options
 */
var MultiAgentStrategy;
(function (MultiAgentStrategy) {
    MultiAgentStrategy["PARALLEL"] = "parallel";
    MultiAgentStrategy["SEQUENTIAL"] = "sequential";
    MultiAgentStrategy["SPECIALIZED"] = "specialized";
})(MultiAgentStrategy || (exports.MultiAgentStrategy = MultiAgentStrategy = {}));
/**
 * Class for managing multi-agent strategies
 */
class MultiAgentManager {
    constructor() {
        this.logger = (0, utils_1.createLogger)('MultiAgentManager');
    }
    /**
     * Create a multi-agent strategy
     * @param config Multi-agent configuration
     * @returns Multi-agent strategy instance
     */
    createMultiAgentStrategy(config) {
        switch (config.strategy) {
            case MultiAgentStrategy.PARALLEL:
                return new ParallelMultiAgent(config);
            case MultiAgentStrategy.SEQUENTIAL:
                return new SequentialMultiAgent(config);
            case MultiAgentStrategy.SPECIALIZED:
                return new SpecializedMultiAgent(config);
            default:
                throw new Error(`Unsupported multi-agent strategy: ${config.strategy}`);
        }
    }
    /**
     * Get a recommended multi-agent strategy for a role
     * @param role Agent role
     * @returns Multi-agent configuration
     */
    getRecommendedStrategyForRole(role) {
        // Get the recommended configuration for this role, or use the default if not found
        const config = MultiAgentManager.RECOMMENDED_CONFIGURATIONS[role] ||
            { ...MultiAgentManager.DEFAULT_CONFIGURATION, role };
        // Return a copy of the configuration to prevent modification of the static reference
        return { ...config };
    }
}
exports.MultiAgentManager = MultiAgentManager;
/**
 * Default multi-agent configurations for each role
 */
MultiAgentManager.RECOMMENDED_CONFIGURATIONS = {
    [agent_registry_1.AgentRole.SECURITY]: {
        strategy: MultiAgentStrategy.SPECIALIZED,
        primaryProvider: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE],
        role: agent_registry_1.AgentRole.SECURITY
    },
    [agent_registry_1.AgentRole.CODE_QUALITY]: {
        strategy: MultiAgentStrategy.PARALLEL,
        primaryProvider: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE, agent_registry_1.AgentProvider.OPENAI],
        role: agent_registry_1.AgentRole.CODE_QUALITY
    },
    [agent_registry_1.AgentRole.PERFORMANCE]: {
        strategy: MultiAgentStrategy.SEQUENTIAL,
        primaryProvider: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE],
        role: agent_registry_1.AgentRole.PERFORMANCE
    },
    [agent_registry_1.AgentRole.ARCHITECTURE]: {
        strategy: MultiAgentStrategy.SPECIALIZED,
        primaryProvider: agent_registry_1.AgentProvider.CLAUDE,
        secondaryProviders: [agent_registry_1.AgentProvider.DEEPSEEK_CODER],
        role: agent_registry_1.AgentRole.ARCHITECTURE
    },
    [agent_registry_1.AgentRole.DEPENDENCY]: {
        strategy: MultiAgentStrategy.PARALLEL,
        primaryProvider: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE],
        role: agent_registry_1.AgentRole.DEPENDENCY
    },
    [agent_registry_1.AgentRole.EDUCATIONAL]: {
        strategy: MultiAgentStrategy.PARALLEL,
        primaryProvider: agent_registry_1.AgentProvider.CLAUDE,
        secondaryProviders: [agent_registry_1.AgentProvider.DEEPSEEK_CODER],
        role: agent_registry_1.AgentRole.EDUCATIONAL
    },
    [agent_registry_1.AgentRole.ORCHESTRATOR]: {
        strategy: MultiAgentStrategy.SPECIALIZED,
        primaryProvider: agent_registry_1.AgentProvider.CLAUDE,
        secondaryProviders: [agent_registry_1.AgentProvider.OPENAI],
        role: agent_registry_1.AgentRole.ORCHESTRATOR
    },
    [agent_registry_1.AgentRole.REPORT_GENERATION]: {
        strategy: MultiAgentStrategy.SEQUENTIAL,
        primaryProvider: agent_registry_1.AgentProvider.CLAUDE,
        secondaryProviders: [agent_registry_1.AgentProvider.OPENAI],
        role: agent_registry_1.AgentRole.REPORT_GENERATION
    },
    [agent_registry_1.AgentRole.RESEARCHER]: {
        strategy: MultiAgentStrategy.SPECIALIZED,
        primaryProvider: agent_registry_1.AgentProvider.GOOGLE,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE],
        role: agent_registry_1.AgentRole.RESEARCHER
    },
    [agent_registry_1.AgentRole.LOCATION_FINDER]: {
        strategy: MultiAgentStrategy.SPECIALIZED,
        primaryProvider: agent_registry_1.AgentProvider.OPENAI,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE],
        role: agent_registry_1.AgentRole.LOCATION_FINDER
    },
    [agent_registry_1.AgentRole.DEEPWIKI]: {
        strategy: MultiAgentStrategy.SPECIALIZED,
        primaryProvider: agent_registry_1.AgentProvider.OPENAI,
        secondaryProviders: [agent_registry_1.AgentProvider.CLAUDE],
        role: agent_registry_1.AgentRole.DEEPWIKI
    }
};
/**
 * Default multi-agent configuration to use when no specific configuration is found
 */
MultiAgentManager.DEFAULT_CONFIGURATION = {
    strategy: MultiAgentStrategy.PARALLEL,
    primaryProvider: agent_registry_1.AgentProvider.CLAUDE,
    secondaryProviders: [agent_registry_1.AgentProvider.OPENAI],
    role: agent_registry_1.AgentRole.CODE_QUALITY // Will be overridden in the method
};
/**
 * Base class for multi-agent strategies
 */
class MultiAgent {
    /**
     * Constructor
     * @param config Multi-agent configuration
     */
    constructor(config) {
        this.secondaryAgents = [];
        this.logger = (0, utils_1.createLogger)('MultiAgent');
        this.config = config;
        // Create primary agent
        this.primaryAgent = agent_factory_1.AgentFactory.createAgent(config.role, config.primaryProvider, config.config || {});
        // Create secondary agents
        for (const provider of config.secondaryProviders) {
            this.secondaryAgents.push(agent_factory_1.AgentFactory.createAgent(config.role, provider, config.config || {}));
        }
    }
    /**
     * Log an informational message
     * @param message Message
     * @param data Additional data
     */
    log(message, data) {
        this.logger.info(message, data instanceof Error ? data : (typeof data === 'object' && data !== null ? data : { value: data }));
    }
    /**
     * Log an error message
     * @param message Message
     * @param error Error object
     */
    error(message, error) {
        this.logger.error(message, error instanceof Error ? error : { message: String(error) });
    }
}
exports.MultiAgent = MultiAgent;
/**
 * Parallel multi-agent strategy
 *
 * Runs all agents in parallel and combines results
 */
class ParallelMultiAgent extends MultiAgent {
    /**
     * Analyze data using parallel agents
     * @param data Data to analyze
     * @returns Combined analysis result
     */
    async analyze(data) {
        try {
            // Start all analysis tasks in parallel
            const allAgents = [this.primaryAgent, ...this.secondaryAgents];
            const results = await Promise.all(allAgents.map((agent) => agent.analyze(data).catch((error) => {
                this.error(`Error in agent analysis:`, error);
                return null; // Return null for failed agents
            })));
            // Filter out null results
            const validResults = results.filter((result) => result !== null);
            // Combine results
            return this.combineResults(validResults);
        }
        catch (error) {
            this.error('Error in parallel multi-agent analysis', error);
            // Fallback to primary agent if multi-agent approach fails
            return this.primaryAgent.analyze(data);
        }
    }
    /**
     * Combine multiple analysis results
     * @param results Analysis results
     * @returns Combined result
     */
    combineResults(results) {
        if (results.length === 0) {
            return {
                insights: [],
                suggestions: [],
                educational: [],
                metadata: {
                    error: true,
                    timestamp: new Date().toISOString(),
                    message: 'No valid results from any agent'
                }
            };
        }
        // Start with the first result as a base
        const combined = { ...results[0] };
        // Create sets to track unique items
        const uniqueInsights = new Set();
        const uniqueSuggestions = new Set();
        const uniqueEducational = new Set();
        // Add existing items to sets
        results[0].insights?.forEach((item) => uniqueInsights.add(JSON.stringify(item)));
        results[0].suggestions?.forEach((item) => uniqueSuggestions.add(JSON.stringify(item)));
        results[0].educational?.forEach((item) => uniqueEducational.add(JSON.stringify(item)));
        // Process additional results
        for (let i = 1; i < results.length; i++) {
            const result = results[i];
            // Add unique insights
            result.insights?.forEach((item) => {
                const key = JSON.stringify(item);
                if (!uniqueInsights.has(key)) {
                    uniqueInsights.add(key);
                    combined.insights = combined.insights || [];
                    combined.insights.push(item);
                }
            });
            // Add unique suggestions
            result.suggestions?.forEach((item) => {
                const key = JSON.stringify(item);
                if (!uniqueSuggestions.has(key)) {
                    uniqueSuggestions.add(key);
                    combined.suggestions = combined.suggestions || [];
                    combined.suggestions.push(item);
                }
            });
            // Add unique educational content
            result.educational?.forEach((item) => {
                const key = JSON.stringify(item);
                if (!uniqueEducational.has(key)) {
                    uniqueEducational.add(key);
                    combined.educational = combined.educational || [];
                    combined.educational.push(item);
                }
            });
        }
        // Sort insights by severity (high -> medium -> low)
        if (combined.insights) {
            combined.insights.sort((a, b) => {
                const severityOrder = {
                    high: 0,
                    medium: 1,
                    low: 2
                };
                return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
            });
        }
        // Update metadata to reflect multi-agent approach
        combined.metadata = {
            ...combined.metadata,
            timestamp: new Date().toISOString(),
            multiAgent: true,
            strategy: 'parallel',
            providers: [
                this.config.primaryProvider,
                ...this.config.secondaryProviders
            ]
        };
        return combined;
    }
}
exports.ParallelMultiAgent = ParallelMultiAgent;
/**
 * Sequential multi-agent strategy
 *
 * Runs primary agent first, then passes results to secondary agents for enhancement
 */
class SequentialMultiAgent extends MultiAgent {
    /**
     * Analyze data using sequential agents
     * @param data Data to analyze
     * @returns Enhanced analysis result
     */
    async analyze(data) {
        try {
            // Start with primary agent
            let result = await this.primaryAgent.analyze(data);
            // Pass result to each secondary agent for enhancement
            for (const agent of this.secondaryAgents) {
                try {
                    // Create enhanced data with original data + primary results
                    const enhancedData = {
                        originalData: data,
                        previousResult: result
                    };
                    // Get enhanced result
                    const enhancedResult = await agent.analyze(enhancedData);
                    // Merge results
                    result = this.mergeResults(result, enhancedResult);
                }
                catch (error) {
                    this.error('Error in sequential agent enhancement', error);
                    // Continue with next agent if one fails
                }
            }
            // Update metadata
            result.metadata = {
                ...result.metadata,
                multiAgent: true,
                strategy: 'sequential',
                providers: [
                    this.config.primaryProvider,
                    ...this.config.secondaryProviders
                ]
            };
            return result;
        }
        catch (error) {
            this.error('Error in sequential multi-agent analysis', error);
            // Fallback to primary agent if multi-agent approach fails
            return this.primaryAgent.analyze(data);
        }
    }
    /**
     * Merge primary and enhanced results
     * @param primary Primary result
     * @param enhanced Enhanced result
     * @returns Merged result
     */
    mergeResults(primary, enhanced) {
        // Start with primary result
        const merged = { ...primary };
        // Create sets to track existing items
        const existingInsights = new Set();
        const existingSuggestions = new Set();
        const existingEducational = new Set();
        // Add existing items to sets
        primary.insights?.forEach((item) => existingInsights.add(JSON.stringify(item)));
        primary.suggestions?.forEach((item) => existingSuggestions.add(JSON.stringify(item)));
        primary.educational?.forEach((item) => existingEducational.add(JSON.stringify(item)));
        // Add new insights
        enhanced.insights?.forEach((item) => {
            const key = JSON.stringify(item);
            if (!existingInsights.has(key)) {
                merged.insights = merged.insights || [];
                merged.insights.push(item);
            }
        });
        // Add new suggestions
        enhanced.suggestions?.forEach((item) => {
            const key = JSON.stringify(item);
            if (!existingSuggestions.has(key)) {
                merged.suggestions = merged.suggestions || [];
                merged.suggestions.push(item);
            }
        });
        // Add new educational content
        enhanced.educational?.forEach((item) => {
            const key = JSON.stringify(item);
            if (!existingEducational.has(key)) {
                merged.educational = merged.educational || [];
                merged.educational.push(item);
            }
        });
        return merged;
    }
}
exports.SequentialMultiAgent = SequentialMultiAgent;
/**
 * Specialized multi-agent strategy
 *
 * Uses each agent for its specialty and combines results
 */
class SpecializedMultiAgent extends MultiAgent {
    /**
     * Analyze data using specialized agents with context enrichment
     * @param data Data to analyze
     * @returns Combined analysis result with domain-specific insights
     */
    async analyze(data) {
        try {
            // Run primary agent first with specialized context
            const prData = data;
            // Create enriched context for primary agent
            const primaryData = {
                originalData: data,
                specializedFocus: this.getRoleFocusArea(this.config.role),
                files: prData.files || [],
                position: 'primary'
            };
            // Run primary agent
            const primaryResult = await this.primaryAgent.analyze(primaryData).catch(error => {
                this.error(`Error in primary ${this.config.role} analysis with ${this.config.primaryProvider}`, error);
                return null;
            });
            // If primary analysis failed, return empty result or fall back to first secondary agent
            if (!primaryResult) {
                return this.secondaryAgents[0]?.analyze(data) || {
                    insights: [],
                    suggestions: [],
                    educational: [],
                    metadata: {
                        error: true,
                        timestamp: new Date().toISOString(),
                        message: `Primary ${this.config.role} analysis failed`
                    }
                };
            }
            // Create enriched context for secondary agents with primary results
            const secondaryData = {
                originalData: data,
                specializedFocus: `complementary_${this.config.role}`,
                primaryResults: primaryResult,
                files: prData.files || [],
                position: 'secondary'
            };
            // Run secondary agents with enriched context
            const secondaryResults = await Promise.all(this.secondaryAgents.map((agent) => agent.analyze(secondaryData).catch((error) => {
                this.error(`Error in secondary ${this.config.role} analysis`, error);
                return null;
            })));
            // Filter out null results
            const validSecondaryResults = secondaryResults.filter((result) => result !== null);
            // Combine all agent results
            const allResults = [primaryResult, ...validSecondaryResults];
            // Combine results
            return this.combineSpecializedResults(allResults);
        }
        catch (error) {
            this.error('Error in specialized multi-agent analysis', error);
            // Fallback to primary agent if multi-agent approach fails
            return this.primaryAgent.analyze(data);
        }
    }
    /**
     * Get focus area based on role
     * @param role Agent role
     * @returns Focus area for specialized context
     */
    getRoleFocusArea(role) {
        const focusAreas = {
            [agent_registry_1.AgentRole.SECURITY]: 'security_analysis',
            [agent_registry_1.AgentRole.CODE_QUALITY]: 'code_quality_analysis',
            [agent_registry_1.AgentRole.PERFORMANCE]: 'performance_analysis',
            [agent_registry_1.AgentRole.ARCHITECTURE]: 'architecture_analysis',
            [agent_registry_1.AgentRole.DEPENDENCY]: 'dependency_analysis',
            [agent_registry_1.AgentRole.EDUCATIONAL]: 'educational_content',
            [agent_registry_1.AgentRole.ORCHESTRATOR]: 'orchestration',
            [agent_registry_1.AgentRole.REPORT_GENERATION]: 'report_generation',
            [agent_registry_1.AgentRole.RESEARCHER]: 'research_analysis',
            [agent_registry_1.AgentRole.LOCATION_FINDER]: 'location_finding',
            [agent_registry_1.AgentRole.DEEPWIKI]: 'deepwiki_analysis'
        };
        return focusAreas[role] || String(role);
    }
    // No cloud-specific functions needed anymore
    /**
     * Combine specialized results with domain weighting
     * @param results Results from different agents
     * @returns Combined results with specialty weighting
     */
    combineSpecializedResults(results) {
        if (results.length === 0) {
            return {
                insights: [],
                suggestions: [],
                educational: [],
                metadata: {
                    error: true,
                    timestamp: new Date().toISOString(),
                    message: 'No valid results from any agent'
                }
            };
        }
        // Start with the primary result
        const combined = { ...results[0] };
        // Create sets to track unique items
        const uniqueInsights = new Set();
        const uniqueSuggestions = new Set();
        const uniqueEducational = new Set();
        // Add primary items to sets
        results[0].insights?.forEach((item) => uniqueInsights.add(JSON.stringify(item)));
        results[0].suggestions?.forEach((item) => uniqueSuggestions.add(JSON.stringify(item)));
        results[0].educational?.forEach((item) => uniqueEducational.add(JSON.stringify(item)));
        // Process additional results
        for (let i = 1; i < results.length; i++) {
            const result = results[i];
            // Add unique insights
            result.insights?.forEach((item) => {
                const key = JSON.stringify(item);
                if (!uniqueInsights.has(key)) {
                    uniqueInsights.add(key);
                    combined.insights = combined.insights || [];
                    combined.insights.push(item);
                }
            });
            // Add unique suggestions
            result.suggestions?.forEach((item) => {
                const key = JSON.stringify(item);
                if (!uniqueSuggestions.has(key)) {
                    uniqueSuggestions.add(key);
                    combined.suggestions = combined.suggestions || [];
                    combined.suggestions.push(item);
                }
            });
            // Add unique educational content
            result.educational?.forEach((item) => {
                const key = JSON.stringify(item);
                if (!uniqueEducational.has(key)) {
                    uniqueEducational.add(key);
                    combined.educational = combined.educational || [];
                    combined.educational.push(item);
                }
            });
        }
        // Sort insights by severity (high -> medium -> low)
        if (combined.insights) {
            combined.insights.sort((a, b) => {
                const severityOrder = {
                    high: 0,
                    medium: 1,
                    low: 2
                };
                return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
            });
        }
        // Update metadata
        combined.metadata = {
            ...combined.metadata,
            timestamp: new Date().toISOString(),
            multiAgent: true,
            strategy: 'specialized',
            providers: [
                this.config.primaryProvider,
                ...this.config.secondaryProviders
            ]
        };
        return combined;
    }
}
exports.SpecializedMultiAgent = SpecializedMultiAgent;
