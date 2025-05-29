import { MultiAgentFactory } from '../factory';
import { AgentPosition, AnalysisStrategy, AgentConfig, MultiAgentConfig } from '../types';
import { AgentProvider, AgentRole, Agent } from '@codequal/core';
import { AgentFactory } from '../../factory/agent-factory';
import { MultiAgentValidator } from '../validator';

// Mock dependencies
jest.mock('../../factory/agent-factory', () => ({
  AgentFactory: {
    createAgent: jest.fn().mockImplementation((role, provider, options) => ({
      analyze: jest.fn().mockResolvedValue({ insights: [], suggestions: [] })
    }))
  }
}));

jest.mock('../validator', () => ({
  MultiAgentValidator: {
    validateConfig: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] })
  }
}));

describe('MultiAgentFactory', () => {
  let factory: MultiAgentFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new MultiAgentFactory();
  });

  describe('createConfiguration', () => {
    it('should create a valid configuration with primary agent only', () => {
      const primaryAgentConfig: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        agentType: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        parameters: {}
      };

      const config = factory.createConfiguration(
        'code-quality',
        primaryAgentConfig
      );

      expect(config.name).toBe('code-quality-parallel-analysis');
      expect(config.strategy).toBe(AnalysisStrategy.PARALLEL);
      expect(config.agents.length).toBe(1);
      
      const primaryAgent = config.agents[0];
      expect(primaryAgent).toBeDefined();
      expect(primaryAgent.provider).toBe(AgentProvider.CLAUDE);
      expect(primaryAgent.role).toBe(AgentRole.CODE_QUALITY);
      
      expect(MultiAgentValidator.validateConfig).toHaveBeenCalledWith(config);
    });

    it('should create a configuration with primary and secondary agents', () => {
      const primaryAgentConfig: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        agentType: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        parameters: {}
      };

      const secondaryAgentConfig: AgentConfig = {
        provider: AgentProvider.OPENAI,
        agentType: AgentProvider.OPENAI,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.SECONDARY,
        parameters: {}
      };

      const config = factory.createConfiguration(
        'code-quality',
        primaryAgentConfig,
        [secondaryAgentConfig],
        { strategy: AnalysisStrategy.SEQUENTIAL }
      );

      expect(config.name).toBe('code-quality-sequential-analysis');
      expect(config.strategy).toBe(AnalysisStrategy.SEQUENTIAL);
      expect(config.agents.length).toBe(2);
      
      const primaryAgent = config.agents[0];
      expect(primaryAgent).toBeDefined();
      expect(primaryAgent.provider).toBe(AgentProvider.CLAUDE);
      
      const secondaryAgent = config.agents[1];
      expect(secondaryAgent).toBeDefined();
      expect(secondaryAgent.provider).toBe(AgentProvider.OPENAI);
    });

    it('should create a configuration with fallback agents', () => {
      const primaryAgentConfig: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        agentType: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        parameters: {}
      };

      const fallbackAgentConfig: AgentConfig = {
        provider: AgentProvider.DEEPSEEK_CODER,
        agentType: AgentProvider.DEEPSEEK_CODER,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.FALLBACK,
        priority: 10,
        parameters: {}
      };

      const config = factory.createConfiguration(
        'code-quality',
        primaryAgentConfig,
        [],
        { 
          fallbackEnabled: true,
          fallbackAgents: [fallbackAgentConfig]
        }
      );

      expect(config.fallbackEnabled).toBe(true);
      expect(config.fallbackAgents).toBeDefined();
      expect(config.fallbackAgents?.length).toBe(1);
      
      const fallbackAgent = config.fallbackAgents?.[0];
      expect(fallbackAgent).toBeDefined();
      expect(fallbackAgent?.provider).toBe(AgentProvider.DEEPSEEK_CODER);
      expect(fallbackAgent?.priority).toBe(10);
    });

    it('should handle custom options', () => {
      const primaryAgentConfig: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        agentType: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        parameters: {}
      };

      const config = factory.createConfiguration(
        'code-quality',
        primaryAgentConfig,
        [],
        {
          fallbackEnabled: false,
          combineResults: false
        }
      );

      expect(config.fallbackEnabled).toBe(false);
      expect(config.combineResults).toBe(false);
    });

    it('should throw an error when validation fails', () => {
      (MultiAgentValidator.validateConfig as jest.Mock).mockReturnValueOnce({ valid: false, errors: ['Invalid config'], warnings: [] });

      const primaryAgentConfig: AgentConfig = {
        provider: AgentProvider.CLAUDE,
        agentType: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY,
        parameters: {}
      };

      expect(() => {
        factory.createConfiguration(
          'code-quality',
          primaryAgentConfig
        );
      }).toThrow('Invalid configuration: Invalid config');
    });
  });

  describe('createConfigWithFallbacks', () => {
    it('should create a configuration with appropriate fallback agents', () => {
      const primaryAgentSelection = {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.SECURITY,
        position: AgentPosition.PRIMARY
      };

      const config = factory.createConfigWithFallbacks(
        'Test Config',
        AnalysisStrategy.PARALLEL,
        primaryAgentSelection
      );

      expect(config.fallbackEnabled).toBe(true);
      expect(config.fallbackAgents).toBeDefined();
      expect(config.fallbackAgents?.length).toBeGreaterThan(0);
      
      // Primary provider should not be in fallbacks
      const primaryProviderInFallbacks = config.fallbackAgents?.some(agent => 
        agent.provider === primaryAgentSelection.provider
      );
      expect(primaryProviderInFallbacks).toBe(false);
      
      // Fallbacks should have priorities
      config.fallbackAgents?.forEach(agent => {
        expect(agent.priority).toBeDefined();
      });
    });

    it('should respect custom options', () => {
      const primaryAgentSelection = {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY
      };

      const secondaryAgentSelection = {
        provider: AgentProvider.OPENAI,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.SECONDARY
      };

      const config = factory.createConfigWithFallbacks(
        'Test Config',
        AnalysisStrategy.SEQUENTIAL,
        primaryAgentSelection,
        [secondaryAgentSelection],
        {
          fallbackTimeout: 45000,
          maxConcurrentAgents: 3,
          description: 'Custom description'
        }
      );

      expect(config.fallbackTimeout).toBe(45000);
      expect(config.maxConcurrentAgents).toBe(3);
      expect(config.description).toBe('Custom description');
      expect(config.agents.length).toBe(2);
      
      const secondaryAgent = config.agents[1];
      expect(secondaryAgent).toBeDefined();
      expect(secondaryAgent.provider).toBe(AgentProvider.OPENAI);
      expect(secondaryAgent.position).toBe(AgentPosition.SECONDARY);
    });
  });

  describe('createAgents', () => {
    it('should create agent instances based on configuration', () => {
      const config: MultiAgentConfig = {
        name: 'Test Config',
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          {
            provider: AgentProvider.CLAUDE,
            agentType: AgentProvider.CLAUDE,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.PRIMARY,
            parameters: {}
          },
          {
            provider: AgentProvider.OPENAI,
            agentType: AgentProvider.OPENAI,
            role: AgentRole.SECURITY,
            position: AgentPosition.SECONDARY,
            parameters: {}
          }
        ],
        fallbackEnabled: true,
        fallbackAgents: []
      };

      const agents = factory.createAgents(config);
      
      expect(agents.size).toBe(2);
      expect(agents.get('primary')).toBeDefined();
      expect(agents.get('secondary-0')).toBeDefined();
      
      expect(AgentFactory.createAgent).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFallbackAgents', () => {
    it('should return fallback agents sorted by priority', () => {
      const config: MultiAgentConfig = {
        name: 'Test Config',
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          {
            provider: AgentProvider.CLAUDE,
            agentType: AgentProvider.CLAUDE,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.PRIMARY,
            parameters: {}
          }
        ],
        fallbackEnabled: true,
        fallbackAgents: [
          {
            provider: AgentProvider.OPENAI,
            agentType: AgentProvider.OPENAI,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.FALLBACK,
            priority: 5,
            parameters: {}
          },
          {
            provider: AgentProvider.DEEPSEEK_CODER,
            agentType: AgentProvider.DEEPSEEK_CODER,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.FALLBACK,
            priority: 10,
            parameters: {}
          }
        ]
      };

      const fallbackAgents = factory.getFallbackAgents(config);
      
      expect(fallbackAgents.length).toBe(2);
      // Should be sorted by priority (highest first)
      expect(fallbackAgents[0].provider).toBe(AgentProvider.DEEPSEEK_CODER);
      expect(fallbackAgents[1].provider).toBe(AgentProvider.OPENAI);
    });

    it('should return empty array when fallbacks are disabled', () => {
      const config: MultiAgentConfig = {
        name: 'Test Config',
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          {
            provider: AgentProvider.CLAUDE,
            agentType: AgentProvider.CLAUDE,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.PRIMARY,
            parameters: {}
          }
        ],
        fallbackEnabled: false,
        fallbackAgents: [
          {
            provider: AgentProvider.OPENAI,
            agentType: AgentProvider.OPENAI,
            role: AgentRole.CODE_QUALITY,
            position: AgentPosition.FALLBACK,
            priority: 5,
            parameters: {}
          }
        ]
      };

      const fallbackAgents = factory.getFallbackAgents(config);
      
      expect(fallbackAgents.length).toBe(0);
    });
  });
});
