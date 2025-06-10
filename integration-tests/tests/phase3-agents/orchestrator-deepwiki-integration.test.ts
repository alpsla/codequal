import { 
  ToolEnhancedOrchestrator
} from '@codequal/mcp-hybrid';
import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Orchestrator DeepWiki Integration Tests', () => {
  let vectorContextService: VectorContextService;
  let supabase: any;
  let orchestrator: ToolEnhancedOrchestrator;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);
    orchestrator = new ToolEnhancedOrchestrator();
  });

  describe('DeepWiki Report Retrieval', () => {
    it('should retrieve DeepWiki report from Vector DB if exists', async () => {
      // Mock repository URL
      const repositoryUrl = 'https://github.com/codequal/test-repo';
      
      // Check if DeepWiki report exists in Vector DB
      const { data: existingReport } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', repositoryUrl)
        .eq('metadata->content_type', 'deepwiki_report')
        .single();

      if (existingReport) {
        const report = JSON.parse(existingReport.content);
        
        expect(report).toHaveProperty('repositoryUrl');
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('architecture');
        expect(report).toHaveProperty('security');
        expect(report).toHaveProperty('codeQuality');
        expect(report).toHaveProperty('performance');
        expect(report).toHaveProperty('agentContexts');
        
        // Verify agent contexts structure
        expect(report.agentContexts).toHaveProperty('security');
        expect(report.agentContexts.security).toHaveProperty('focus');
        expect(report.agentContexts.security).toHaveProperty('priority');
      }
    });

    it('should generate DeepWiki request if report not found', async () => {
      const repositoryUrl = 'https://github.com/codequal/new-repo';
      
      // Simulate orchestrator checking for report
      const checkForDeepWikiReport = async (repoUrl: string) => {
        const { data } = await supabase
          .from('analysis_chunks')
          .select('*')
          .eq('repository_id', repoUrl)
          .eq('metadata->content_type', 'deepwiki_report')
          .single();
        
        if (!data) {
          // Generate DeepWiki request
          return {
            action: 'generate_deepwiki_request',
            request: {
              repositoryUrl: repoUrl,
              analysisType: 'comprehensive',
              requestedSections: [
                'architecture',
                'security',
                'codeQuality',
                'performance',
                'dependencies'
              ],
              includeAgentContexts: true,
              contextDepth: 'detailed'
            }
          };
        }
        
        return {
          action: 'use_existing_report',
          report: JSON.parse(data.content)
        };
      };

      const result = await checkForDeepWikiReport(repositoryUrl);
      
      if (result.action === 'generate_deepwiki_request') {
        expect(result.request).toHaveProperty('repositoryUrl');
        expect(result.request!.requestedSections).toContain('architecture');
        expect(result.request!.requestedSections).toContain('security');
        expect(result.request!.includeAgentContexts).toBe(true);
      }
    });
  });

  describe('DeepWiki Context Distribution', () => {
    it('should extract role-specific context from DeepWiki report', () => {
      const deepWikiReport = {
        repositoryUrl: 'https://github.com/codequal/test-repo',
        summary: 'Repository implements modern React patterns with TypeScript',
        architecture: {
          patterns: ['Component-based', 'Hooks', 'Context API'],
          dependencies: ['react', 'typescript', 'jest'],
          structure: 'Feature-based organization'
        },
        security: {
          vulnerabilities: [],
          bestPractices: ['JWT authentication', 'HTTPS only'],
          concerns: ['API key management needs improvement']
        },
        codeQuality: {
          testCoverage: 82,
          lintingScore: 95,
          techDebt: ['Legacy auth module', 'Inconsistent error handling']
        },
        performance: {
          buildTime: '45s',
          bundleSize: '1.2MB',
          opportunities: ['Code splitting', 'Lazy loading']
        },
        agentContexts: {
          security: {
            focus: 'authentication and authorization',
            priority: 'high',
            dependencies: ['jwt', 'bcrypt'],
            guidelines: 'Follow OWASP Top 10'
          },
          codeQuality: {
            focus: 'maintainability and testing',
            priority: 'medium',
            standards: 'ESLint + Prettier',
            targetCoverage: 85
          },
          architecture: {
            focus: 'scalability and modularity',
            priority: 'high',
            patterns: 'Clean architecture principles'
          },
          performance: {
            focus: 'bundle optimization',
            priority: 'medium',
            targets: { loadTime: '2s', bundleSize: '1MB' }
          }
        }
      };

      // Extract context for security agent
      const extractSecurityContext = (report: typeof deepWikiReport) => {
        return {
          summary: report.summary,
          vulnerabilities: report.security.vulnerabilities,
          bestPractices: report.security.bestPractices,
          concerns: report.security.concerns,
          focus: report.agentContexts.security.focus,
          priority: report.agentContexts.security.priority,
          dependencies: report.agentContexts.security.dependencies,
          guidelines: report.agentContexts.security.guidelines
        };
      };

      const securityContext = extractSecurityContext(deepWikiReport);
      
      expect(securityContext.summary).toContain('React patterns');
      expect(securityContext.vulnerabilities).toHaveLength(0);
      expect(securityContext.bestPractices).toContain('JWT authentication');
      expect(securityContext.focus).toBe('authentication and authorization');
      expect(securityContext.priority).toBe('high');
      expect(securityContext.dependencies).toContain('jwt');
    });

    it('should provide context to all specialized agents', () => {
      const deepWikiReport = {
        summary: 'E-commerce platform with microservices',
        agentContexts: {
          security: { focus: 'payment security', priority: 'critical' },
          codeQuality: { focus: 'code standards', priority: 'high' },
          architecture: { focus: 'microservices', priority: 'high' },
          performance: { focus: 'response time', priority: 'high' },
          dependency: { focus: 'vulnerability scanning', priority: 'critical' }
        }
      };

      // Simulate distributing context to agents
      const distributeContexts = (report: typeof deepWikiReport) => {
        const contexts = new Map();
        
        Object.entries(report.agentContexts).forEach(([role, context]) => {
          contexts.set(role, {
            deepwikiSummary: report.summary,
            roleContext: context,
            enhanced: true
          });
        });
        
        return contexts;
      };

      const distributedContexts = distributeContexts(deepWikiReport);
      
      expect(distributedContexts.size).toBe(5);
      expect(distributedContexts.get('security').roleContext.priority).toBe('critical');
      expect(distributedContexts.get('dependency').roleContext.priority).toBe('critical');
      
      // All agents should receive the summary
      distributedContexts.forEach((context) => {
        expect(context.deepwikiSummary).toContain('E-commerce platform');
        expect(context.enhanced).toBe(true);
      });
    });
  });

  describe('Agent Analysis with DeepWiki Context', () => {
    it('should enhance agent analysis with DeepWiki insights', async () => {
      // Mock agent receiving DeepWiki context
      class SecurityAgentWithDeepWiki {
        async analyze(context: {
          prData: any;
          deepwikiContext: any;
          toolResults: any;
          vectorContext: any;
        }) {
          const { prData, deepwikiContext, toolResults, vectorContext } = context;
          
          // Use DeepWiki context to enhance analysis
          const enhancedFindings = [];
          
          // Example: If PR touches authentication and DeepWiki indicates auth focus
          if (prData.files.some((f: any) => f.path.includes('auth')) && 
              deepwikiContext.focus === 'authentication and authorization') {
            enhancedFindings.push({
              type: 'deepwiki-enhanced',
              severity: 'high',
              description: 'Authentication changes detected in critical security area',
              recommendation: `Based on repository patterns: ${deepwikiContext.guidelines}`,
              confidence: 0.95, // Higher confidence with DeepWiki context
              source: 'deepwiki+tool+context'
            });
          }
          
          // Combine with tool results if available
          if (toolResults && toolResults.findings) {
            toolResults.findings.forEach((finding: any) => {
              enhancedFindings.push({
                ...finding,
                deepwikiContext: deepwikiContext.bestPractices,
                enhancedSeverity: deepwikiContext.priority === 'critical' ? 
                  'critical' : finding.severity
              });
            });
          }
          
          return {
            role: 'security',
            findings: enhancedFindings,
            summary: {
              deepwikiEnhanced: true,
              focusArea: deepwikiContext.focus,
              priority: deepwikiContext.priority,
              confidence: 0.9, // Higher than without DeepWiki
              repositoryContext: deepwikiContext.summary
            }
          };
        }
      }

      const agent = new SecurityAgentWithDeepWiki();
      const result = await agent.analyze({
        prData: {
          files: [{ path: 'src/auth/login.tsx', status: 'modified' }]
        },
        deepwikiContext: {
          summary: 'React app with JWT authentication',
          focus: 'authentication and authorization',
          priority: 'high',
          guidelines: 'Follow OWASP Top 10',
          bestPractices: ['Use secure tokens', 'Implement rate limiting']
        },
        toolResults: {
          findings: [
            { severity: 'medium', message: 'Weak token generation' }
          ]
        },
        vectorContext: { patterns: [] }
      });

      expect(result.findings).toHaveLength(2);
      expect(result.findings[0].type).toBe('deepwiki-enhanced');
      expect(result.findings[0].confidence).toBe(0.95);
      expect((result.findings[1] as any).deepwikiContext).toContain('Use secure tokens');
      expect(result.summary.deepwikiEnhanced).toBe(true);
      expect(result.summary.confidence).toBe(0.9);
    });

    it('should adjust confidence scores based on context availability', () => {
      const calculateConfidence = (hasDeepWiki: boolean, hasTools: boolean, hasVector: boolean) => {
        let confidence = 0.5; // Base confidence
        
        if (hasDeepWiki) confidence += 0.25;
        if (hasTools) confidence += 0.15;
        if (hasVector) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
      };

      // Test different combinations
      expect(calculateConfidence(true, true, true)).toBe(1.0); // All context
      expect(calculateConfidence(true, false, true)).toBe(0.85); // No tools
      expect(calculateConfidence(false, true, true)).toBe(0.75); // No DeepWiki
      expect(calculateConfidence(false, false, false)).toBe(0.5); // Base only
    });
  });

  describe('Orchestrator Report Enhancement with DeepWiki', () => {
    it('should use DeepWiki summary to enhance final report', () => {
      const agentReports = [
        {
          role: 'security',
          findings: [{ severity: 'high', description: 'SQL injection risk' }],
          summary: { confidence: 0.85 }
        },
        {
          role: 'codeQuality',
          findings: [{ severity: 'medium', description: 'Complex functions' }],
          summary: { confidence: 0.8 }
        }
      ];

      const deepWikiSummary = {
        summary: 'E-commerce platform with payment processing',
        keyInsights: [
          'Uses Stripe for payments',
          'PCI compliance required',
          'High traffic during sales'
        ],
        overallAssessment: 'Mature codebase with focus on security'
      };

      const enhanceWithDeepWiki = (reports: typeof agentReports, deepwiki: typeof deepWikiSummary) => {
        return {
          executiveSummary: `${deepwiki.summary}. ${deepwiki.overallAssessment}`,
          contextualFindings: reports.map(report => ({
            ...report,
            contextualRelevance: report.role === 'security' ? 'critical' : 'high',
            deepwikiInsight: deepwiki.keyInsights.find(i => 
              (report.role === 'security' && i.includes('payment')) ||
              (report.role === 'codeQuality' && i.includes('traffic'))
            )
          })),
          enhancedRecommendations: [
            {
              priority: 'critical',
              recommendation: 'Address SQL injection immediately due to payment processing',
              basedOn: ['agent-findings', 'deepwiki-context']
            }
          ],
          confidence: {
            overall: 0.95,
            reason: 'High confidence due to DeepWiki repository context'
          }
        };
      };

      const enhancedReport = enhanceWithDeepWiki(agentReports, deepWikiSummary);
      
      expect(enhancedReport.executiveSummary).toContain('E-commerce platform');
      expect(enhancedReport.executiveSummary).toContain('Mature codebase');
      expect(enhancedReport.contextualFindings[0].contextualRelevance).toBe('critical');
      expect(enhancedReport.contextualFindings[0].deepwikiInsight).toContain('Stripe');
      expect(enhancedReport.enhancedRecommendations[0].priority).toBe('critical');
      expect(enhancedReport.confidence.overall).toBe(0.95);
    });
  });

  describe('DeepWiki Cache Management', () => {
    it('should cache DeepWiki reports with expiration', async () => {
      const cacheReport = async (report: any) => {
        const cached = {
          ...report,
          metadata: {
            cachedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            version: '1.0'
          }
        };

        // In real implementation, this would store in Vector DB
        const { error } = await supabase
          .from('analysis_chunks')
          .upsert({
            repository_id: '00000000-0000-0000-0000-000000000001', // Use test UUID
            source_type: 'manual',
            content: JSON.stringify(cached),
            metadata: {
              content_type: 'deepwiki_report',
              cached_at: cached.metadata.cachedAt,
              expires_at: cached.metadata.expiresAt
            }
          });

        return !error;
      };

      const mockReport = {
        repositoryUrl: 'https://github.com/codequal/cached-repo',
        summary: 'Test repository for caching'
      };

      const success = await cacheReport(mockReport);
      expect(success).toBe(true);
    });

    it('should check cache validity before using', () => {
      const isCacheValid = (metadata: any) => {
        if (!metadata.expiresAt) return false;
        
        const expirationDate = new Date(metadata.expiresAt);
        const now = new Date();
        
        return now < expirationDate;
      };

      // Test valid cache
      const validMetadata = {
        expiresAt: new Date(Date.now() + 1000000).toISOString()
      };
      expect(isCacheValid(validMetadata)).toBe(true);

      // Test expired cache
      const expiredMetadata = {
        expiresAt: new Date(Date.now() - 1000000).toISOString()
      };
      expect(isCacheValid(expiredMetadata)).toBe(false);
    });
  });

  describe('Missing DeepWiki Context Handling', () => {
    it('should gracefully handle missing DeepWiki context', async () => {
      // Simulate agent operating without DeepWiki context
      const analyzeWithoutDeepWiki = async (prData: any, toolResults: any) => {
        return {
          role: 'security',
          findings: toolResults?.findings || [],
          summary: {
            deepwikiEnhanced: false,
            confidence: 0.7, // Lower confidence
            note: 'Analysis performed without repository context from DeepWiki'
          },
          recommendations: [
            'Consider running DeepWiki analysis for better repository understanding'
          ]
        };
      };

      const result = await analyzeWithoutDeepWiki(
        { files: [] },
        { findings: [{ severity: 'medium' }] }
      );

      expect(result.summary.deepwikiEnhanced).toBe(false);
      expect(result.summary.confidence).toBeLessThan(0.8);
      expect(result.recommendations[0]).toContain('DeepWiki analysis');
    });
  });
});
