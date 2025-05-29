import { AgentProvider, AgentRole, createLogger } from '@codequal/core';
import { AgentPosition, AnalysisStrategy, MultiAgentConfig } from './types';
import { MultiAgentFactory } from './factory';

/**
 * Registry of predefined multi-agent configurations
 */
export class MultiAgentRegistry {
  private configs: Record<string, MultiAgentConfig> = {};
  private factory: MultiAgentFactory;
  private logger = createLogger('MultiAgentRegistry');

  constructor() {
    this.factory = new MultiAgentFactory();
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default configuration presets
   */
  private initializeDefaultConfigs(): void {
    // Add standard code quality configuration
    this.configs.codeQualityStandard = this.factory.createConfigWithFallbacks(
      'Code Quality Standard',
      AnalysisStrategy.PARALLEL,
      { provider: AgentProvider.CLAUDE, role: AgentRole.CODE_QUALITY },
      [{ provider: AgentProvider.OPENAI, role: AgentRole.CODE_QUALITY }],
      { description: 'Standard code quality analysis with Claude as primary and OpenAI as secondary' }
    );

    // Add premium code quality configuration
    this.configs.codeQualityPremium = this.factory.createConfigWithFallbacks(
      'Code Quality Premium',
      AnalysisStrategy.SEQUENTIAL,
      { provider: AgentProvider.CLAUDE, role: AgentRole.CODE_QUALITY },
      [{ provider: AgentProvider.OPENAI, role: AgentRole.CODE_QUALITY, position: AgentPosition.SECONDARY }],
      { 
        description: 'Premium code quality analysis with Claude as primary and multiple secondary agents',
        maxConcurrentAgents: 3
      }
    );

    // Add security analysis configuration
    this.configs.securityStandard = this.factory.createConfigWithFallbacks(
      'Security Standard',
      AnalysisStrategy.PARALLEL,
      { provider: AgentProvider.DEEPSEEK_CODER, role: AgentRole.SECURITY },
      [{ provider: AgentProvider.CLAUDE, role: AgentRole.SECURITY, position: AgentPosition.SECONDARY }],
      { description: 'Standard security analysis with DeepSeek as primary and Claude as secondary' }
    );

    // Add specialized config
    this.configs.cloudSecuritySpecialized = this.factory.createConfig(
      'Cloud Security Specialized',
      AnalysisStrategy.SPECIALIZED,
      { provider: AgentProvider.DEEPSEEK_CODER, role: AgentRole.SECURITY, position: AgentPosition.PRIMARY },
      [{ provider: AgentProvider.CLAUDE, role: AgentRole.SECURITY, position: AgentPosition.SECONDARY }],
      [
        { provider: AgentProvider.OPENAI, role: AgentRole.SECURITY, position: AgentPosition.FALLBACK, priority: 2 },
        { provider: AgentProvider.GEMINI_2_5_PRO, role: AgentRole.SECURITY, position: AgentPosition.FALLBACK, priority: 1 }
      ],
      {
        description: 'Specialized cloud security analysis with pattern-based file selection',
        fallbackEnabled: true,
        fallbackTimeout: 45000,
      }
    );

    // Add performance analysis config
    this.configs.performanceStandard = this.factory.createConfigWithFallbacks(
      'Performance Standard',
      AnalysisStrategy.SEQUENTIAL,
      { provider: AgentProvider.DEEPSEEK_CODER, role: AgentRole.PERFORMANCE },
      [{ provider: AgentProvider.CLAUDE, role: AgentRole.PERFORMANCE, position: AgentPosition.SECONDARY }],
      { description: 'Standard performance analysis with DeepSeek as primary for its code optimization capabilities' }
    );

    // Add educational content config
    this.configs.educationalStandard = this.factory.createConfigWithFallbacks(
      'Educational Standard',
      AnalysisStrategy.SEQUENTIAL,
      { provider: AgentProvider.CLAUDE, role: AgentRole.EDUCATIONAL },
      [],
      { description: 'Educational content generation with Claude' }
    );

    this.logger.info(`Initialized ${Object.keys(this.configs).length} multi-agent configurations`);
  }

  /**
   * Get all registered configurations
   */
  getAllConfigs(): Record<string, MultiAgentConfig> {
    return { ...this.configs };
  }

  /**
   * Get a specific configuration by name
   */
  getConfig(name: string): MultiAgentConfig | undefined {
    return this.configs[name];
  }

  /**
   * Register a new configuration
   */
  registerConfig(name: string, config: MultiAgentConfig): void {
    this.configs[name] = config;
    this.logger.info(`Registered multi-agent configuration: ${name}`);
  }

  /**
   * Find configurations that match certain criteria
   */
  findConfigs(criteria: {
    strategy?: AnalysisStrategy;
    primaryProvider?: AgentProvider;
    primaryRole?: AgentRole;
  }): MultiAgentConfig[] {
    return Object.values(this.configs).filter(config => {
      // Find primary agent
      const primaryAgent = config.agents.find(agent => agent.position === AgentPosition.PRIMARY);
      if (!primaryAgent) return false;

      // Check if it matches all specified criteria
      if (criteria.strategy && config.strategy !== criteria.strategy) return false;
      if (criteria.primaryProvider && primaryAgent.provider !== criteria.primaryProvider) return false;
      if (criteria.primaryRole && primaryAgent.role !== criteria.primaryRole) return false;

      return true;
    });
  }

  /**
   * Get recommended configuration for a specific role
   */
  getRecommendedConfig(role: AgentRole): MultiAgentConfig {
    // Define mapping of roles to recommended configurations
    const recommendedConfigs: Record<string, string> = {
      [AgentRole.CODE_QUALITY]: 'codeQualityStandard',
      [AgentRole.SECURITY]: 'securityStandard',
      [AgentRole.PERFORMANCE]: 'performanceStandard',
      [AgentRole.EDUCATIONAL]: 'educationalStandard',
      'documentation': 'educationalStandard',
    };

    const configName = recommendedConfigs[role];
    if (!configName || !this.configs[configName]) {
      // Fallback to code quality if no specific recommendation
      return this.configs.codeQualityStandard;
    }

    return this.configs[configName];
  }
}

// Singleton instance
let registryInstance: MultiAgentRegistry | null = null;

/**
 * Get the multi-agent registry instance
 */
export function getMultiAgentRegistry(): MultiAgentRegistry {
  if (!registryInstance) {
    registryInstance = new MultiAgentRegistry();
  }
  return registryInstance;
}
