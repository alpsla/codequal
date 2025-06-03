import { AgentProvider } from './agent-registry';

/**
 * Provider group for family of models
 */
export enum ProviderGroup {
  OPENAI = 'openai',
  CLAUDE = 'anthropic',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  MCP = 'mcp'
}

/**
 * Map individual model providers to their provider group
 */
export const PROVIDER_TO_GROUP: Record<AgentProvider, ProviderGroup> = {
  // Main providers  
  [AgentProvider.ANTHROPIC]: ProviderGroup.CLAUDE,
  [AgentProvider.OPENAI]: ProviderGroup.OPENAI,
  [AgentProvider.GOOGLE]: ProviderGroup.GEMINI,
  [AgentProvider.DEEPSEEK]: ProviderGroup.DEEPSEEK,
  [AgentProvider.OPENROUTER]: ProviderGroup.OPENAI, // OpenRouter provides access to multiple providers
  
  // Legacy providers (backward compatibility)
  [AgentProvider.CLAUDE]: ProviderGroup.CLAUDE,
  [AgentProvider.GEMINI_1_5_PRO]: ProviderGroup.GEMINI,
  [AgentProvider.GEMINI_2_5_PRO]: ProviderGroup.GEMINI,
  [AgentProvider.GEMINI_2_5_FLASH]: ProviderGroup.GEMINI,
  [AgentProvider.DEEPSEEK_CODER]: ProviderGroup.DEEPSEEK,
  [AgentProvider.DEEPSEEK_CODER_LITE]: ProviderGroup.DEEPSEEK,
  [AgentProvider.DEEPSEEK_CODER_PLUS]: ProviderGroup.DEEPSEEK,
  [AgentProvider.DEEPSEEK_CHAT]: ProviderGroup.DEEPSEEK,
  
  // MCP providers
  [AgentProvider.MCP_CODE_REVIEW]: ProviderGroup.MCP,
  [AgentProvider.MCP_DEPENDENCY]: ProviderGroup.MCP,
  [AgentProvider.MCP_CODE_CHECKER]: ProviderGroup.MCP,
  [AgentProvider.MCP_REPORTER]: ProviderGroup.MCP,
  [AgentProvider.MCP_GEMINI]: ProviderGroup.MCP,
  [AgentProvider.MCP_OPENAI]: ProviderGroup.MCP,
  [AgentProvider.MCP_GROK]: ProviderGroup.MCP,
  [AgentProvider.MCP_LLAMA]: ProviderGroup.MCP,
  [AgentProvider.MCP_DEEPSEEK]: ProviderGroup.MCP,
  
  // External services
  [AgentProvider.BITO]: ProviderGroup.OPENAI,
  [AgentProvider.CODE_RABBIT]: ProviderGroup.OPENAI
};

/**
 * Get all models for a specific provider group
 * @param group Provider group
 * @returns Array of agent providers in the group
 */
export function getModelsForGroup(group: ProviderGroup): AgentProvider[] {
  return Object.entries(PROVIDER_TO_GROUP)
    .filter(([_, providerGroup]) => providerGroup === group)
    .map(([provider]) => provider as AgentProvider);
}

/**
 * Default model for each provider group
 */
export const DEFAULT_MODEL_BY_GROUP: Record<ProviderGroup, AgentProvider> = {
  [ProviderGroup.OPENAI]: AgentProvider.OPENAI,
  [ProviderGroup.CLAUDE]: AgentProvider.CLAUDE,
  [ProviderGroup.DEEPSEEK]: AgentProvider.DEEPSEEK_CODER,
  [ProviderGroup.GEMINI]: AgentProvider.GEMINI_2_5_FLASH,
  [ProviderGroup.MCP]: AgentProvider.MCP_CODE_REVIEW
};

/**
 * Premium model for each provider group
 */
export const PREMIUM_MODEL_BY_GROUP: Record<ProviderGroup, AgentProvider> = {
  [ProviderGroup.OPENAI]: AgentProvider.OPENAI, // Assuming premium OpenAI is still just AgentProvider.OPENAI
  [ProviderGroup.CLAUDE]: AgentProvider.CLAUDE, // Assuming premium Claude is still just AgentProvider.CLAUDE
  [ProviderGroup.DEEPSEEK]: AgentProvider.DEEPSEEK_CODER_PLUS,
  [ProviderGroup.GEMINI]: AgentProvider.GEMINI_2_5_PRO,
  [ProviderGroup.MCP]: AgentProvider.MCP_CODE_REVIEW // Assuming premium MCP is still just AgentProvider.MCP_CODE_REVIEW
};