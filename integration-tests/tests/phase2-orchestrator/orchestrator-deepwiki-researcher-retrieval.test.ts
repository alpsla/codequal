import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator DeepWiki Model Retrieval from RESEARCHER Data', () => {
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
        expiresAt: new Date(Date.now() + 3600000)
      }
    };

    // Mock RESEARCHER's pre-analyzed DeepWiki configurations
    await mockResearcherDeepWikiConfigurations();
  });

  async function mockResearcherDeepWikiConfigurations() {
    // RESEARCHER agent analyzed and stored optimal DeepWiki models for all combinations
    const researcherDeepWikiConfigs = {
      repository_id: '00000000-0000-0000-0000-000000000001', // RESEARCHER's special repository
      source_type: 'researcher_agent',
      content: JSON.stringify({
        last_research_date: '2025-03-09',
        next_research_date: '2025-06-09',
        deepwiki_configurations: {
          // TypeScript + React + Large
          'typescript-react-large': {
            primary_model: {
              provider: 'openai',
              model: 'gpt-4-turbo-2024-04-09',
              openrouterPath: 'openai/gpt-4-turbo',
              reasoning: 'Best for analyzing large React codebases with complex patterns',
              token_budget: 32000,
              analysis_depth: 'comprehensive'
            },
            fallback_model: {
              provider: 'anthropic',
              model: 'claude-3-opus-20240229',
              openrouterPath: 'anthropic/claude-3-opus',
              reasoning: 'Excellent fallback for deep architectural insights'
            },
            analysis_strategy: {
              focus_areas: ['component-architecture', 'state-management', 'performance'],
              file_limit: 500,
              chunk_strategy: 'semantic',
              parallel_analysis: true
            }
          },
          // Python + Django + Medium
          'python-django-medium': {
            primary_model: {
              provider: 'openai',
              model: 'gpt-4-0125-preview',
              openrouterPath: 'openai/gpt-4',
              reasoning: 'Good balance for Python/Django analysis',
              token_budget: 16000,
              analysis_depth: 'standard'
            },
            fallback_model: {
              provider: 'anthropic',
              model: 'claude-3-sonnet-20240229',
              openrouterPath: 'anthropic/claude-3-sonnet',
              reasoning: 'Cost-effective fallback'
            },
            analysis_strategy: {
              focus_areas: ['django-patterns', 'orm-usage', 'security'],
              file_limit: 200,
              chunk_strategy: 'file-based',
              parallel_analysis: false
            }
          },
          // JavaScript + Express + Small
          'javascript-express-small': {
            primary_model: {
              provider: 'openai',
              model: 'gpt-3.5-turbo-0125',
              openrouterPath: 'openai/gpt-3.5-turbo',
              reasoning: 'Cost-effective for small repositories',
              token_budget: 4000,
              analysis_depth: 'quick'
            },
            fallback_model: {
              provider: 'anthropic',
              model: 'claude-3-haiku-20240307',
              openrouterPath: 'anthropic/claude-3-haiku',
              reasoning: 'Fast and cheap fallback'
            },
            analysis_strategy: {
              focus_areas: ['api-structure', 'middleware', 'routing'],
              file_limit: 50,
              chunk_strategy: 'simple',
              parallel_analysis: false
            }
          },
          // Rust + Actix + Large
          'rust-actix-large': {
            primary_model: {
              provider: 'deepseek',
              model: 'deepseek-coder-33b-instruct',
              openrouterPath: 'deepseek/deepseek-coder-33b-instruct',
              reasoning: 'Specialized in systems programming languages',
              token_budget: 32000,
              analysis_depth: 'comprehensive'
            },
            fallback_model: {
              provider: 'openai',
              model: 'gpt-4-turbo-2024-04-09',
              openrouterPath: 'openai/gpt-4-turbo',
              reasoning: 'Strong general-purpose fallback'
            },
            analysis_strategy: {
              focus_areas: ['memory-safety', 'concurrency', 'performance'],
              file_limit: 400,
              chunk_strategy: 'ast-based',
              parallel_analysis: true
            }
          }
        }
      }),
      metadata: {
        content_type: 'researcher_deepwiki_configurations',
        version: '2.0',
        created_by: 'researcher_agent',
        total_combinations_analyzed: 180,
        optimization_criteria: ['cost', 'accuracy', 'speed', 'context_window']
      },
      storage_type: 'permanent'
    };

    await supabase
      .from('analysis_chunks')
      .insert(researcherDeepWikiConfigs);
  }

  describe('DeepWiki Model Retrieval', () => {
    it('should retrieve DeepWiki configuration based on repository metadata', async () => {
      // Orchestrator analyzes repository
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      // Simple retrieval function used by orchestrator
      const retrieveDeepWikiConfig = async (metadata: any) => {
        const lookupKey = `${metadata.language}-${metadata.framework}-${metadata.size}`;
        
        const { data } = await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('metadata->content_type', 'researcher_deepwiki_configurations')
          .single();

        if (data) {
          const configs = JSON.parse(data.content);
          return configs.deepwiki_configurations[lookupKey];
        }
        return null;
      };

      const deepwikiConfig = await retrieveDeepWikiConfig(repoMetadata);
      
      expect(deepwikiConfig).toBeDefined();
      expect(deepwikiConfig.primary_model.model).toBe('gpt-4-turbo-2024-04-09');
      expect(deepwikiConfig.primary_model.openrouterPath).toBe('openai/gpt-4-turbo');
      expect(deepwikiConfig.primary_model.token_budget).toBe(32000);
      expect(deepwikiConfig.analysis_strategy.focus_areas).toContain('component-architecture');
      expect(deepwikiConfig.analysis_strategy.parallel_analysis).toBe(true);
    });

    it('should retrieve both DeepWiki and agent models in one orchestrator flow', async () => {
      class CompleteOrchestrator {
        async initializeAnalysis(repositoryData: RepositoryData) {
          // 1. Extract metadata from repository
          const metadata = this.extractMetadata(repositoryData);
          
          // 2. Retrieve DeepWiki configuration
          const deepwikiConfig = await this.getDeepWikiConfig(metadata);
          
          // 3. Determine required agents
          const requiredAgents = this.determineRequiredAgents(repositoryData);
          
          // 4. Retrieve model for each agent
          const agentConfigs = [];
          for (const agentRole of requiredAgents) {
            const agentModel = await this.getAgentModel({
              ...metadata,
              agentRole
            });
            
            if (agentModel) {
              agentConfigs.push({
                role: agentRole,
                ...agentModel
              });
            }
          }
          
          return {
            deepwiki: deepwikiConfig,
            agents: agentConfigs
          };
        }

        private extractMetadata(repoData: RepositoryData) {
          // Simple metadata extraction
          const hasTypeScript = repoData.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
          const hasReact = repoData.files.some(f => f.path.endsWith('.tsx'));
          const fileCount = repoData.files.length;
          
          return {
            language: hasTypeScript ? 'typescript' : 'javascript',
            framework: hasReact ? 'react' : 'unknown',
            size: fileCount > 100 ? 'large' : fileCount > 20 ? 'medium' : 'small'
          };
        }

        private async getDeepWikiConfig(metadata: any) {
          const key = `${metadata.language}-${metadata.framework}-${metadata.size}`;
          
          const { data } = await supabase
            .from('analysis_chunks')
            .select('content')
            .eq('repository_id', '00000000-0000-0000-0000-000000000001')
            .eq('metadata->content_type', 'researcher_deepwiki_configurations')
            .single();

          const configs = JSON.parse(data.content).deepwiki_configurations;
          return configs[key];
        }

        private async getAgentModel(metadata: any) {
          const key = `${metadata.language}-${metadata.framework}-${metadata.size}-${metadata.agentRole}`;
          
          const { data } = await supabase
            .from('analysis_chunks')
            .select('content')
            .eq('repository_id', '00000000-0000-0000-0000-000000000001')
            .eq('metadata->content_type', 'researcher_model_configurations')
            .single();

          const configs = JSON.parse(data.content).configurations;
          return configs[key];
        }

        private determineRequiredAgents(repoData: RepositoryData) {
          // Simple logic - in reality would be more sophisticated
          return ['security', 'codeQuality'];
        }
      }

      // Test complete flow
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'large-react-app',
        prNumber: 456,
        baseBranch: 'main',
        headBranch: 'feature/refactor',
        files: Array.from({ length: 150 }, (_, i) => ({
          path: `src/components/Component${i}.tsx`,
          content: '',
          status: 'modified' as const,
          additions: 50,
          deletions: 25
        })),
        commits: ['ref001'],
        prTitle: 'Refactor component architecture',
        prDescription: 'Major refactoring',
        prAuthor: 'senior-dev'
      };

      const orchestrator = new CompleteOrchestrator();
      const config = await orchestrator.initializeAnalysis(testPR);
      
      // Verify DeepWiki configuration
      expect(config.deepwiki).toBeDefined();
      expect(config.deepwiki.primary_model.model).toBe('gpt-4-turbo-2024-04-09');
      expect(config.deepwiki.analysis_strategy.file_limit).toBe(500);
      
      // Verify agent configurations
      expect(config.agents).toHaveLength(2);
      
      // Both retrieved from RESEARCHER's pre-analyzed data
      expect(config.deepwiki.primary_model.reasoning).toContain('large React codebases');
    });

    it('should use DeepWiki fallback model when needed', async () => {
      const metadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_deepwiki_configurations')
        .single();

      const configs = JSON.parse(data.content).deepwiki_configurations;
      const deepwikiConfig = configs['typescript-react-large'];
      
      // Verify fallback configuration exists
      expect(deepwikiConfig.fallback_model).toBeDefined();
      expect(deepwikiConfig.fallback_model.model).toBe('claude-3-opus-20240229');
      expect(deepwikiConfig.fallback_model.openrouterPath).toBe('anthropic/claude-3-opus');
      
      // Primary uses GPT-4 Turbo, fallback uses Claude Opus
      expect(deepwikiConfig.primary_model.provider).not.toBe(deepwikiConfig.fallback_model.provider);
    });

    it('should adapt DeepWiki analysis strategy based on repository size', async () => {
      // Get configs for different sizes
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_deepwiki_configurations')
        .single();

      const configs = JSON.parse(data.content).deepwiki_configurations;
      
      const largeRepoConfig = configs['typescript-react-large'];
      const smallRepoConfig = configs['javascript-express-small'];
      
      // Large repos get comprehensive analysis
      expect(largeRepoConfig.primary_model.analysis_depth).toBe('comprehensive');
      expect(largeRepoConfig.primary_model.token_budget).toBe(32000);
      expect(largeRepoConfig.analysis_strategy.parallel_analysis).toBe(true);
      expect(largeRepoConfig.analysis_strategy.file_limit).toBe(500);
      
      // Small repos get quick analysis
      expect(smallRepoConfig.primary_model.analysis_depth).toBe('quick');
      expect(smallRepoConfig.primary_model.token_budget).toBe(4000);
      expect(smallRepoConfig.analysis_strategy.parallel_analysis).toBe(false);
      expect(smallRepoConfig.analysis_strategy.file_limit).toBe(50);
    });
  });

  describe('Performance', () => {
    it('should retrieve both DeepWiki and agent configs within 100ms total', async () => {
      const metadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const startTime = Date.now();
      
      // Simulate orchestrator retrieving both configs
      const deepwikiKey = `${metadata.language}-${metadata.framework}-${metadata.size}`;
      const agentKey = `${metadata.language}-${metadata.framework}-${metadata.size}-security`;
      
      // Both queries to RESEARCHER data
      const [deepwikiResult, agentResult] = await Promise.all([
        supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('metadata->content_type', 'researcher_deepwiki_configurations')
          .single(),
        supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('metadata->content_type', 'researcher_model_configurations')
          .single()
      ]);
      
      const totalTime = Date.now() - startTime;
      
      expect(deepwikiResult.data).toBeDefined();
      expect(agentResult.data).toBeDefined();
      expect(totalTime).toBeLessThan(100);
    });
  });
});
