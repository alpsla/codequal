import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { Agent } from '../agent';
import { MultiAgentStrategy } from './multi-agent-strategy';
/**
 * Provider Group for families of models
 */
export declare enum ProviderGroup {
    OPENAI = "openai",
    CLAUDE = "anthropic",
    DEEPSEEK = "deepseek",
    GEMINI = "gemini",
    MCP = "mcp"
}
/**
 * Factory for creating agent instances
 */
export declare class AgentFactory {
    /**
     * Multi-agent manager instance
     */
    private static multiAgentManager;
    /**
     * Create an agent for a specific role and provider
     * @param role Agent role
     * @param provider Agent provider or provider group
     * @param config Configuration
     * @returns Agent instance
     */
    static createAgent(role: AgentRole, provider: AgentProvider | ProviderGroup, config?: Record<string, unknown>): Agent;
    /**
     * Create a multi-agent strategy for a role
     * @param role Agent role
     * @param strategy Multi-agent strategy type
     * @param config Configuration
     * @returns Multi-agent instance
     */
    static createMultiAgentStrategy(role: AgentRole, strategy: MultiAgentStrategy, config?: Record<string, unknown>): Agent;
    /**
     * Create a specialized multi-agent for security analysis
     * @param config Configuration
     * @returns Specialized security multi-agent
     */
    static createSecurityMultiAgent(config?: Record<string, unknown>): Agent;
    /**
     * Create an agent with the recommended configuration for a role
     * @param role Agent role
     * @param config Configuration
     * @returns Agent instance
     */
    static createRecommendedAgent(role: AgentRole, config?: Record<string, unknown>): Agent;
    /**
     * Get Claude prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    private static getClaudePromptForRole;
    /**
     * Get OpenAI prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    private static getOpenAIPromptForRole;
    /**
     * Get DeepSeek prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    private static getDeepSeekPromptForRole;
    /**
     * Get Gemini prompt template for a role
     * @param role Agent role
     * @returns Template name
     */
    private static getGeminiPromptForRole;
    /**
     * MCP server configurations for different providers
     */
    private static readonly MCP_SERVER_CONFIGURATIONS;
    /**
     * Default MCP server configuration
     */
    private static readonly DEFAULT_MCP_SERVER;
    /**
     * Get MCP server URL for a provider
     * @param provider Agent provider or provider group
     * @returns MCP server configuration
     */
    private static getMCPServerForProvider;
    /**
     * Default MCP tool mappings for each role
     */
    private static readonly DEFAULT_MCP_TOOLS;
    /**
     * Provider-specific MCP tool overrides
     */
    private static readonly PROVIDER_SPECIFIC_MCP_TOOLS;
    /**
     * Get MCP tool name for a provider and role
     * @param provider Agent provider or provider group
     * @param role Agent role
     * @returns Tool name
     */
    private static getMCPToolForRole;
    /**
     * Recommended providers for each role
     */
    private static readonly RECOMMENDED_PROVIDERS;
    /**
     * Get recommended provider for a role
     * @param role Agent role
     * @returns Recommended provider
     */
    private static getRecommendedProviderForRole;
}
