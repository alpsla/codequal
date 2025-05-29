// Mock registry for testing
import { AgentProvider, AgentRole } from '@codequal/core';

/**
 * Agent registry interface
 */
export interface AgentRegistry {
  /**
   * Check if a provider supports a specific role
   * @param provider Agent provider
   * @param role Agent role
   * @returns True if the provider supports the role
   */
  providerSupportsRole(provider: AgentProvider, role: AgentRole): boolean;

  /**
   * Get all providers that support a specific role
   * @param role Agent role
   * @returns Array of providers
   */
  getProvidersSupportingRole(role: AgentRole): AgentProvider[];
}

/**
 * Get the agent registry
 * @returns Agent registry instance
 */
export function getAgentRegistry(): AgentRegistry {
  return {
    providerSupportsRole(_provider: AgentProvider, _role: AgentRole): boolean {
      // This is a mock implementation for testing
      return true;
    },
    
    getProvidersSupportingRole(_role: AgentRole): AgentProvider[] {
      // This is a mock implementation for testing
      return [
        AgentProvider.CLAUDE,
        AgentProvider.OPENAI,
        AgentProvider.DEEPSEEK_CODER
      ];
    }
  };
}