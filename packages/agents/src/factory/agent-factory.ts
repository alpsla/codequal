import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { Agent } from '@codequal/core/types/agent';

// Import agent implementations
import { ClaudeAgent } from '../claude/claude-agent';
import { MCPAgent } from '../mcp/mcp-agent';
import { DeepSeekAgent } from '../deepseek/deepseek-agent';

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
   * Create an agent for a specific role and provider
   * @param role Agent role
   * @param provider Agent provider
   * @param config Configuration
   * @returns Agent instance
   */
  static createAgent(role: AgentRole, provider: AgentProvider, config: Record<string, unknown> = {}): Agent {
    switch (provider) {
      case AgentProvider.CLAUDE:
        return new ClaudeAgent(this.getClaudePromptForRole(role), config);
      
      case AgentProvider.DEEPSEEK_CODER:
        return new DeepSeekAgent(this.getDeepSeekPromptForRole(role), config);
      
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
   * Get MCP server URL for a provider
   * @param provider Agent provider
   * @returns MCP server configuration
   */
  private static getMCPServerForProvider(provider: AgentProvider): MCPServerConfig {
    // Default MCP server
    const defaultServer = {
      url: 'http://localhost:8080',
      apiKey: process.env.MCP_API_KEY
    };
    
    // Map providers to servers
    const serverMap: Partial<Record<AgentProvider, MCPServerConfig>> = {
      [AgentProvider.MCP_CODE_REVIEW]: defaultServer,
      [AgentProvider.MCP_DEPENDENCY]: defaultServer,
      [AgentProvider.MCP_CODE_CHECKER]: defaultServer,
      [AgentProvider.MCP_REPORTER]: defaultServer,
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
    
    return serverMap[provider] || defaultServer;
  }
  
  /**
   * Get MCP tool name for a provider and role
   * @param provider Agent provider
   * @param role Agent role
   * @returns Tool name
   */
  private static getMCPToolForRole(provider: AgentProvider, role: AgentRole): string {
    // Default tool mappings
    const defaultTools: Record<AgentRole, string> = {
      [AgentRole.ORCHESTRATOR]: 'orchestrator',
      [AgentRole.CODE_QUALITY]: 'code-quality',
      [AgentRole.SECURITY]: 'security-check',
      [AgentRole.PERFORMANCE]: 'performance-analysis',
      [AgentRole.DEPENDENCY]: 'dependency-check',
      [AgentRole.EDUCATIONAL]: 'educational-content',
      [AgentRole.REPORT_GENERATION]: 'report-generator'
    };
    
    // Provider-specific tool overrides
    const providerTools: Partial<Record<AgentProvider, Partial<Record<AgentRole, string>>>> = {
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
    
    // Check if there's a provider-specific tool for this role
    const providerToolMap = providerTools[provider] || {};
    return providerToolMap[role] || defaultTools[role] || 'default-tool';
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
}