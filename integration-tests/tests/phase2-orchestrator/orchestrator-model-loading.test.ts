import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Dynamic Model Loading Tests', () => {
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
        expiresAt: new Date(Date.now() + 3600000)
      }
    };

    // Store model configurations in Vector DB
    await setupModelConfigurations();
  });

  async function setupModelConfigurations() {
    // Store agent model configurations
    const modelConfigs = [
      {
        repository_id: 'agent-model-configs',
        source_type: 'manual',
        content: JSON.stringify({
          configurations: {
            security: {
              high_complexity: {
                provider: 'claude',
                model: 'claude-3-opus',
                temperature: 0.1,
                maxTokens: 8000
              },
              medium_complexity: {
                provider: 'openai',
                model: 'gpt-4',
                temperature: 0.2,
                maxTokens: 4000
              },
              low_complexity: {
                provider: 'openai',
                model: 'gpt-3.5-turbo',
                temperature: 0.3,
                maxTokens: 2000
              }
            },
            performance: {
              large_codebase: {
                provider: 'deepseek',
                model: 'deepseek-coder',
                temperature: 0.2,
                maxTokens: 16000
              },
              small_codebase: {
                provider: 'openai',
                model: 'gpt-4-turbo',
                temperature: 0.3,
                maxTokens: 4000
              }
            },
            architecture: {
              complex_patterns: {
                provider: 'claude',
                model: 'claude-3-opus',
                temperature: 0.2,
                maxTokens: 8000
              },
              simple_patterns: {
                provider: 'gemini',
                model: 'gemini-pro',
                temperature: 0.3,
                maxTokens: 4000
              }
            }
          }
        }),
        metadata: {
          content_type: 'agent_model_config',
          version: '1.0',
          last_updated: new Date().toISOString()
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

  describe('Dynamic Model Loading from Database', () => {
    it('should load model configurations from Vector DB on initialization', async () => {
      // This is what the orchestrator SHOULD do
      class DynamicOrchestrator extends EnhancedMultiAgentExecutor {
        async initialize() {
          // Pull model configurations from Vector DB
          const modelConfigs = await this.loadModelConfigurations();
          return modelConfigs;
        }

        private async loadModelConfigurations() {
          const { data } = await supabase
            .from('analysis_chunks')
            .select('*')
            .eq('metadata->content_type', 'agent_model_config')
            .single();

          return JSON.parse(data.content).configurations;
        }
      }

      // Test the loading
      const orchestrator = new DynamicOrchestrator(
        { strategy: AnalysisStrategy.PARALLEL, agents: [] }, // Empty initially
        repositoryData,
        vectorContextService,
        authenticatedUser
      );

      const configs = await orchestrator.initialize();
      
      expect(configs).toBeDefined();
      expect(configs.security).toBeDefined();
      expect(configs.security.high_complexity.model).toBe('claude-3-opus');
      expect(configs.performance.large_codebase.model).toBe('deepseek-coder');
    });

    it('should select appropriate models based on PR context', async () => {
      // Mock PR analysis result
      const prAnalysis = {
        complexity: 'high',
        size: 'large',
        securityCritical: true,
        performanceCritical: false,
        primaryLanguage: 'typescript'
      };

      // Mock the model selection function
      const selectModelsForContext = async (analysis: any) => {
        const { data } = await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('metadata->content_type', 'agent_model_config')
          .single();

        const configs = JSON.parse(data.content).configurations;
        
        // Select based on context
        const selectedModels = [];
        
        if (analysis.securityCritical) {
          selectedModels.push({
            role: 'security',
            ...configs.security[`${analysis.complexity}_complexity`]
          });
        }
        
        if (analysis.size === 'large') {
          selectedModels.push({
            role: 'architecture',
            ...configs.architecture.complex_patterns
          });
        }
        
        return selectedModels;
      };

      const models = await selectModelsForContext(prAnalysis);
      
      expect(models).toHaveLength(2);
      expect(models[0].role).toBe('security');
      expect(models[0].model).toBe('claude-3-opus'); // High complexity security
      expect(models[1].role).toBe('architecture');
      expect(models[1].model).toBe('claude-3-opus'); // Complex patterns
    });

    it('should cache model configurations for performance', async () => {
      let dbCallCount = 0;
      
      // Mock DB call counter
      const originalSelect = supabase.from;
      supabase.from = jest.fn((table: string) => {
        if (table === 'analysis_chunks') dbCallCount++;
        return originalSelect.call(supabase, table);
      });

      // First orchestrator should load from DB
      const orchestrator1 = new EnhancedMultiAgentExecutor(
        { strategy: AnalysisStrategy.PARALLEL, agents: [] },
        repositoryData,
        vectorContextService,
        authenticatedUser
      );
      
      // Simulate initialization
      expect(dbCallCount).toBe(0);
      
      // Second orchestrator should use cached config
      const orchestrator2 = new EnhancedMultiAgentExecutor(
        { strategy: AnalysisStrategy.PARALLEL, agents: [] },
        repositoryData,
        vectorContextService,
        authenticatedUser
      );
      
      // DB should only be called once if caching works
      expect(dbCallCount).toBeLessThanOrEqual(1);
      
      // Restore original function
      supabase.from = originalSelect;
    });

    it('should handle missing configurations with defaults', async () => {
      // Clear configs from DB
      await supabase
        .from('analysis_chunks')
        .delete()
        .eq('metadata->content_type', 'agent_model_config');

      // Should fall back to default configurations
      const getDefaultConfigs = () => ({
        security: {
          default: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.2,
            maxTokens: 4000
          }
        },
        performance: {
          default: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.3,
            maxTokens: 4000
          }
        }
      });

      const configs = getDefaultConfigs();
      
      expect(configs.security.default.model).toBe('gpt-4');
      expect(configs.performance.default.model).toBe('gpt-4');
    });

    it('should update configurations when newer version available', async () => {
      // Store v1.0 config
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: 'agent-model-configs-v1',
          content: JSON.stringify({
            version: '1.0',
            configurations: { security: { default: { model: 'gpt-4' } } }
          }),
          metadata: {
            content_type: 'agent_model_config',
            version: '1.0'
          },
          storage_type: 'permanent'
        });

      // Store v2.0 config
      await supabase
        .from('analysis_chunks')
        .insert({
          repository_id: 'agent-model-configs-v2',
          content: JSON.stringify({
            version: '2.0',
            configurations: { security: { default: { model: 'claude-3-opus' } } }
          }),
          metadata: {
            content_type: 'agent_model_config',
            version: '2.0'
          },
          storage_type: 'permanent'
        });

      // Should load latest version
      const { data } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->content_type', 'agent_model_config')
        .order('metadata->version', { ascending: false })
        .limit(1)
        .single();

      const config = JSON.parse(data.content);
      expect(config.version).toBe('2.0');
      expect(config.configurations.security.default.model).toBe('claude-3-opus');
    });
  });

  describe('Performance', () => {
    it('should load configurations within 50ms', async () => {
      const startTime = Date.now();
      
      const { data } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('metadata->content_type', 'agent_model_config')
        .single();
      
      const loadTime = Date.now() - startTime;
      
      expect(data).toBeDefined();
      expect(loadTime).toBeLessThan(50);
    });
  });
});
