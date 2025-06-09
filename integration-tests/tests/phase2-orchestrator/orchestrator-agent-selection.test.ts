import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { MCPContextManager } from '@codequal/agents/multi-agent/mcp-context-manager';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Agent Selection Tests', () => {
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

  describe('Hybrid Selection Logic', () => {
    it('should select appropriate agents for security-focused PR', () => {
      const securityPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 1,
        baseBranch: 'main',
        headBranch: 'security/auth-fix',
        files: [
          {
            path: 'src/auth/jwt-validator.ts',
            content: 'export function validateJWT(token: string) { /* JWT validation */ }',
            status: 'modified',
            additions: 50,
            deletions: 20
          },
          {
            path: 'src/middleware/auth.ts',
            content: 'export const authMiddleware = () => { /* auth checks */ }',
            status: 'modified',
            additions: 30,
            deletions: 10
          }
        ],
        commits: ['sec001'],
        prTitle: 'Security: Fix JWT validation vulnerability',
        prDescription: 'Addresses CVE-2024-12345 in JWT validation',
        prAuthor: 'security-team'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security', priority: 10 },
          { provider: 'openai', model: 'gpt-4', role: 'codeQuality', priority: 5 },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'architecture', priority: 3 }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        securityPR,
        vectorContextService,
        authenticatedUser,
        { priorityBasedExecution: true }
      );

      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      
      // Security agent should be in the first parallel group due to high priority
      expect(strategy.parallel_groups[0]).toContain('security');
      expect(strategy.dependency_graph).toBeDefined();
    });

    it('should adapt agent selection based on file patterns', () => {
      const frontendPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 2,
        baseBranch: 'main',
        headBranch: 'feature/ui-update',
        files: [
          { path: 'src/components/Button.tsx', content: '', status: 'modified', additions: 20, deletions: 10 },
          { path: 'src/components/Modal.tsx', content: '', status: 'added', additions: 100, deletions: 0 },
          { path: 'src/styles/components.css', content: '', status: 'modified', additions: 50, deletions: 20 },
          { path: 'src/hooks/useModal.ts', content: '', status: 'added', additions: 30, deletions: 0 }
        ],
        commits: ['ui001'],
        prTitle: 'UI: Add modal component',
        prDescription: 'Implements reusable modal component',
        prAuthor: 'frontend-dev'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SPECIALIZED,
        agents: [
          { 
            provider: 'claude', 
            model: 'claude-3-opus', 
            role: 'frontend',
            filePatterns: ['.*\\.(tsx|jsx|css|scss)$'],
            focusAreas: ['component-design', 'accessibility', 'styling']
          },
          { 
            provider: 'openai', 
            model: 'gpt-4', 
            role: 'performance',
            filePatterns: ['.*\\.(ts|tsx|js|jsx)$'],
            focusAreas: ['bundle-size', 'render-performance']
          },
          { 
            provider: 'deepseek', 
            model: 'deepseek-coder', 
            role: 'backend',
            filePatterns: ['.*\\/api\\/.*', '.*\\/server\\/.*']
          }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        frontendPR,
        vectorContextService,
        authenticatedUser
      );

      // With specialized strategy, agents should be selected based on file patterns
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('deep');
      
      // Frontend and performance agents should be selected for frontend files
      // Backend agent might not be included in execution due to no matching files
      expect(strategy.execution_order.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle agent dependencies correctly', () => {
      const complexPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 3,
        baseBranch: 'main',
        headBranch: 'feature/complex-feature',
        files: [
          { path: 'src/api/service.ts', content: '', status: 'added', additions: 200, deletions: 0 },
          { path: 'src/db/schema.sql', content: '', status: 'modified', additions: 50, deletions: 10 },
          { path: 'src/cache/redis.ts', content: '', status: 'added', additions: 100, deletions: 0 }
        ],
        commits: ['feat001', 'feat002'],
        prTitle: 'Feature: Add caching layer',
        prDescription: 'Implements Redis caching for API responses',
        prAuthor: 'backend-dev'
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
        complexPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      
      // Check dependency graph
      expect(strategy.dependency_graph.architecture).toContain('security');
      expect(strategy.dependency_graph.performance).toContain('architecture');
      
      // Verify parallel groups respect dependencies
      const securityGroupIndex = strategy.parallel_groups.findIndex(group => group.includes('security'));
      const architectureGroupIndex = strategy.parallel_groups.findIndex(group => group.includes('architecture'));
      const performanceGroupIndex = strategy.parallel_groups.findIndex(group => group.includes('performance'));
      
      expect(architectureGroupIndex).toBeGreaterThan(securityGroupIndex);
      expect(performanceGroupIndex).toBeGreaterThan(architectureGroupIndex);
    });

    it('should select agents based on PR context and repository history', async () => {
      // First, store some mock history in Vector DB
      const mockHistory = {
        repository_id: TEST_REPOS.small,
        source_type: 'manual',
        content: JSON.stringify({
          historical_issues: [
            { type: 'security', severity: 'high', count: 5 },
            { type: 'performance', severity: 'medium', count: 3 }
          ]
        }),
        metadata: {
          content_type: 'analysis_history',
          repository_name: 'express-test-repo'
        },
        storage_type: 'permanent'
      };

      await supabase
        .from('analysis_chunks')
        .insert(mockHistory);

      const historicalPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 4,
        baseBranch: 'main',
        headBranch: 'fix/general-improvements',
        files: [
          { path: 'src/index.ts', content: '', status: 'modified', additions: 50, deletions: 30 }
        ],
        commits: ['fix001'],
        prTitle: 'General improvements',
        prDescription: 'Various fixes and improvements',
        prAuthor: 'developer'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'performance' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'codeQuality' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        historicalPR,
        vectorContextService,
        authenticatedUser
      );

      // Based on historical issues, security and performance agents should be prioritized
      const mcpContext = orchestrator.getMCPStatus().currentContext;
      expect(mcpContext.repository_context.analysis_history).toBeDefined();
    });
  });

  describe('MCP Coordination', () => {
    it('should use MCP coordination for multi-agent execution', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 5,
        baseBranch: 'main',
        headBranch: 'feature/test',
        files: [
          { path: 'src/service.ts', content: '', status: 'modified', additions: 100, deletions: 50 }
        ],
        commits: ['test001'],
        prTitle: 'Test PR for MCP',
        prDescription: 'Testing MCP coordination',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'codeQuality' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser,
        { enableMCP: true }
      );

      const mcpManager = orchestrator.getMCPContextManager();
      
      // Register agents
      mcpManager.registerAgent('security');
      mcpManager.registerAgent('codeQuality');
      
      // Check active agents
      const context = mcpManager.getContext();
      expect(context.agent_context.active_agents).toContain('security');
      expect(context.agent_context.active_agents).toContain('codeQuality');
      
      // Simulate agent completion
      mcpManager.completeAgent('security', { findings: ['test finding'] });
      
      const updatedContext = mcpManager.getContext();
      expect(updatedContext.agent_context.completed_agents).toContain('security');
      expect(updatedContext.agent_context.active_agents).not.toContain('security');
    });

    it('should handle cross-agent insights sharing', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 6,
        baseBranch: 'main',
        headBranch: 'feature/insights',
        files: [
          { path: 'src/auth.ts', content: '', status: 'modified', additions: 50, deletions: 20 }
        ],
        commits: ['ins001'],
        prTitle: 'Test cross-agent insights',
        prDescription: 'Testing insight sharing',
        prAuthor: 'tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'architecture' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      
      // Subscribe architecture agent to messages
      const receivedMessages: any[] = [];
      mcpManager.subscribe('architecture', (message) => {
        receivedMessages.push(message);
      });
      
      // Security agent adds insight for architecture agent
      mcpManager.addCrossAgentInsight('security', 'architecture', {
        type: 'authentication_pattern',
        description: 'JWT validation implemented, consider rate limiting',
        severity: 'medium'
      });
      
      // Check that insight was added
      const context = mcpManager.getContext();
      expect(context.shared_findings.cross_agent_insights).toHaveLength(1);
      expect(context.shared_findings.cross_agent_insights[0].source_agent).toBe('security');
      
      // Check that architecture agent received the message
      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].type).toBe('context_update');
      expect(receivedMessages[0].payload.type).toBe('cross_agent_insight');
      
      // Cleanup
      mcpManager.unsubscribe('architecture');
    });
  });

  describe('Performance', () => {
    it('should select agents within 20ms', () => {
      const perfPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 7,
        baseBranch: 'main',
        headBranch: 'perf/test',
        files: Array.from({ length: 100 }, (_, i) => ({
          path: `src/file${i}.ts`,
          content: '',
          status: 'modified' as const,
          additions: 10,
          deletions: 5
        })),
        commits: ['perf001'],
        prTitle: 'Performance test',
        prDescription: 'Testing agent selection performance',
        prAuthor: 'perf-tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'codeQuality' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'architecture' },
          { provider: 'gemini', model: 'gemini-pro', role: 'performance' }
        ]
      };

      const startTime = Date.now();

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        perfPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      const nextAgents = mcpManager.getNextAgentsToExecute(strategy);

      const selectionTime = Date.now() - startTime;

      expect(nextAgents).toBeDefined();
      expect(nextAgents.length).toBeGreaterThan(0);
      expect(selectionTime).toBeLessThan(20);
    });
  });
});
