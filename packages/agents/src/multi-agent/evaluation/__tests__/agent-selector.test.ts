import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AgentPosition } from '../../types';
import { 
  AgentSelector,
  AgentSelectionResult 
} from '../agent-selector';
import { 
  RepositoryContext, 
  PRContext, 
  UserPreferences,
  mockAgentEvaluationData,
  SecondaryAgentDecisionCriteria
} from '../agent-evaluation-data';

describe('AgentSelector', () => {
  // Create test data
  const javascriptContext: RepositoryContext = {
    primaryLanguages: ['JavaScript', 'TypeScript'],
    size: { totalFiles: 500, totalLoc: 50000 },
    complexity: 45,
    frameworks: ['React', 'Node.js'],
    architecture: 'microservices'
  };
  
  const cppContext: RepositoryContext = {
    primaryLanguages: ['C++', 'C'],
    size: { totalFiles: 300, totalLoc: 80000 },
    complexity: 70,
    frameworks: ['Boost', 'Qt'],
    architecture: 'monolith'
  };
  
  const featurePRContext: PRContext = {
    changedFiles: 10,
    changedLoc: 500,
    fileTypes: { code: 8, config: 1, docs: 1, tests: 0 },
    complexity: 40,
    impactedAreas: ['auth', 'api'],
    changeType: 'feature',
    changeImpact: 70
  };
  
  const bugfixPRContext: PRContext = {
    changedFiles: 3,
    changedLoc: 50,
    fileTypes: { code: 2, config: 0, docs: 0, tests: 1 },
    complexity: 20,
    impactedAreas: ['database'],
    changeType: 'bugfix',
    changeImpact: 30
  };
  
  describe('selectAgent', () => {
    test('should select Claude for code quality with JavaScript', () => {
      const selector = new AgentSelector();
      const config = selector.selectAgent(
        AgentRole.CODE_QUALITY,
        javascriptContext,
        featurePRContext
      );
      
      expect(config).toBeDefined();
      expect(config.provider).toBe(AgentProvider.CLAUDE);
      expect(config.role).toBe(AgentRole.CODE_QUALITY);
      expect(config.position).toBe(AgentPosition.PRIMARY);
      expect(config.temperature).toBeDefined();
    });
    
    test('should select DeepSeek for performance with C++', () => {
      const selector = new AgentSelector();
      const config = selector.selectAgent(
        AgentRole.PERFORMANCE,
        cppContext,
        bugfixPRContext
      );
      
      expect(config).toBeDefined();
      expect(config.provider).toBe(AgentProvider.DEEPSEEK_CODER);
      expect(config.role).toBe(AgentRole.PERFORMANCE);
      expect(config.position).toBe(AgentPosition.PRIMARY);
      expect(config.temperature).toBeDefined();
    });
    
    test('should respect user preferences', () => {
      const selector = new AgentSelector();
      const preferences: UserPreferences = {
        preferredProviders: [AgentProvider.GEMINI_2_5_PRO],
        priorityConcerns: [AgentRole.SECURITY],
        qualityPreference: 90
      };
      
      const config = selector.selectAgent(
        AgentRole.CODE_QUALITY,
        javascriptContext,
        featurePRContext,
        preferences
      );
      
      expect(config).toBeDefined();
      expect(config.provider).toBe(AgentProvider.GEMINI_2_5_PRO);
      expect(config.role).toBe(AgentRole.CODE_QUALITY);
      expect(config.position).toBe(AgentPosition.PRIMARY);
    });
    
    test('should optimize for language', () => {
      const selector = new AgentSelector();
      const config = selector.selectAgent(
        AgentRole.CODE_QUALITY,
        javascriptContext,
        featurePRContext
      );
      
      expect(config.focusAreas).toBeDefined();
      expect(config.focusAreas).toContain('JavaScript');
      expect(config.maxTokens).toBeDefined();
    });
  });
  
  describe('selectMultiAgentConfiguration', () => {
    test('should select appropriate agents for all roles', () => {
      const selector = new AgentSelector();
      const roles = [
        AgentRole.CODE_QUALITY,
        AgentRole.SECURITY
      ];
      
      const secondaryCriteria: SecondaryAgentDecisionCriteria = {
        repositoryComplexity: 60,
        changeImpact: 50,
        confidenceThreshold: 0.8,
        languageFactors: {
          'JavaScript': 10,
          'TypeScript': 10
        },
        businessCriticalityScore: 80,
        costBudget: 0.5
      };
      
      const result = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        featurePRContext,
        undefined,
        secondaryCriteria
      );
      
      expect(result).toBeDefined();
      expect(result.primaryAgent).toBeDefined();
      expect(result.fallbackAgents.length).toBeGreaterThan(0);
      expect(result.expectedCost).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.explanation).toBeDefined();
    });
    
    test('should not use secondary agents for simple PRs', () => {
      const selector = new AgentSelector();
      const roles = [AgentRole.CODE_QUALITY];
      
      const secondaryCriteria: SecondaryAgentDecisionCriteria = {
        repositoryComplexity: 30,
        changeImpact: 20,
        confidenceThreshold: 0.8,
        languageFactors: {
          'JavaScript': 5
        },
        businessCriticalityScore: 30,
        costBudget: 0.2
      };
      
      // Override shouldUseSecondaryAgent to return false for this test
      const originalFunction = require('../agent-evaluation-data').shouldUseSecondaryAgent;
      require('../agent-evaluation-data').shouldUseSecondaryAgent = jest.fn(() => false);
      
      const result = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        bugfixPRContext,
        undefined,
        secondaryCriteria
      );
      
      expect(result).toBeDefined();
      expect(result.secondaryAgents.length).toBe(0);
      expect(result.primaryAgent).toBeDefined();
      expect(result.fallbackAgents.length).toBeGreaterThan(0);
      
      // Restore original function
      require('../agent-evaluation-data').shouldUseSecondaryAgent = originalFunction;
    });
    
    test('should use MCP for large repositories', () => {
      const selector = new AgentSelector();
      const roles = [AgentRole.CODE_QUALITY];
      
      const largeRepoContext: RepositoryContext = {
        primaryLanguages: ['JavaScript'],
        size: { totalFiles: 10000, totalLoc: 1000000 },
        complexity: 80,
        frameworks: ['React'],
        architecture: 'monolith'
      };
      
      const result = selector.selectMultiAgentConfiguration(
        roles,
        largeRepoContext,
        featurePRContext
      );
      
      expect(result).toBeDefined();
      expect(result.useMCP).toBe(true);
      expect(result.explanation).toContain('Model Control Plane');
    });
    
    test('should select different fallback providers', () => {
      const selector = new AgentSelector();
      const roles = [AgentRole.CODE_QUALITY];
      
      const result = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        featurePRContext
      );
      
      expect(result).toBeDefined();
      expect(result.fallbackAgents.length).toBeGreaterThan(0);
      
      // Verify fallback providers are different from primary
      const primaryProvider = result.primaryAgent.provider;
      result.fallbackAgents.forEach(agent => {
        expect(agent.provider).not.toBe(primaryProvider);
      });
    });
    
    test('should generate meaningful explanations', () => {
      const selector = new AgentSelector();
      const roles = [AgentRole.SECURITY];
      
      const result = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        featurePRContext
      );
      
      expect(result).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(50);
      expect(result.explanation).toContain('selected');
      expect(result.explanation).toContain('JavaScript');
    });
  });
  
  describe('language optimization', () => {
    test('should optimize for JavaScript', () => {
      const selector = new AgentSelector();
      const jsContext: RepositoryContext = {
        primaryLanguages: ['JavaScript'],
        size: { totalFiles: 200, totalLoc: 20000 },
        complexity: 30,
        frameworks: ['React'],
        architecture: 'spa'
      };
      
      const result = selector.selectMultiAgentConfiguration(
        [AgentRole.CODE_QUALITY],
        jsContext,
        featurePRContext
      );
      
      expect(result.primaryAgent.focusAreas).toContain('JavaScript');
      expect(result.explanation).toContain('JavaScript');
    });
    
    test('should optimize for C++', () => {
      const selector = new AgentSelector();
      const cppContext: RepositoryContext = {
        primaryLanguages: ['C++'],
        size: { totalFiles: 150, totalLoc: 50000 },
        complexity: 70,
        frameworks: ['Boost'],
        architecture: 'monolith'
      };
      
      const result = selector.selectMultiAgentConfiguration(
        [AgentRole.PERFORMANCE],
        cppContext,
        featurePRContext
      );
      
      expect(result.primaryAgent.provider).toBe(AgentProvider.DEEPSEEK_CODER);
      expect(result.primaryAgent.focusAreas).toContain('C++');
    });
  });
  
  describe('cost estimation', () => {
    test('should estimate cost accurately', () => {
      const selector = new AgentSelector();
      const roles = [
        AgentRole.CODE_QUALITY,
        AgentRole.SECURITY,
        AgentRole.PERFORMANCE
      ];
      
      const result = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        featurePRContext
      );
      
      expect(result.expectedCost).toBeGreaterThan(0);
      
      // More agents should mean higher cost
      const singleRoleResult = selector.selectMultiAgentConfiguration(
        [AgentRole.CODE_QUALITY],
        javascriptContext,
        featurePRContext
      );
      
      expect(result.expectedCost).toBeGreaterThan(singleRoleResult.expectedCost);
    });
    
    test('should respect budget constraints', () => {
      const selector = new AgentSelector();
      const roles = [AgentRole.CODE_QUALITY, AgentRole.SECURITY];
      
      const expensivePrefs: UserPreferences = {
        maxCost: 1.0,
        qualityPreference: 90
      };
      
      const cheapPrefs: UserPreferences = {
        maxCost: 0.1,
        qualityPreference: 50
      };
      
      const expensiveResult = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        featurePRContext,
        expensivePrefs
      );
      
      const cheapResult = selector.selectMultiAgentConfiguration(
        roles,
        javascriptContext,
        featurePRContext,
        cheapPrefs
      );
      
      expect(cheapResult.expectedCost).toBeLessThan(expensiveResult.expectedCost);
    });
  });
});
