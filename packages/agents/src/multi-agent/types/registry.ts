import { AgentProvider, AgentRole } from '@codequal/core';
import { AnalysisStrategy, MultiAgentConfig } from './types';
import { MultiAgent, MultiAgentOptions } from './agent';

/**
 * Interface for the multi-agent registry
 */
export interface IMultiAgentRegistry {
  /**
   * Get all registered configurations
   */
  getAllConfigs(): Record<string, MultiAgentConfig>;
  
  /**
   * Get a specific configuration by name
   */
  getConfig(name: string): MultiAgentConfig | undefined;
  
  /**
   * Register a new configuration
   */
  registerConfig(name: string, config: MultiAgentConfig): void;
  
  /**
   * Find configurations that match certain criteria
   */
  findConfigs(criteria: {
    strategy?: AnalysisStrategy;
    primaryProvider?: AgentProvider;
    primaryRole?: AgentRole;
  }): MultiAgentConfig[];
  
  /**
   * Get recommended configuration for a specific role
   */
  getRecommendedConfig(role: AgentRole): MultiAgentConfig;
}

/**
 * Interface for agent registry entry
 */
export interface AgentRegistryEntry {
  id: string;
  config: MultiAgentConfig;
  factory: (options: MultiAgentOptions) => Promise<MultiAgent>;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  averageExecutionTime?: number;
  failureRate?: number;
}

/**
 * Interface for the agent registry event subscriber
 */
export interface RegistryEventSubscriber {
  onAgentRegistered(entry: AgentRegistryEntry): void;
  onAgentUsed(entry: AgentRegistryEntry): void;
  onAgentFailed(entry: AgentRegistryEntry, error: Error): void;
  onConfigurationChanged(configName: string, newConfig: MultiAgentConfig): void;
}

/**
 * Configuration for creating a multi-agent registry
 */
export interface MultiAgentRegistryConfig {
  /**
   * Whether to load default configurations
   */
  loadDefaults?: boolean;
  
  /**
   * Custom configurations to load
   */
  customConfigs?: Record<string, MultiAgentConfig>;
  
  /**
   * Event subscribers
   */
  subscribers?: RegistryEventSubscriber[];
  
  /**
   * Configuration for Supabase analytics storage
   */
  analyticsConfig?: {
    enabled: boolean;
    supabaseUrl?: string;
    supabaseKey?: string;
    failureTrackingEnabled?: boolean;
    performanceTrackingEnabled?: boolean;
    usageTrackingEnabled?: boolean;
  };
}