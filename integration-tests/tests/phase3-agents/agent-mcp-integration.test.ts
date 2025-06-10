import { AgentToolEnhancer, ToolEnhancedAgent } from '@codequal/mcp-hybrid';
import { agentToolService } from '@codequal/mcp-hybrid';
import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Agent MCP Integration Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);

    // Setup RESEARCHER agent configurations for tests
    await setupResearcherAgentConfigs();
  });

  afterAll(async () => {
    // Cleanup any MCP processes that might have been started
    try {
      // Try to import MCPHybridIntegration and shut it down
      const { MCPHybridIntegration } = await import('@codequal/mcp-hybrid');
      await MCPHybridIntegration.shutdown();
    } catch (error) {
      // Ignore errors during shutdown
    }
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
        configurations: {
          'typescript-react-large-security': {
            provider: 'anthropic',
            model: 'claude-3-opus-20240229',
            openrouterPath: 'anthropic/claude-3-opus',
            temperature: 0.1,
            maxTokens: 8000,
            systemPrompt: 'You are a security expert analyzing code for vulnerabilities...'
          }
        }
      }),
      metadata: {
        content_type: 'researcher_agent_configurations',
        version: '2.0'
      },
      storage_type: 'permanent'
    };

    const { error } = await supabase
      .from('analysis_chunks')
      .insert(researcherConfigs);
      
    if (error) {
      console.error('Insert error:', error);
      throw new Error(`Failed to insert researcher configs: ${error.message}`);
    }
  }

  describe('Agent Tool Enhancement', () => {
    it('should enhance agent with tool capabilities using AgentToolEnhancer', async () => {
      // Mock base agent
      const mockAgent = {
        analyze: async (data: any) => {
          return {
            insights: [],
            suggestions: [],
            metadata: {
              role: 'security',
              confidence: 0.5 // Low confidence without tools
            }
          };
        }
      };

      // Enhance agent with tools
      const enhancedAgent = await AgentToolEnhancer.enhanceAgent(
        mockAgent,
        'security',
        {
          enableTools: true,
          executionStrategy: 'parallel-by-role',
          maxParallelTools: 3,
          toolTimeout: 30000
        }
      );

      expect(enhancedAgent).toBeDefined();
      expect(enhancedAgent.setTools).toBeDefined();
      expect(enhancedAgent.getToolResults).toBeDefined();
      expect(enhancedAgent.setToolsEnabled).toBeDefined();
    });

    it('should create analysis context from PR data', () => {
      const prData = {
        pull_request: {
          number: 123,
          title: 'Add authentication',
          body: 'Implements JWT authentication',
          user: { login: 'developer' },
          base: { ref: 'main' },
          head: { ref: 'feature/auth' }
        },
        files: [
          {
            filename: 'src/auth/jwt.ts',
            content: 'export const validateToken = () => {}',
            status: 'added',
            language: 'typescript'
          },
          {
            filename: 'src/auth/login.tsx',
            content: 'import React from "react"',
            status: 'modified'
          }
        ],
        repository: {
          name: 'test-repo',
          owner: { login: 'codequal' }
        }
      };

      const context = AgentToolEnhancer.createAnalysisContext(
        prData,
        'security',
        'test-user-123'
      );

      expect(context.agentRole).toBe('security');
      expect(context.pr.prNumber).toBe(123);
      expect(context.pr.files).toHaveLength(2);
      expect(context.repository.languages).toContain('typescript');
      expect(context.repository.frameworks).toContain('react');
    });
  });

  describe('Agent Tool Service', () => {
    it('should format tool results for agent prompt', () => {
      const mockToolResults = {
        findings: [
          {
            type: 'issue' as const,
            severity: 'critical' as const,
            category: 'security',
            message: 'SQL injection vulnerability',
            file: 'src/db/queries.ts',
            line: 45,
            ruleId: 'sql-injection'
          },
          {
            type: 'issue' as const,
            severity: 'high' as const,
            category: 'security',
            message: 'Hardcoded credentials',
            file: 'src/config.ts',
            line: 12,
            ruleId: 'hardcoded-creds'
          },
          {
            type: 'issue' as const,
            severity: 'medium' as const,
            category: 'code-quality',
            message: 'Complex function',
            file: 'src/utils.ts',
            line: 78
          }
        ],
        metrics: {
          totalIssues: 3,
          fixableIssues: 2,
          securityScore: 6.5
        },
        toolsExecuted: ['semgrep', 'eslint'],
        toolsFailed: [],
        executionTime: 2500
      };

      const formatted = agentToolService.formatToolResultsForPrompt(
        mockToolResults,
        'security'
      );

      expect(formatted).toContain('=== Tool Analysis Results for security ===');
      expect(formatted).toContain('CRITICAL (1):');
      expect(formatted).toContain('SQL injection vulnerability');
      expect(formatted).toContain('HIGH (1):');
      expect(formatted).toContain('Metrics:');
      expect(formatted).toContain('Tool Execution:');
    });

    it('should create tool summary for agent consumption', () => {
      const mockToolResults = {
        findings: [
          { type: 'issue' as const, severity: 'critical' as const, category: 'security', autoFixable: false },
          { type: 'issue' as const, severity: 'high' as const, category: 'security', autoFixable: true },
          { type: 'issue' as const, severity: 'medium' as const, category: 'code-quality', autoFixable: true }
        ],
        metrics: { securityScore: 6.5 },
        toolsExecuted: ['semgrep'],
        toolsFailed: [],
        executionTime: 1000
      };

      const summary = agentToolService.createToolSummary(mockToolResults as any);

      expect(summary.totalFindings).toBe(3);
      expect(summary.findingsBySeverity.critical).toBe(1);
      expect(summary.findingsBySeverity.high).toBe(1);
      expect(summary.findingsByCategory.security).toBe(2);
      expect(summary.autoFixableCount).toBe(2);
      expect(summary.criticalIssues).toHaveLength(2);
    });
  });

  describe('Integration with Existing Architecture', () => {
    it('should integrate with RESEARCHER model configurations', async () => {
      // Get RESEARCHER configuration
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('source_type', 'manual')
        .contains('metadata', { content_type: 'researcher_agent_configurations' })
        .single();

      expect(data).toBeDefined();
      
      const configurations = JSON.parse(data.content).configurations;
      const securityConfig = configurations['typescript-react-large-security'];
      
      expect(securityConfig).toBeDefined();
      expect(securityConfig.provider).toBe('anthropic');
      expect(securityConfig.model).toBe('claude-3-opus-20240229');
    });

    it('should work with agent factory pattern', async () => {
      // Mock agent factory integration
      const createEnhancedAgent = async (role: string, modelConfig: any) => {
        const baseAgent = {
          role,
          config: modelConfig,
          analyze: async (data: any) => ({ 
            insights: [],
            suggestions: [],
            metadata: {
              role, 
              modelUsed: modelConfig.model 
            }
          })
        };

        // Enhance with tools
        const enhanced = await AgentToolEnhancer.enhanceAgent(
          baseAgent,
          role,
          { enableTools: true }
        );

        return enhanced;
      };

      // Get config from RESEARCHER
      const { data } = await supabase
        .from('analysis_chunks')
        .select('content')
        .eq('repository_id', '00000000-0000-0000-0000-000000000001')
        .eq('source_type', 'manual')
        .contains('metadata', { content_type: 'researcher_agent_configurations' })
        .single();

      const config = JSON.parse(data.content).configurations['typescript-react-large-security'];
      const agent = await createEnhancedAgent('security', config);

      expect(agent).toBeDefined();
      expect(agent.setTools).toBeDefined();
      
      // Test analysis
      const result = await agent.analyze({ 
        prData: { files: [] },
        userId: 'test-user'
      });
      
      expect(result.metadata?.modelUsed).toBe('claude-3-opus-20240229');
    });
  });

  describe('Tool Execution Flow', () => {
    it('should handle tool execution with fallback', async () => {
      const mockAgent = {
        analyze: async (data: any) => {
          // Agent receives enhanced data with tool results
          if (data.toolResults) {
            return {
              insights: data.toolResults.findings || [],
              suggestions: [],
              metadata: {
                role: 'security',
                confidence: 0.9, // High confidence with tools
                toolsUsed: data.toolResults.toolsExecuted
              }
            };
          }
          return {
            insights: [],
            suggestions: [],
            metadata: {
              role: 'security',
              confidence: 0.5 // Low confidence without tools
            }
          };
        }
      };

      const enhancedAgent = await AgentToolEnhancer.enhanceAgent(
        mockAgent,
        'security',
        { enableTools: false } // Simulate tools not available
      );

      const result = await enhancedAgent.analyze({
        prData: { files: [] }
      });

      expect(result.metadata?.confidence).toBe(0.5); // Low confidence when tools disabled
      expect(result.metadata?.toolsUsed).toBeUndefined();
    });
  });

  describe('Context Enrichment', () => {
    it('should enrich agent context with repository patterns', async () => {
      const repoId = 'test-repo-123';
      const role = 'security';
      
      // Get repository context
      const context = await vectorContextService.getRepositoryContext(
        repoId,
        role,
        { id: 'test-user', email: 'test@example.com' } as any,
        { includeHistorical: true }
      );

      expect(context.repositoryId).toBe(repoId);
      expect(context.recentAnalysis).toHaveLength(1);
      expect(context.historicalPatterns).toHaveLength(1);
      expect(context.confidenceScore).toBe(0.85);
    });

    it('should get cross-repository patterns', async () => {
      const patterns = await vectorContextService.getCrossRepositoryPatterns(
        'security',
        'authentication vulnerability',
        { id: 'test-user' } as any,
        { 
          maxResults: 5,
          sanitizeContent: true,
          anonymizeMetadata: true
        }
      );

      expect(patterns).toHaveLength(1);
      expect(patterns[0].metadata.repository_id).toBe('[EXTERNAL_REPO]');
      expect(patterns[0].content).toContain('Pattern:');
      expect(patterns[0].similarity_score).toBe(0.9);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete agent enhancement within performance bounds', async () => {
      const startTime = Date.now();
      
      const mockAgent = {
        analyze: async () => ({ 
          insights: [],
          suggestions: [],
          metadata: { role: 'performance' }
        })
      };

      const enhanced = await AgentToolEnhancer.enhanceAgent(
        mockAgent,
        'performance',
        { enableTools: false }
      );

      const enhancementTime = Date.now() - startTime;
      
      expect(enhancementTime).toBeLessThan(50); // Enhancement should be fast
      expect(enhanced).toBeDefined();
    });

    it('should format tool results quickly', () => {
      const largeResults = {
        findings: Array(100).fill({
          severity: 'medium',
          category: 'test',
          message: 'Test finding'
        }),
        metrics: { total: 100 },
        toolsExecuted: ['tool1', 'tool2'],
        toolsFailed: [],
        executionTime: 5000
      };

      const startTime = Date.now();
      const formatted = agentToolService.formatToolResultsForPrompt(
        largeResults as any,
        'security'
      );
      const formatTime = Date.now() - startTime;

      expect(formatTime).toBeLessThan(50); // Formatting should be fast
      expect(formatted).toContain('100'); // Should show total count
    });
  });
});
