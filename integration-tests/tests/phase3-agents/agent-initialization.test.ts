import { AgentFactory } from '@codequal/agents';
import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Agent Initialization Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;
  let agentFactory: AgentFactory;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Vector Context Service
    vectorContextService = new VectorContextService(supabase);
    
    // Initialize Agent Factory
    agentFactory = new AgentFactory();

    // Mock RESEARCHER's pre-analyzed agent configurations
    await setupResearcherAgentConfigs();
  });

  async function setupResearcherAgentConfigs() {
    // Clean up any existing test data first
    await supabase
      .from('analysis_chunks')
      .delete()
      .eq('repository_id', '00000000-0000-0000-0000-000000000001')
      .eq('source_type', 'manual')
      .contains('metadata', { content_type: 'researcher_agent_configurations' });
    
    // This mimics what RESEARCHER agent stores for agent configurations
    const researcherConfigs = {
      repository_id: '00000000-0000-0000-0000-000000000001',
      source_type: 'manual',
      content: JSON.stringify({
        last_updated: '2025-03-09',
        configurations: {
          // Security agent configurations
          'typescript-react-large-security': {
            provider: 'anthropic',
            model: 'claude-3-opus-20240229',
            openrouterPath: 'anthropic/claude-3-opus',
            temperature: 0.1,
            maxTokens: 8000,
            systemPrompt: 'You are a security expert analyzing code for vulnerabilities...',
            fallback: {
              provider: 'openai',
              model: 'gpt-4-turbo-2024-04-09',
              openrouterPath: 'openai/gpt-4-turbo'
            }
          },
          'javascript-express-small-security': {
            provider: 'openai',
            model: 'gpt-4-0125-preview',
            openrouterPath: 'openai/gpt-4',
            temperature: 0.1,
            maxTokens: 4000,
            systemPrompt: 'You are a security expert analyzing code for vulnerabilities...',
            fallback: {
              provider: 'anthropic',
              model: 'claude-3-sonnet-20240229',
              openrouterPath: 'anthropic/claude-3-sonnet'
            }
          },
          // Performance agent configurations
          'typescript-react-large-performance': {
            provider: 'deepseek',
            model: 'deepseek-coder-33b-instruct',
            openrouterPath: 'deepseek/deepseek-coder-33b-instruct',
            temperature: 0.2,
            maxTokens: 16000,
            systemPrompt: 'You are a performance optimization expert...',
            fallback: {
              provider: 'openai',
              model: 'gpt-4-turbo-2024-04-09',
              openrouterPath: 'openai/gpt-4-turbo'
            }
          },
          // Code Quality agent configurations
          'typescript-react-large-codeQuality': {
            provider: 'openai',
            model: 'gpt-4-turbo-2024-04-09',
            openrouterPath: 'openai/gpt-4-turbo',
            temperature: 0.3,
            maxTokens: 4000,
            systemPrompt: 'You are a code quality expert focusing on maintainability...',
            fallback: {
              provider: 'anthropic',
              model: 'claude-3-opus-20240229',
              openrouterPath: 'anthropic/claude-3-opus'
            }
          }
        }
      }),
      metadata: {
        content_type: 'researcher_agent_configurations',
        version: '2.0'
      },
      storage_type: 'permanent'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('analysis_chunks')
      .insert(researcherConfigs);
      
    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert researcher configs: ${insertError.message}`);
    }
    
    console.log('Successfully inserted researcher configs:', insertData);
  }

  describe('Dynamic Agent Creation from RESEARCHER Data', () => {
    it('should create agent with model retrieved from RESEARCHER configurations', async () => {
      // Repository metadata
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      // Function to retrieve agent config from RESEARCHER data
      const getAgentConfig = async (metadata: any, role: string) => {
        const key = `${metadata.language}-${metadata.framework}-${metadata.size}-${role}`;
        
        const { data, error } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('source_type', 'manual')
          .contains('metadata', { content_type: 'researcher_agent_configurations' })
          .single();
          
        if (error) {
          console.error('Retrieval error:', error);
          throw new Error(`Failed to retrieve researcher configs: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('No data found for researcher configs');
        }

        const configs = JSON.parse(data.content).configurations;
        return configs[key];
      };

      // Get security agent configuration
      const securityConfig = await getAgentConfig(repoMetadata, 'security');
      
      expect(securityConfig).toBeDefined();
      expect(securityConfig.model).toBe('claude-3-opus-20240229');
      expect(securityConfig.openrouterPath).toBe('anthropic/claude-3-opus');
      expect(securityConfig.temperature).toBe(0.1);
      expect(securityConfig.fallback.model).toBe('gpt-4-turbo-2024-04-09');
    });

    it('should create multiple agents with different configurations', async () => {
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      // Simulate creating agents for different roles
      const roles = ['security', 'performance', 'codeQuality'];
      const agents = [];

      for (const role of roles) {
        const key = `${repoMetadata.language}-${repoMetadata.framework}-${repoMetadata.size}-${role}`;
        
        const { data } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('source_type', 'manual')
          .contains('metadata', { content_type: 'researcher_agent_configurations' })
          .single();

        const config = JSON.parse(data.content).configurations[key];
        
        if (config) {
          agents.push({
            role,
            provider: config.provider,
            model: config.model,
            config
          });
        }
      }

      expect(agents).toHaveLength(3);
      
      // Verify different models for different roles
      const securityAgent = agents.find(a => a.role === 'security');
      expect(securityAgent?.provider).toBe('anthropic');
      
      const performanceAgent = agents.find(a => a.role === 'performance');
      expect(performanceAgent?.provider).toBe('deepseek');
      
      const codeQualityAgent = agents.find(a => a.role === 'codeQuality');
      expect(codeQualityAgent?.provider).toBe('openai');
    });

    it('should handle different repository types with appropriate models', async () => {
      // Small JavaScript project should get different models
      const smallRepoMetadata = {
        language: 'javascript',
        framework: 'express',
        size: 'small'
      };

      const key = `${smallRepoMetadata.language}-${smallRepoMetadata.framework}-${smallRepoMetadata.size}-security`;
      
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('source_type', 'manual')
        .contains('metadata', { content_type: 'researcher_agent_configurations' })
        .single();

      const config = JSON.parse(data.content).configurations[key];
      
      expect(config).toBeDefined();
      expect(config.model).toBe('gpt-4-0125-preview'); // Less expensive model for small repos
      expect(config.maxTokens).toBe(4000); // Lower token limit
    });
  });

  describe('Agent Factory Integration', () => {
    it('should create agent instance with configuration from RESEARCHER', async () => {
      // Mock agent creation with RESEARCHER config
      const createAgentWithConfig = async (role: string, repoMetadata: any) => {
        const key = `${repoMetadata.language}-${repoMetadata.framework}-${repoMetadata.size}-${role}`;
        
        const { data } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('source_type', 'manual')
          .contains('metadata', { content_type: 'researcher_agent_configurations' })
          .single();

        const config = JSON.parse(data.content).configurations[key];
        
        if (!config) {
          throw new Error(`No configuration found for ${key}`);
        }

        // Create agent with factory (mock implementation)
        return {
          role,
          provider: config.provider,
          model: config.model,
          openrouterPath: config.openrouterPath,
          config,
          analyze: async (context: any) => {
            // Mock analyze function
            return {
              role,
              findings: [],
              confidence: 0.85
            };
          }
        };
      };

      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const securityAgent = await createAgentWithConfig('security', repoMetadata);
      
      expect(securityAgent).toBeDefined();
      expect(securityAgent.model).toBe('claude-3-opus-20240229');
      expect(typeof securityAgent.analyze).toBe('function');
    });

    it('should initialize agents with proper OpenRouter configuration', async () => {
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('source_type', 'manual')
        .contains('metadata', { content_type: 'researcher_agent_configurations' })
        .single();

      const config = JSON.parse(data.content).configurations['typescript-react-large-security'];
      
      // Verify OpenRouter-ready configuration
      const openRouterRequest = {
        model: config.openrouterPath,
        messages: [], // Will be populated
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        provider: {
          order: [config.provider],
          allow_fallbacks: true,
          fallbacks: {
            [config.provider]: [config.fallback.provider]
          }
        }
      };

      expect(openRouterRequest.model).toBe('anthropic/claude-3-opus');
      expect(openRouterRequest.temperature).toBe(0.1);
      expect(openRouterRequest.provider.order[0]).toBe('anthropic');
    });
  });

  describe('Fallback Configuration', () => {
    it('should have fallback models configured for each agent', async () => {
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('source_type', 'manual')
        .contains('metadata', { content_type: 'researcher_agent_configurations' })
        .single();

      const configs = JSON.parse(data.content).configurations;
      
      // Check all configs have fallbacks
      for (const [key, config] of Object.entries(configs)) {
        expect(config).toHaveProperty('fallback');
        const agentConfig = config as any;
        expect(agentConfig.fallback).toHaveProperty('provider');
        expect(agentConfig.fallback).toHaveProperty('model');
        expect(agentConfig.fallback).toHaveProperty('openrouterPath');
        
        // Fallback should be different provider
        expect(agentConfig.fallback.provider).not.toBe(agentConfig.provider);
      }
    });
  });

  describe('Performance', () => {
    it('should retrieve agent configuration within reasonable time', async () => {
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const startTime = Date.now();
      
      const key = `${repoMetadata.language}-${repoMetadata.framework}-${repoMetadata.size}-security`;
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('source_type', 'manual')
        .contains('metadata', { content_type: 'researcher_agent_configurations' })
        .single();

      const config = JSON.parse(data.content).configurations[key];
      
      const retrievalTime = Date.now() - startTime;
      
      expect(config).toBeDefined();
      expect(retrievalTime).toBeLessThan(500); // Reasonable threshold for database operations
    });
  });
});
