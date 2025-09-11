import { MultiAgentRegistry, getMultiAgentRegistry } from '../registry';
import { AnalysisStrategy, AgentPosition } from '../types';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';

// Mock dependencies
jest.mock('../factory', () => {
  const originalModule = jest.requireActual('../factory');
  
  return {
    MultiAgentFactory: jest.fn().mockImplementation(() => ({
      createConfigWithFallbacks: jest.fn().mockImplementation(
        (name, strategy, primaryAgent, secondaryAgents, options) => ({
          name,
          strategy,
          agents: [
            { ...primaryAgent, position: AgentPosition.PRIMARY },
            ...(secondaryAgents || []).map((agent: any) => ({ ...agent, position: AgentPosition.SECONDARY })),
            // Mock some fallback agents
            {
              provider: AgentProvider.GEMINI_2_5_PRO,
              role: primaryAgent.role,
              position: AgentPosition.FALLBACK,
              priority: 2
            },
            {
              provider: AgentProvider.DEEPSEEK_CODER,
              role: primaryAgent.role,
              position: AgentPosition.FALLBACK,
              priority: 1
            }
          ],
          fallbackEnabled: true,
          ...options
        })
      ),
      createConfig: jest.fn().mockImplementation(
        (name, strategy, primaryAgent, secondaryAgents, fallbackAgents, options) => ({
          name,
          strategy,
          agents: [
            { ...primaryAgent, position: AgentPosition.PRIMARY },
            ...(secondaryAgents || []).map((agent: any) => ({ ...agent, position: AgentPosition.SECONDARY })),
            ...(fallbackAgents || []).map((agent: any) => ({ ...agent, position: AgentPosition.FALLBACK }))
          ],
          fallbackEnabled: options?.fallbackEnabled !== undefined ? options.fallbackEnabled : true,
          ...options
        })
      )
    }))
  };
});

// Mock the logger
jest.mock('@codequal/core/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('MultiAgentRegistry', () => {
  let registry: MultiAgentRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new MultiAgentRegistry();
  });

  describe('initialization', () => {
    it('should initialize with default configurations', () => {
      const configs = registry.getAllConfigs();
      
      // Check that standard configurations are created
      expect(configs.codeQualityStandard).toBeDefined();
      expect(configs.securityStandard).toBeDefined();
      expect(configs.performanceStandard).toBeDefined();
      expect(configs.educationalStandard).toBeDefined();
      
      // Check that at least one premium configuration exists
      expect(configs.codeQualityPremium).toBeDefined();
      
      // Check that specialized configuration exists
      expect(configs.cloudSecuritySpecialized).toBeDefined();
    });

    it('should create configurations with appropriate strategies', () => {
      const configs = registry.getAllConfigs();
      
      // Standard configs should use appropriate strategies
      expect(configs.codeQualityStandard.strategy).toBe(AnalysisStrategy.PARALLEL);
      expect(configs.cloudSecuritySpecialized.strategy).toBe(AnalysisStrategy.SPECIALIZED);
    });

    it('should create configurations with appropriate agents', () => {
      const configs = registry.getAllConfigs();
      
      // Check primary agents
      const codeQualityPrimary = configs.codeQualityStandard.agents.find(
        agent => agent.position === AgentPosition.PRIMARY
      );
      expect(codeQualityPrimary?.provider).toBe(AgentProvider.CLAUDE);
      expect(codeQualityPrimary?.role).toBe(AgentRole.CODE_QUALITY);
      
      // Check security config primary
      const securityPrimary = configs.securityStandard.agents.find(
        agent => agent.position === AgentPosition.PRIMARY
      );
      expect(securityPrimary?.provider).toBe(AgentProvider.DEEPSEEK_CODER);
      expect(securityPrimary?.role).toBe(AgentRole.SECURITY);
    });
  });

  describe('getConfig', () => {
    it('should retrieve a specific configuration by name', () => {
      const config = registry.getConfig('codeQualityStandard');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('Code Quality Standard');
      
      const primaryAgent = config?.agents.find(
        agent => agent.position === AgentPosition.PRIMARY
      );
      expect(primaryAgent?.provider).toBe(AgentProvider.CLAUDE);
    });

    it('should return undefined for non-existent configurations', () => {
      const config = registry.getConfig('nonExistentConfig');
      
      expect(config).toBeUndefined();
    });
  });

  describe('registerConfig', () => {
    it('should register a new configuration', () => {
      const newConfig = {
        name: 'Custom Config',
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          {
            provider: AgentProvider.DEEPSEEK_CODER,
            role: AgentRole.PERFORMANCE,
            position: AgentPosition.PRIMARY,
            priority: 0
          }
        ],
        fallbackEnabled: true
      };
      
      registry.registerConfig('customConfig', newConfig);
      
      const retrievedConfig = registry.getConfig('customConfig');
      expect(retrievedConfig).toBeDefined();
      expect(retrievedConfig?.name).toBe('Custom Config');
    });

    it('should override existing configurations with the same name', () => {
      const newConfig = {
        name: 'Override Config',
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          {
            provider: AgentProvider.DEEPSEEK_CODER,
            role: AgentRole.PERFORMANCE,
            position: AgentPosition.PRIMARY,
            priority: 0
          }
        ],
        fallbackEnabled: true
      };
      
      registry.registerConfig('codeQualityStandard', newConfig);
      
      const retrievedConfig = registry.getConfig('codeQualityStandard');
      expect(retrievedConfig).toBeDefined();
      expect(retrievedConfig?.name).toBe('Override Config');
    });
  });

  describe('findConfigs', () => {
    it('should find configurations matching a strategy', () => {
      const parallelConfigs = registry.findConfigs({ 
        strategy: AnalysisStrategy.PARALLEL 
      });
      
      expect(parallelConfigs.length).toBeGreaterThan(0);
      parallelConfigs.forEach(config => {
        expect(config.strategy).toBe(AnalysisStrategy.PARALLEL);
      });
    });

    it('should find configurations matching a primary provider', () => {
      const claudeConfigs = registry.findConfigs({ 
        primaryProvider: AgentProvider.CLAUDE 
      });
      
      expect(claudeConfigs.length).toBeGreaterThan(0);
      claudeConfigs.forEach(config => {
        const primaryAgent = config.agents.find(
          agent => agent.position === AgentPosition.PRIMARY
        );
        expect(primaryAgent?.provider).toBe(AgentProvider.CLAUDE);
      });
    });

    it('should find configurations matching a primary role', () => {
      const securityConfigs = registry.findConfigs({ 
        primaryRole: AgentRole.SECURITY 
      });
      
      expect(securityConfigs.length).toBeGreaterThan(0);
      securityConfigs.forEach(config => {
        const primaryAgent = config.agents.find(
          agent => agent.position === AgentPosition.PRIMARY
        );
        expect(primaryAgent?.role).toBe(AgentRole.SECURITY);
      });
    });

    it('should find configurations matching multiple criteria', () => {
      const matchingConfigs = registry.findConfigs({
        strategy: AnalysisStrategy.PARALLEL,
        primaryProvider: AgentProvider.CLAUDE,
        primaryRole: AgentRole.CODE_QUALITY
      });
      
      expect(matchingConfigs.length).toBeGreaterThan(0);
      matchingConfigs.forEach(config => {
        expect(config.strategy).toBe(AnalysisStrategy.PARALLEL);
        
        const primaryAgent = config.agents.find(
          agent => agent.position === AgentPosition.PRIMARY
        );
        expect(primaryAgent?.provider).toBe(AgentProvider.CLAUDE);
        expect(primaryAgent?.role).toBe(AgentRole.CODE_QUALITY);
      });
    });

    it('should return empty array when no configurations match', () => {
      const matchingConfigs = registry.findConfigs({
        strategy: AnalysisStrategy.SPECIALIZED,
        primaryProvider: AgentProvider.DEEPSEEK_CODER,
        primaryRole: AgentRole.EDUCATIONAL
      });
      
      expect(matchingConfigs.length).toBe(0);
    });
  });

  describe('getRecommendedConfig', () => {
    it('should return recommended configuration for a role', () => {
      const config = registry.getRecommendedConfig(AgentRole.SECURITY);
      
      expect(config).toBeDefined();
      expect(config.name).toBe('Security Standard');
      
      const primaryAgent = config.agents.find(
        agent => agent.position === AgentPosition.PRIMARY
      );
      expect(primaryAgent?.role).toBe(AgentRole.SECURITY);
    });

    it('should fallback to code quality for undefined roles', () => {
      const config = registry.getRecommendedConfig('UNKNOWN_ROLE' as AgentRole);
      
      expect(config).toBeDefined();
      expect(config.name).toBe('Code Quality Standard');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance when calling getMultiAgentRegistry multiple times', () => {
      const instance1 = getMultiAgentRegistry();
      const instance2 = getMultiAgentRegistry();
      
      expect(instance1).toBe(instance2);
    });
  });
});
