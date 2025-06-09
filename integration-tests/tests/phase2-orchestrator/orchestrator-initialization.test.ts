import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Initialization Tests', () => {
  let vectorContextService: VectorContextService;
  let authenticatedUser: AuthenticatedUser;
  let repositoryData: RepositoryData;
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
          'codequal/test-repo': {
            read: true,
            write: true,
            admin: false
          }
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

    // Mock repository data
    repositoryData = {
      owner: 'codequal',
      repo: 'test-repo',
      prNumber: 123,
      baseBranch: 'main',
      headBranch: 'feature/test',
      files: [
        {
          path: 'src/index.ts',
          content: 'console.log("test");',
          status: 'modified',
          additions: 1,
          deletions: 0
        }
      ],
      commits: [],
      prTitle: 'Test PR',
      prDescription: 'Test description',
      prAuthor: 'test-user'
    };
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Model Loading and Configuration', () => {
    it('should initialize orchestrator with valid configuration', () => {
      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        fallbackEnabled: true,
        agents: [
          {
            provider: 'claude',
            model: 'claude-3-opus',
            role: 'security',
            temperature: 0.1,
            maxTokens: 4000
          },
          {
            provider: 'openai',
            model: 'gpt-4',
            role: 'codeQuality',
            temperature: 0.2,
            maxTokens: 4000
          }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        repositoryData,
        vectorContextService,
        authenticatedUser
      );

      expect(orchestrator).toBeDefined();
      expect(orchestrator.getMCPStatus().isEnabled).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        fallbackEnabled: true,
        agents: [] // No agents - should be invalid
      };

      expect(() => {
        new EnhancedMultiAgentExecutor(
          invalidConfig,
          repositoryData,
          vectorContextService,
          authenticatedUser
        );
      }).toThrow('Invalid configuration');
    });

    it('should initialize with MCP context manager', () => {
      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          {
            provider: 'claude',
            model: 'claude-3-opus',
            role: 'security'
          }
        ]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        repositoryData,
        vectorContextService,
        authenticatedUser,
        { enableMCP: true }
      );

      const mcpStatus = orchestrator.getMCPStatus();
      expect(mcpStatus.isEnabled).toBe(true);
      expect(mcpStatus.currentContext).toBeDefined();
      expect(mcpStatus.currentContext.user_context.user_id).toBe('test-user-123');
    });

    it('should handle repository access validation', () => {
      const unauthorizedUser: AuthenticatedUser = {
        ...authenticatedUser,
        permissions: {
          repositories: {} // No repository permissions
        }
      };

      expect(() => {
        new EnhancedMultiAgentExecutor(
          {
            strategy: AnalysisStrategy.PARALLEL,
            agents: [{
              provider: 'claude',
              model: 'claude-3-opus',
              role: 'security'
            }]
          },
          repositoryData,
          vectorContextService,
          unauthorizedUser
        );
      }).toThrow('REPOSITORY_ACCESS_DENIED');
    });

    it('should initialize with different analysis strategies', () => {
      const strategies = [
        AnalysisStrategy.PARALLEL,
        AnalysisStrategy.SEQUENTIAL,
        AnalysisStrategy.SPECIALIZED
      ];

      strategies.forEach(strategy => {
        const config: MultiAgentConfig = {
          strategy,
          agents: [{
            provider: 'claude',
            model: 'claude-3-opus',
            role: 'security'
          }]
        };

        const orchestrator = new EnhancedMultiAgentExecutor(
          config,
          repositoryData,
          vectorContextService,
          authenticatedUser
        );

        expect(orchestrator).toBeDefined();
        
        // Check that MCP context has appropriate coordination strategy
        const mcpManager = orchestrator.getMCPContextManager();
        const analysisMode = strategy === AnalysisStrategy.SPECIALIZED ? 'deep' : 
                           strategy === AnalysisStrategy.SEQUENTIAL ? 'comprehensive' : 'quick';
        const coordinationStrategy = mcpManager.getCoordinationStrategy(analysisMode);
        
        expect(coordinationStrategy).toBeDefined();
        expect(coordinationStrategy.name).toBeTruthy();
      });
    });

    it('should detect and set primary language in MCP context', () => {
      const repoWithMultipleFiles: RepositoryData = {
        ...repositoryData,
        files: [
          { path: 'src/index.ts', content: '', status: 'modified', additions: 0, deletions: 0 },
          { path: 'src/app.ts', content: '', status: 'modified', additions: 0, deletions: 0 },
          { path: 'test/test.js', content: '', status: 'modified', additions: 0, deletions: 0 },
          { path: 'README.md', content: '', status: 'modified', additions: 0, deletions: 0 }
        ]
      };

      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [{
          provider: 'claude',
          model: 'claude-3-opus',
          role: 'security'
        }]
      };

      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        repoWithMultipleFiles,
        vectorContextService,
        authenticatedUser
      );

      const mcpContext = orchestrator.getMCPStatus().currentContext;
      // TypeScript files dominate, so primary language should be detected
      expect(mcpContext.repository_context.primary_language).toBeTruthy();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should initialize within 100ms', () => {
      const config: MultiAgentConfig = {
        strategy: AnalysisStrategy.PARALLEL,
        agents: [
          {
            provider: 'claude',
            model: 'claude-3-opus',
            role: 'security'
          },
          {
            provider: 'openai',
            model: 'gpt-4',
            role: 'codeQuality'
          }
        ]
      };

      const startTime = Date.now();
      
      const orchestrator = new EnhancedMultiAgentExecutor(
        config,
        repositoryData,
        vectorContextService,
        authenticatedUser
      );

      const initTime = Date.now() - startTime;
      
      expect(orchestrator).toBeDefined();
      expect(initTime).toBeLessThan(100);
    });
  });
});
