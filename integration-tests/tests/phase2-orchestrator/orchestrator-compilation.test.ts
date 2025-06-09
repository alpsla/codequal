import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Context Compilation Tests', () => {
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
          'codequal/test-repo': { read: true, write: true, admin: false },
          'codequal/repo-with-history': { read: true, write: true, admin: false }
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

  describe('Context Compilation for Educational Agent', () => {
    it('should compile context with repository analysis for educational agent', async () => {
      // Store mock repository analysis in Vector DB
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: TEST_REPOS.medium,
          source_type: 'manual',
          content: JSON.stringify({
            architecture_patterns: [
              'MVC pattern used in controllers',
              'Repository pattern for data access',
              'Dependency injection container'
            ],
            best_practices: [
              'Consistent error handling',
              'Comprehensive test coverage',
              'Clear separation of concerns'
            ]
          }),
          metadata: {
            content_type: 'repository_analysis',
            analysis_type: 'architecture',
            importance_score: 0.9
          },
          storage_type: 'permanent'
        });

      const educationalPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 1,
        baseBranch: 'main',
        headBranch: 'feature/new-controller',
        files: [
          { 
            path: 'src/controllers/UserController.ts', 
            content: 'export class UserController { }', 
            status: 'added', 
            additions: 50, 
            deletions: 0 
          }
        ],
        commits: ['edu001'],
        prTitle: 'Add user controller',
        prDescription: 'Implements user management controller',
        prAuthor: 'junior-dev'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'architecture' },
          { provider: 'openai', model: 'gpt-4', role: 'educational' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        educationalPR,
        vectorContextService,
        authenticatedUser
      );

      // Get MCP context which should include repository patterns
      const mcpContext = orchestrator.getMCPStatus().currentContext;
      
      // Educational agent should have access to repository patterns
      expect(mcpContext.repository_context).toBeDefined();
      expect(mcpContext.repository_context.analysis_history).toBeDefined();
      
      // Context should be prepared for educational purposes
      const mcpManager = orchestrator.getMCPContextManager();
      mcpManager.registerAgent('educational');
      
      // Simulate architecture agent completing and sharing insights
      mcpManager.completeAgent('architecture', {
        findings: ['Controller follows MVC pattern', 'Missing dependency injection'],
        recommendations: ['Consider using DI container', 'Add error handling']
      });
      
      // Educational agent should have access to architecture insights
      const context = mcpManager.getContext();
      expect(context.agent_context.agent_results.architecture).toBeDefined();
      expect(context.agent_context.completed_agents).toContain('architecture');
    });

    it('should compile learning materials from multiple agent insights', () => {
      const complexPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 2,
        baseBranch: 'main',
        headBranch: 'feature/complex',
        files: [
          { path: 'src/auth/jwt.ts', content: '', status: 'modified', additions: 100, deletions: 50 },
          { path: 'src/api/users.ts', content: '', status: 'modified', additions: 200, deletions: 100 },
          { path: 'tests/auth.test.ts', content: '', status: 'added', additions: 150, deletions: 0 }
        ],
        commits: ['cplx001', 'cplx002'],
        prTitle: 'Refactor authentication system',
        prDescription: 'Complete auth system overhaul',
        prAuthor: 'senior-dev'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'architecture' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'testing' },
          { provider: 'gemini', model: 'gemini-pro', role: 'educational' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        complexPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      
      // Simulate multiple agents completing with insights
      mcpManager.registerAgent('security');
      mcpManager.completeAgent('security', {
        findings: ['JWT implementation needs stronger secret', 'Missing rate limiting'],
        severity: 'high',
        owasp_references: ['A02:2021', 'A04:2021']
      });
      
      mcpManager.registerAgent('architecture');
      mcpManager.completeAgent('architecture', {
        findings: ['Good separation of concerns', 'Consider middleware pattern'],
        patterns_identified: ['Factory pattern', 'Strategy pattern']
      });
      
      mcpManager.registerAgent('testing');
      mcpManager.completeAgent('testing', {
        coverage: '85%',
        missing_tests: ['Error scenarios', 'Edge cases'],
        test_quality: 'good'
      });
      
      // Educational agent should have comprehensive context
      const context = mcpManager.getContext();
      expect(context.agent_context.completed_agents).toHaveLength(3);
      expect(context.agent_context.agent_results.security).toBeDefined();
      expect(context.agent_context.agent_results.architecture).toBeDefined();
      expect(context.agent_context.agent_results.testing).toBeDefined();
      
      // Cross-agent insights should be available
      mcpManager.addCrossAgentInsight('security', 'educational', {
        type: 'security_education',
        topic: 'JWT best practices',
        references: ['RFC 7519', 'OWASP guidelines']
      });
      
      expect(context.shared_findings.cross_agent_insights).toHaveLength(1);
    });
  });

  describe('Context Compilation for Reporting Agent', () => {
    it('should compile comprehensive data for reporting agent', async () => {
      // Store multiple analysis results in Vector DB
      const analysisResults = [
        {
          repository_id: TEST_REPOS.large,
          source_type: 'manual',
          content: JSON.stringify({
            score: 8.5,
            category: 'security',
            findings: 10,
            fixed: 7,
            pending: 3
          }),
          metadata: {
            content_type: 'analysis_score',
            analysis_type: 'security',
            timestamp: new Date().toISOString()
          },
          storage_type: 'permanent'
        },
        {
          repository_id: TEST_REPOS.large,
          source_type: 'manual',
          content: JSON.stringify({
            score: 7.2,
            category: 'performance',
            bottlenecks: 5,
            optimized: 3,
            pending: 2
          }),
          metadata: {
            content_type: 'analysis_score',
            analysis_type: 'performance',
            timestamp: new Date().toISOString()
          },
          storage_type: 'permanent'
        }
      ];

      await supabase
        .from('analysis_chunks')
        .insert(analysisResults);

      const reportingPR: RepositoryData = {
        owner: 'codequal',
        repo: 'repo-with-history',
        prNumber: 3,
        baseBranch: 'main',
        headBranch: 'report/quarterly',
        files: [
          { path: 'docs/report.md', content: '', status: 'added', additions: 100, deletions: 0 }
        ],
        commits: ['rpt001'],
        prTitle: 'Quarterly analysis report',
        prDescription: 'Q4 2024 analysis summary',
        prAuthor: 'analyst'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'performance' },
          { provider: 'gemini', model: 'gemini-pro', role: 'reporting' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        reportingPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      
      // Simulate agents completing with metrics
      mcpManager.registerAgent('security');
      mcpManager.completeAgent('security', {
        current_score: 8.7,
        previous_score: 8.5,
        trend: 'improving',
        critical_issues: 0,
        high_issues: 2,
        medium_issues: 5
      });
      
      mcpManager.registerAgent('performance');
      mcpManager.completeAgent('performance', {
        current_score: 7.5,
        previous_score: 7.2,
        trend: 'improving',
        response_time_p95: 250,
        response_time_p99: 500
      });
      
      // Reporting agent should have access to all metrics
      const context = mcpManager.getContext();
      const progressSummary = mcpManager.getProgressSummary();
      
      expect(progressSummary.completed_agents).toBe(2);
      expect(context.agent_context.agent_results.security.current_score).toBe(8.7);
      expect(context.agent_context.agent_results.performance.current_score).toBe(7.5);
    });

    it('should aggregate cross-repository patterns for reporting', async () => {
      // Store cross-repo patterns
      await supabase
        .from('analysis_chunks')
        .insert([
          {
            repository_id: 'repo-1',
            source_type: 'manual',
            content: JSON.stringify({
              pattern: 'Singleton overuse',
              occurrences: 15,
              repositories_affected: 3
            }),
            metadata: {
              content_type: 'cross_repo_pattern',
              pattern_type: 'anti-pattern',
              severity: 'medium'
            },
            storage_type: 'permanent'
          },
          {
            repository_id: 'repo-2',
            source_type: 'manual',
            content: JSON.stringify({
              pattern: 'Missing error boundaries',
              occurrences: 8,
              repositories_affected: 2
            }),
            metadata: {
              content_type: 'cross_repo_pattern',
              pattern_type: 'missing-practice',
              severity: 'high'
            },
            storage_type: 'permanent'
          }
        ]);

      const crossRepoPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 4,
        baseBranch: 'main',
        headBranch: 'report/patterns',
        files: [
          { path: 'reports/patterns.md', content: '', status: 'added', additions: 200, deletions: 0 }
        ],
        commits: ['pat001'],
        prTitle: 'Cross-repository pattern analysis',
        prDescription: 'Identified patterns across organization',
        prAuthor: 'architect'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'architecture' },
          { provider: 'openai', model: 'gpt-4', role: 'reporting' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        crossRepoPR,
        vectorContextService,
        authenticatedUser
      );

      // Verify cross-repo context is available
      const mcpContext = orchestrator.getMCPStatus().currentContext;
      expect(mcpContext.repository_context).toBeDefined();
      
      // Should have access to pattern data for reporting
      const mcpManager = orchestrator.getMCPContextManager();
      mcpManager.addCrossAgentInsight('architecture', 'reporting', {
        type: 'pattern_summary',
        anti_patterns_found: 2,
        total_occurrences: 23,
        recommendations: ['Refactor singletons', 'Add error boundaries']
      });
      
      const context = mcpManager.getContext();
      expect(context.shared_findings.cross_agent_insights).toHaveLength(1);
      expect(context.shared_findings.cross_agent_insights[0].insight.anti_patterns_found).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should compile context within 100ms for complex scenarios', async () => {
      const complexPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 5,
        baseBranch: 'main',
        headBranch: 'perf/test',
        files: Array.from({ length: 50 }, (_, i) => ({
          path: `src/module${i}.ts`,
          content: '',
          status: 'modified' as const,
          additions: 50,
          deletions: 25
        })),
        commits: ['perf001', 'perf002', 'perf003'],
        prTitle: 'Performance test',
        prDescription: 'Testing context compilation performance',
        prAuthor: 'perf-tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'openai', model: 'gpt-4', role: 'architecture' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'performance' },
          { provider: 'gemini', model: 'gemini-pro', role: 'educational' },
          { provider: 'openai', model: 'gpt-4', role: 'reporting' }
        ]
      };

      const startTime = Date.now();

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        complexPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpManager = orchestrator.getMCPContextManager();
      
      // Simulate all agents completing
      ['security', 'architecture', 'performance'].forEach(agent => {
        mcpManager.registerAgent(agent);
        mcpManager.completeAgent(agent, {
          score: Math.random() * 10,
          findings: Math.floor(Math.random() * 20)
        });
      });
      
      // Add cross-agent insights
      mcpManager.addCrossAgentInsight('security', 'all', { type: 'security_summary' });
      mcpManager.addCrossAgentInsight('architecture', 'all', { type: 'architecture_summary' });
      mcpManager.addCrossAgentInsight('performance', 'all', { type: 'performance_summary' });
      
      const context = mcpManager.getContext();
      const compilationTime = Date.now() - startTime;
      
      expect(context.agent_context.completed_agents).toHaveLength(3);
      expect(context.shared_findings.cross_agent_insights).toHaveLength(3);
      expect(compilationTime).toBeLessThan(100);
    });
  });
});
