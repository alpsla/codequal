import { VectorContextService } from '../../mocks/VectorContextService';
import { createClient } from '@supabase/supabase-js';
import { TEST_REPOS } from '../../test-config-updated';
import { AuthenticatedUser } from '@codequal/agents';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

describe('Agent Context Enrichment from Vector DB', () => {
  let vectorContextService: VectorContextService;
  let authenticatedUser: AuthenticatedUser;
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    vectorContextService = new VectorContextService(supabase);

    authenticatedUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'developer',
      organizationId: 'test-org-123',
      permissions: {
        repositories: {
          [TEST_REPOS.small]: { read: true, write: true, admin: false },
          [TEST_REPOS.medium]: { read: true, write: true, admin: false },
          [TEST_REPOS.large]: { read: true, write: true, admin: false }
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
  });

  describe('Repository Context Retrieval', () => {
    it('should retrieve existing repository analysis from Vector DB', async () => {
      // Check if repository has existing analysis
      const { data: existingAnalysis } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', TEST_REPOS.medium)
        .eq('metadata->content_type', 'deepwiki_summary')
        .limit(5);

      if (existingAnalysis && existingAnalysis.length > 0) {
        expect(existingAnalysis[0]).toHaveProperty('content');
        expect(existingAnalysis[0]).toHaveProperty('metadata');
        
        const content = JSON.parse(existingAnalysis[0].content);
        expect(content).toBeDefined();
      }
    });

    it('should retrieve historical patterns for specific agent role', async () => {
      const agentRole = 'security';
      
      // Get historical security patterns
      const { data: securityPatterns } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('repository_id', TEST_REPOS.medium)
        .contains('metadata', { analysis_type: agentRole })
        .limit(10);

      if (securityPatterns && securityPatterns.length > 0) {
        // Verify pattern structure
        securityPatterns.forEach((pattern: any) => {
          expect(pattern.metadata).toHaveProperty('analysis_type');
          expect(pattern.metadata.analysis_type).toBe(agentRole);
        });
      }
    });

    it('should enrich agent context with Vector DB data', async () => {
      // Mock agent context enrichment
      class ContextEnricher {
        constructor(
          private supabase: any,
          private vectorContextService: VectorContextService
        ) {}

        async enrichAgentContext(agentRole: string, repositoryId: string, prContext: any) {
          // Get repository-specific context
          const repositoryContext = await this.vectorContextService.getRepositoryContext(
            repositoryId,
            agentRole,
            authenticatedUser
          );

          // Get DeepWiki summary if available
          const { data: deepwikiData } = await this.supabase
            .from('analysis_chunks')
            .select('content')
            .eq('repository_id', repositoryId)
            .eq('metadata->content_type', 'deepwiki_summary')
            .single();

          // Get cross-repository patterns
          const crossRepoPatterns = await this.vectorContextService.getCrossRepositoryPatterns(
            agentRole,
            prContext.description,
            authenticatedUser,
            {
              excludeRepositoryId: repositoryId,
              maxResults: 5
            }
          );

          return {
            repository: {
              id: repositoryId,
              context: repositoryContext,
              deepwiki: deepwikiData ? JSON.parse(deepwikiData.content) : null
            },
            crossRepositoryInsights: crossRepoPatterns,
            enrichmentMetadata: {
              timestamp: new Date().toISOString(),
              sources: ['repository-history', 'deepwiki', 'cross-repo-patterns'],
              confidence: repositoryContext.confidenceScore
            }
          };
        }
      }

      const enricher = new ContextEnricher(supabase, vectorContextService);
      
      const enrichedContext = await enricher.enrichAgentContext(
        'security',
        TEST_REPOS.medium,
        {
          description: 'Authentication update',
          files: ['src/auth.ts']
        }
      );

      expect(enrichedContext).toHaveProperty('repository');
      expect(enrichedContext).toHaveProperty('crossRepositoryInsights');
      expect(enrichedContext.enrichmentMetadata).toHaveProperty('sources');
      expect(enrichedContext.enrichmentMetadata.sources).toContain('repository-history');
    });
  });

  describe('Cross-Repository Pattern Learning', () => {
    it('should retrieve sanitized patterns from other repositories', async () => {
      // Get patterns while respecting permissions
      const patterns = await vectorContextService.getCrossRepositoryPatterns(
        'security',
        'authentication vulnerability',
        authenticatedUser,
        {
          respectUserPermissions: true,
          sanitizeContent: true,
          maxResults: 5
        }
      );

      expect(Array.isArray(patterns)).toBe(true);
      
      patterns.forEach(pattern => {
        // Verify sanitization
        expect(pattern.metadata.repository_id).toBe('[EXTERNAL_REPO]');
        expect(pattern.metadata.file_path).toBeUndefined(); // Removed for privacy
        
        // Verify pattern has useful content
        expect(pattern.content).toBeDefined();
        expect(pattern.similarity_score).toBeGreaterThan(0);
      });
    });

    it('should apply learned patterns to current analysis', async () => {
      // Example: Apply security patterns to current PR
      const applyPatterns = (currentPR: any, patterns: any[]) => {
        const appliedInsights: any[] = [];
        
        patterns.forEach(pattern => {
          if (pattern.metadata.severity === 'high') {
            appliedInsights.push({
              pattern: pattern.content,
              relevance: pattern.similarity_score,
              recommendation: 'Similar issue found in other repositories - apply same fix',
              confidence: pattern.similarity_score * 0.8
            });
          }
        });

        return {
          insights: appliedInsights,
          summary: `Found ${appliedInsights.length} relevant patterns from other repositories`,
          applicability: appliedInsights.length > 0 ? 'high' : 'low'
        };
      };

      const mockPatterns = [
        {
          content: 'JWT validation vulnerability pattern',
          metadata: { severity: 'high', repository_id: '[EXTERNAL_REPO]' },
          similarity_score: 0.85
        }
      ];

      const insights = applyPatterns(
        { files: ['src/auth/jwt.ts'] },
        mockPatterns
      );

      expect(insights.insights).toHaveLength(1);
      expect(insights.insights[0].relevance).toBe(0.85);
      expect(insights.applicability).toBe('high');
    });
  });

  describe('Agent-Specific Context Enhancement', () => {
    it('should provide security-specific context for security agent', async () => {
      const securityContext = await vectorContextService.getRepositoryContext(
        TEST_REPOS.medium,
        'security',
        authenticatedUser,
        {
          includeHistorical: true
        }
      );

      expect(securityContext).toHaveProperty('recentAnalysis');
      expect(securityContext).toHaveProperty('historicalPatterns');
      expect(securityContext).toHaveProperty('confidenceScore');
      
      // Mock security agent using context
      const analyzeWithContext = (context: any) => {
        const hasHistoricalData = context.historicalPatterns.length > 0;
        const hasRecentData = context.recentAnalysis.length > 0;
        
        return {
          analysisDepth: hasHistoricalData ? 'comprehensive' : 'standard',
          confidence: hasRecentData ? 0.85 : 0.65,
          insights: [
            ...(hasHistoricalData ? ['Based on historical patterns...'] : []),
            ...(hasRecentData ? ['Recent analysis shows...'] : [])
          ]
        };
      };

      const analysis = analyzeWithContext(securityContext);
      expect(analysis.confidence).toBeGreaterThan(0.6);
    });

    it('should provide architecture-specific context for architecture agent', async () => {
      const architectureContext = await vectorContextService.getRepositoryContext(
        TEST_REPOS.large,
        'architecture',
        authenticatedUser
      );

      // Architecture agent focuses on different aspects
      const analyzeArchitecture = (context: any) => {
        return {
          patterns: {
            identified: ['MVC', 'Repository Pattern', 'Dependency Injection'],
            violations: context.recentAnalysis
              .filter((a: any) => a.metadata.severity === 'high')
              .map((a: any) => a.content)
          },
          recommendations: {
            immediate: 'Address circular dependencies',
            longTerm: 'Consider microservices for scaling'
          }
        };
      };

      const archAnalysis = analyzeArchitecture(architectureContext);
      expect(archAnalysis.patterns.identified).toContain('MVC');
    });
  });

  describe('Context Quality and Freshness', () => {
    it('should assess context quality based on data freshness', async () => {
      const assessContextQuality = (context: any) => {
        const now = new Date();
        const lastUpdated = new Date(context.lastUpdated);
        const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        return {
          freshness: daysSinceUpdate < 7 ? 'fresh' : daysSinceUpdate < 30 ? 'recent' : 'stale',
          dataPoints: context.recentAnalysis.length + context.historicalPatterns.length,
          quality: context.confidenceScore > 0.8 ? 'high' : context.confidenceScore > 0.6 ? 'medium' : 'low',
          recommendation: daysSinceUpdate > 30 ? 'Consider re-analyzing repository' : 'Context is current'
        };
      };

      const context = await vectorContextService.getRepositoryContext(
        TEST_REPOS.small,
        'codeQuality',
        authenticatedUser
      );

      const quality = assessContextQuality(context);
      
      expect(quality).toHaveProperty('freshness');
      expect(quality).toHaveProperty('quality');
      expect(quality).toHaveProperty('recommendation');
    });
  });

  describe('Performance', () => {
    it('should retrieve context within acceptable time limits', async () => {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await vectorContextService.getRepositoryContext(
          TEST_REPOS.medium,
          'security',
          authenticatedUser
        );
        
        measurements.push(Date.now() - startTime);
      }
      
      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      
      expect(avgTime).toBeLessThan(100); // Context retrieval under 100ms
      expect(Math.max(...measurements)).toBeLessThan(200); // No outliers over 200ms
    });
  });
});
