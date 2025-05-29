import { AgentFactory } from '../factory/agent-factory';
import { Agent, AgentProvider, AgentRole, createLogger } from '@codequal/core';
import { AgentConfig, MultiAgentConfig, AgentPosition, AnalysisStrategy } from './types';
import { MultiAgentValidator } from './validator';
import { AgentSelector } from './evaluation/agent-selector';
import { RepositoryContext, PRContext, UserPreferences } from './evaluation/agent-evaluation-data';

/**
 * Factory class for creating multi-agent configurations and instances
 */
export class MultiAgentFactory {
  private logger = createLogger('MultiAgentFactory');
  private agentSelector: AgentSelector;

  constructor() {
    this.agentSelector = new AgentSelector();
  }

  /**
   * Creates a set of agent configurations for a multi-agent analysis
   * @param analysisType Type of analysis to perform
   * @param primaryConfig Primary agent configuration
   * @param secondaryConfigs Secondary agent configurations
   * @param options Additional options
   * @returns Multi-agent configuration
   */
  createConfiguration(
    analysisType: string,
    primaryConfig: AgentConfig,
    secondaryConfigs: AgentConfig[] = [],
    options: {
      fallbackEnabled?: boolean;
      fallbackAgents?: AgentConfig[];
      combineResults?: boolean;
      strategy?: AnalysisStrategy;
    } = {}
  ): MultiAgentConfig {
    const strategy = options.strategy || AnalysisStrategy.PARALLEL;
    
    // Combine all agents into a single array
    const agents = [primaryConfig, ...secondaryConfigs];
    
    // Add fallback agents if enabled
    const fallbackAgents = options.fallbackEnabled ? (options.fallbackAgents || []) : [];
    
    const config: MultiAgentConfig = {
      name: `${analysisType}-${strategy}-analysis`,
      strategy,
      agents,
      fallbackEnabled: options.fallbackEnabled || false,
      fallbackAgents,
      combineResults: options.combineResults !== undefined ? options.combineResults : true
    };
    
    // Validate the configuration
    const validation = MultiAgentValidator.validateConfig(config);
    if (!validation.valid) {
      this.logger.error(`Invalid configuration: ${validation.errors.join(', ')}`);
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      this.logger.warn(`Configuration warnings: ${validation.warnings.join(', ')}`);
    }
    
    return config;
  }
  
  /**
   * Creates a set of agents for a specific multi-agent configuration
   * @param config Multi-agent configuration
   * @returns Map of agent instances
   */
  createAgents(config: MultiAgentConfig): Map<string, Agent> {
    const agents = new Map<string, Agent>();
    
    // Create primary agent
    const primaryAgent = this.createAgentFromConfig(config.agents[0], 'primary');
    agents.set('primary', primaryAgent);
    
    // Create secondary agents
    const secondaryAgents = config.agents.slice(1);
    for (let i = 0; i < secondaryAgents.length; i++) {
      const agent = this.createAgentFromConfig(secondaryAgents[i], `secondary-${i}`);
      agents.set(`secondary-${i}`, agent);
    }
    
    // Create fallback agents if enabled
    if (config.fallbackEnabled && config.fallbackAgents && config.fallbackAgents.length > 0) {
      for (const fallbackConfig of config.fallbackAgents) {
        for (const baseAgentName of ['primary', ...secondaryAgents.map((_, i) => `secondary-${i}`)]) {
          const fallbackName = `fallback-for-${baseAgentName}-${fallbackConfig.agentType}`;
          const agent = this.createAgentFromConfig(fallbackConfig, fallbackName);
          agents.set(fallbackName, agent);
        }
      }
    }
    
    return agents;
  }
  
  /**
   * Creates an agent from a configuration
   * @param config Agent configuration
   * @param name Agent name
   * @returns Agent instance
   */
  private createAgentFromConfig(config: AgentConfig, name: string): Agent {
    this.logger.debug(`Creating agent ${name} of type ${config.agentType}`);
    
    // Create configuration object for the agent
    const agentConfig = {
      ...config.parameters,
      name,
      role: config.role,
      position: config.position,
      focusAreas: config.focusAreas
    };
    
    // Create the agent using the factory
    if (!config.provider && !config.agentType) {
      throw new Error('Agent configuration must have either provider or agentType');
    }
    
    return AgentFactory.createAgent(
      config.role, 
      config.provider || (config.agentType as any), 
      agentConfig
    );
  }
  
  /**
   * Gets fallback agents for a specific multi-agent configuration
   * @param config Multi-agent configuration
   * @returns Array of fallback agent configurations
   */
  getFallbackAgents(config: MultiAgentConfig): AgentConfig[] {
    if (!config.fallbackEnabled || !config.fallbackAgents) {
      return [];
    }
    
    // Sort fallback agents by priority (highest first)
    return [...config.fallbackAgents].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Creates a configuration with fallbacks
   * @param name Configuration name
   * @param strategy Analysis strategy
   * @param primaryAgentSelection Primary agent selection
   * @param secondaryAgentSelections Secondary agent selections
   * @param options Additional options
   * @returns Multi-agent configuration
   */
  createConfigWithFallbacks(
    name: string,
    strategy: AnalysisStrategy,
    primaryAgentSelection: {
      provider: AgentProvider,
      role: AgentRole,
      position?: AgentPosition
    },
    secondaryAgentSelections: Array<{
      provider: AgentProvider,
      role: AgentRole,
      position?: AgentPosition
    }> = [],
    options: {
      description?: string,
      fallbackTimeout?: number,
      maxConcurrentAgents?: number
    } = {}
  ): MultiAgentConfig {
    // Create primary agent config
    const primaryConfig: AgentConfig = {
      provider: primaryAgentSelection.provider,
      agentType: primaryAgentSelection.provider,
      role: primaryAgentSelection.role,
      position: primaryAgentSelection.position || AgentPosition.PRIMARY,
      parameters: {}
    };
    
    // Create secondary agent configs
    const secondaryConfigs: AgentConfig[] = secondaryAgentSelections.map(selection => ({
      provider: selection.provider,
      agentType: selection.provider,
      role: selection.role,
      position: selection.position || AgentPosition.SECONDARY,
      parameters: {}
    }));
    
    // Generate fallback agents list - exclude the primary provider
    const fallbackProviders = this.generateFallbackProviders(
      primaryAgentSelection.provider,
      secondaryAgentSelections.map(s => s.provider)
    );
    
    const fallbackAgents: AgentConfig[] = fallbackProviders.map((provider, index) => ({
      provider: provider,
      agentType: provider,
      role: primaryAgentSelection.role,
      position: AgentPosition.FALLBACK,
      priority: fallbackProviders.length - index,
      parameters: {}
    }));
    
    // Create the final configuration
    const config: MultiAgentConfig = {
      name,
      description: options.description,
      strategy,
      agents: [primaryConfig, ...secondaryConfigs],
      fallbackEnabled: true,
      fallbackAgents,
      fallbackTimeout: options.fallbackTimeout || 30000,
      combineResults: true,
      maxConcurrentAgents: options.maxConcurrentAgents || 3
    };
    
    return config;
  }
  
  /**
   * Creates a configuration without fallbacks
   * @param name Configuration name
   * @param strategy Analysis strategy
   * @param primaryConfig Primary agent configuration
   * @param secondaryConfigs Secondary agent configurations
   * @param fallbackConfigs Fallback agent configurations
   * @param options Additional options
   * @returns Multi-agent configuration
   */
  createConfig(
    name: string,
    strategy: AnalysisStrategy,
    primaryConfig: {
      provider: AgentProvider,
      role: AgentRole,
      position: AgentPosition
    },
    secondaryConfigs: Array<{
      provider: AgentProvider,
      role: AgentRole,
      position: AgentPosition
    }>,
    fallbackConfigs?: Array<{
      provider: AgentProvider,
      role: AgentRole,
      position: AgentPosition,
      priority?: number
    }>,
    options?: {
      description?: string,
      fallbackEnabled?: boolean,
      fallbackTimeout?: number,
      maxConcurrentAgents?: number
    }
  ): MultiAgentConfig {
    const primary: AgentConfig = {
      provider: primaryConfig.provider,
      agentType: primaryConfig.provider,
      role: primaryConfig.role,
      position: primaryConfig.position,
      parameters: {}
    };
    
    const secondaries: AgentConfig[] = secondaryConfigs.map(config => ({
      provider: config.provider,
      agentType: config.provider,
      role: config.role,
      position: config.position,
      parameters: {}
    }));
    
    const fallbacks: AgentConfig[] = fallbackConfigs?.map(config => ({
      provider: config.provider,
      agentType: config.provider,
      role: config.role,
      position: config.position,
      priority: config.priority || 1,
      parameters: {}
    })) || [];
    
    return {
      name,
      description: options?.description,
      strategy,
      agents: [primary, ...secondaries],
      fallbackEnabled: options?.fallbackEnabled || false,
      fallbackAgents: fallbacks,
      fallbackTimeout: options?.fallbackTimeout || 30000,
      combineResults: true,
      maxConcurrentAgents: options?.maxConcurrentAgents || 3
    };
  }
  
  /**
   * Create adaptive configuration based on repository and PR context
   * Uses the agent evaluation system to select optimal agents
   * @param name Name of the configuration
   * @param strategy Analysis strategy
   * @param roles Roles to analyze
   * @param repoContext Repository context
   * @param prContext PR context
   * @param options Optional configuration options
   * @returns Multi-agent configuration
   */
  public createAdaptiveConfig(
    name: string,
    strategy: AnalysisStrategy,
    roles: AgentRole[],
    repoContext: RepositoryContext,
    prContext: PRContext,
    userPreferences?: UserPreferences,
    options?: {
      fallbackEnabled?: boolean;
      fallbackTimeout?: number;
      fallbackRetries?: number;
      includeSecondary?: boolean;
      maxCost?: number;
    }
  ): MultiAgentConfig {
    this.logger.info(`Creating adaptive configuration: ${name}`);
    
    // Use agent selector to determine optimal configuration
    const selectionResult = this.agentSelector.selectMultiAgentConfiguration(
      roles,
      repoContext,
      prContext,
      userPreferences
    );
    
    const primaryAgents: AgentConfig[] = [];
    primaryAgents.push(selectionResult.primaryAgent);
    
    // Add other primary agents for additional roles
    roles.forEach(role => {
      if (role !== selectionResult.primaryAgent.role) {
        const agentConfig = this.agentSelector.selectAgent(
          role,
          repoContext,
          prContext,
          userPreferences
        );
        agentConfig.position = AgentPosition.PRIMARY;
        // Set agent type same as provider for compatibility
        agentConfig.agentType = agentConfig.provider;
        primaryAgents.push(agentConfig);
      }
    });
    
    // Set agent type for primary agent and fallback agents for compatibility
    selectionResult.primaryAgent.agentType = selectionResult.primaryAgent.provider;
    selectionResult.fallbackAgents.forEach(agent => {
      agent.agentType = agent.provider;
    });
    
    // Create configuration using the selection result
    const config: MultiAgentConfig = {
      name,
      description: selectionResult.explanation,
      strategy,
      agents: primaryAgents,
      fallbackEnabled: options?.fallbackEnabled ?? true,
      fallbackAgents: selectionResult.fallbackAgents,
      fallbackTimeout: options?.fallbackTimeout || 30000,
      fallbackRetries: options?.fallbackRetries,
      combineResults: true,
      maxConcurrentAgents: 3,
      // Apply additional metadata
      globalParameters: {
        useMCP: selectionResult.useMCP,
        expectedCost: selectionResult.expectedCost,
        confidence: selectionResult.confidence
      }
    };
    
    // Include secondary agents if enabled and recommended
    if (options?.includeSecondary && selectionResult.secondaryAgents.length > 0) {
      // Set agent type for secondary agents
      selectionResult.secondaryAgents.forEach(agent => {
        agent.agentType = agent.provider;
      });
      config.agents = [...config.agents, ...selectionResult.secondaryAgents];
    }
    
    // Validate the configuration
    const validation = MultiAgentValidator.validateConfig(config);
    if (!validation.valid) {
      this.logger.error('Invalid adaptive configuration', { errors: validation.errors });
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      this.logger.warn(`Configuration warnings: ${validation.warnings.join(', ')}`);
    }
    
    this.logger.info(`Created adaptive configuration with ${config.agents.length} agents`);
    return config;
  }
  
  /**
   * Generate fallback providers excluding the ones already in use
   * @param primaryProvider Primary provider
   * @param secondaryProviders Secondary providers
   * @returns Array of fallback providers
   */
  private generateFallbackProviders(
    primaryProvider: AgentProvider,
    secondaryProviders: AgentProvider[] = []
  ): AgentProvider[] {
    // List of potential fallback providers in order of preference
    const potentialProviders: AgentProvider[] = [
      AgentProvider.OPENAI,
      AgentProvider.CLAUDE,
      AgentProvider.DEEPSEEK_CODER,
      AgentProvider.GEMINI_2_5_PRO
    ];
    
    // Filter out providers already in use
    const excludedProviders = [primaryProvider, ...secondaryProviders];
    return potentialProviders.filter(provider => !excludedProviders.includes(provider));
  }
}