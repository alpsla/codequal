import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { VectorContextService } from '../../mocks/VectorContextService';
import { MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData } from '@codequal/agents/multi-agent/types';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator Model Retrieval from RESEARCHER Agent Data', () => {
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

    // Mock data that RESEARCHER agent would have stored (runs every 3 months)
    await mockResearcherStoredConfigurations();
  });

  async function mockResearcherStoredConfigurations() {
    // This is what RESEARCHER agent stores after analyzing all available models
    // It creates optimal configurations for every combination of metadata
    const researcherGeneratedConfigs = {
      repository_id: '00000000-0000-0000-0000-000000000001', // Special RESEARCHER repository
      source_type: 'researcher_agent',
      content: JSON.stringify({
        last_research_date: '2025-03-09', // Last quarterly run
        next_research_date: '2025-06-09', // Next scheduled run
        total_combinations: 180, // All possible metadata combinations
        configurations: {
          // TypeScript + React + Large + Security
          'typescript-react-large-security': {
            provider: 'anthropic',
            model: 'claude-3-opus-20240229',
            openrouterPath: 'anthropic/claude-3-opus',
            reasoning: 'Best for complex security analysis in large TypeScript codebases',
            cost_per_million: 15.00,
            context_window: 200000,
            performance_score: 9.8
          },
          // TypeScript + React + Large + Performance
          'typescript-react-large-performance': {
            provider: 'deepseek',
            model: 'deepseek-coder-33b-instruct',
            openrouterPath: 'deepseek/deepseek-coder-33b-instruct',
            reasoning: 'Excellent at performance optimization patterns',
            cost_per_million: 0.80,
            context_window: 16000,
            performance_score: 9.2
          },
          // Python + Django + Medium + Security
          'python-django-medium-security': {
            provider: 'openai',
            model: 'gpt-4-turbo-2024-04-09',
            openrouterPath: 'openai/gpt-4-turbo',
            reasoning: 'Good balance for Python security analysis',
            cost_per_million: 10.00,
            context_window: 128000,
            performance_score: 8.7
          },
          // JavaScript + Express + Small + CodeQuality
          'javascript-express-small-codeQuality': {
            provider: 'openai',
            model: 'gpt-3.5-turbo-0125',
            openrouterPath: 'openai/gpt-3.5-turbo',
            reasoning: 'Cost-effective for small JavaScript projects',
            cost_per_million: 0.50,
            context_window: 16000,
            performance_score: 7.5
          },
          // ... 176 more combinations stored by RESEARCHER
        }
      }),
      metadata: {
        content_type: 'researcher_model_configurations',
        version: '2.0',
        created_by: 'researcher_agent',
        research_model_used: 'gpt-4.1-nano', // RESEARCHER's own model
        last_updated: new Date('2025-03-09').toISOString()
      },
      storage_type: 'permanent'
    };

    await supabase
      .from('analysis_chunks')
      .insert(researcherGeneratedConfigs);
  }

  describe('Orchestrator Retrieving Models from RESEARCHER Data', () => {
    it('should retrieve the correct model based on repository metadata', async () => {
      // Orchestrator analyzes the repository
      const repositoryMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large',
        agentRole: 'security'
      };

      // Orchestrator's simple lookup function
      const retrieveModelForTask = async (metadata: any) => {
        // Build lookup key
        const lookupKey = `${metadata.language}-${metadata.framework}-${metadata.size}-${metadata.agentRole}`;
        
        // Query RESEARCHER's stored configurations
        const { data } = await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001') // RESEARCHER's special repo
          .eq('metadata->content_type', 'researcher_model_configurations')
          .single();

        if (data) {
          const researcherConfigs = JSON.parse(data.content);
          return researcherConfigs.configurations[lookupKey];
        }
        return null;
      };

      const modelConfig = await retrieveModelForTask(repositoryMetadata);
      
      expect(modelConfig).toBeDefined();
      expect(modelConfig.model).toBe('claude-3-opus-20240229');
      expect(modelConfig.openrouterPath).toBe('anthropic/claude-3-opus');
      expect(modelConfig.reasoning).toContain('complex security analysis');
      expect(modelConfig.performance_score).toBe(9.8);
    });

    it('should retrieve different models for different agent roles', async () => {
      // Same repository, different agent roles
      const securityMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large',
        agentRole: 'security'
      };

      const performanceMetadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large',
        agentRole: 'performance'
      };

      // Query function used by orchestrator
      const getModelConfig = async (metadata: any) => {
        const key = `${metadata.language}-${metadata.framework}-${metadata.size}-${metadata.agentRole}`;
        
        const { data } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .single();

        const configs = JSON.parse(data.content).configurations;
        return configs[key];
      };

      const securityModel = await getModelConfig(securityMetadata);
      const performanceModel = await getModelConfig(performanceMetadata);
      
      // Different models for different roles
      expect(securityModel.model).toBe('claude-3-opus-20240229');
      expect(performanceModel.model).toBe('deepseek-coder-33b-instruct');
      
      // Different costs
      expect(securityModel.cost_per_million).toBe(15.00);
      expect(performanceModel.cost_per_million).toBe(0.80);
    });

    it('should handle the complete orchestrator initialization flow', async () => {
      class OrchestratorWithModelRetrieval extends EnhancedMultiAgentExecutor {
        async initializeWithDynamicModels(repositoryData: RepositoryData) {
          // 1. Extract repository metadata
          const metadata = this.extractMetadata(repositoryData);
          
          // 2. Determine required agents based on PR
          const requiredAgents = this.determineRequiredAgents(repositoryData);
          
          // 3. Retrieve model for each agent from RESEARCHER data
          const agentConfigs = [];
          for (const agentRole of requiredAgents) {
            const modelConfig = await this.retrieveModelFromResearcherData({
              ...metadata,
              agentRole
            });
            
            if (modelConfig) {
              agentConfigs.push({
                role: agentRole,
                provider: modelConfig.provider,
                model: modelConfig.model,
                openrouterPath: modelConfig.openrouterPath,
                temperature: 0.2, // Can be role-specific
                maxTokens: Math.min(modelConfig.context_window / 2, 8000)
              });
            }
          }
          
          return agentConfigs;
        }

        private extractMetadata(repoData: RepositoryData) {
          const tsFiles = repoData.files.filter(f => 
            f.path.endsWith('.ts') || f.path.endsWith('.tsx')
          );
          const pyFiles = repoData.files.filter(f => f.path.endsWith('.py'));
          const jsFiles = repoData.files.filter(f => f.path.endsWith('.js'));
          
          let language = 'javascript';
          if (tsFiles.length > jsFiles.length) language = 'typescript';
          if (pyFiles.length > tsFiles.length) language = 'python';
          
          const framework = this.detectFramework(repoData.files);
          const size = repoData.files.length > 100 ? 'large' : 
                      repoData.files.length > 20 ? 'medium' : 'small';
          
          return { language, framework, size };
        }

        private detectFramework(files: any[]) {
          if (files.some(f => f.path.includes('.tsx'))) return 'react';
          if (files.some(f => f.path.includes('django'))) return 'django';
          if (files.some(f => f.path.includes('express'))) return 'express';
          return 'unknown';
        }

        private determineRequiredAgents(repoData: RepositoryData) {
          const agents = [];
          
          if (repoData.prTitle.toLowerCase().includes('security') ||
              repoData.files.some(f => f.path.includes('auth'))) {
            agents.push('security');
          }
          
          if (repoData.files.some(f => f.path.includes('performance') ||
                                     f.path.includes('optimize'))) {
            agents.push('performance');
          }
          
          // Always include code quality for any PR
          agents.push('codeQuality');
          
          return agents;
        }

        private async retrieveModelFromResearcherData(metadata: any) {
          const lookupKey = `${metadata.language}-${metadata.framework}-${metadata.size}-${metadata.agentRole}`;
          
          const { data } = await supabase
            .from('analysis_chunks')
            .select('content')
            .eq('repository_id', '00000000-0000-0000-0000-000000000001')
            .single();

          if (data) {
            const configs = JSON.parse(data.content).configurations;
            return configs[lookupKey];
          }
          return null;
        }
      }

      // Test the complete flow
      const testPR: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 123,
        baseBranch: 'main',
        headBranch: 'feature/security-fix',
        files: [
          { path: 'src/auth/login.tsx', content: '', status: 'modified', additions: 100, deletions: 50 },
          { path: 'src/auth/jwt.ts', content: '', status: 'added', additions: 200, deletions: 0 }
        ],
        commits: ['sec001'],
        prTitle: 'Security: Fix authentication',
        prDescription: 'Addresses auth vulnerabilities',
        prAuthor: 'dev'
      };

      const orchestrator = new OrchestratorWithModelRetrieval(
        { strategy: AnalysisStrategy.PARALLEL, agents: [] },
        testPR,
        vectorContextService,
        authenticatedUser
      );

      const dynamicAgents = await orchestrator.initializeWithDynamicModels(testPR);
      
      expect(dynamicAgents).toHaveLength(2); // security + codeQuality
      
      const securityAgent = dynamicAgents.find(a => a.role === 'security');
      expect(securityAgent?.model).toBe('claude-3-opus-20240229');
      expect(securityAgent?.openrouterPath).toBe('anthropic/claude-3-opus');
      
      const codeQualityAgent = dynamicAgents.find(a => a.role === 'codeQuality');
      expect(codeQualityAgent).toBeDefined();
    });

    it('should check if RESEARCHER data needs refresh', async () => {
      // Orchestrator should check if RESEARCHER data is current
      const checkResearcherDataFreshness = async () => {
        const { data } = await supabase
          .from('analysis_chunks')
          .select('content, metadata')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .single();

        if (data) {
          const content = JSON.parse(data.content);
          const nextResearchDate = new Date(content.next_research_date);
          const now = new Date();
          
          return {
            isCurrent: now < nextResearchDate,
            lastResearch: content.last_research_date,
            nextScheduled: content.next_research_date,
            daysUntilRefresh: Math.ceil((nextResearchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          };
        }
        return null;
      };

      const freshness = await checkResearcherDataFreshness();
      
      expect(freshness).toBeDefined();
      expect(freshness?.lastResearch).toBe('2025-03-09');
      expect(freshness?.nextScheduled).toBe('2025-06-09');
      expect(freshness?.isCurrent).toBe(true); // Since today is June 9, 2025
    });
  });

  describe('Performance', () => {
    it('should retrieve model configuration in under 50ms', async () => {
      const metadata = {
        language: 'typescript',
        framework: 'react',
        size: 'large',
        agentRole: 'security'
      };

      const startTime = Date.now();
      
      const lookupKey = `${metadata.language}-${metadata.framework}-${metadata.size}-${metadata.agentRole}`;
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .single();

      const configs = JSON.parse(data.content).configurations;
      const modelConfig = configs[lookupKey];
      
      const retrievalTime = Date.now() - startTime;
      
      expect(modelConfig).toBeDefined();
      expect(retrievalTime).toBeLessThan(50);
    });
  });
});
