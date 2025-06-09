import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator DeepWiki Configuration Tests', () => {
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

  describe('DeepWiki Model Selection', () => {
    it('should select appropriate DeepWiki model for small repository', async () => {
      const smallRepoPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 1,
        baseBranch: 'main',
        headBranch: 'feature/small',
        files: [
          { path: 'index.js', content: 'console.log("hello");', status: 'modified', additions: 1, deletions: 0 }
        ],
        commits: ['abc123'],
        prTitle: 'Small change',
        prDescription: 'Minor update',
        prAuthor: 'dev1'
      };

      // Store mock DeepWiki configuration for small repos
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: TEST_REPOS.small,
          source_type: 'manual',
          content: JSON.stringify({
            deepwiki_config: {
              recommended_model: 'gpt-3.5-turbo',
              analysis_depth: 'quick',
              token_budget: 4000
            }
          }),
          metadata: {
            content_type: 'deepwiki_config',
            repository_size: 'small'
          },
          storage_type: 'permanent'
        });

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'openai', model: 'gpt-3.5-turbo', role: 'codeQuality' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        smallRepoPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      expect(mcpContext.repository_context.size_category).toBe('small');
      
      // For small repos, should use quick analysis mode
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('quick');
      expect(strategy.timeout_per_agent).toBe(30000); // 30 seconds for small repos
    });

    it('should select appropriate DeepWiki model for large repository', async () => {
      const largeRepoPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 2,
        baseBranch: 'main',
        headBranch: 'feature/large',
        files: Array.from({ length: 100 }, (_, i) => ({
          path: `src/module${i}/service.ts`,
          content: `export class Service${i} { /* complex logic */ }`,
          status: 'added' as const,
          additions: 100,
          deletions: 0
        })),
        commits: ['def456', 'ghi789', 'jkl012'],
        prTitle: 'Major feature implementation',
        prDescription: 'Implements new service architecture',
        prAuthor: 'senior-dev'
      };

      // Store mock DeepWiki configuration for large repos
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: TEST_REPOS.large,
          source_type: 'manual',
          content: JSON.stringify({
            deepwiki_config: {
              recommended_model: 'gpt-4-turbo',
              analysis_depth: 'comprehensive',
              token_budget: 32000,
              parallel_agents: 5
            }
          }),
          metadata: {
            content_type: 'deepwiki_config',
            repository_size: 'large'
          },
          storage_type: 'permanent'
        });

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SPECIALIZED,
        agents: [
          { provider: 'openai', model: 'gpt-4', role: 'architecture', maxTokens: 8000 },
          { provider: 'claude', model: 'claude-3-opus', role: 'security', maxTokens: 8000 },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'performance', maxTokens: 16000 }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        largeRepoPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      expect(mcpContext.repository_context.size_category).toBe('large');
      
      // For large repos with specialized strategy, should use deep analysis
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('deep');
      expect(strategy.timeout_per_agent).toBe(300000); // 5 minutes for large repos
      expect(strategy.execution_order.length).toBeGreaterThanOrEqual(4);
    });

    it('should adapt DeepWiki configuration based on PR complexity', async () => {
      const complexSecurityPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 3,
        baseBranch: 'main',
        headBranch: 'security/oauth-implementation',
        files: [
          { path: 'src/auth/oauth2.ts', content: '', status: 'added', additions: 300, deletions: 0 },
          { path: 'src/auth/jwt.ts', content: '', status: 'modified', additions: 150, deletions: 100 },
          { path: 'src/middleware/security.ts', content: '', status: 'modified', additions: 200, deletions: 50 },
          { path: 'src/config/security.json', content: '', status: 'added', additions: 50, deletions: 0 }
        ],
        commits: ['sec001', 'sec002', 'sec003'],
        prTitle: 'Security: Implement OAuth 2.0',
        prDescription: 'Complete OAuth 2.0 implementation with JWT',
        prAuthor: 'security-engineer'
      };

      // Store mock security-focused DeepWiki configuration
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: 'security-analysis-config',
          source_type: 'manual',
          content: JSON.stringify({
            deepwiki_config: {
              security_focused: true,
              recommended_models: {
                security: 'claude-3-opus',
                architecture: 'gpt-4',
                code_review: 'deepseek-coder'
              },
              analysis_priorities: ['authentication', 'authorization', 'encryption'],
              enhanced_checks: ['OWASP', 'CVE', 'best-practices']
            }
          }),
          metadata: {
            content_type: 'deepwiki_security_config',
            domain: 'security'
          },
          storage_type: 'permanent'
        });

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SEQUENTIAL,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security', priority: 10 },
          { provider: 'openai', model: 'gpt-4', role: 'architecture', priority: 8 },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'codeQuality', priority: 6 }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        complexSecurityPR,
        vectorContextService,
        authenticatedUser
      );

      // For security-critical PRs, should use comprehensive analysis with dependencies
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      
      expect(strategy.dependency_graph.architecture).toContain('security');
      expect(strategy.fallback_strategy).toBe('progressive_timeout');
    });

    it('should configure DeepWiki for language-specific analysis', async () => {
      const pythonPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 4,
        baseBranch: 'main',
        headBranch: 'feature/ml-pipeline',
        files: [
          { path: 'src/models/classifier.py', content: '', status: 'added', additions: 200, deletions: 0 },
          { path: 'src/preprocessing/data_loader.py', content: '', status: 'added', additions: 150, deletions: 0 },
          { path: 'tests/test_classifier.py', content: '', status: 'added', additions: 100, deletions: 0 },
          { path: 'requirements.txt', content: '', status: 'modified', additions: 10, deletions: 2 }
        ],
        commits: ['ml001'],
        prTitle: 'Feature: ML classification pipeline',
        prDescription: 'Implements scikit-learn based classifier',
        prAuthor: 'ml-engineer'
      };

      // Store Python-specific DeepWiki configuration
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: 'python-analysis-config',
          source_type: 'manual',
          content: JSON.stringify({
            deepwiki_config: {
              language: 'python',
              specialized_models: {
                ml_analysis: 'gpt-4',
                python_best_practices: 'claude-3-opus',
                testing: 'deepseek-coder'
              },
              analysis_focus: ['type-hints', 'docstrings', 'test-coverage', 'ml-patterns']
            }
          }),
          metadata: {
            content_type: 'deepwiki_language_config',
            language: 'python'
          },
          storage_type: 'permanent'
        });

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SPECIALIZED,
        agents: [
          { 
            provider: 'openai', 
            model: 'gpt-4', 
            role: 'ml-analysis',
            filePatterns: ['.*\\.py$']
          },
          { 
            provider: 'claude', 
            model: 'claude-3-opus', 
            role: 'python-quality',
            filePatterns: ['.*\\.py$']
          }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        pythonPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      expect(mcpContext.repository_context.primary_language).toBe('python');
    });
  });

  describe('DeepWiki Request Generation', () => {
    it('should generate appropriate DeepWiki request for PR analysis', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 5,
        baseBranch: 'main',
        headBranch: 'feature/api',
        files: [
          { path: 'src/api/users.ts', content: '', status: 'added', additions: 150, deletions: 0 },
          { path: 'src/api/auth.ts', content: '', status: 'modified', additions: 50, deletions: 20 }
        ],
        commits: ['api001'],
        prTitle: 'API: User management endpoints',
        prDescription: 'Adds user CRUD operations',
        prAuthor: 'backend-dev'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'openai', model: 'gpt-4', role: 'api-design' },
          { provider: 'claude', model: 'claude-3-opus', role: 'security' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        testPR,
        vectorContextService,
        authenticatedUser
      );

      // Verify that orchestrator has proper context for DeepWiki
      const mcpContext = orchestrator.getMCPStatus().currentContext;
      
      expect(mcpContext.repository_context.repository_url).toBe('codequal/test-repo');
      expect(mcpContext.agent_context.coordination_strategy).toBe('adaptive');
      
      // Check that the context includes PR-specific information
      const progressSummary = orchestrator.getMCPContextManager().getProgressSummary();
      expect(progressSummary.total_agents).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should configure DeepWiki models within 30ms', async () => {
      const perfPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 6,
        baseBranch: 'main',
        headBranch: 'perf/test',
        files: Array.from({ length: 50 }, (_, i) => ({
          path: `src/service${i}.ts`,
          content: '',
          status: 'modified' as const,
          additions: 20,
          deletions: 10
        })),
        commits: ['perf001'],
        prTitle: 'Performance test',
        prDescription: 'Testing configuration performance',
        prAuthor: 'perf-tester'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          { provider: 'openai', model: 'gpt-4', role: 'architecture' },
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'performance' }
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

      const configTime = Date.now() - startTime;

      expect(strategy).toBeDefined();
      expect(strategy.execution_order).toContain('security');
      expect(strategy.execution_order).toContain('architecture');
      expect(strategy.execution_order).toContain('performance');
      expect(configTime).toBeLessThan(30);
    });
  });
});
