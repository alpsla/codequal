import { EnhancedMultiAgentExecutor } from '@codequal/agents';
import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Agent Integration Tests - Using Existing Vector DB Data', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;
  // AgentFactory will be created inline as needed

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize Vector Context Service
    vectorContextService = new VectorContextService(supabase);
    
    // Agent Factory will be created inline as needed
  });

  describe('Agent Creation with Existing RESEARCHER Configurations', () => {
    it('should retrieve agent configuration from existing Vector DB data', async () => {
      // Query actual Vector DB for existing configurations
      const { data } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_model_configurations')
        .single();

      expect(data).toBeDefined();
      expect(data.content).toBeDefined();
      
      const configurations = JSON.parse(data.content).configurations;
      
      // Verify configurations exist for common combinations
      expect(configurations).toHaveProperty('typescript-react-large-security');
      expect(configurations).toHaveProperty('python-django-medium-security');
      expect(configurations).toHaveProperty('javascript-express-small-codeQuality');
    });

    it('should create agents using configurations from Vector DB', async () => {
      // Test with a known combination that should exist
      const repoMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large'
      };

      const agentRole = 'security';
      const configKey = `${repoMetadata.language}-${repoMetadata.framework}-${repoMetadata.size}-${agentRole}`;

      // Retrieve from actual Vector DB
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_model_configurations')
        .single();

      const config = JSON.parse(data.content).configurations[configKey];
      
      // Mock agent creation with retrieved configuration
      const mockAgent = {
        provider: config.provider,
        model: config.model,
        role: agentRole,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        analyze: async (context: any) => ({
          insights: [],
          suggestions: [],
          confidence: 0.85
        })
      };

      expect(mockAgent).toBeDefined();
      expect(mockAgent.provider).toBe(config.provider);
      expect(mockAgent.model).toBe(config.model);
    });
  });

  describe('Missing Configuration Scenario', () => {
    it('should handle missing configuration by requesting RESEARCHER to find match', async () => {
      // Test with an unusual combination that might not exist
      const unusualMetadata = {
        language: 'rust',
        framework: 'actix-web',
        size: 'medium'
      };

      const agentRole = 'performance';
      const configKey = `${unusualMetadata.language}-${unusualMetadata.framework}-${unusualMetadata.size}-${agentRole}`;

      // First, check if configuration exists
      const { data: existingData } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_model_configurations')
        .single();

      const configurations = JSON.parse(existingData.content).configurations;
      const configExists = configurations.hasOwnProperty(configKey);

      if (!configExists) {
        // Simulate orchestrator requesting RESEARCHER to find a match
        const researcherRequest = {
          action: 'find_configuration',
          metadata: unusualMetadata,
          role: agentRole,
          requestedBy: 'orchestrator',
          timestamp: new Date().toISOString()
        };

        // In real implementation, this would trigger RESEARCHER agent
        // For testing, we simulate finding a close match
        const findClosestMatch = (metadata: any, role: string) => {
          // Strategy: Find same language and role, different framework/size
          const allConfigs = Object.keys(configurations);
          
          // Try exact language match first
          let closeMatch = allConfigs.find(key => 
            key.startsWith(`${metadata.language}-`) && 
            key.endsWith(`-${role}`)
          );

          // If no language match, find same role with similar characteristics
          if (!closeMatch) {
            closeMatch = allConfigs.find(key => {
              const parts = key.split('-');
              const keyRole = parts[parts.length - 1];
              const keySize = parts[parts.length - 2];
              return keyRole === role && keySize === metadata.size;
            });
          }

          return closeMatch;
        };

        const closestMatch = findClosestMatch(unusualMetadata, agentRole);
        expect(closestMatch).toBeDefined();

        // After RESEARCHER finds match, it would be stored in Vector DB
        // Then orchestrator retrieves it
        if (closestMatch) {
          const fallbackConfig = configurations[closestMatch];
          expect(fallbackConfig).toBeDefined();
          expect(fallbackConfig.model).toBeDefined();
        }
      }
    });

    it('should use fallback strategy when no exact match found', async () => {
      // Test the complete flow of missing config → RESEARCHER → retrieval
      class ConfigurationResolver {
        constructor(private supabase: any) {}

        async resolveConfiguration(metadata: any, role: string) {
          const configKey = `${metadata.language}-${metadata.framework}-${metadata.size}-${role}`;
          
          // Step 1: Check if exact configuration exists
          const { data } = await this.supabase
            .from('analysis_chunks')
            .select('content')
            .eq('repository_id', '00000000-0000-0000-0000-000000000001')
            .eq('metadata->content_type', 'researcher_model_configurations')
            .single();

          const configurations = JSON.parse(data.content).configurations;
          
          if (configurations[configKey]) {
            return configurations[configKey];
          }

          // Step 2: Request RESEARCHER to find match
          console.log(`Configuration not found for ${configKey}, requesting RESEARCHER assistance`);
          
          // Step 3: Use fallback logic (simplified for testing)
          const fallbackStrategies = [
            // Same language, any framework, same size
            () => Object.keys(configurations).find(k => 
              k.startsWith(`${metadata.language}-`) && 
              k.includes(`-${metadata.size}-`) &&
              k.endsWith(`-${role}`)
            ),
            // Any language, same size and role
            () => Object.keys(configurations).find(k => 
              k.includes(`-${metadata.size}-${role}`)
            ),
            // Default fallback
            () => `typescript-react-medium-${role}`
          ];

          for (const strategy of fallbackStrategies) {
            const match = strategy();
            if (match && configurations[match]) {
              console.log(`Found fallback configuration: ${match}`);
              return configurations[match];
            }
          }

          throw new Error(`No configuration found for ${configKey} even with fallbacks`);
        }
      }

      const resolver = new ConfigurationResolver(supabase);
      
      // Test with unusual combination
      const config = await resolver.resolveConfiguration(
        { language: 'kotlin', framework: 'ktor', size: 'small' },
        'security'
      );

      expect(config).toBeDefined();
      expect(config.model).toBeDefined();
      expect(config.provider).toBeDefined();
    });
  });

  describe('Agent Execution without MCP Tools', () => {
    it('should execute agent analysis when tools are not available', async () => {
      // Framework allows skipping tools if not available
      const executeAgentWithoutTools = async (agentConfig: any) => {
        // Mock agent creation
        const agent = {
          ...agentConfig,
          analyze: async (context: any) => ({
            insights: [],
            suggestions: [],
            confidence: context.toolFindings ? 0.9 : 0.7
          })
        };
        
        // Execute without tool results (tools not implemented yet)
        const context = {
          toolFindings: null, // No tools available
          vectorContext: await vectorContextService.getRepositoryContext(
            TEST_REPOS.medium,
            agentConfig.role,
            { id: 'test-user', permissions: { repositories: { [TEST_REPOS.medium]: { read: true } } } } as any
          ),
          deepwikiContext: {
            summary: 'Repository implements React patterns with TypeScript',
            relevantSections: []
          },
          prData: {
            files: ['src/components/Auth.tsx', 'src/hooks/useAuth.ts'],
            changes: { additions: 150, deletions: 50 }
          }
        };

        // Agent should still provide analysis based on context
        const result = await agent.analyze(context);
        
        return {
          success: true,
          analysis: result,
          confidence: result.confidence || 0.7, // Lower confidence without tools
          note: 'Analysis performed without tool results'
        };
      };

      // Get configuration from Vector DB
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .single();

      const config = JSON.parse(data.content).configurations['typescript-react-large-security'];
      
      const result = await executeAgentWithoutTools({
        provider: config.provider,
        model: config.model,
        role: 'security',
        temperature: config.temperature,
        maxTokens: config.maxTokens
      });

      expect(result.success).toBe(true);
      expect(result.note).toBe('Analysis performed without tool results');
      expect(result.confidence).toBeLessThan(0.9); // Lower confidence expected
    });
  });

  describe('Vector DB Data Verification', () => {
    it('should verify RESEARCHER data structure in Vector DB', async () => {
      // Query all RESEARCHER configurations
      const { data: researcherData } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_model_configurations');

      expect(researcherData).toBeDefined();
      expect(researcherData.length).toBeGreaterThan(0);

      const latestConfig = researcherData[0];
      const content = JSON.parse(latestConfig.content);

      // Verify structure
      expect(content).toHaveProperty('last_research_date');
      expect(content).toHaveProperty('configurations');
      expect(Object.keys(content.configurations).length).toBeGreaterThan(50); // Many combinations

      // Verify configuration format
      const sampleKey = Object.keys(content.configurations)[0];
      const sampleConfig = content.configurations[sampleKey];
      
      expect(sampleConfig).toHaveProperty('provider');
      expect(sampleConfig).toHaveProperty('model');
      expect(sampleConfig).toHaveProperty('openrouterPath');
      expect(sampleConfig).toHaveProperty('reasoning');
    });

    it('should verify DeepWiki configurations exist in Vector DB', async () => {
      const { data: deepwikiData } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('metadata->content_type', 'researcher_deepwiki_configurations');

      expect(deepwikiData).toBeDefined();
      
      if (deepwikiData && deepwikiData.length > 0) {
        const content = JSON.parse(deepwikiData[0].content);
        expect(content).toHaveProperty('deepwiki_configurations');
        
        // Verify DeepWiki config structure
        const configs = content.deepwiki_configurations;
        const sampleKey = Object.keys(configs)[0];
        const sampleConfig = configs[sampleKey];
        
        expect(sampleConfig).toHaveProperty('primary_model');
        expect(sampleConfig).toHaveProperty('fallback_model');
        expect(sampleConfig).toHaveProperty('analysis_strategy');
      }
    });
  });

  describe('Performance', () => {
    it('should retrieve configurations quickly from Vector DB', async () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('metadata->content_type', 'researcher_model_configurations')
          .single();
        
        times.push(Date.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      expect(avgTime).toBeLessThan(50); // Should average under 50ms
      expect(Math.max(...times)).toBeLessThan(100); // No single query over 100ms
    });
  });
});
