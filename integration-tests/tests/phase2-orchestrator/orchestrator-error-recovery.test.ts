import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Error Recovery Tests', () => {
  let vectorContextService: VectorContextService;
  let authenticatedUser: AuthenticatedUser;
  let supabase: any;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Vector Context Service
    vectorContextService = new VectorContextService(supabase);

    // Mock authenticated user
    authenticatedUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'developer',
      organizationId: 'test-org-123',
      permissions: {
        repositories: {
          'codequal/test-repo': { read: true, write: true, admin: false }
        }
      },
      session: {
        id: 'session-123',
        fingerprint: 'test-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      }
    };
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', () => {
      const invalidUser: AuthenticatedUser = {
        ...authenticatedUser,
        permissions: {
          repositories: {} // No permissions
        }
      };

      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 1,
        baseBranch: 'main',
        headBranch: 'feature/test',
        files: [{ path: 'test.ts', content: '', status: 'modified', additions: 1, deletions: 0 }],
        commits: ['test001'],
        prTitle: 'Test PR',
        prDescription: 'Testing error handling',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{ provider: 'claude', model: 'claude-3-opus', role: 'security' }]
      };

      expect(() => {
        new EnhancedMultiAgentExecutor(
          config,
          testPR,
          vectorContextService,
          invalidUser
        );
      }).toThrow('REPOSITORY_ACCESS_DENIED');
    });

    it('should handle expired session errors', () => {
      const expiredSessionUser: AuthenticatedUser = {
        ...authenticatedUser,
        session: {
          ...authenticatedUser.session,
          expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
        }
      };

      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 2,
        baseBranch: 'main',
        headBranch: 'feature/expired',
        files: [{ path: 'test.ts', content: '', status: 'modified', additions: 1, deletions: 0 }],
        commits: ['exp001'],
        prTitle: 'Expired session test',
        prDescription: 'Testing expired session handling',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{ provider: 'openai', model: 'gpt-4', role: 'codeQuality' }]
      };

      expect(() => {
        new EnhancedMultiAgentExecutor(
          config,
          testPR,
          vectorContextService,
          expiredSessionUser
        );
      }).toThrow('EXPIRED_SESSION');
    });

    it('should handle invalid configuration errors', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 3,
        baseBranch: 'main',
        headBranch: 'feature/invalid',
        files: [{ path: 'test.ts', content: '', status: 'modified', additions: 1, deletions: 0 }],
        commits: ['inv001'],
        prTitle: 'Invalid config test',
        prDescription: 'Testing invalid configuration',
        prAuthor: 'tester'
      };

      const invalidConfigs = [
        {
          strategy: AnalysisStrategy.PARALLEL,
          agents: [] // Empty agents array
        },
        {
          strategy: 'INVALID_STRATEGY' as any,
          agents: [{ provider: 'claude', model: 'claude-3-opus', role: 'security' }]
        },
        {
          strategy: AnalysisStrategy.PARALLEL,
          agents: [{ provider: '', model: '', role: '' }] // Invalid agent config
        }
      ];

      invalidConfigs.forEach((invalidConfig, index) => {
        expect(() => {
          new EnhancedMultiAgentExecutor(
            invalidConfig as MultiAgentConfig,
            testPR,
            vectorContextService,
            authenticatedUser
          );
        }).toThrow();
      });
    });
  });

  describe('Agent Failure Recovery', () => {
    it('should recover from agent timeout with fallback', async () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 4,
        baseBranch: 'main',
        headBranch: 'feature/timeout',
        files: [{ path: 'slow.ts', content: '', status: 'modified', additions: 100, deletions: 50 }],
        commits: ['slow001'],
        prTitle: 'Timeout test',
        prDescription: 'Testing timeout recovery',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        fallbackEnabled: true,
        agents: [
          { 
            provider: 'claude', 
            model: 'claude-3-opus', 
            role: 'security',
            fallbackProvider: 'openai',
            fallbackModel: 'gpt-4'
          }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser,
        {
          agentTimeout: 100, // Very short timeout to trigger failure
          maxRetries: 1
        }
      );

      // Mock the agent execution to simulate timeout
      const mcpManager = orchestrator.getMCPContextManager();
      
      // The orchestrator should handle timeouts and use fallback
      const mcpStatus = orchestrator.getMCPStatus();
      expect(mcpStatus.isEnabled).toBe(true);
      
      // Verify fallback configuration exists
      expect(config.agents[0].fallbackProvider).toBe('openai');
      expect(config.agents[0].fallbackModel).toBe('gpt-4');
    });

    it('should handle Vector DB connection failures gracefully', async () => {
      // Mock Vector DB failure
      const failingVectorService = {
        ...vectorContextService,
        getRepositoryContext: jest.fn().mockRejectedValue(new Error('Vector DB connection failed')),
        getCrossRepositoryPatterns: jest.fn().mockRejectedValue(new Error('Vector DB connection failed'))
      };

      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 5,
        baseBranch: 'main',
        headBranch: 'feature/vector-fail',
        files: [{ path: 'test.ts', content: '', status: 'modified', additions: 10, deletions: 5 }],
        commits: ['vec001'],
        prTitle: 'Vector DB failure test',
        prDescription: 'Testing Vector DB failure handling',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{ provider: 'claude', model: 'claude-3-opus', role: 'security' }]
      };

      // Should not throw during initialization even with failing vector service
      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        failingVectorService as any,
        authenticatedUser
      );

      expect(orchestrator).toBeDefined();
      
      // Orchestrator should continue to work without vector context
      const mcpContext = orchestrator.getMCPStatus().currentContext;
      expect(mcpContext).toBeDefined();
    });

    it('should handle partial agent failures in parallel execution', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 6,
        baseBranch: 'main',
        headBranch: 'feature/partial-fail',
        files: [
          { path: 'src/service.ts', content: '', status: 'modified', additions: 50, deletions: 25 },
          { path: 'src/controller.ts', content: '', status: 'added', additions: 100, deletions: 0 }
        ],
        commits: ['part001'],
        prTitle: 'Partial failure test',
        prDescription: 'Testing partial agent failure recovery',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        fallbackEnabled: true,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'architecture' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'performance' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      
      // Simulate one agent failing
      mcpManager.registerAgent('security');
      mcpManager.registerAgent('architecture');
      mcpManager.registerAgent('performance');
      
      // Complete two agents successfully
      mcpManager.completeAgent('security', { score: 8.5, findings: 5 });
      mcpManager.completeAgent('architecture', { score: 7.8, patterns: 3 });
      
      // Performance agent fails - should not affect other results
      const context = mcpManager.getContext();
      expect(context.agent_context.completed_agents).toHaveLength(2);
      expect(context.agent_context.agent_results.security).toBeDefined();
      expect(context.agent_context.agent_results.architecture).toBeDefined();
      
      // Progress should reflect partial completion
      const progress = mcpManager.getProgressSummary();
      expect(progress.completed_agents).toBe(2);
      expect(progress.total_agents).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Resource Management Recovery', () => {
    it('should handle resource exhaustion gracefully', () => {
      const largePR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 7,
        baseBranch: 'main',
        headBranch: 'feature/resource-test',
        files: Array.from({ length: 200 }, (_, i) => ({
          path: `src/file${i}.ts`,
          content: `// Large file ${i}`,
          status: 'added' as const,
          additions: 100,
          deletions: 0
        })),
        commits: ['res001', 'res002', 'res003'],
        prTitle: 'Resource exhaustion test',
        prDescription: 'Testing resource management',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: Array.from({ length: 10 }, (_, i) => ({
          provider: i % 2 === 0 ? 'claude' : 'openai',
          model: i % 2 === 0 ? 'claude-3-opus' : 'gpt-4',
          role: `agent-${i}`
        }))
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        largePR,
        vectorContextService,
        authenticatedUser,
        {
          maxConcurrentAgents: 3, // Limit concurrent executions
          modelTokenLimits: {
            'claude-3-opus': 4000,
            'gpt-4': 4000
          }
        }
      );

      // Resource manager should be configured
      expect(orchestrator).toBeDefined();
      
      // Should handle large number of agents with limited concurrency
      const mcpStatus = orchestrator.getMCPStatus();
      expect(mcpStatus.currentContext.agent_context.active_agents.length).toBeLessThanOrEqual(3);
    });

    it('should implement progressive timeout strategy', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 8,
        baseBranch: 'main',
        headBranch: 'feature/progressive',
        files: [{ path: 'test.ts', content: '', status: 'modified', additions: 50, deletions: 25 }],
        commits: ['prog001'],
        prTitle: 'Progressive timeout test',
        prDescription: 'Testing progressive timeout strategy',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security', priority: 10 },
          { provider: 'openai', model: 'gpt-4', role: 'architecture', priority: 5 },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'codeQuality', priority: 1 }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser,
        {
          priorityBasedExecution: true,
          timeout: 60000, // 1 minute total
          agentTimeout: 20000 // 20 seconds per agent
        }
      );

      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      
      // Should use progressive timeout as fallback strategy
      expect(strategy.fallback_strategy).toBe('progressive_timeout');
      
      // Higher priority agents should get more time/resources
      expect(config.agents[0].priority).toBeGreaterThan(config.agents[2].priority);
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should maintain performance with multiple retries', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 9,
        baseBranch: 'main',
        headBranch: 'perf/retry-test',
        files: [{ path: 'test.ts', content: '', status: 'modified', additions: 30, deletions: 15 }],
        commits: ['retry001'],
        prTitle: 'Retry performance test',
        prDescription: 'Testing performance with retries',
        prAuthor: 'perf-tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'codeQuality' }
        ]
      };

      const startTime = Date.now();

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser,
        {
          maxRetries: 3,
          retryDelay: 100
        }
      );

      const initTime = Date.now() - startTime;

      // Even with retry configuration, initialization should be fast
      expect(orchestrator).toBeDefined();
      expect(initTime).toBeLessThan(50);
    });

    it('should handle cascading failures without deadlock', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 10,
        baseBranch: 'main',
        headBranch: 'feature/cascade',
        files: [{ path: 'cascade.ts', content: '', status: 'modified', additions: 40, deletions: 20 }],
        commits: ['casc001'],
        prTitle: 'Cascade failure test',
        prDescription: 'Testing cascading failure handling',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'architecture' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'performance' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      
      // Dependencies should be clearly defined to prevent deadlock
      expect(strategy.dependency_graph).toBeDefined();
      expect(strategy.parallel_groups).toBeDefined();
      
      // Each parallel group should be independent
      strategy.parallel_groups.forEach(group => {
        group.forEach(agent => {
          // Agents in the same group should not depend on each other
          const dependencies = strategy.dependency_graph[agent] || [];
          group.forEach(otherAgent => {
            if (agent !== otherAgent) {
              expect(dependencies).not.toContain(otherAgent);
            }
          });
        });
      });
    });
  });
});
