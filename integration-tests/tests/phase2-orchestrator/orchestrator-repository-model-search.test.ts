import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Repository-Based Model Selection Tests', () => {
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

    // Store model configurations with repository metadata
    await setupRepositoryBasedModelConfigs();
  });

  async function setupRepositoryBasedModelConfigs() {
    // Store model configurations indexed by repository metadata
    const modelConfigs = [
      // TypeScript + React + Large repo configurations
      {
        repository_id: 'model-config-ts-react-large',
        source_type: 'manual',
        content: JSON.stringify({
          security: {
            provider: 'anthropic',
            model: 'claude-3-opus-20240229',
            openrouterModel: 'anthropic/claude-3-opus',
            temperature: 0.1,
            maxTokens: 8000
          },
          architecture: {
            provider: 'openai',
            model: 'gpt-4-turbo-2024-04-09',
            openrouterModel: 'openai/gpt-4-turbo',
            temperature: 0.2,
            maxTokens: 8000
          },
          performance: {
            provider: 'deepseek',
            model: 'deepseek-coder-33b-instruct',
            openrouterModel: 'deepseek/deepseek-coder-33b-instruct',
            temperature: 0.2,
            maxTokens: 16000
          },
          codeQuality: {
            provider: 'openai',
            model: 'gpt-4-turbo-2024-04-09',
            openrouterModel: 'openai/gpt-4-turbo',
            temperature: 0.3,
            maxTokens: 4000
          }
        }),
        metadata: {
          content_type: 'agent_model_config',
          language: 'typescript',
          framework: 'react',
          size: 'large',
          version: '1.0',
          last_updated: new Date().toISOString()
        },
        storage_type: 'permanent'
      },
      // Python + Django + Medium repo configurations
      {
        repository_id: 'model-config-python-django-medium',
        source_type: 'manual',
        content: JSON.stringify({
          security: {
            provider: 'anthropic',
            model: 'claude-3-sonnet-20240229',
            openrouterModel: 'anthropic/claude-3-sonnet',
            temperature: 0.1,
            maxTokens: 4000
          },
          architecture: {
            provider: 'openai',
            model: 'gpt-4-0125-preview',
            openrouterModel: 'openai/gpt-4',
            temperature: 0.2,
            maxTokens: 4000
          },
          performance: {
            provider: 'openai',
            model: 'gpt-4-turbo-2024-04-09',
            openrouterModel: 'openai/gpt-4-turbo',
            temperature: 0.3,
            maxTokens: 4000
          },
          dependencies: {
            provider: 'deepseek',
            model: 'deepseek-coder-33b-instruct',
            openrouterModel: 'deepseek/deepseek-coder-33b-instruct',
            temperature: 0.2,
            maxTokens: 8000
          }
        }),
        metadata: {
          content_type: 'agent_model_config',
          language: 'python',
          framework: 'django',
          size: 'medium',
          version: '1.0'
        },
        storage_type: 'permanent'
      },
      // JavaScript + Express + Small repo configurations
      {
        repository_id: 'model-config-javascript-express-small',
        source_type: 'manual',
        content: JSON.stringify({
          security: {
            provider: 'openai',
            model: 'gpt-4-0125-preview',
            openrouterModel: 'openai/gpt-4',
            temperature: 0.2,
            maxTokens: 2000
          },
          codeQuality: {
            provider: 'openai',
            model: 'gpt-3.5-turbo-0125',
            openrouterModel: 'openai/gpt-3.5-turbo',
            temperature: 0.3,
            maxTokens: 2000
          }
        }),
        metadata: {
          content_type: 'agent_model_config',
          language: 'javascript',
          framework: 'express',
          size: 'small',
          version: '1.0'
        },
        storage_type: 'permanent'
      }
    ];

    for (const config of modelConfigs) {
      await supabase
        .from('analysis_chunks')
        .insert(config);
    }
  }

  describe('Repository Metadata-Based Model Search', () => {
    it('should search Vector DB using repository metadata to find appropriate models', async () => {
      // Mock repository analysis
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large',
        files: 250,
        totalLines: 50000
      };

      // Mock orchestrator's model search function
      const searchModelsForRepository = async (metadata: any, agentRole: string) => {
        const { data } = await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('metadata->content_type', 'agent_model_config')
          .eq('metadata->language', metadata.language)
          .eq('metadata->framework', metadata.framework)
          .eq('metadata->size', metadata.size)
          .single();

        if (data) {
          const configs = JSON.parse(data.content);
          return configs[agentRole];
        }
        return null;
      };

      // Search for security agent model
      const securityModel = await searchModelsForRepository(repoMetadata, 'security');
      
      expect(securityModel).toBeDefined();
      expect(securityModel.provider).toBe('anthropic');
      expect(securityModel.model).toBe('claude-3-opus-20240229');
      expect(securityModel.openrouterModel).toBe('anthropic/claude-3-opus');
      
      // Search for performance agent model
      const performanceModel = await searchModelsForRepository(repoMetadata, 'performance');
      
      expect(performanceModel).toBeDefined();
      expect(performanceModel.provider).toBe('deepseek');
      expect(performanceModel.model).toBe('deepseek-coder-33b-instruct');
      expect(performanceModel.openrouterModel).toBe('deepseek/deepseek-coder-33b-instruct');
    });

    it('should build complete agent configuration from repository context', async () => {
      // Simulate orchestrator analyzing a TypeScript React PR
      const repositoryData: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 123,
        baseBranch: 'main',
        headBranch: 'feature/security-fix',
        files: [
          { path: 'src/components/Auth.tsx', content: '', status: 'modified', additions: 100, deletions: 50 },
          { path: 'src/hooks/useAuth.ts', content: '', status: 'added', additions: 200, deletions: 0 },
          { path: 'src/api/auth.ts', content: '', status: 'modified', additions: 150, deletions: 75 }
        ],
        commits: ['sec001', 'sec002'],
        prTitle: 'Security: Fix authentication flow',
        prDescription: 'Addresses security vulnerabilities in auth',
        prAuthor: 'security-engineer'
      };

      // Mock orchestrator's complete flow
      class RepositoryAwareOrchestrator {
        async buildAgentConfiguration(repoData: RepositoryData) {
          // 1. Analyze repository to extract metadata
          const metadata = this.extractRepositoryMetadata(repoData);
          
          // 2. Determine required agents based on PR
          const requiredAgents = this.determineRequiredAgents(repoData);
          
          // 3. Search Vector DB for each agent's model
          const agentConfigs = [];
          for (const agentRole of requiredAgents) {
            const modelConfig = await this.searchModelForAgent(metadata, agentRole);
            if (modelConfig) {
              agentConfigs.push({
                role: agentRole,
                ...modelConfig
              });
            }
          }
          
          return agentConfigs;
        }

        private extractRepositoryMetadata(repoData: RepositoryData) {
          // Analyze files to determine language and framework
          const tsFiles = repoData.files.filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
          const hasReactFiles = repoData.files.some(f => f.path.endsWith('.tsx'));
          
          return {
            language: tsFiles.length > 0 ? 'typescript' : 'javascript',
            framework: hasReactFiles ? 'react' : 'unknown',
            size: repoData.files.length > 100 ? 'large' : repoData.files.length > 20 ? 'medium' : 'small'
          };
        }

        private determineRequiredAgents(repoData: RepositoryData) {
          const agents = [];
          
          // Security-related PR
          if (repoData.prTitle.toLowerCase().includes('security') || 
              repoData.files.some(f => f.path.includes('auth'))) {
            agents.push('security');
          }
          
          // Architecture changes
          if (repoData.files.length > 5) {
            agents.push('architecture');
          }
          
          // Always include code quality
          agents.push('codeQuality');
          
          return agents;
        }

        private async searchModelForAgent(metadata: any, agentRole: string) {
          const { data } = await supabase
            .from('analysis_chunks')
            .select('*')
            .eq('metadata->content_type', 'agent_model_config')
            .eq('metadata->language', metadata.language)
            .eq('metadata->framework', metadata.framework)
            .eq('metadata->size', metadata.size)
            .single();

          if (data) {
            const configs = JSON.parse(data.content);
            return configs[agentRole];
          }
          return null;
        }
      }

      const orchestrator = new RepositoryAwareOrchestrator();
      const agentConfigs = await orchestrator.buildAgentConfiguration(repositoryData);
      
      expect(agentConfigs).toHaveLength(3); // security, architecture, codeQuality
      
      // Verify security agent gets claude-3-opus for TypeScript/React/Large
      const securityAgent = agentConfigs.find(a => a.role === 'security');
      expect(securityAgent?.openrouterModel).toBe('anthropic/claude-3-opus');
      
      // Verify architecture agent gets gpt-4-turbo
      const architectureAgent = agentConfigs.find(a => a.role === 'architecture');
      expect(architectureAgent?.openrouterModel).toBe('openai/gpt-4-turbo');
    });

    it('should handle fallback when exact metadata match not found', async () => {
      // Search for a combination that doesn't exist
      const repoMetadata = {
        language: 'rust',
        framework: 'actix',
        size: 'medium'
      };

      // Should fall back to language-only search, then to defaults
      const searchWithFallback = async (metadata: any, agentRole: string) => {
        // Try exact match first
        let { data } = await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('metadata->content_type', 'agent_model_config')
          .eq('metadata->language', metadata.language)
          .eq('metadata->framework', metadata.framework)
          .eq('metadata->size', metadata.size)
          .single();

        // If no exact match, try language + size only
        if (!data) {
          const result = await supabase
            .from('analysis_chunks')
            .select('*')
            .eq('metadata->content_type', 'agent_model_config')
            .eq('metadata->language', metadata.language)
            .eq('metadata->size', metadata.size)
            .limit(1);
          
          data = result.data?.[0];
        }

        // If still no match, use defaults
        if (!data) {
          return {
            provider: 'openai',
            model: 'gpt-4-0125-preview',
            openrouterModel: 'openai/gpt-4',
            temperature: 0.2,
            maxTokens: 4000
          };
        }

        const configs = JSON.parse(data.content);
        return configs[agentRole];
      };

      const model = await searchWithFallback(repoMetadata, 'security');
      
      expect(model).toBeDefined();
      expect(model.openrouterModel).toBe('openai/gpt-4'); // Default fallback
    });

    it('should select different models for same role based on repository characteristics', async () => {
      // Large TypeScript repo gets Claude Opus for security
      const largeRepoSecurity = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->content_type', 'agent_model_config')
        .eq('metadata->language', 'typescript')
        .eq('metadata->size', 'large')
        .single();
      
      const largeConfig = JSON.parse(largeRepoSecurity.data.content);
      expect(largeConfig.security.openrouterModel).toBe('anthropic/claude-3-opus');

      // Small JavaScript repo gets GPT-4 for security
      const smallRepoSecurity = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->content_type', 'agent_model_config')
        .eq('metadata->language', 'javascript')
        .eq('metadata->size', 'small')
        .single();
      
      const smallConfig = JSON.parse(smallRepoSecurity.data.content);
      expect(smallConfig.security.openrouterModel).toBe('openai/gpt-4');
      
      // Different models for same role based on repo characteristics
      expect(largeConfig.security.openrouterModel).not.toBe(smallConfig.security.openrouterModel);
    });
  });

  describe('OpenRouter Integration', () => {
    it('should format model configuration for OpenRouter API', async () => {
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      // Get model config from Vector DB
      const { data } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->content_type', 'agent_model_config')
        .eq('metadata->language', repoMetadata.language)
        .eq('metadata->framework', repoMetadata.framework)
        .eq('metadata->size', repoMetadata.size)
        .single();

      const configs = JSON.parse(data.content);
      const securityConfig = configs.security;

      // Format for OpenRouter
      const openRouterRequest = {
        model: securityConfig.openrouterModel,
        temperature: securityConfig.temperature,
        max_tokens: securityConfig.maxTokens,
        messages: [], // Would be populated with actual messages
        provider: {
          order: [securityConfig.provider], // Preferred provider
          allow_fallbacks: true
        }
      };

      expect(openRouterRequest.model).toBe('anthropic/claude-3-opus');
      expect(openRouterRequest.provider.order[0]).toBe('anthropic');
      expect(openRouterRequest.temperature).toBe(0.1);
      expect(openRouterRequest.max_tokens).toBe(8000);
    });
  });

  describe('Performance', () => {
    it('should complete repository metadata search within 100ms', async () => {
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const startTime = Date.now();
      
      const { data } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->content_type', 'agent_model_config')
        .eq('metadata->language', repoMetadata.language)
        .eq('metadata->framework', repoMetadata.framework)
        .eq('metadata->size', repoMetadata.size)
        .single();
      
      const searchTime = Date.now() - startTime;
      
      expect(data).toBeDefined();
      expect(searchTime).toBeLessThan(100);
    });
  });
});
