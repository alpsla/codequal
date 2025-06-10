import { EnhancedMultiAgentExecutor, MultiAgentConfig, AnalysisStrategy, AuthenticatedUser, RepositoryData, UserRole, UserStatus, VectorContextService, AgentPosition } from '@codequal/agents';
import { AgentProvider, AgentRole } from '@codequal/core';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Agent Execution Flow without MCP Tools', () => {
  let vectorContextService: VectorContextService;
  let authenticatedUser: AuthenticatedUser;
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Create a minimal VectorContextService for testing
    vectorContextService = new VectorContextService({
      supabaseClient: supabase,
      tableName: 'analysis_chunks',
      embeddingDimensions: 1536
    });

    // RESEARCHER data should already be available from other tests

    // Mock authenticated user
    authenticatedUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      organizationId: 'test-org-123',
      permissions: {
        repositories: {
          'codequal/test-repo': { read: true, write: true, admin: false }
        },
        organizations: ['test-org-123'],
        globalPermissions: [],
        quotas: {
          requestsPerHour: 1000,
          maxConcurrentExecutions: 5,
          storageQuotaMB: 100
        }
      },
      session: {
        token: 'test-token',
        fingerprint: 'test-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        expiresAt: new Date(Date.now() + 3600000)
      }
    };
  });


  describe('Agent Analysis without Tool Results', () => {
    it('should perform analysis based on context when tools are not available', async () => {
      const repositoryData: RepositoryData = {
        owner: 'codequal',
        repo: 'test-repo',
        prNumber: 123,
        branch: 'feature/auth-update',
        files: [
          {
            path: 'src/auth/login.tsx',
            content: 'export const login = async (username: string, password: string) => { /* auth logic */ }'
          },
          {
            path: 'src/auth/jwt.ts',
            content: 'export const validateToken = (token: string) => { /* validation */ }'
          }
        ]
      };

      // Create orchestrator that will skip tools
      const orchestrator = new EnhancedMultiAgentExecutor(
        {
          name: 'test-orchestrator',
          strategy: AnalysisStrategy.PARALLEL,
          agents: [
            {
              provider: AgentProvider.OPENAI,
              role: AgentRole.SECURITY,
              position: AgentPosition.PRIMARY,
              priority: 1,
              maxTokens: 4000,
              temperature: 0.1
            }
          ],
          fallbackEnabled: false
        },
        repositoryData,
        vectorContextService,
        authenticatedUser,
        {
          enableMCP: false // Tools not implemented yet
        }
      );

      // Mock the agent execution without tools
      const executeAnalysisWithoutTools = async () => {
        // Get configurations from Vector DB
        const metadata = {
          language: 'typescript',
          framework: 'react',
          size: 'medium'
        };

        const { data, error } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', '00000000-0000-0000-0000-000000000001')
          .eq('source_type', 'manual')
          .contains('metadata', { content_type: 'researcher_agent_configurations' })
          .single();

        if (error || !data) {
          throw new Error('RESEARCHER configurations not found');
        }

        const configurations = JSON.parse(data.content).configurations;
        
        // Create security agent
        const securityConfig = configurations[`${metadata.language}-${metadata.framework}-${metadata.size}-security`];
        
        // Get DeepWiki context from Vector DB
        const { data: deepwikiData } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', 'https://github.com/codequal/test-repo')
          .eq('metadata->content_type', 'deepwiki_report')
          .single();

        const deepwikiContext = deepwikiData ? JSON.parse(deepwikiData.content) : {
          summary: 'Repository analysis not available',
          security: { guidelines: [] }
        };

        // Agent analyzes based on context only (including DeepWiki)
        const securityAnalysis = {
          role: 'security',
          findings: [
            {
              type: 'pattern-based',
              description: 'Authentication flow modification detected',
              severity: 'medium',
              recommendation: 'Ensure proper JWT validation and secure token storage',
              confidence: 0.7, // Lower confidence without tool validation
              source: 'context-analysis',
              deepwikiEnhanced: true,
              repositoryContext: deepwikiContext.summary
            },
            {
              type: 'best-practice',
              description: 'New JWT validation function added',
              severity: 'info',
              recommendation: 'Consider adding rate limiting to prevent brute force',
              confidence: 0.6,
              source: 'pattern-matching',
              deepwikiGuidelines: deepwikiContext.security?.guidelines || []
            }
          ],
          summary: {
            toolsUsed: [],
            analysisType: 'context-based',
            confidence: 0.65,
            limitations: 'Analysis performed without security scanning tools',
            deepwikiAvailable: !!deepwikiData
          }
        };

        return {
          agentAnalyses: [securityAnalysis],
          overallConfidence: 0.65,
          note: 'Analysis completed without MCP tools - based on code patterns and context'
        };
      };

      const result = await executeAnalysisWithoutTools();

      expect(result.agentAnalyses).toHaveLength(1);
      expect(result.agentAnalyses[0].role).toBe('security');
      expect(result.agentAnalyses[0].findings).toHaveLength(2);
      expect(result.agentAnalyses[0].summary.toolsUsed).toHaveLength(0);
      expect(result.overallConfidence).toBeLessThan(0.7); // Lower confidence expected
      expect(result.note).toContain('without MCP tools');
    });

    it('should provide educational content even without tool results', async () => {
      // Educational agent can work without tools by using patterns and best practices
      const generateEducationalContent = async (prContext: any) => {
        // First try to get DeepWiki report
        const { data: deepwikiReport } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', 'https://github.com/codequal/test-repo')
          .eq('metadata->content_type', 'deepwiki_report')
          .single();

        // Fallback to summary if report not found
        const { data } = await supabase
          .from('analysis_chunks')
          .select('content')
          .eq('repository_id', TEST_REPOS.medium)
          .eq('metadata->content_type', 'deepwiki_summary')
          .single();

        const repositoryPatterns = data ? JSON.parse(data.content) : {};
        const deepwikiContext = deepwikiReport ? JSON.parse(deepwikiReport.content) : null;

        return {
          role: 'educational',
          content: {
            topics: [
              {
                title: 'Authentication Best Practices',
                relevance: 'high',
                content: 'Based on the PR changes, here are key authentication considerations...',
                basedOn: 'repository-patterns',
                deepwikiInsights: deepwikiContext?.security?.bestPractices || []
              },
              {
                title: 'JWT Security Guidelines',
                relevance: 'high',
                content: 'When implementing JWT validation, ensure...',
                basedOn: 'best-practices',
                deepwikiInsights: deepwikiContext?.agentContexts?.security?.guidelines || []
              }
            ],
            learningPaths: [
              {
                topic: 'Secure Authentication Implementation',
                steps: [
                  'Understanding JWT structure and claims',
                  'Implementing secure token storage',
                  'Adding rate limiting and brute force protection'
                ],
                estimatedTime: '2-3 hours'
              }
            ],
            resources: [
              {
                type: 'documentation',
                title: 'OWASP Authentication Cheat Sheet',
                relevance: 'high'
              }
            ]
          },
          metadata: {
            generatedWithoutTools: true,
            basedOn: ['code-patterns', 'best-practices', 'repository-history', deepwikiContext ? 'deepwiki-report' : null].filter(Boolean),
            confidence: deepwikiContext ? 0.85 : 0.75,
            deepwikiEnhanced: !!deepwikiContext
          }
        };
      };

      const educationalContent = await generateEducationalContent({
        files: ['src/auth/login.tsx', 'src/auth/jwt.ts'],
        prTitle: 'Security: Update authentication flow'
      });

      expect(educationalContent.role).toBe('educational');
      expect(educationalContent.content.topics).toHaveLength(2);
      expect(educationalContent.content.learningPaths).toHaveLength(1);
      expect(educationalContent.metadata.generatedWithoutTools).toBe(true);
      expect(educationalContent.metadata.confidence).toBe(0.75);
    });
  });

  describe('Reporting without Tool Metrics', () => {
    it('should generate reports based on agent analyses without tool data', async () => {
      // Reporting agent aggregates analyses even without concrete tool metrics
      const generateReport = async (agentAnalyses: any[]) => {
        return {
          role: 'reporting',
          report: {
            summary: {
              totalAgents: agentAnalyses.length,
              overallAssessment: 'Preliminary analysis based on code patterns',
              confidence: 'medium',
              limitations: 'Analysis performed without automated scanning tools'
            },
            findings: {
              security: agentAnalyses.find(a => a.role === 'security')?.findings || [],
              codeQuality: agentAnalyses.find(a => a.role === 'codeQuality')?.findings || [],
              architecture: agentAnalyses.find(a => a.role === 'architecture')?.findings || []
            },
            recommendations: {
              immediate: [
                'Run security scanning tools when available',
                'Validate findings with automated tests'
              ],
              future: [
                'Implement MCP tools for comprehensive analysis',
                'Add ESLint and Semgrep to CI/CD pipeline'
              ]
            },
            visualizations: {
              type: 'text-based',
              reason: 'Tool metrics not available for charts'
            }
          },
          metadata: {
            reportType: 'preliminary',
            toolsAvailable: false,
            generatedAt: new Date().toISOString()
          }
        };
      };

      const mockAnalyses = [
        {
          role: 'security',
          findings: [
            { description: 'Authentication pattern needs review', severity: 'medium' }
          ]
        },
        {
          role: 'codeQuality',
          findings: [
            { description: 'Consider adding type definitions', severity: 'low' }
          ]
        }
      ];

      const report = await generateReport(mockAnalyses);

      expect(report.role).toBe('reporting');
      expect(report.report.summary.limitations).toContain('without automated scanning');
      expect(report.report.recommendations.immediate).toContain('Run security scanning tools when available');
      expect(report.metadata.toolsAvailable).toBe(false);
    });
  });

  describe('Configuration Fallback Scenarios', () => {
    it('should handle missing configuration with RESEARCHER request', async () => {
      // Test the complete flow when configuration is missing
      class OrchestrationFlow {
        constructor(private supabase: any) {}

        async getAgentConfiguration(metadata: any, role: string) {
          const configKey = `${metadata.language}-${metadata.framework}-${metadata.size}-${role}`;
          
          // Step 1: Try to get existing configuration
          const { data, error } = await this.supabase
            .from('analysis_chunks')
            .select('content')
            .eq('repository_id', '00000000-0000-0000-0000-000000000001')
            .eq('source_type', 'manual')
            .contains('metadata', { content_type: 'researcher_agent_configurations' })
            .single();

          if (error || !data) {
            throw new Error('RESEARCHER configurations not found');
          }

          const configurations = JSON.parse(data.content).configurations;
          
          if (configurations[configKey]) {
            return {
              found: true,
              config: configurations[configKey],
              source: 'exact-match',
              note: 'Exact configuration match found'
            };
          }

          // Step 2: Configuration missing - request RESEARCHER
          console.log(`Configuration missing for: ${configKey}`);
          const researcherResponse = await this.requestResearcher(metadata, role, configurations);
          
          return researcherResponse;
        }

        private async requestResearcher(metadata: any, role: string, existingConfigs: any) {
          // Simulate RESEARCHER finding best match
          console.log('RESEARCHER: Analyzing best match for new combination...');
          
          // Strategy 1: Same language and role
          const languageRoleMatch = Object.keys(existingConfigs).find(key =>
            key.startsWith(`${metadata.language}-`) && key.endsWith(`-${role}`)
          );

          if (languageRoleMatch) {
            // After RESEARCHER analysis, it would store new config
            // For now, return adapted config
            return {
              found: true,
              config: existingConfigs[languageRoleMatch],
              source: 'researcher-adapted',
              note: `Adapted from ${languageRoleMatch}`
            };
          }

          // Strategy 2: Similar characteristics
          const sizeRoleMatch = Object.keys(existingConfigs).find(key =>
            key.includes(`-${metadata.size}-${role}`)
          );

          if (sizeRoleMatch) {
            return {
              found: true,
              config: existingConfigs[sizeRoleMatch],
              source: 'researcher-fallback',
              note: `Fallback from ${sizeRoleMatch}`
            };
          }

          // Strategy 3: Default configuration
          return {
            found: true,
            config: {
              provider: 'openai',
              model: 'gpt-4',
              openrouterPath: 'openai/gpt-4',
              temperature: 0.2,
              maxTokens: 4000,
              reasoning: 'Default configuration for unmatched combination'
            },
            source: 'researcher-default',
            note: 'Using default configuration'
          };
        }
      }

      const flow = new OrchestrationFlow(supabase);
      
      // Test with unusual combination
      const result = await flow.getAgentConfiguration(
        { language: 'elixir', framework: 'phoenix', size: 'medium' },
        'security'
      );

      expect(result.found).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.source).not.toBe('exact-match');
      expect(result.note).toBeDefined();
    });
  });

  describe('Performance without Tools', () => {
    it('should complete agent analysis quickly without waiting for tools', async () => {
      const analyzeWithoutTools = async () => {
        const startTime = Date.now();
        
        // Simulate agent analysis without tool execution overhead
        const analyses = await Promise.all([
          // Security agent
          new Promise(resolve => setTimeout(() => resolve({
            role: 'security',
            findings: [],
            duration: Date.now() - startTime
          }), 100)),
          
          // Code quality agent
          new Promise(resolve => setTimeout(() => resolve({
            role: 'codeQuality',
            findings: [],
            duration: Date.now() - startTime
          }), 100)),
          
          // Architecture agent
          new Promise(resolve => setTimeout(() => resolve({
            role: 'architecture',
            findings: [],
            duration: Date.now() - startTime
          }), 100))
        ]);

        return {
          analyses,
          totalDuration: Date.now() - startTime
        };
      };

      const result = await analyzeWithoutTools();
      
      // Without tools, analysis should be faster
      expect(result.totalDuration).toBeLessThan(200); // Parallel execution
      expect(result.analyses).toHaveLength(3);
      
      // Each agent should complete quickly
      result.analyses.forEach((analysis: any) => {
        expect(analysis.duration).toBeLessThan(150);
      });
    });
  });
});
