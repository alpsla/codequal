import { Agent } from './agent';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';

/**
 * Factory for creating agents
 */
export class AgentFactory {
  /**
   * Create an agent 
   * @param role Agent role
   * @param provider Agent provider
   * @param options Configuration options
   * @returns Agent instance
   */
  static createAgent(provider: AgentProvider, role: AgentRole, options?: Record<string, any>): Promise<Agent> {
    // This is a mock interface for testing - actual implementation will be in each provider's factory
    throw new Error("Not implemented - this is a mock interface for testing");
  }
}