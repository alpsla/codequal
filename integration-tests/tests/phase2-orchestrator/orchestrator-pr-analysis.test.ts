import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator PR Analysis Tests', () => {
  let vectorContextService: VectorContextService;
  let authenticatedUser: AuthenticatedUser;
  let supabase: any;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Vector Context Service
    vectorContextService = new VectorContextService(supabase);

    // Mock authenticated user with proper permissions
    authenticatedUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'developer',
      organizationId: 'test-org-123',
      permissions: {
        repositories: {
          'codequal/small-pr': { read: true, write: true, admin: false },
          'codequal/medium-pr': { read: true, write: true, admin: false },
          'codequal/large-pr': { read: true, write: true, admin: false }
        }
      },
      session: {
        id: 'session-123',
        fingerprint: 'test-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      }
    };
  });

  describe('PR Metadata Extraction', () => {
    it('should extract metadata from small PR', () => {
      const smallPR: RepositoryData = {
        owner: 'codequal',
        repo: 'small-pr',
        prNumber: 1,
        baseBranch: 'main',
        headBranch: 'feature/small-change',
        files: [
          {
            path: 'src/utils.ts',
            content: 'export const add = (a: number, b: number) => a + b;',
            status: 'modified',
            additions: 1,
            deletions: 0
          }
        ],
        commits: ['abc123'],
        prTitle: 'Fix: Add utility function',
        prDescription: 'Small utility function addition',
        prAuthor: 'developer1'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{ provider: 'claude', model: 'claude-3-opus', role: 'security' }]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        smallPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      
      expect(mcpContext.repository_context.size_category).toBe('small');
      expect(mcpContext.repository_context.primary_language).toBe('typescript');
    });

    it('should extract metadata from medium PR', () => {
      const mediumPR: RepositoryData = {
        owner: 'codequal',
        repo: 'medium-pr',
        prNumber: 2,
        baseBranch: 'main',
        headBranch: 'feature/refactor',
        files: Array.from({ length: 25 }, (_, i) => ({
          path: `src/components/Component${i}.tsx`,
          content: `export const Component${i} = () => <div>Component ${i}</div>;`,
          status: 'modified' as const,
          additions: 10,
          deletions: 5
        })),
        commits: ['def456', 'ghi789'],
        prTitle: 'Refactor: Update component architecture',
        prDescription: 'Refactoring multiple components for better performance',
        prAuthor: 'developer2'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{ provider: 'openai', model: 'gpt-4', role: 'architecture' }]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        mediumPR,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      
      expect(mcpContext.repository_context.size_category).toBe('medium');
      expect(mcpContext.repository_context.primary_language).toBe('typescript');
    });

    it('should extract metadata from large PR with multiple languages', () => {
      const largePR: RepositoryData = {
        owner: 'codequal',
        repo: 'large-pr',
        prNumber: 3,
        baseBranch: 'main',
        headBranch: 'feature/major-feature',
        files: [
          ...Array.from({ length: 40 }, (_, i) => ({
            path: `src/services/service${i}.ts`,
            content: `export class Service${i} { }`,
            status: 'added' as const,
            additions: 50,
            deletions: 0
          })),
          ...Array.from({ length: 20 }, (_, i) => ({
            path: `scripts/script${i}.py`,
            content: `def function${i}(): pass`,
            status: 'added' as const,
            additions: 30,
            deletions: 0
          })),
          ...Array.from({ length: 10 }, (_, i) => ({
            path: `config/config${i}.json`,
            content: '{}',
            status: 'modified' as const,
            additions: 5,
            deletions: 3
          }))
        ],
        commits: ['jkl012', 'mno345', 'pqr678', 'stu901'],
        prTitle: 'Feature: Implement new service layer',
        prDescription: 'Major feature implementation with multiple services',
        prAuthor: 'developer3'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SPECIALIZED,
        agents: [
          { provider: 'claude', model: 'claude-3-opus', role: 'security' },
          { provider: 'deepseek', model: 'deepseek-coder', role: 'architecture' }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        largePR,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      
      expect(mcpContext.repository_context.size_category).toBe('large');
      // TypeScript files dominate (40 vs 20 Python files)
      expect(mcpContext.repository_context.primary_language).toBe('typescript');
    });
  });

  describe('PR Complexity Detection', () => {
    it('should detect simple PR complexity', () => {
      const simplePR: RepositoryData = {
        owner: 'codequal',
        repo: 'simple-pr',
        prNumber: 4,
        baseBranch: 'main',
        headBranch: 'fix/typo',
        files: [{
          path: 'README.md',
          content: '# Fixed typo',
          status: 'modified',
          additions: 1,
          deletions: 1
        }],
        commits: ['fix123'],
        prTitle: 'Fix typo in README',
        prDescription: 'Fixed a simple typo',
        prAuthor: 'contributor1'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{ provider: 'openai', model: 'gpt-3.5-turbo', role: 'codeQuality' }]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        simplePR,
        vectorContextService,
        { ...authenticatedUser, permissions: { repositories: { 'codequal/simple-pr': { read: true, write: true, admin: false } } } }
      );

      // For simple PRs, should use 'quick' analysis mode
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('quick');
      
      expect(strategy.name).toBe('Quick Analysis');
      expect(strategy.timeout_per_agent).toBe(30000); // 30 seconds for quick analysis
    });

    it('should detect complex PR requiring comprehensive analysis', () => {
      const complexPR: RepositoryData = {
        owner: 'codequal',
        repo: 'complex-pr',
        prNumber: 5,
        baseBranch: 'main',
        headBranch: 'feature/security-refactor',
        files: [
          {
            path: 'src/auth/authentication.ts',
            content: 'export class AuthenticationService { /* complex auth logic */ }',
            status: 'modified',
            additions: 200,
            deletions: 150
          },
          {
            path: 'src/auth/authorization.ts',
            content: 'export class AuthorizationService { /* complex authz logic */ }',
            status: 'added',
            additions: 300,
            deletions: 0
          },
          {
            path: 'src/middleware/security.ts',
            content: 'export const securityMiddleware = () => { /* security checks */ }',
            status: 'modified',
            additions: 100,
            deletions: 50
          }
        ],
        commits: ['sec001', 'sec002', 'sec003'],
        prTitle: 'Security: Implement new authentication system',
        prDescription: 'Complete overhaul of authentication and authorization',
        prAuthor: 'security-engineer'
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
        complexPR,
        vectorContextService,
        { ...authenticatedUser, permissions: { repositories: { 'codequal/complex-pr': { read: true, write: true, admin: false } } } }
      );

      // For security-critical PRs with sequential strategy, should use 'comprehensive' analysis
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('comprehensive');
      
      expect(strategy.name).toBe('Comprehensive Analysis');
      expect(strategy.timeout_per_agent).toBe(120000); // 2 minutes for comprehensive analysis
      expect(strategy.dependency_graph).toBeDefined();
      expect(strategy.dependency_graph.architecture).toContain('security'); // Architecture depends on security
    });
  });

  describe('File Pattern Analysis', () => {
    it('should categorize files by type and purpose', () => {
      const mixedPR: RepositoryData = {
        owner: 'codequal',
        repo: 'mixed-pr',
        prNumber: 6,
        baseBranch: 'main',
        headBranch: 'feature/full-stack',
        files: [
          // Frontend files
          { path: 'src/components/Button.tsx', content: '', status: 'added', additions: 50, deletions: 0 },
          { path: 'src/styles/button.css', content: '', status: 'added', additions: 30, deletions: 0 },
          // Backend files
          { path: 'src/api/users.ts', content: '', status: 'modified', additions: 100, deletions: 20 },
          { path: 'src/db/migrations/001_users.sql', content: '', status: 'added', additions: 20, deletions: 0 },
          // Test files
          { path: 'tests/api/users.test.ts', content: '', status: 'added', additions: 80, deletions: 0 },
          // Config files
          { path: 'tsconfig.json', content: '', status: 'modified', additions: 5, deletions: 2 },
          { path: '.eslintrc.js', content: '', status: 'modified', additions: 10, deletions: 5 }
        ],
        commits: ['mix001'],
        prTitle: 'Full stack feature implementation',
        prDescription: 'Frontend and backend changes',
        prAuthor: 'fullstack-dev'
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.SPECIALIZED,
        agents: [
          { 
            provider: 'claude', 
            model: 'claude-3-opus', 
            role: 'frontend',
            filePatterns: ['.*\\.(tsx|jsx|css|scss)$']
          },
          { 
            provider: 'openai', 
            model: 'gpt-4', 
            role: 'backend',
            filePatterns: ['.*\\/api\\/.*', '.*\\.sql$']
          },
          { 
            provider: 'deepseek', 
            model: 'deepseek-coder', 
            role: 'testing',
            filePatterns: ['.*\\.test\\.(ts|js)$', '.*\\.spec\\.(ts|js)$']
          }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        mixedPR,
        vectorContextService,
        { ...authenticatedUser, permissions: { repositories: { 'codequal/mixed-pr': { read: true, write: true, admin: false } } } }
      );

      // With specialized strategy, should use 'deep' analysis mode
      const mcpManager = orchestrator.getMCPContextManager();
      const strategy = mcpManager.getCoordinationStrategy('deep');
      
      expect(strategy.name).toBe('Deep Analysis');
      expect(strategy.execution_order).toContain('security');
      expect(strategy.execution_order).toContain('architecture');
      expect(strategy.parallel_groups).toBeDefined();
      expect(strategy.parallel_groups.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should analyze PR metadata within 50ms', () => {
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'perf-test',
        prNumber: 7,
        baseBranch: 'main',
        headBranch: 'perf/test',
        files: Array.from({ length: 50 }, (_, i) => ({
          path: `src/file${i}.ts`,
          content: `// File ${i}`,
          status: 'modified' as const,
          additions: 10,
          deletions: 5
        })),
        commits: ['perf001'],
        prTitle: 'Performance test PR',
        prDescription: 'Testing analysis performance',
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
        { ...authenticatedUser, permissions: { repositories: { 'codequal/perf-test': { read: true, write: true, admin: false } } } }
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      const analysisTime = Date.now() - startTime;

      expect(mcpContext).toBeDefined();
      expect(mcpContext.repository_context.size_category).toBe('large');
      expect(analysisTime).toBeLessThan(50);
    });
  });
});
