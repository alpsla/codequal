import { AgentProvider, AgentRole } from '../config/agent-registry';
import { ProviderGroup, PROVIDER_TO_GROUP, DEFAULT_MODEL_BY_GROUP } from '../config/provider-groups';
import { Agent } from '../types/agent';

/**
 * Configuration for agent creation
 */
export interface AgentConfig {
  model?: string;
  debug?: boolean;
  premium?: boolean;
  [key: string]: unknown;
}

/**
 * Factory for creating agent instances
 */
export class AgentFactory {
  /**
   * Create an agent for the specified role and provider
   * @param role Agent role
   * @param provider Agent provider or provider group
   * @param config Configuration options
   * @returns Agent instance
   */
  static createAgent(role: AgentRole, provider: AgentProvider | ProviderGroup, config: AgentConfig = {}): Agent {
    // If a provider group was provided, convert it to the default model for that group
    let resolvedProvider: AgentProvider;
    if (Object.values(ProviderGroup).includes(provider as ProviderGroup)) {
      resolvedProvider = DEFAULT_MODEL_BY_GROUP[provider as ProviderGroup];
    } else {
      resolvedProvider = provider as AgentProvider;
    }

    // Get the provider group for the resolved provider
    const providerGroup = PROVIDER_TO_GROUP[resolvedProvider];
    
    // Dynamically import and instantiate the appropriate agent based on provider group
    switch (providerGroup) {
      case ProviderGroup.DEEPSEEK: {
        // Using dynamic import to avoid circular dependencies
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { DeepSeekAgent } = require('@codequal/agents');
        return new DeepSeekAgent(`deepseek_${role}_template`, {
          ...config,
          model: resolvedProvider // Pass the specific model if one was provided
        });
      }
        
      case ProviderGroup.GEMINI: {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GeminiAgent } = require('@codequal/agents');
        return new GeminiAgent(`gemini_${role}_template`, {
          ...config,
          model: resolvedProvider // Pass the specific model if one was provided
        });
      }
        
      case ProviderGroup.CLAUDE: {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ClaudeAgent } = require('@codequal/agents');
        return new ClaudeAgent(`claude_${role}_template`, config);
      }
        
      case ProviderGroup.OPENAI: {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OpenAIAgent } = require('@codequal/agents');
        return new OpenAIAgent(`openai_${role}_template`, config);
      }
        
      // Remove SNYK provider as it's no longer used
      // If we need to add it back in the future:
      // case ProviderGroup.SNYK: {
      //   // eslint-disable-next-line @typescript-eslint/no-var-requires
      //   const { SnykAgent } = require('@codequal/agents');
      //   return new SnykAgent(role, config);
      // }
        
      case ProviderGroup.MCP: {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MCPAgent } = require('@codequal/agents');
        return new MCPAgent(role, resolvedProvider, config);
      }
        
      default:
        throw new Error(`Unsupported agent provider: ${provider}`);
    }
  }
}