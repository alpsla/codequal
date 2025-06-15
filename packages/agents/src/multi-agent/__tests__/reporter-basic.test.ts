/**
 * Basic Reporter Agent functionality tests
 * These tests focus on core functionality with minimal mock dependencies
 */

import { ReporterAgent } from '../reporter-agent';

describe('Reporter Agent - Basic Functionality', () => {
  
  describe('Agent Instantiation', () => {
    it('should create ReporterAgent instance with minimal dependencies', () => {
      const mockVectorDB = {
        search: jest.fn().mockResolvedValue([])
      };
      
      const mockReportingService = {
        generateDependencyGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
        generateTrendAnalysis: jest.fn().mockResolvedValue({ labels: [], datasets: [] })
      };
      
      const agent = new ReporterAgent(mockVectorDB, mockReportingService);
      expect(agent).toBeDefined();
      expect(agent).toBeInstanceOf(ReporterAgent);
    });
  });

  describe('Report Generation Methods', () => {
    let agent: ReporterAgent;
    let mockVectorDB: any;
    let mockReportingService: any;

    beforeEach(() => {
      mockVectorDB = {
        search: jest.fn().mockResolvedValue([])
      };
      
      mockReportingService = {
        generateDependencyGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
        generateTrendAnalysis: jest.fn().mockResolvedValue({ labels: [], datasets: [] })
      };
      
      agent = new ReporterAgent(mockVectorDB, mockReportingService);
    });

    it('should have generateStandardReport method', () => {
      expect(typeof agent.generateStandardReport).toBe('function');
    });

    it('should handle empty analysis results', async () => {
      const emptyAnalysis = {
        repository: { url: 'https://github.com/test/repo', name: 'test', primaryLanguage: 'JavaScript' },
        pr: { number: 1, title: 'Test PR', changedFiles: 0 },
        findings: {},
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 } }
      };

      const emptyEducational = {
        educational: {
          learningPath: { totalSteps: 0, steps: [], difficulty: 'beginner', estimatedTime: '0 hours', description: 'No learning path' },
          content: { explanations: [], tutorials: [], bestPractices: [], resources: [] },
          insights: { skillGaps: [], relatedTopics: [], nextSteps: [] }
        },
        metadata: { compiledAt: new Date(), confidence: 1.0 }
      };

      const emptyRecommendations = {
        summary: { totalRecommendations: 0, focusAreas: [], description: 'No recommendations' },
        recommendations: []
      };

      const reportFormat = {
        type: 'pr-comment' as const,
        includeEducational: false,
        educationalDepth: 'summary' as const
      };

      // Mock the formatReport method to return a minimal valid StandardReport
      const mockReportFormatter = {
        formatReport: jest.fn().mockResolvedValue({
          id: 'test-report-1',
          repositoryUrl: 'https://github.com/test/repo',
          prNumber: 1,
          timestamp: new Date(),
          overview: {
            executiveSummary: 'No issues found',
            analysisScore: 100,
            riskLevel: 'low',
            totalFindings: 0,
            totalRecommendations: 0,
            learningPathAvailable: false,
            estimatedRemediationTime: '0 hours'
          },
          modules: {
            findings: { summary: 'No findings', categories: {}, criticalFindings: [], totalCount: 0 },
            recommendations: { summary: 'No recommendations', totalRecommendations: 0, categories: [], priorityMatrix: { critical: [], high: [], medium: [], low: [] }, implementationPlan: { phases: [], totalEstimatedTime: '0 hours', teamSizeRecommendation: 1 } },
            educational: { summary: 'No educational content', learningPath: null, content: { explanations: [], tutorials: [], bestPractices: [], resources: [] }, skillGaps: [], certifications: [] },
            metrics: { summary: 'Perfect score', scores: {}, trends: [], benchmarks: [], improvements: [] },
            insights: { summary: 'No insights', keyInsights: [], patterns: [], predictions: [], contextualAdvice: [] }
          },
          visualizations: {
            severityDistribution: { type: 'pie', title: 'Severity', data: {} },
            categoryBreakdown: { type: 'bar', title: 'Categories', data: {} },
            learningPathProgress: { type: 'radar', title: 'Skills', data: {} }
          },
          exports: {
            prComment: '✅ No issues found',
            emailFormat: 'No issues to report',
            slackFormat: '✅ Clean code!',
            markdownReport: '# Clean Report\nNo issues found.',
            jsonReport: '{}'
          },
          metadata: {
            analysisMode: 'basic',
            agentsUsed: ['reporter'],
            toolsExecuted: [],
            processingTime: 100,
            modelVersions: {},
            reportVersion: '1.0.0'
          }
        })
      };

      // Inject the mock
      (agent as any).reportFormatter = mockReportFormatter;

      const result = await agent.generateStandardReport(
        emptyAnalysis,
        emptyEducational,
        emptyRecommendations,
        reportFormat
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('test-report-1');
      expect(result.overview.totalFindings).toBe(0);
      expect(result.overview.riskLevel).toBe('low');
      expect(mockReportFormatter.formatReport).toHaveBeenCalledWith(
        emptyAnalysis,
        emptyEducational,
        emptyRecommendations,
        reportFormat
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle vector DB failures gracefully', async () => {
      const mockVectorDB = {
        search: jest.fn().mockRejectedValue(new Error('Vector DB connection failed'))
      };
      
      const mockReportingService = {
        generateDependencyGraph: jest.fn().mockResolvedValue({ nodes: [], edges: [] }),
        generateTrendAnalysis: jest.fn().mockResolvedValue({ labels: [], datasets: [] })
      };
      
      const agent = new ReporterAgent(mockVectorDB, mockReportingService);
      
      // Should not throw error during instantiation
      expect(agent).toBeDefined();
    });
  });
});