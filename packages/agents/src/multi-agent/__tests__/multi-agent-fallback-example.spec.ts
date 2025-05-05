import { AgentFactory } from '../../factory/agent-factory';
import { AgentPosition, AnalysisStrategy } from '../types';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { MultiAgentFactory } from '../factory';
import { MultiAgentExecutor } from '../executor';

// Mock agent implementation for testing
class MockAgent {
  private mockName: string;
  private shouldFail: boolean;

  constructor(mockName: string, shouldFail = false) {
    this.mockName = mockName;
    this.shouldFail = shouldFail;
  }

  async analyze(data: any): Promise<any> {
    if (this.shouldFail) {
      throw new Error(`${this.mockName} agent failed`);
    }

    return {
      insights: [
        {
          type: 'quality',
          severity: 'medium',
          message: `${this.mockName} insight`,
        },
      ],
      suggestions: [
        {
          file: 'file.ts',
          line: 10,
          suggestion: `${this.mockName} suggestion`,
        },
      ],
      educational: [
        {
          topic: `${this.mockName} topic`,
          explanation: `${this.mockName} explanation`,
        },
      ],
      metadata: {
        tokenUsage: {
          input: 100,
          output: 200,
        },
      },
    };
  }
}

// Mock the AgentFactory
jest.mock('../../factory/agent-factory', () => {
  return {
    AgentFactory: {
      createAgent: jest.fn((provider, role, options = {}) => {
        // Determine if this agent should fail based on options
        const shouldFail = 
          options.shouldFail || 
          (options.position === 'primary' && options.mockFail === 'primary') ||
          (options.position === 'secondary' && options.mockFail === 'secondary');
        
        return new MockAgent(`${provider}-${role}`, shouldFail);
      }),
    },
  };
});

describe('MultiAgentFactory with Fallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a configuration with fallbacks', async () => {
    const factory = new MultiAgentFactory();
    
    const config = factory.createConfigWithFallbacks(
      'Test Config',
      AnalysisStrategy.PARALLEL,
      { provider: AgentProvider.CLAUDE, role: AgentRole.CODE_QUALITY },
      [{ provider: AgentProvider.OPENAI, role: AgentRole.CODE_QUALITY }],
      { description: 'Test configuration' }
    );
    
    expect(config.name).toBe('Test Config');
    expect(config.strategy).toBe(AnalysisStrategy.PARALLEL);
    expect(config.fallbackEnabled).toBe(true);
    
    // Verify primary agent
    const primaryAgent = config.agents.find(agent => agent.position === AgentPosition.PRIMARY);
    expect(primaryAgent).toBeDefined();
    expect(primaryAgent!.provider).toBe(AgentProvider.CLAUDE);
    expect(primaryAgent!.role).toBe(AgentRole.CODE_QUALITY);
    
    // Verify secondary agents
    const secondaryAgents = config.agents.filter(agent => agent.position === AgentPosition.SECONDARY);
    expect(secondaryAgents).toHaveLength(1);
    expect(secondaryAgents[0].provider).toBe(AgentProvider.OPENAI);
    expect(secondaryAgents[0].role).toBe(AgentRole.CODE_QUALITY);
    
    // Verify fallback agents (should not include CLAUDE since it's already used as primary)
    const fallbackAgents = config.agents.filter(agent => agent.position === AgentPosition.FALLBACK);
    expect(fallbackAgents.length).toBeGreaterThan(0);
    
    // Should not include Claude in fallbacks since it's used as primary
    const includeClaude = fallbackAgents.some(agent => agent.provider === AgentProvider.CLAUDE);
    expect(includeClaude).toBe(false);
  });

  it('should execute with fallback when primary agent fails', async () => {
    // Setup mocks
    const mockCreateAgent = AgentFactory.createAgent as jest.Mock;
    
    // Make the primary agent fail
    mockCreateAgent.mockImplementation((provider, role, options = {}) => {
      const shouldFail = options.position === AgentPosition.PRIMARY;
      return new MockAgent(`${provider}-${role}`, shouldFail);
    });
    
    const factory = new MultiAgentFactory();
    
    const config = factory.createConfigWithFallbacks(
      'Test Config',
      AnalysisStrategy.PARALLEL,
      { provider: AgentProvider.CLAUDE, role: AgentRole.CODE_QUALITY },
      [{ provider: AgentProvider.OPENAI, role: AgentRole.CODE_QUALITY }],
      { description: 'Test configuration' }
    );
    
    const executor = new MultiAgentExecutor(config, {
      owner: 'test-owner',
      repo: 'test-repo',
      files: []
    });
    const result = await executor.execute();
    
    // Get the agents used
    const agents = result.results;
    
    expect(Object.keys(agents).length).toBeGreaterThan(0);
  });
});