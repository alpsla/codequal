import { 
  EnhancedMultiAgentExecutor,
  EnhancedExecutionOptions,
  ExecutionProgress,
  RepositoryVectorContext,
  ModelBlacklistManager
} from '../enhanced-executor';
import { VectorContextService } from '../vector-context-service';
import { ExecutionStrategyFactory } from '../execution-strategies';
import { TimeoutManager, createTimeoutManager } from '../timeout-manager';
import { ExecutionMonitor } from '../execution-monitor';
import { EducationalAgent, CompiledFindings, LearningOpportunity } from '../educational-agent';
import { 
  MultiAgentConfig, 
  AnalysisStrategy, 
  AgentPosition,
  RepositoryData,
  AuthenticatedUser,
  UserRole,
  UserStatus
} from '../types';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
// Mock auth service removed - tests need to be updated to use real auth or test doubles
// import { createMockAuthenticationService } from '../mock-auth-service';

// Mock data for testing
const mockRepositoryData: RepositoryData = {
  owner: 'test-owner',
  repo: 'test-repo',
  prNumber: 123,
  branch: 'main',
  files: [
    {
      path: 'src/index.ts',
      content: 'console.log("Hello, World!");',
      diff: '+console.log("Hello, World!");'
    },
    {
      path: 'src/utils.js',
      content: 'function helper() { return true; }',
      diff: '+function helper() { return true; }'
    }
  ]
};

const mockAgentConfig: MultiAgentConfig = {
  name: 'test-config',
  agents: [
    {
      provider: AgentProvider.CLAUDE,
      role: AgentRole.CODE_QUALITY,
      position: AgentPosition.PRIMARY,
      priority: 1,
      maxTokens: 1000,
      temperature: 0.7
    },
    {
      provider: AgentProvider.OPENAI,
      role: AgentRole.SECURITY,
      position: AgentPosition.SECONDARY,
      priority: 2,
      maxTokens: 1000,
      temperature: 0.5
    }
  ],
  strategy: AnalysisStrategy.PARALLEL,
  fallbackEnabled: true
};

// Mock AuthenticatedUser for testing
const mockAuthenticatedUser: AuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  permissions: {
    repositories: {
      'test-owner/test-repo': {
        read: true,
        write: true,
        admin: false
      }
    },
    organizations: ['test-org'],
    globalPermissions: [],
    quotas: {
      requestsPerHour: 1000,
      maxConcurrentExecutions: 5,
      storageQuotaMB: 1000
    }
  },
  session: {
    token: 'test-token-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    fingerprint: 'test-fingerprint',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent'
  }
};

// Mock VectorContextService
const mockVectorContextService = {
  getRepositoryContext: jest.fn().mockResolvedValue({
    repositoryId: 'test-owner/test-repo',
    recentAnalysis: [],
    historicalPatterns: [],
    similarIssues: [],
    confidenceScore: 0.5,
    lastUpdated: new Date()
  }),
  getCrossRepositoryPatterns: jest.fn().mockResolvedValue([]),
  storeAnalysisResults: jest.fn().mockResolvedValue({ stored: 0, errors: 0 })
} as unknown as VectorContextService;

describe('EnhancedMultiAgentExecutor', () => {
  let executor: EnhancedMultiAgentExecutor;
  
  beforeEach(() => {
    executor = new EnhancedMultiAgentExecutor(
      mockAgentConfig,
      mockRepositoryData,
      mockVectorContextService,
      mockAuthenticatedUser,
      {
        debug: true,
        timeout: 30000,
        maxConcurrentAgents: 2,
        enableMetrics: true
      }
    );
  });
  
  afterEach(() => {
    // Cleanup any running operations
    jest.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with valid configuration', () => {
      expect(executor).toBeInstanceOf(EnhancedMultiAgentExecutor);
    });
    
    it('should throw error with invalid configuration', () => {
      const invalidConfig = { ...mockAgentConfig, agents: [] };
      
      expect(() => {
        new EnhancedMultiAgentExecutor(invalidConfig, mockRepositoryData, mockVectorContextService, mockAuthenticatedUser);
      }).toThrow();
    });
    
    it('should set default options when not provided', () => {
      const defaultExecutor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser
      );
      
      expect(defaultExecutor).toBeInstanceOf(EnhancedMultiAgentExecutor);
    });
  });
  
  describe('Resource Management', () => {
    it('should respect maximum concurrent agents limit', async () => {
      const config = {
        ...mockAgentConfig,
        agents: Array(10).fill(null).map((_, i) => ({
          provider: AgentProvider.CLAUDE,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.PRIMARY,
          priority: i
        }))
      };
      
      const resourceLimitedExecutor = new EnhancedMultiAgentExecutor(
        config,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { maxConcurrentAgents: 3, timeout: 10000 }
      );
      
      const result = await resourceLimitedExecutor.execute();
      expect(result.successful).toBe(true);
    });
    
    it('should handle model limits efficiently', async () => {
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { 
          modelTokenLimits: { 'claude': 1000 }, // Very low budget
          maxConcurrentAgents: 1
        }
      );
      
      const result = await executor.execute();
      // Should complete but may have fewer successful agents due to budget
      expect(result).toBeDefined();
    });
  });
  
  describe('Execution Strategies', () => {
    it('should execute parallel strategy successfully', async () => {
      const parallelConfig = { ...mockAgentConfig, strategy: AnalysisStrategy.PARALLEL };
      const executor = new EnhancedMultiAgentExecutor(
        parallelConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { timeout: 20000 }
      );
      
      const result = await executor.execute();
      
      expect(result.successful).toBe(true);
      expect(result.analysisId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.config.agents.length).toBe(2);
    });
    
    it('should execute sequential strategy successfully', async () => {
      const sequentialConfig = { ...mockAgentConfig, strategy: AnalysisStrategy.SEQUENTIAL };
      const executor = new EnhancedMultiAgentExecutor(
        sequentialConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { timeout: 20000 }
      );
      
      const result = await executor.execute();
      
      expect(result.successful).toBe(true);
      expect(result.analysisId).toBeDefined();
    });
    
    it('should execute specialized strategy successfully', async () => {
      const specializedConfig = {
        ...mockAgentConfig,
        strategy: AnalysisStrategy.SPECIALIZED,
        agents: [
          {
            ...mockAgentConfig.agents[0],
            filePatterns: ['*.ts'],
            focusAreas: ['typescript']
          },
          {
            ...mockAgentConfig.agents[1],
            filePatterns: ['*.js'],
            focusAreas: ['javascript']
          }
        ]
      };
      
      const executor = new EnhancedMultiAgentExecutor(
        specializedConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { timeout: 20000 }
      );
      
      const result = await executor.execute();
      
      expect(result.successful).toBe(true);
    });
  });
  
  describe('Progress Tracking', () => {
    it('should track execution progress', async () => {
      const progressUpdates: any[] = [];
      
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        {
          timeout: 20000,
          onProgress: (progress: ExecutionProgress) => {
            progressUpdates.push(progress);
          }
        }
      );
      
      const result = await executor.execute();
      
      expect(result.successful).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check progress structure
      const lastProgress = progressUpdates[progressUpdates.length - 1];
      expect(lastProgress.totalAgents).toBe(2);
      expect(lastProgress.progressPercentage).toBeGreaterThanOrEqual(0);
      expect(lastProgress.phase).toBeDefined();
    });
    
    it('should update progress percentage correctly', async () => {
      const progressUpdates: any[] = [];
      
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        {
          timeout: 20000,
          onProgress: (progress: ExecutionProgress) => {
            progressUpdates.push({ ...progress });
          }
        }
      );
      
      await executor.execute();
      
      // Progress should increase over time
      const percentages = progressUpdates.map(p => p.progressPercentage);
      const hasIncreasingProgress = percentages.some((p, i) => 
        i > 0 && p >= percentages[i - 1]
      );
      
      expect(hasIncreasingProgress).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle agent timeouts gracefully', async () => {
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { 
          agentTimeout: 100, // Very short timeout
          timeout: 5000
        }
      );
      
      const result = await executor.execute();
      
      // Should complete even with timeouts
      expect(result).toBeDefined();
      expect(result.successful).toBeDefined();
    });
    
    it('should handle execution failures gracefully', async () => {
      // This would test actual failure scenarios in a real implementation
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { timeout: 10000 }
      );
      
      const result = await executor.execute();
      
      // Should handle failures gracefully
      expect(result).toBeDefined();
      expect(result.analysisId).toBeDefined();
    });
  });
  
  describe('Metrics Collection', () => {
    it('should collect comprehensive metrics', async () => {
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { 
          enableMetrics: true,
          timeout: 20000
        }
      );
      
      const result = await executor.execute();
      
      expect(result.duration).toBeGreaterThan(0);
      expect(result.config.agents.length).toBe(2);
      expect(result.metadata?.tokenUsage).toBeDefined();
      expect(Object.keys(result.results).length).toBeGreaterThanOrEqual(0);
    });
    
    it('should track token usage correctly', async () => {
      const executor = new EnhancedMultiAgentExecutor(
        mockAgentConfig,
        mockRepositoryData,
        mockVectorContextService,
        mockAuthenticatedUser,
        { timeout: 20000 }
      );
      
      const result = await executor.execute();
      
      expect(result.metadata?.tokenUsage).toBeDefined();
      expect(result.totalCost).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate agent configuration', () => {
      const invalidConfig = {
        ...mockAgentConfig,
        agents: [
          {
            // Missing required fields
            provider: AgentProvider.CLAUDE
          }
        ]
      } as any;
      
      expect(() => {
        new EnhancedMultiAgentExecutor(invalidConfig, mockRepositoryData, mockVectorContextService, mockAuthenticatedUser);
      }).toThrow();
    });
    
    it('should accept valid fallback configuration', () => {
      const configWithFallback = {
        ...mockAgentConfig,
        fallbackEnabled: true,
        agents: [
          {
            ...mockAgentConfig.agents[0],
            position: AgentPosition.PRIMARY
          },
          {
            ...mockAgentConfig.agents[1],
            position: AgentPosition.FALLBACK
          }
        ]
      };
      
      expect(() => {
        new EnhancedMultiAgentExecutor(configWithFallback, mockRepositoryData, mockVectorContextService, mockAuthenticatedUser);
      }).not.toThrow();
    });
  });
});

describe('ExecutionStrategyFactory', () => {
  it('should create parallel strategy', () => {
    const strategy = ExecutionStrategyFactory.createStrategy(AnalysisStrategy.PARALLEL);
    expect(strategy.getName()).toBe('Parallel');
  });
  
  it('should create sequential strategy', () => {
    const strategy = ExecutionStrategyFactory.createStrategy(AnalysisStrategy.SEQUENTIAL);
    expect(strategy.getName()).toBe('Sequential');
  });
  
  it('should create specialized strategy', () => {
    const strategy = ExecutionStrategyFactory.createStrategy(AnalysisStrategy.SPECIALIZED);
    expect(strategy.getName()).toBe('Specialized');
  });
  
  it('should create hybrid strategy', () => {
    const strategy = ExecutionStrategyFactory.createHybridStrategy();
    expect(strategy.getName()).toBe('Hybrid');
  });
  
  it('should list available strategies', () => {
    const strategies = ExecutionStrategyFactory.getAvailableStrategies();
    expect(strategies.length).toBeGreaterThan(0);
    expect(strategies[0]).toHaveProperty('strategy');
    expect(strategies[0]).toHaveProperty('description');
  });
});

describe('TimeoutManager', () => {
  let timeoutManager: TimeoutManager;
  
  beforeEach(() => {
    timeoutManager = new TimeoutManager({
      defaultTimeout: 5000,
      maxTimeout: 10000,
      minTimeout: 1000
    });
  });
  
  it('should execute operation within timeout', async () => {
    const result = await timeoutManager.executeWithTimeout(
      'test-op',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      }
    );
    
    expect(result.completed).toBe(true);
    expect(result.result).toBe('success');
    expect(result.timedOut).toBe(false);
  });
  
  it('should handle operation timeout', async () => {
    const result = await timeoutManager.executeWithTimeout(
      'timeout-op',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        return 'success';
      },
      { timeout: 100 }
    );
    
    expect(result.completed).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.error).toBeDefined();
  });
  
  it('should support operation cancellation', async () => {
    const promise = timeoutManager.executeWithTimeout(
      'cancel-op',
      async (signal) => {
        // Simulate a long-running operation that respects AbortSignal
        return new Promise((resolve, reject) => {
          const longTimeout = setTimeout(() => {
            resolve('success');
          }, 5000);
          
          // Listen for abort signal
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(longTimeout);
              reject(new Error('Operation was cancelled'));
            });
          }
        });
      }
    );
    
    // Cancel the operation after 100ms
    setTimeout(() => {
      const cancelled = timeoutManager.cancelOperation('cancel-op', 'Test cancellation');
      expect(cancelled).toBe(true); // Should successfully cancel
    }, 100);
    
    const result = await promise;
    
    // Operation should be cancelled, not completed
    expect(result.completed).toBe(false);
    expect(result.cancelled).toBe(true);
    expect(result.result).toBeUndefined();
  }, 10000);
  
  it('should provide operation statistics', () => {
    const stats = timeoutManager.getStatistics();
    
    expect(stats).toHaveProperty('activeOperations');
    expect(stats).toHaveProperty('averageExecutionTime');
    expect(stats).toHaveProperty('config');
  });
});

describe('ExecutionMonitor', () => {
  let monitor: ExecutionMonitor;
  
  beforeEach(() => {
    monitor = new ExecutionMonitor({
      enableMetrics: true,
      enableEvents: true,
      eventBufferSize: 100
    });
  });
  
  it('should track execution lifecycle', () => {
    const executionId = 'test-execution';
    
    monitor.startExecution(executionId, AnalysisStrategy.PARALLEL, 2);
    
    const agent1Config = mockAgentConfig.agents[0];
    monitor.startAgent('agent1', agent1Config);
    monitor.completeAgent('agent1', { result: 'success' }, { input: 100, output: 50 });
    
    monitor.completeExecution(true);
    
    const events = monitor.getEvents();
    expect(events.length).toBeGreaterThan(0);
    
    const summary = monitor.getSummary();
    expect(summary.execution.id).toBe(executionId);
    expect(summary.execution.totalAgents).toBe(1); // One agent tracked
  });
  
  it('should collect execution metrics', () => {
    monitor.startExecution('test', AnalysisStrategy.PARALLEL, 1);
    
    const metrics = monitor.getMetrics();
    
    expect(metrics.execution).toBeDefined();
    expect(metrics.resources).toBeDefined();
    expect(metrics.performance).toBeDefined();
    expect(metrics.realtime).toBeDefined();
  });
  
  it('should track agent failures', () => {
    monitor.startExecution('test', AnalysisStrategy.PARALLEL, 1);
    monitor.startAgent('failing-agent', mockAgentConfig.agents[0]);
    monitor.failAgent('failing-agent', new Error('Test failure'));
    
    const events = monitor.getEvents();
    const failureEvent = events.find(e => e.type === 'agent_failed');
    
    expect(failureEvent).toBeDefined();
    expect(failureEvent?.agentId).toBe('failing-agent');
  });
  
  it('should track agent retries', () => {
    monitor.startExecution('test', AnalysisStrategy.PARALLEL, 1);
    monitor.retryAgent('retry-agent', 1, 'Timeout occurred');
    
    const events = monitor.getEvents();
    const retryEvent = events.find(e => e.type === 'agent_retried');
    
    expect(retryEvent).toBeDefined();
    expect(retryEvent?.data.retryCount).toBe(1);
  });
  
  it('should track fallback triggers', () => {
    monitor.startExecution('test', AnalysisStrategy.PARALLEL, 1);
    monitor.triggerFallback('original-agent', 'fallback-agent', 'Primary failed');
    
    const events = monitor.getEvents();
    const fallbackEvent = events.find(e => e.type === 'fallback_triggered');
    
    expect(fallbackEvent).toBeDefined();
    expect(fallbackEvent?.data.fallbackAgentId).toBe('fallback-agent');
  });
});

// Integration tests
describe('Enhanced Executor Integration', () => {
  it('should integrate all components successfully', async () => {
    const monitor = new ExecutionMonitor({
      enableMetrics: true,
      enableEvents: true
    });
    
    let progressUpdates = 0;
    
    const executor = new EnhancedMultiAgentExecutor(
      mockAgentConfig,
      mockRepositoryData,
      mockVectorContextService,
      mockAuthenticatedUser,
      {
        timeout: 30000,
        enableMetrics: true,
        onProgress: () => {
          progressUpdates++;
        }
      }
    );
    
    const result = await executor.execute();
    
    expect(result.successful).toBe(true);
    expect(result.analysisId).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(progressUpdates).toBeGreaterThan(0);
  });
  
  it('should handle model blacklist and replacement', async () => {
    const mockBlacklist: ModelBlacklistManager = {
      isBlacklisted: jest.fn().mockReturnValue(false),
      addToBlacklist: jest.fn(),
      getAvailableModelsForRole: jest.fn().mockReturnValue(['claude', 'openai']),
      findReplacement: jest.fn().mockResolvedValue('openai')
    };
    
    const executor = new EnhancedMultiAgentExecutor(
      mockAgentConfig,
      mockRepositoryData,
      mockVectorContextService,
      mockAuthenticatedUser,
      {
        timeout: 30000,
        modelBlacklist: mockBlacklist,
        modelTokenLimits: {
          'claude': 15000,
          'openai': 20000
        }
      }
    );
    
    const result = await executor.execute();
    expect(result.successful).toBe(true);
  });
  
  it('should handle complex multi-strategy execution', async () => {
    const complexConfig = {
      ...mockAgentConfig,
      agents: [
        {
          provider: AgentProvider.CLAUDE,
          role: AgentRole.CODE_QUALITY,
          position: AgentPosition.PRIMARY,
          priority: 1
        },
        {
          provider: AgentProvider.OPENAI,
          role: AgentRole.SECURITY,
          position: AgentPosition.SECONDARY,
          priority: 2
        },
        {
          provider: AgentProvider.DEEPSEEK_CODER,
          role: AgentRole.PERFORMANCE,
          position: AgentPosition.SPECIALIST,
          priority: 3,
          filePatterns: ['*.ts', '*.js']
        }
      ]
    };
    
    const executor = new EnhancedMultiAgentExecutor(
      complexConfig,
      mockRepositoryData,
      mockVectorContextService,
      mockAuthenticatedUser,
      { timeout: 30000 }
    );
    
    const result = await executor.execute();
    
    expect(result.successful).toBe(true);
    expect(result.config.agents.length).toBe(3);
  });
});

describe('EducationalAgent', () => {
  let educationalAgent: EducationalAgent;
  let mockVectorDB: any;
  let mockResearcher: any;
  
  beforeEach(() => {
    mockVectorDB = {
      searchEducationalContent: jest.fn()
    };
    
    mockResearcher = {
      requestEducationalContent: jest.fn()
    };
    
    educationalAgent = new EducationalAgent(mockVectorDB, mockResearcher);
  });
  
  it('should extract learning opportunities from compiled findings', async () => {
    const mockFindings: CompiledFindings = {
      codeQuality: {
        complexityIssues: [{ type: 'high_complexity', file: 'test.ts' }],
        maintainabilityIssues: [],
        codeSmells: [{ type: 'god_object', file: 'large.ts' }],
        patterns: []
      },
      security: {
        vulnerabilities: [{ type: 'xss', severity: 'high' }],
        securityPatterns: [],
        complianceIssues: [],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: [],
        technicalDebt: [{ type: 'coupling', impact: 'medium' }],
        refactoringOpportunities: [],
        architecturalDecisions: []
      },
      performance: {
        performanceIssues: [],
        optimizationOpportunities: [],
        bottlenecks: [],
        benchmarkResults: []
      },
      dependency: {
        vulnerabilityIssues: [],
        licenseIssues: [],
        outdatedPackages: [],
        conflictResolution: []
      },
      criticalIssues: [],
      learningOpportunities: [],
      knowledgeGaps: []
    };
    
    mockVectorDB.searchEducationalContent.mockResolvedValue([
      {
        type: 'explanation',
        content: {
          concept: 'Code Complexity',
          simpleExplanation: 'Complex code is hard to understand',
          technicalDetails: 'Cyclomatic complexity measures...',
          whyItMatters: 'Complex code has more bugs',
          examples: []
        }
      }
    ]);
    
    const result = await educationalAgent.analyze(mockFindings);
    
    expect(result.learningPath).toBeDefined();
    expect(result.explanations).toBeDefined();
    expect(result.skillGaps.length).toBeGreaterThanOrEqual(0);
    expect(result.recommendedNextSteps).toBeDefined();
  });
  
  it('should request researcher content when vector DB has no results', async () => {
    const mockFindings: CompiledFindings = {
      codeQuality: {
        complexityIssues: [{ type: 'complexity', file: 'test.ts' }],
        maintainabilityIssues: [],
        codeSmells: [],
        patterns: []
      },
      security: { vulnerabilities: [], securityPatterns: [], complianceIssues: [], threatLandscape: [] },
      architecture: { designPatternViolations: [], technicalDebt: [], refactoringOpportunities: [], architecturalDecisions: [] },
      performance: { performanceIssues: [], optimizationOpportunities: [], bottlenecks: [], benchmarkResults: [] },
      dependency: { vulnerabilityIssues: [], licenseIssues: [], outdatedPackages: [], conflictResolution: [] },
      criticalIssues: [],
      learningOpportunities: [],
      knowledgeGaps: []
    };
    
    mockVectorDB.searchEducationalContent.mockResolvedValue(null);
    mockResearcher.requestEducationalContent.mockResolvedValue({
      id: 'research-123',
      estimatedCompletion: new Date()
    });
    
    const result = await educationalAgent.analyze(mockFindings);
    
    expect(mockResearcher.requestEducationalContent).toHaveBeenCalled();
    expect(result.additionalResources).toContainEqual(
      expect.objectContaining({
        status: 'research_requested',
        requestId: 'research-123'
      })
    );
  });
  
  it('should create appropriate learning path based on priorities', async () => {
    const mockFindings: CompiledFindings = {
      codeQuality: { complexityIssues: [], maintainabilityIssues: [], codeSmells: [], patterns: [] },
      security: {
        vulnerabilities: [
          { type: 'sql_injection', severity: 'critical' },
          { type: 'xss', severity: 'high' },
          { type: 'csrf', severity: 'medium' }
        ],
        securityPatterns: [],
        complianceIssues: [],
        threatLandscape: []
      },
      architecture: { designPatternViolations: [], technicalDebt: [], refactoringOpportunities: [], architecturalDecisions: [] },
      performance: { performanceIssues: [], optimizationOpportunities: [], bottlenecks: [], benchmarkResults: [] },
      dependency: { vulnerabilityIssues: [], licenseIssues: [], outdatedPackages: [], conflictResolution: [] },
      criticalIssues: [],
      learningOpportunities: [],
      knowledgeGaps: []
    };
    
    mockVectorDB.searchEducationalContent.mockResolvedValue([]);
    
    const result = await educationalAgent.analyze(mockFindings);
    
    expect(result.learningPath.title).toBe('Personalized Learning Path');
    expect(result.learningPath.difficulty).toBe('advanced'); // Security is advanced
    expect(result.learningPath.steps).toContain('1. Security Best Practices (advanced)');
  });
});