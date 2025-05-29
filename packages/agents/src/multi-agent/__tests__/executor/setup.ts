// Mock imports
import { AgentFactory } from '../../../factory/agent-factory';
import { AgentPosition, AnalysisStrategy } from '../../types';
import { AgentProvider, AgentRole } from '@codequal/core';
import { MultiAgentExecutor } from '../../executor';
import { MultiAgentFactory } from '../../factory';

// Mock AgentFactory class
jest.mock('../../../factory/agent-factory', () => {
  return {
    AgentFactory: {
      createAgent: jest.fn()
    }
  };
});

// Mock core utilities
jest.mock('@codequal/core', () => ({
  createLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Mock validator
jest.mock('../../validator', () => ({
  MultiAgentValidator: {
    validateConfig: jest.fn().mockReturnValue({
      valid: true,
      errors: [],
      warnings: []
    })
  }
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid')
}));

// Mock agent interfaces
export const createMockPrimaryAgent = () => ({
  analyze: jest.fn().mockResolvedValue({
    insights: [{ type: 'quality', severity: 'medium', message: 'Primary insight' }],
    suggestions: [{ type: 'refactor', severity: 'medium', message: 'Primary suggestion' }],
    educational: [{ topic: 'Primary topic', content: 'Primary explanation' }],
    metadata: { duration: 100 }
  })
});

export const createMockSecondaryAgent = () => ({
  analyze: jest.fn().mockResolvedValue({
    insights: [{ type: 'quality', severity: 'low', message: 'Secondary insight' }],
    suggestions: [{ type: 'refactor', severity: 'low', message: 'Secondary suggestion' }],
    educational: [{ topic: 'Secondary topic', content: 'Secondary explanation' }],
    metadata: { duration: 150 }
  })
});

export const createMockFallbackAgent = () => ({
  analyze: jest.fn().mockResolvedValue({
    insights: [{ type: 'quality', severity: 'high', message: 'Fallback insight' }],
    suggestions: [{ type: 'refactor', severity: 'high', message: 'Fallback suggestion' }],
    educational: [{ topic: 'Fallback topic', content: 'Fallback explanation' }],
    metadata: { duration: 200 }
  })
});

// Test configuration
export const testConfig = {
  name: 'Test Config',
  strategy: AnalysisStrategy.PARALLEL,
  agents: [
    {
      provider: AgentProvider.CLAUDE,
      agentType: AgentProvider.CLAUDE,
      role: AgentRole.CODE_QUALITY,
      position: AgentPosition.PRIMARY,
      parameters: {
        model: 'claude-3-sonnet-20240229'
      }
    },
    {
      provider: AgentProvider.OPENAI,
      agentType: AgentProvider.OPENAI,
      role: AgentRole.CODE_QUALITY,
      position: AgentPosition.SECONDARY,
      parameters: {
        model: 'gpt-4o-2024-05-13'
      }
    },
    {
      provider: AgentProvider.DEEPSEEK_CODER,
      agentType: AgentProvider.DEEPSEEK_CODER,
      role: AgentRole.CODE_QUALITY,
      position: AgentPosition.SECONDARY,
      parameters: {
        model: 'deepseek-coder-33b-instruct'
      }
    }
  ],
  fallbackEnabled: true,
  combineResults: false, // Add combine results property
  fallbackAgents: [
    {
      provider: AgentProvider.GEMINI_2_5_PRO,
      agentType: AgentProvider.GEMINI_2_5_PRO,
      role: AgentRole.CODE_QUALITY,
      position: AgentPosition.FALLBACK,
      priority: 2,
      parameters: {
        model: 'gemini-2.5-pro'
      }
    }
  ]
};

// Repository data for testing
export const testRepositoryData = {
  owner: 'test-owner',
  repo: 'test-repo',
  prNumber: 123,
  files: [
    {
      path: 'src/file1.ts',
      content: 'console.log("Hello World")',
      diff: '@@ -0,0 +1 @@\n+console.log("Hello World")'
    },
    {
      path: 'src/file2.ts',
      content: 'export const add = (a, b) => a + b;',
      diff: '@@ -0,0 +1 @@\n+export const add = (a, b) => a + b;'
    }
  ]
};

// Setup mock agents for testing
export function setupMockAgents() {
  jest.spyOn(AgentFactory, 'createAgent').mockImplementation((role, agentType, config = {}) => {
    if (config.position === AgentPosition.PRIMARY) {
      return createMockPrimaryAgent();
    } else if (config.position === AgentPosition.SECONDARY) {
      return createMockSecondaryAgent();
    } else if (config.position === AgentPosition.FALLBACK) {
      return createMockFallbackAgent();
    }
    
    // Default mock agent
    return { analyze: jest.fn() } as any;
  });
}

// Create test setup for executor tests
export function createTestSetup() {
  const mockPrimaryAgent = createMockPrimaryAgent();
  const mockSecondaryAgent = createMockSecondaryAgent();
  const mockFallbackAgent = createMockFallbackAgent();
  
  // Clear and setup agent creation mock
  (AgentFactory.createAgent as jest.Mock).mockClear();
  (AgentFactory.createAgent as jest.Mock).mockImplementation((role, agentType, config = {}) => {
    if (config.position === AgentPosition.PRIMARY || config.name === 'primary') {
      return mockPrimaryAgent;
    } else if (config.position === AgentPosition.SECONDARY || config.name?.startsWith('secondary-')) {
      return mockSecondaryAgent;
    } else if (config.position === AgentPosition.FALLBACK || config.name?.includes('fallback')) {
      return mockFallbackAgent;
    }
    return { analyze: jest.fn() } as any;
  });
  
  // Force reset the test config to ensure it's in a clean state
  const freshConfig = JSON.parse(JSON.stringify(testConfig));
  freshConfig.fallbackEnabled = true;
  freshConfig.strategy = testConfig.strategy;
  
  // Setup factory and executor after the mock is ready
  const factory = new MultiAgentFactory();
  const executor = new MultiAgentExecutor(freshConfig, testRepositoryData);
  
  return {
    factory,
    executor,
    mockPrimaryAgent,
    mockSecondaryAgent,
    mockFallbackAgent,
    testConfig: freshConfig,
    testRepositoryData
  };
}

// Reset mocks
export function resetMocks() {
  jest.clearAllMocks();
}
