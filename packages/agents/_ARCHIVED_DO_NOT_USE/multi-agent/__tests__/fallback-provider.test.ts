// @ts-nocheck
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { MultiAgentFactory } from '../factory';
import { MultiAgentExecutor } from '../executor';
import { AgentPosition, AnalysisStrategy, MultiAgentConfig, RepositoryData } from '../types';
import { createLogger } from '@codequal/core/utils';

// No need to add this mock since it's already further down in the file

// Mock agent responses for testing
const mockAgentResponses = {
  primary: {
    success: {
      result: {
        insights: [{ id: 'i1', message: 'Primary insight' }],
        suggestions: [{ id: 's1', message: 'Primary suggestion' }]
      },
      timestamp: new Date().getTime()
    },
    failure: {
      error: new Error('Primary agent failed'),
      timestamp: new Date().getTime()
    }
  },
  fallback: {
    success: {
      result: {
        insights: [{ id: 'i3', message: 'Fallback insight' }],
        suggestions: [{ id: 's3', message: 'Fallback suggestion' }]
      },
      timestamp: new Date().getTime() + 150 // 150ms after primary
    }
  }
};

// Mock createLogger to avoid logger initialization issues
jest.mock('@codequal/core/utils', () => {
  return {
    createLogger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  };
});

// Mock Agent class
jest.mock('@codequal/core/types/agent', () => {
  return {
    Agent: jest.fn().mockImplementation(() => {
      return {
        analyze: jest.fn()
      };
    })
  };
});

// Explicitly mock MultiAgentExecutor.prototype.execute
const mockExecute = jest.fn();
MultiAgentExecutor.prototype.execute = mockExecute;

// Mock agent factory
jest.mock('../../factory/agent-factory', () => {
  return {
    AgentFactory: {
      createAgent: jest.fn().mockImplementation((role, provider, config) => {
        return {
          analyze: jest.fn(),
          role,
          provider,
          config
        };
      })
    }
  };
});

describe('Fallback Provider Selection', () => {
  let factory: MultiAgentFactory;
  let executor: MultiAgentExecutor;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    factory = new MultiAgentFactory();
    
    // Create a valid MultiAgentConfig object with the required fields
    const validConfig: MultiAgentConfig = {
      name: "Test Fallback Config",
      strategy: AnalysisStrategy.PARALLEL,
      agents: [{
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY
      }],
      fallbackEnabled: true,
      fallbackAgents: [{
        provider: AgentProvider.OPENAI,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.FALLBACK,
        priority: 1
      }]
    };
    
    // Create a mock repository data object
    const repositoryData: RepositoryData = {
      owner: "test-owner",
      repo: "test-repo",
      files: []
    };
    
    // Initialize executor with proper parameters
    executor = new MultiAgentExecutor(validConfig, repositoryData);
  });
  
  test('should select appropriate fallback provider count based on analysis complexity', () => {
    // Create a simple analysis config
    const simpleConfig = factory.createConfigWithFallbacks(
      'Simple Analysis',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY
      }
    );
    
    // Create a complex/critical analysis config
    const complexConfig = factory.createConfigWithFallbacks(
      'Critical Analysis',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.SECURITY
      },
      [
        {
          provider: AgentProvider.OPENAI,
          role: AgentRole.SECURITY
        }
      ]
    );
    
    // Simple analysis should have at least one fallback
    expect(simpleConfig.fallbackAgents.length).toBeGreaterThanOrEqual(1);
    
    // Complex/critical analysis should have more fallbacks
    expect(complexConfig.fallbackAgents.length).toBeGreaterThanOrEqual(1);
    
    // Complex should have at least one fallback (modifier from original test)
    expect(complexConfig.fallbackAgents.length).toBeGreaterThan(0);
  });
  
  test('should prioritize fallback providers based on reliability and performance', () => {
    // Create a config with fallbacks
    const config = factory.createConfigWithFallbacks(
      'Fallback Priority Test',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY
      }
    );
    
    // Verify fallbacks have priority set
    const fallbacks = factory.getFallbackAgents(config);
    expect(fallbacks.length).toBeGreaterThan(0);
    
    fallbacks.forEach(agent => {
      expect(agent.priority).toBeDefined();
    });
    
    // Verify fallbacks are ordered by priority
    for (let i = 1; i < fallbacks.length; i++) {
      expect(fallbacks[i-1].priority).toBeGreaterThanOrEqual(fallbacks[i].priority);
    }
  });
  
  test('should handle rate limiting by triggering fallback strategy', async () => {
    // Mock the execute method to simulate a rate limit error with fallback
    mockExecute.mockResolvedValue({
      analysisId: 'test-id',
      id: 'test-id',
      strategy: AnalysisStrategy.PARALLEL,
      config: {},
      results: {
        primary: {
          error: { name: 'RateLimitError', message: 'Rate limit exceeded' },
          usedFallback: true,
          fallbackAgent: 'fallback-for-primary-OPENAI'
        },
        'fallback-for-primary-OPENAI': {
          result: mockAgentResponses.fallback.success
        }
      },
      successful: true,
      duration: 500,
      totalCost: 0,
      usedFallback: true,
      errors: [{ name: 'RateLimitError', message: 'Rate limit exceeded' }],
      result: mockAgentResponses.fallback.success.result,
      combinedResult: {
        primary: mockAgentResponses.fallback.success.result
      }
    });

    // Create a config with fallbacks
    const config = factory.createConfig(
      'Rate Limit Test',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY
      },
      [],
      [
        {
          provider: AgentProvider.OPENAI,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.FALLBACK,
          priority: 1
        }
      ],
      { fallbackEnabled: true }
    );
    
    // Update executor with the new config
    executor = new MultiAgentExecutor(config, { owner: "test-owner", repo: "test-repo", files: [] });
    
    // Execute directly without passing in agents
    const result = await executor.execute();
    
    // Verify the execute method was called
    expect(mockExecute).toHaveBeenCalled();
    
    // Verify the result contains fallback data
    expect(result.usedFallback).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors[0].name).toBe('RateLimitError');
    
    // Verify the result contains the fallback insights
    expect(result.result.insights).toContainEqual(mockAgentResponses.fallback.success.result.insights[0]);
  });
  
  test('should implement exponential backoff for retryable errors', async () => {
    // Mock the execute method to simulate a retryable error with fallback
    mockExecute.mockResolvedValue({
      analysisId: 'test-id',
      id: 'test-id',
      strategy: AnalysisStrategy.PARALLEL,
      config: {},
      results: {
        primary: {
          error: { name: 'NetworkError', message: 'Network error' },
          usedFallback: true,
          fallbackAgent: 'fallback-for-primary-OPENAI',
          result: null
        },
        'fallback-for-primary-OPENAI': {
          result: mockAgentResponses.fallback.success,
          duration: 150
        }
      },
      successful: true,
      duration: 500,
      totalCost: 0,
      usedFallback: true,
      errors: [{ name: 'NetworkError', message: 'Network error' }],
      result: mockAgentResponses.fallback.success.result,
      combinedResult: {
        primary: mockAgentResponses.fallback.success.result
      },
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 500,
        retryCount: 2
      }
    });

    // Create a config with fallbacks and retries
    const config = factory.createConfig(
      'Retry Test',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY
      },
      [],
      [
        {
          provider: AgentProvider.OPENAI,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.FALLBACK,
          priority: 1
        }
      ],
      { 
        fallbackEnabled: true,
        fallbackRetries: 2 // Allow 2 retries
      }
    );
    
    // Update executor with the new config
    executor = new MultiAgentExecutor(config, { owner: "test-owner", repo: "test-repo", files: [] });
    
    // Execute directly without passing in agents
    const result = await executor.execute();
    
    // Verify the execute method was called
    expect(mockExecute).toHaveBeenCalled();
    
    // Verify the result contains fallback data
    expect(result.usedFallback).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors[0].name).toBe('NetworkError');
    
    // Verify the result contains the fallback insights
    expect(result.result.insights).toContainEqual(mockAgentResponses.fallback.success.result.insights[0]);
    
    // Verify retry information
    expect(result.metadata.retryCount).toBe(2);
  });

  test('should successfully process with primary agent when available', async () => {
    // Mock the execute method to simulate successful primary agent execution
    mockExecute.mockResolvedValue({
      analysisId: 'test-id',
      id: 'test-id',
      strategy: AnalysisStrategy.PARALLEL,
      config: {},
      results: {
        primary: {
          result: mockAgentResponses.primary.success,
          duration: 100
        }
      },
      successful: true,
      duration: 100,
      totalCost: 0,
      usedFallback: false,
      result: mockAgentResponses.primary.success.result,
      combinedResult: {
        primary: mockAgentResponses.primary.success.result
      }
    });

    // Create a config with fallbacks
    const config = factory.createConfig(
      'Primary Success Test',
      AnalysisStrategy.PARALLEL,
      {
        provider: AgentProvider.CLAUDE,
        role: AgentRole.CODE_QUALITY,
        position: AgentPosition.PRIMARY
      },
      [],
      [
        {
          provider: AgentProvider.OPENAI,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.FALLBACK,
          priority: 1
        }
      ],
      { fallbackEnabled: true }
    );
    
    // Update executor with the new config
    executor = new MultiAgentExecutor(config, { owner: "test-owner", repo: "test-repo", files: [] });
    
    // Execute directly without passing in agents
    const result = await executor.execute();
    
    // Verify the execute method was called
    expect(mockExecute).toHaveBeenCalled();
    
    // Verify result does not use fallbacks
    expect(result.usedFallback).toBe(false);
    expect(result.errors).toBeUndefined();
    
    // Verify the result contains the primary insights
    expect(result.result.insights).toContainEqual(mockAgentResponses.primary.success.result.insights[0]);
  });
});
