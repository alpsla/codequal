"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = exports.ProviderGroup = void 0;
const agent_registry_1 = require("@codequal/core/config/agent-registry");
const multi_agent_strategy_1 = require("./multi-agent-strategy");
// Import agent implementations
const claude_agent_1 = require("../claude/claude-agent");
const chatgpt_agent_1 = require("../chatgpt/chatgpt-agent");
// MCP agent archived - use @codequal/mcp-hybrid for tool integration
const deepseek_agent_1 = require("../deepseek/deepseek-agent");
const gemini_agent_1 = require("../gemini/gemini-agent");
/**
 * Provider Group for families of models
 */
var ProviderGroup;
(function (ProviderGroup) {
    ProviderGroup["OPENAI"] = "openai";
    ProviderGroup["CLAUDE"] = "anthropic";
    ProviderGroup["DEEPSEEK"] = "deepseek";
    ProviderGroup["GEMINI"] = "gemini";
    ProviderGroup["MCP"] = "mcp";
})(ProviderGroup || (exports.ProviderGroup = ProviderGroup = {}));
/**
 * Factory for creating agent instances
 */
class AgentFactory {
    /**
     * Create an agent for a specific role and provider
     * @param role Agent role
     * @param provider Agent provider or provider group
     * @param config Configuration
     * @returns Agent instance
     */
    static createAgent(role, provider, config = {}) {
        // Handle provider groups first - but ensure we're not already handling a specific provider
        if (Object.values(ProviderGroup).includes(provider) &&
            !Object.values(agent_registry_1.AgentProvider).includes(provider)) {
            const providerGroupValue = provider;
            // Map provider group to a specific provider
            switch (providerGroupValue) {
                case ProviderGroup.OPENAI:
                    return this.createAgent(role, agent_registry_1.AgentProvider.OPENAI, config);
                case ProviderGroup.CLAUDE:
                    return this.createAgent(role, agent_registry_1.AgentProvider.CLAUDE, config);
                case ProviderGroup.DEEPSEEK:
                    return this.createAgent(role, agent_registry_1.AgentProvider.DEEPSEEK_CODER, config);
                case ProviderGroup.GEMINI:
                    return this.createAgent(role, agent_registry_1.AgentProvider.GEMINI_2_5_FLASH, config);
                case ProviderGroup.MCP:
                    return this.createAgent(role, agent_registry_1.AgentProvider.MCP_CODE_REVIEW, config);
                default:
                    throw new Error(`Unsupported provider group: ${provider}`);
            }
        }
        // If not a group, handle specific providers
        const agentProvider = provider;
        switch (agentProvider) {
            case agent_registry_1.AgentProvider.CLAUDE:
                return new claude_agent_1.ClaudeAgent(this.getClaudePromptForRole(role), config);
            case agent_registry_1.AgentProvider.OPENAI:
                return new chatgpt_agent_1.ChatGPTAgent(this.getOpenAIPromptForRole(role), config);
            case agent_registry_1.AgentProvider.DEEPSEEK_CODER:
                return new deepseek_agent_1.DeepSeekAgent(this.getDeepSeekPromptForRole(role), config);
            case agent_registry_1.AgentProvider.GEMINI_2_5_PRO:
            case agent_registry_1.AgentProvider.GEMINI_2_5_FLASH:
                return new gemini_agent_1.GeminiAgent(this.getGeminiPromptForRole(role), config);
            // Handle MCP providers
            case agent_registry_1.AgentProvider.MCP_CODE_REVIEW:
            case agent_registry_1.AgentProvider.MCP_DEPENDENCY:
            case agent_registry_1.AgentProvider.MCP_CODE_CHECKER:
            case agent_registry_1.AgentProvider.MCP_REPORTER:
            case agent_registry_1.AgentProvider.MCP_GEMINI:
            case agent_registry_1.AgentProvider.MCP_OPENAI:
            case agent_registry_1.AgentProvider.MCP_GROK:
            case agent_registry_1.AgentProvider.MCP_LLAMA:
            case agent_registry_1.AgentProvider.MCP_DEEPSEEK:
                throw new Error(`MCP agent implementation has been archived. ` +
                    `Please use @codequal/mcp-hybrid for tool integration. ` +
                    `See /packages/mcp-hybrid for the new implementation.`);
            // Add other providers as needed
            default:
                throw new Error(`Unsupported agent provider: ${provider}`);
        }
    }
    /**
     * Create a multi-agent strategy for a role
     * @param role Agent role
     * @param strategy Multi-agent strategy type
     * @param config Configuration
     * @returns Multi-agent instance
     */
    static createMultiAgentStrategy(role, strategy, config = {}) {
        const multiAgentConfig = this.multiAgentManager.getRecommendedStrategyForRole(role);
        // Override strategy if specified
        if (strategy) {
            multiAgentConfig.strategy = strategy;
        }
        // Add additional configuration
        multiAgentConfig.config = config;
        return this.multiAgentManager.createMultiAgentStrategy(multiAgentConfig);
    }
    /**
     * Create a specialized multi-agent for security analysis
     * @param config Configuration
     * @returns Specialized security multi-agent
     */
    static createSecurityMultiAgent(config = {}) {
        return this.createMultiAgentStrategy(agent_registry_1.AgentRole.SECURITY, multi_agent_strategy_1.MultiAgentStrategy.SPECIALIZED, config);
    }
    /**
     * Create an agent with the recommended configuration for a role
     * @param role Agent role
     * @param config Configuration
     * @returns Agent instance
     */
    static createRecommendedAgent(role, config = {}) {
        // For security role, use multi-agent approach
        if (role === agent_registry_1.AgentRole.SECURITY) {
            return this.createSecurityMultiAgent(config);
        }
        // For other roles, use the recommended provider
        const provider = this.getRecommendedProviderForRole(role);
        return this.createAgent(role, provider, config);
    }
    /**
     * Get Claude prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    static getClaudePromptForRole(role) {
        const prompts = {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: 'claude_orchestration_template',
            [agent_registry_1.AgentRole.CODE_QUALITY]: 'claude_code_quality_template',
            [agent_registry_1.AgentRole.SECURITY]: 'claude_security_analysis_template',
            [agent_registry_1.AgentRole.PERFORMANCE]: 'claude_performance_analysis_template',
            [agent_registry_1.AgentRole.ARCHITECTURE]: 'claude_architecture_analysis_template',
            [agent_registry_1.AgentRole.DEPENDENCY]: 'claude_dependency_analysis_template',
            [agent_registry_1.AgentRole.EDUCATIONAL]: 'claude_educational_content_template',
            [agent_registry_1.AgentRole.REPORT_GENERATION]: 'claude_report_generation_template',
            [agent_registry_1.AgentRole.RESEARCHER]: 'claude_researcher_template',
            [agent_registry_1.AgentRole.LOCATION_FINDER]: 'claude_location_finder_template',
            [agent_registry_1.AgentRole.DEEPWIKI]: 'claude_deepwiki_template'
        };
        return prompts[role] || 'claude_default_template';
    }
    /**
     * Get OpenAI prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    static getOpenAIPromptForRole(role) {
        const prompts = {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: 'openai_orchestration_template',
            [agent_registry_1.AgentRole.CODE_QUALITY]: 'openai_code_quality_template',
            [agent_registry_1.AgentRole.SECURITY]: 'openai_security_analysis_template',
            [agent_registry_1.AgentRole.PERFORMANCE]: 'openai_performance_analysis_template',
            [agent_registry_1.AgentRole.ARCHITECTURE]: 'openai_architecture_analysis_template',
            [agent_registry_1.AgentRole.DEPENDENCY]: 'openai_dependency_analysis_template',
            [agent_registry_1.AgentRole.EDUCATIONAL]: 'openai_educational_content_template',
            [agent_registry_1.AgentRole.REPORT_GENERATION]: 'openai_report_generation_template',
            [agent_registry_1.AgentRole.RESEARCHER]: 'openai_researcher_template',
            [agent_registry_1.AgentRole.LOCATION_FINDER]: 'openai_location_finder_template',
            [agent_registry_1.AgentRole.DEEPWIKI]: 'openai_deepwiki_template'
        };
        return prompts[role] || 'openai_default_template';
    }
    /**
     * Get DeepSeek prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    static getDeepSeekPromptForRole(role) {
        const prompts = {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: 'deepseek_orchestration_template',
            [agent_registry_1.AgentRole.CODE_QUALITY]: 'deepseek_code_quality_template',
            [agent_registry_1.AgentRole.SECURITY]: 'deepseek_security_analysis_template',
            [agent_registry_1.AgentRole.PERFORMANCE]: 'deepseek_performance_analysis_template',
            [agent_registry_1.AgentRole.ARCHITECTURE]: 'deepseek_architecture_analysis_template',
            [agent_registry_1.AgentRole.DEPENDENCY]: 'deepseek_dependency_analysis_template',
            [agent_registry_1.AgentRole.EDUCATIONAL]: 'deepseek_educational_content_template',
            [agent_registry_1.AgentRole.REPORT_GENERATION]: 'deepseek_report_generation_template',
            [agent_registry_1.AgentRole.RESEARCHER]: 'deepseek_researcher_template',
            [agent_registry_1.AgentRole.LOCATION_FINDER]: 'deepseek_location_finder_template',
            [agent_registry_1.AgentRole.DEEPWIKI]: 'deepseek_deepwiki_template'
        };
        return prompts[role] || 'deepseek_default_template';
    }
    /**
     * Get Gemini prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    static getGeminiPromptForRole(role) {
        const prompts = {
            [agent_registry_1.AgentRole.ORCHESTRATOR]: 'gemini_orchestration_template',
            [agent_registry_1.AgentRole.CODE_QUALITY]: 'gemini_code_quality_template',
            [agent_registry_1.AgentRole.SECURITY]: 'gemini_security_analysis_template',
            [agent_registry_1.AgentRole.PERFORMANCE]: 'gemini_performance_analysis_template',
            [agent_registry_1.AgentRole.ARCHITECTURE]: 'gemini_architecture_analysis_template',
            [agent_registry_1.AgentRole.DEPENDENCY]: 'gemini_dependency_analysis_template',
            [agent_registry_1.AgentRole.EDUCATIONAL]: 'gemini_educational_content_template',
            [agent_registry_1.AgentRole.REPORT_GENERATION]: 'gemini_report_generation_template',
            [agent_registry_1.AgentRole.RESEARCHER]: 'gemini_researcher_template',
            [agent_registry_1.AgentRole.LOCATION_FINDER]: 'gemini_location_finder_template',
            [agent_registry_1.AgentRole.DEEPWIKI]: 'gemini_deepwiki_template'
        };
        return prompts[role] || 'gemini_default_template';
    }
    /**
     * Get MCP server URL for a provider
     * @param provider Agent provider or provider group
     * @returns MCP server configuration
     */
    static getMCPServerForProvider(provider) {
        // We need to use a more defensive approach to indexing
        if (typeof provider === 'string') {
            const serverConfig = Object.entries(this.MCP_SERVER_CONFIGURATIONS)
                .find(([key]) => key === provider)?.[1];
            if (serverConfig) {
                return serverConfig;
            }
        }
        return this.DEFAULT_MCP_SERVER;
    }
    /**
     * Get MCP tool name for a provider and role
     * @param provider Agent provider or provider group
     * @param role Agent role
     * @returns Tool name
     */
    static getMCPToolForRole(provider, role) {
        // We need to use a more defensive approach to indexing
        let toolMapping = {};
        if (typeof provider === 'string') {
            const entry = Object.entries(this.PROVIDER_SPECIFIC_MCP_TOOLS)
                .find(([key]) => key === provider);
            if (entry) {
                toolMapping = entry[1];
            }
        }
        // Get the tool name for this role, or use the default
        return toolMapping[role] || this.DEFAULT_MCP_TOOLS[role] || 'default-tool';
    }
    /**
     * Get recommended provider for a role
     * @param role Agent role
     * @returns Recommended provider
     */
    static getRecommendedProviderForRole(role) {
        return this.RECOMMENDED_PROVIDERS[role] || agent_registry_1.AgentProvider.CLAUDE;
    }
}
exports.AgentFactory = AgentFactory;
/**
 * Multi-agent manager instance
 */
AgentFactory.multiAgentManager = new multi_agent_strategy_1.MultiAgentManager();
/**
 * MCP server configurations for different providers
 */
AgentFactory.MCP_SERVER_CONFIGURATIONS = {
    // Default MCP services
    [agent_registry_1.AgentProvider.MCP_CODE_REVIEW]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_DEPENDENCY]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_CODE_CHECKER]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_REPORTER]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
    },
    // Model-specific MCP services
    [agent_registry_1.AgentProvider.MCP_GEMINI]: {
        url: 'http://localhost:8081',
        apiKey: process.env.MCP_GEMINI_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_OPENAI]: {
        url: 'http://localhost:8082',
        apiKey: process.env.MCP_OPENAI_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_GROK]: {
        url: 'http://localhost:8083',
        apiKey: process.env.MCP_GROK_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_LLAMA]: {
        url: 'http://localhost:8084',
        apiKey: process.env.MCP_LLAMA_API_KEY
    },
    [agent_registry_1.AgentProvider.MCP_DEEPSEEK]: {
        url: 'http://localhost:8085',
        apiKey: process.env.MCP_DEEPSEEK_API_KEY
    }
};
/**
 * Default MCP server configuration
 */
AgentFactory.DEFAULT_MCP_SERVER = {
    url: 'http://localhost:8080',
    apiKey: process.env.MCP_API_KEY
};
/**
 * Default MCP tool mappings for each role
 */
AgentFactory.DEFAULT_MCP_TOOLS = {
    [agent_registry_1.AgentRole.ORCHESTRATOR]: 'orchestrator',
    [agent_registry_1.AgentRole.CODE_QUALITY]: 'code-quality',
    [agent_registry_1.AgentRole.SECURITY]: 'security-check',
    [agent_registry_1.AgentRole.PERFORMANCE]: 'performance-analysis',
    [agent_registry_1.AgentRole.ARCHITECTURE]: 'architecture-analysis',
    [agent_registry_1.AgentRole.DEPENDENCY]: 'dependency-check',
    [agent_registry_1.AgentRole.EDUCATIONAL]: 'educational-content',
    [agent_registry_1.AgentRole.REPORT_GENERATION]: 'report-generator',
    [agent_registry_1.AgentRole.RESEARCHER]: 'researcher',
    [agent_registry_1.AgentRole.LOCATION_FINDER]: 'location-finder',
    [agent_registry_1.AgentRole.DEEPWIKI]: 'deepwiki'
};
/**
 * Provider-specific MCP tool overrides
 */
AgentFactory.PROVIDER_SPECIFIC_MCP_TOOLS = {
    [agent_registry_1.AgentProvider.MCP_CODE_REVIEW]: {
        [agent_registry_1.AgentRole.CODE_QUALITY]: 'code-review'
    },
    [agent_registry_1.AgentProvider.MCP_DEPENDENCY]: {
        [agent_registry_1.AgentRole.DEPENDENCY]: 'dependency-analyzer'
    },
    [agent_registry_1.AgentProvider.MCP_CODE_CHECKER]: {
        [agent_registry_1.AgentRole.CODE_QUALITY]: 'code-checker',
        [agent_registry_1.AgentRole.SECURITY]: 'security-analyzer'
    },
    [agent_registry_1.AgentProvider.MCP_REPORTER]: {
        [agent_registry_1.AgentRole.REPORT_GENERATION]: 'pr-report'
    },
    [agent_registry_1.AgentProvider.MCP_GEMINI]: {},
    [agent_registry_1.AgentProvider.MCP_OPENAI]: {},
    [agent_registry_1.AgentProvider.MCP_GROK]: {},
    [agent_registry_1.AgentProvider.MCP_LLAMA]: {},
    [agent_registry_1.AgentProvider.MCP_DEEPSEEK]: {}
};
/**
 * Recommended providers for each role
 */
AgentFactory.RECOMMENDED_PROVIDERS = {
    [agent_registry_1.AgentRole.ORCHESTRATOR]: agent_registry_1.AgentProvider.CLAUDE,
    [agent_registry_1.AgentRole.CODE_QUALITY]: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
    [agent_registry_1.AgentRole.SECURITY]: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
    [agent_registry_1.AgentRole.PERFORMANCE]: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
    [agent_registry_1.AgentRole.ARCHITECTURE]: agent_registry_1.AgentProvider.CLAUDE,
    [agent_registry_1.AgentRole.DEPENDENCY]: agent_registry_1.AgentProvider.DEEPSEEK_CODER,
    [agent_registry_1.AgentRole.EDUCATIONAL]: agent_registry_1.AgentProvider.CLAUDE,
    [agent_registry_1.AgentRole.REPORT_GENERATION]: agent_registry_1.AgentProvider.OPENAI,
    [agent_registry_1.AgentRole.RESEARCHER]: agent_registry_1.AgentProvider.GOOGLE,
    [agent_registry_1.AgentRole.LOCATION_FINDER]: agent_registry_1.AgentProvider.OPENAI,
    [agent_registry_1.AgentRole.DEEPWIKI]: agent_registry_1.AgentProvider.OPENAI
};
