import { AgentProvider, AgentRole, Agent } from '@codequal/core';
import { MultiAgentManager, MultiAgentStrategy } from './multi-agent-strategy';

// Import agent implementations
import { ClaudeAgent } from '../claude/claude-agent';
import { ChatGPTAgent } from '../chatgpt/chatgpt-agent';
import { MCPAgent } from '../mcp/mcp-agent';
import { DeepSeekAgent } from '../deepseek/deepseek-agent';
import { GeminiAgent } from '../gemini/gemini-agent';

/**
 * Provider Group for families of models
 */
export enum ProviderGroup {
  OPENAI = 'openai',
  CLAUDE = 'anthropic',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  MCP = 'mcp'
}

/**
 * MCP Server URL configuration
 */
interface MCPServerConfig {
  url: string;
  apiKey?: string;
}

/**
 * Factory for creating agent instances
 */
export class AgentFactory {
  /**
   * Multi-agent manager instance
   */
  private static multiAgentManager = new MultiAgentManager();
  
  /**
   * Create an agent for a specific role and provider
   * @param role Agent role
   * @param provider Agent provider or provider group
   * @param config Configuration
   * @returns Agent instance
   */
  static createAgent(role: AgentRole, provider: AgentProvider | ProviderGroup, config: Record<string, unknown> = {}): Agent {
    // Handle provider groups first
    if (Object.values(ProviderGroup).includes(provider as ProviderGroup)) {
      const providerGroupValue = provider as ProviderGroup;
      
      // Map provider group to a specific provider
      switch (providerGroupValue) {
        case ProviderGroup.OPENAI:
          return this.createAgent(role, AgentProvider.OPENAI, config);
          
        case ProviderGroup.CLAUDE:
          return this.createAgent(role, AgentProvider.CLAUDE, config);
          
        case ProviderGroup.DEEPSEEK:
          return this.createAgent(role, AgentProvider.DEEPSEEK_CODER, config);
          
        case ProviderGroup.GEMINI:
        return this.createAgent(role, AgentProvider.GEMINI_2_5_FLASH, config);
        
        case ProviderGroup.MCP:
          return this.createAgent(role, AgentProvider.MCP_CODE_REVIEW, config);
          
        default:
          throw new Error(`Unsupported provider group: ${provider}`);
      }
    }
    
    // If not a group, handle specific providers
    const agentProvider = provider as AgentProvider;
    switch (agentProvider) {
      case AgentProvider.CLAUDE:
        return new ClaudeAgent(this.getClaudePromptForRole(role), config);
      
      case AgentProvider.OPENAI:
        return new ChatGPTAgent(this.getOpenAIPromptForRole(role), config);
      
      case AgentProvider.DEEPSEEK_CODER:
        return new DeepSeekAgent(this.getDeepSeekPromptForRole(role), config);
      
      case AgentProvider.GEMINI_2_5_PRO:
      case AgentProvider.GEMINI_2_5_FLASH:
        return new GeminiAgent(this.getGeminiPromptForRole(role), config);
      
      // Handle MCP providers
      case AgentProvider.MCP_CODE_REVIEW:
      case AgentProvider.MCP_DEPENDENCY:
      case AgentProvider.MCP_CODE_CHECKER:
      case AgentProvider.MCP_REPORTER:
      case AgentProvider.MCP_GEMINI:
      case AgentProvider.MCP_OPENAI:
      case AgentProvider.MCP_GROK:
      case AgentProvider.MCP_LLAMA:
      case AgentProvider.MCP_DEEPSEEK:
        return new MCPAgent(
          this.getMCPServerForProvider(provider).url, 
          this.getMCPToolForRole(provider, role), 
          config
        );
      
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
  static createMultiAgentStrategy(role: AgentRole, strategy: MultiAgentStrategy, config: Record<string, unknown> = {}): Agent {
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
  static createSecurityMultiAgent(config: Record<string, unknown> = {}): Agent {
    return this.createMultiAgentStrategy(
      AgentRole.SECURITY, 
      MultiAgentStrategy.SPECIALIZED,
      config
    );
  }
  
  /**
   * Create an agent with the recommended configuration for a role
   * @param role Agent role
   * @param config Configuration
   * @returns Agent instance
   */
  static createRecommendedAgent(role: AgentRole, config: Record<string, unknown> = {}): Agent {
    // For security role, use multi-agent approach
    if (role === AgentRole.SECURITY) {
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
  private static getClaudePromptForRole(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
      [AgentRole.ORCHESTRATOR]: 'claude_orchestration_template',
      [AgentRole.CODE_QUALITY]: 'claude_code_quality_template',
      [AgentRole.SECURITY]: 'claude_security_analysis_template',
      [AgentRole.PERFORMANCE]: 'claude_performance_analysis_template',
      [AgentRole.DEPENDENCY]: 'claude_dependency_analysis_template',
      [AgentRole.EDUCATIONAL]: 'claude_educational_content_template',
      [AgentRole.REPORT_GENERATION]: 'claude_report_generation_template'
    };
    
    return prompts[role] || 'claude_default_template';
  }
  
  /**
   * Get OpenAI prompt template for a role
   * @param role Agent role
   * @returns Template name
   */
  private static getOpenAIPromptForRole(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
      [AgentRole.ORCHESTRATOR]: 'openai_orchestration_template',
      [AgentRole.CODE_QUALITY]: 'openai_code_quality_template',
      [AgentRole.SECURITY]: 'openai_security_analysis_template',
      [AgentRole.PERFORMANCE]: 'openai_performance_analysis_template',
      [AgentRole.DEPENDENCY]: 'openai_dependency_analysis_template',
      [AgentRole.EDUCATIONAL]: 'openai_educational_content_template',
      [AgentRole.REPORT_GENERATION]: 'openai_report_generation_template'
    };
    
    return prompts[role] || 'openai_default_template';
  }
  
  /**
   * Get DeepSeek prompt template for a role
   * @param role Agent role
   * @returns Template name
   */
  private static getDeepSeekPromptForRole(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
      [AgentRole.ORCHESTRATOR]: 'deepseek_orchestration_template',
      [AgentRole.CODE_QUALITY]: 'deepseek_code_quality_template',
      [AgentRole.SECURITY]: 'deepseek_security_analysis_template',
      [AgentRole.PERFORMANCE]: 'deepseek_performance_analysis_template',
      [AgentRole.DEPENDENCY]: 'deepseek_dependency_analysis_template',
      [AgentRole.EDUCATIONAL]: 'deepseek_educational_content_template',
      [AgentRole.REPORT_GENERATION]: 'deepseek_report_generation_template'
    };
    
    return prompts[role] || 'deepseek_default_template';
  }

  /**
   * Get Gemini prompt template for a role
   * @param role Agent role
   * @returns Template name
   */
  private static getGeminiPromptForRole(role: AgentRole): string {
    const prompts: Record<AgentRole, string> = {
      [AgentRole.ORCHESTRATOR]: 'gemini_orchestration_template',
      [AgentRole.CODE_QUALITY]: 'gemini_code_quality_template',
      [AgentRole.SECURITY]: 'gemini_security_analysis_template',
      [AgentRole.PERFORMANCE]: 'gemini_performance_analysis_template',
      [AgentRole.DEPENDENCY]: 'gemini_dependency_analysis_template',
      [AgentRole.EDUCATIONAL]: 'gemini_educational_content_template',
      [AgentRole.REPORT_GENERATION]: 'gemini_report_generation_template'
    };
    
    return prompts[role] || 'gemini_default_template';
  }
  
  /**
   * MCP server configurations for different providers
   */
  private static getMCPServerConfigurations(): Record<string, MCPServerConfig> {
    return {
      // Default MCP services
      [AgentProvider.MCP_CODE_REVIEW]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
      },
      [AgentProvider.MCP_DEPENDENCY]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
      },
      [AgentProvider.MCP_CODE_CHECKER]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
      },
      [AgentProvider.MCP_REPORTER]: {
        url: 'http://localhost:8080',
        apiKey: process.env.MCP_API_KEY
      },
      
      // Model-specific MCP services
      [AgentProvider.MCP_GEMINI]: {
        url: 'http://localhost:8081',
        apiKey: process.env.MCP_GEMINI_API_KEY
      },
      [AgentProvider.MCP_OPENAI]: {
        url: 'http://localhost:8082',
        apiKey: process.env.MCP_OPENAI_API_KEY
      },
      [AgentProvider.MCP_GROK]: {
        url: 'http://localhost:8083',
        apiKey: process.env.MCP_GROK_API_KEY
      },
      [AgentProvider.MCP_LLAMA]: {
        url: 'http://localhost:8084',
        apiKey: process.env.MCP_LLAMA_API_KEY
      },
      [AgentProvider.MCP_DEEPSEEK]: {
        url: 'http://localhost:8085',
        apiKey: process.env.MCP_DEEPSEEK_API_KEY
      }
    };
  }
  
  /**
   * Default MCP server configuration
   */
  private static readonly DEFAULT_MCP_SERVER: MCPServerConfig = {
    url: 'http://localhost:8080',
    apiKey: process.env.MCP_API_KEY
  };

  /**
   * Get MCP server URL for a provider
   * @param provider Agent provider or provider group
   * @returns MCP server configuration
   */
  private static getMCPServerForProvider(provider: AgentProvider | ProviderGroup): MCPServerConfig {
    // We need to use a more defensive approach to indexing
    if (typeof provider === 'string') {
      const serverConfig = Object.entries(AgentFactory.getMCPServerConfigurations())
        .find(([key]) => key === provider)?.[1];
      
      if (serverConfig) {
        return serverConfig;
      }
    }
    
    return this.DEFAULT_MCP_SERVER;
  }
  
  /**
   * Default MCP tool mappings for each role
   */
  private static getDefaultMCPTools(): Record<AgentRole, string> {
    return {
      [AgentRole.ORCHESTRATOR]: 'orchestrator',
      [AgentRole.CODE_QUALITY]: 'code-quality',
      [AgentRole.SECURITY]: 'security-check',
      [AgentRole.PERFORMANCE]: 'performance-analysis',
      [AgentRole.DEPENDENCY]: 'dependency-check',
      [AgentRole.EDUCATIONAL]: 'educational-content',
      [AgentRole.REPORT_GENERATION]: 'report-generator'
    };
  }
  
  /**
   * Provider-specific MCP tool overrides
   */
  private static getProviderSpecificMCPTools(): Record<string, Partial<Record<AgentRole, string>>> {
    return {
      [AgentProvider.MCP_CODE_REVIEW]: {
        [AgentRole.CODE_QUALITY]: 'code-review'
      },
      [AgentProvider.MCP_DEPENDENCY]: {
        [AgentRole.DEPENDENCY]: 'dependency-analyzer'
      },
      [AgentProvider.MCP_CODE_CHECKER]: {
        [AgentRole.CODE_QUALITY]: 'code-checker',
        [AgentRole.SECURITY]: 'security-analyzer'
      },
      [AgentProvider.MCP_REPORTER]: {
        [AgentRole.REPORT_GENERATION]: 'pr-report'
      },
      [AgentProvider.MCP_GEMINI]: {},
      [AgentProvider.MCP_OPENAI]: {},
      [AgentProvider.MCP_GROK]: {},
      [AgentProvider.MCP_LLAMA]: {},
      [AgentProvider.MCP_DEEPSEEK]: {}
    };
  }
  
  /**
   * Get MCP tool name for a provider and role
   * @param provider Agent provider or provider group
   * @param role Agent role
   * @returns Tool name
   */
  private static getMCPToolForRole(provider: AgentProvider | ProviderGroup, role: AgentRole): string {
    // We need to use a more defensive approach to indexing
    let toolMapping: Partial<Record<AgentRole, string>> = {};
    
    if (typeof provider === 'string') {
      const entry = Object.entries(AgentFactory.getProviderSpecificMCPTools())
        .find(([key]) => key === provider);
        
      if (entry) {
        toolMapping = entry[1];
      }
    }
    
    // Get the tool name for this role, or use the default
    return toolMapping[role] || AgentFactory.getDefaultMCPTools()[role] || 'default-tool';
  }
  
  /**
   * Recommended providers for each role
   */
  private static getRecommendedProviders(): Record<AgentRole, AgentProvider> {
    return {
      [AgentRole.ORCHESTRATOR]: AgentProvider.CLAUDE,
      [AgentRole.CODE_QUALITY]: AgentProvider.DEEPSEEK_CODER,
      [AgentRole.SECURITY]: AgentProvider.DEEPSEEK_CODER,
      [AgentRole.PERFORMANCE]: AgentProvider.DEEPSEEK_CODER,
      [AgentRole.DEPENDENCY]: AgentProvider.DEEPSEEK_CODER,
      [AgentRole.EDUCATIONAL]: AgentProvider.CLAUDE,
      [AgentRole.REPORT_GENERATION]: AgentProvider.OPENAI
    };
  }
  
  /**
   * Get recommended provider for a role
   * @param role Agent role
   * @returns Recommended provider
   */
  private static getRecommendedProviderForRole(role: AgentRole): AgentProvider {
    return AgentFactory.getRecommendedProviders()[role] || AgentProvider.CLAUDE;
  }
}