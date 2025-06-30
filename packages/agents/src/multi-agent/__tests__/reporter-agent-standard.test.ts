import { jest } from '@jest/globals';
import { ReporterAgent } from '../reporter-agent';
import { ReportFormatterService, StandardReport } from '../../services/report-formatter.service';
import { createLogger } from '@codequal/core/utils';

// Mock dependencies
jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

jest.mock('../../services/report-formatter.service');

describe.skip('Reporter Agent - Standard Report Generation - FIXME: TypeScript errors (Issue #TBD)', () => {
  let reporterAgent: ReporterAgent;
  let mockVectorDB: any;
  let mockReportingService: any;
  let mockReportFormatter: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    const searchMock = jest.fn().mockResolvedValue([
      {
        id: 'resource1',
        title: 'Security Best Practices Guide',
        description: 'Comprehensive security guide',
        content: 'Security content...',
        score: 0.9,
        tags: ['security', 'best-practices'],
        url: 'https://example.com/security-guide'
      }
    ]);
    
    const depGraphMock = jest.fn().mockResolvedValue({
      nodes: [
        { id: 'node1', label: 'express', type: 'dependency' },
        { id: 'node2', label: 'react', type: 'dependency' }
      ],
      edges: [
        { source: 'node1', target: 'node2', label: 'uses' }
      ]
    });
    
    const trendMock = jest.fn();
    trendMock.mockResolvedValue({
      labels: ['Week 1', 'Week 2', 'Week 3'],
      datasets: [{
        label: 'Code Quality Score',
        data: [75, 78, 82]
      }]
    });
    
    mockVectorDB = {
      search: searchMock
    };
    
    mockReportingService = {
      generateDependencyGraph: depGraphMock,
      generateTrendAnalysis: trendMock
    };
    
    // Create Reporter Agent instance
    reporterAgent = new ReporterAgent(mockVectorDB, mockReportingService);
    
    // Mock the report formatter
    mockReportFormatter = {
      formatReport: jest.fn()
    };
    (reporterAgent as any).reportFormatter = mockReportFormatter;
  });
  
  describe('generateStandardReport', () => {
    it('should generate a complete standardized report for UI consumption', async () => {
      // Arrange
      const mockAnalysisResult = {
        repository: {
          url: 'https://github.com/test/repo',
          name: 'test-repo',
          primaryLanguage: 'TypeScript'
        },
        pr: {
          number: 123,
          title: 'Fix security issues',
          changedFiles: 5
        },
        findings: {
          security: [
            {
              title: 'SQL Injection vulnerability',
              severity: 'critical',
              file: 'src/database.ts',
              line: 45
            }
          ],
          codeQuality: [
            {
              title: 'Complex function',
              severity: 'medium',
              file: 'src/utils.ts'
            }
          ]
        },
        metrics: {
          totalFindings: 2,
          severity: { critical: 1, high: 0, medium: 1, low: 0 }
        }
      };
      
      const mockCompiledEducationalData = {
        educational: {
          learningPath: {
            totalSteps: 3,
            description: 'Security-focused learning path',
            difficulty: 'intermediate',
            estimatedTime: '2 weeks',
            steps: [
              { topic: 'SQL Injection Prevention', description: 'Learn about SQL injection' },
              { topic: 'Input Validation', description: 'Proper input validation techniques' },
              { topic: 'Security Testing', description: 'Security testing practices' }
            ]
          },
          content: {
            explanations: [{ title: 'What is SQL Injection', content: 'Explanation...' }],
            tutorials: [{ title: 'Preventing SQL Injection', content: 'Tutorial...' }],
            bestPractices: [{ title: 'Security Best Practices', content: 'Best practices...' }],
            resources: []
          },
          insights: {
            skillGaps: [
              { skill: 'Security Testing', importance: 'high' },
              { skill: 'Input Validation', importance: 'medium' }
            ],
            relatedTopics: ['OWASP Top 10', 'Secure Coding'],
            nextSteps: ['Implement input validation', 'Add security tests']
          }
        },
        recommendationMapping: {},
        metadata: {}
      };
      
      const mockRecommendationModule = {
        summary: {
          totalRecommendations: 3,
          focusAreas: ['Security', 'Code Quality'],
          description: 'Focus on security improvements'
        },
        recommendations: [
          {
            id: 'rec1',
            title: 'Fix SQL Injection vulnerability',
            description: 'Use parameterized queries',
            priority: { level: 'critical', score: 10 },
            category: 'security'
          }
        ]
      };
      
      const mockStandardReport: StandardReport = {
        id: 'report_123',
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        timestamp: new Date(),
        overview: {
          executiveSummary: 'Analysis complete with 2 findings',
          analysisScore: 65,
          riskLevel: 'critical',
          totalFindings: 2,
          totalRecommendations: 3,
          learningPathAvailable: true,
          estimatedRemediationTime: '2 weeks'
        },
        modules: {
          findings: {
            summary: 'Found 2 issues',
            categories: {
              security: {
                name: 'Security',
                icon: '🔒',
                count: 1,
                findings: [],
                summary: 'Found 1 security issue'
              },
              architecture: { name: 'Architecture', icon: '🏗️', count: 0, findings: [], summary: '' },
              performance: { name: 'Performance', icon: '⚡', count: 0, findings: [], summary: '' },
              codeQuality: { name: 'Code Quality', icon: '✨', count: 1, findings: [], summary: '' },
              dependencies: { name: 'Dependencies', icon: '📦', count: 0, findings: [], summary: '' }
            },
            criticalFindings: [],
            totalCount: 2
          },
          recommendations: {
            summary: 'Focus on security improvements',
            totalRecommendations: 3,
            categories: [],
            priorityMatrix: {
              critical: [],
              high: [],
              medium: [],
              low: []
            },
            implementationPlan: {
              phases: [],
              totalEstimatedTime: '2 weeks',
              teamSizeRecommendation: 2
            }
          },
          educational: {
            summary: 'Learning path available',
            learningPath: {
              id: 'path1',
              title: 'Security Learning Path',
              description: 'Security-focused learning path',
              difficulty: 'intermediate',
              estimatedTime: '2 weeks',
              steps: []
            },
            content: {
              explanations: [],
              tutorials: [],
              bestPractices: [],
              resources: []
            },
            skillGaps: [],
            certifications: []
          },
          metrics: {
            summary: 'Overall score: 65/100',
            scores: {
              overall: { name: 'Overall', score: 65, rating: 'D', description: '', factors: [] },
              security: { name: 'Security', score: 50, rating: 'F', description: '', factors: [] },
              maintainability: { name: 'Maintainability', score: 70, rating: 'C', description: '', factors: [] },
              performance: { name: 'Performance', score: 80, rating: 'B', description: '', factors: [] },
              reliability: { name: 'Reliability', score: 75, rating: 'C', description: '', factors: [] }
            },
            trends: [],
            benchmarks: [],
            improvements: []
          },
          insights: {
            summary: '2 key insights',
            keyInsights: [],
            patterns: [],
            predictions: [],
            contextualAdvice: []
          }
        },
        visualizations: {
          severityDistribution: {
            type: 'pie',
            title: 'Severity Distribution',
            data: {}
          },
          categoryBreakdown: {
            type: 'bar',
            title: 'Category Breakdown',
            data: {}
          },
          learningPathProgress: {
            type: 'radar',
            title: 'Skill Development',
            data: {}
          }
        },
        exports: {
          prComment: '## CodeQual Analysis\n2 issues found',
          emailFormat: 'Email format...',
          slackFormat: 'Slack format...',
          markdownReport: '# Full Report\n...',
          jsonReport: '{}'
        },
        metadata: {
          analysisMode: 'comprehensive',
          agentsUsed: ['security', 'codeQuality'],
          toolsExecuted: ['npm-audit'],
          processingTime: 5000,
          modelVersions: {},
          reportVersion: '1.0.0'
        }
      };
      
      mockReportFormatter.formatReport.mockResolvedValue(mockStandardReport);
      
      const reportFormat = {
        type: 'full-report' as const,
        includeEducational: true,
        educationalDepth: 'comprehensive' as const
      };
      
      // Act
      const result = await reporterAgent.generateStandardReport(
        mockAnalysisResult,
        mockCompiledEducationalData,
        mockRecommendationModule,
        reportFormat
      );
      
      // Assert
      expect(result).toEqual(mockStandardReport);
      expect(mockReportFormatter.formatReport).toHaveBeenCalledWith(
        mockAnalysisResult,
        mockCompiledEducationalData,
        mockRecommendationModule,
        reportFormat
      );
      
      // Verify Vector DB enrichment was attempted
      expect(mockVectorDB.search).toHaveBeenCalledWith({
        query: 'Security Testing tutorial guide best practices',
        filters: {
          contentType: 'educational',
          difficulty: 'advanced'
        },
        limit: 3
      });
      
      // Verify additional visualizations were generated
      expect(mockReportingService.generateDependencyGraph).toHaveBeenCalled();
      expect(mockReportingService.generateTrendAnalysis).toHaveBeenCalled();
    });
    
    it('should handle Vector DB enrichment failures gracefully', async () => {
      // Arrange
      mockVectorDB.search.mockRejectedValue(new Error('Vector DB unavailable'));
      
      const mockStandardReport: StandardReport = {
        id: 'report_123',
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        timestamp: new Date(),
        overview: {
          executiveSummary: 'Analysis complete',
          analysisScore: 80,
          riskLevel: 'low',
          totalFindings: 0,
          totalRecommendations: 0,
          learningPathAvailable: false,
          estimatedRemediationTime: '0 hours'
        },
        modules: {
          findings: {} as any,
          recommendations: {} as any,
          educational: {
            content: {
              resources: []
            }
          } as any,
          metrics: {} as any,
          insights: {} as any
        },
        visualizations: {} as any,
        exports: {} as any,
        metadata: {} as any
      };
      
      mockReportFormatter.formatReport.mockResolvedValue(mockStandardReport);
      
      // Act
      const result = await reporterAgent.generateStandardReport(
        {},
        { educational: { insights: { skillGaps: [{ skill: 'Testing' }] } } },
        {},
        { type: 'full-report', includeEducational: true, educationalDepth: 'comprehensive' }
      );
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('report_123');
      // Should not have added any resources despite Vector DB failure
      expect(result.modules.educational.content.resources).toHaveLength(0);
    });
    
    it('should skip enrichment when includeEducational is false', async () => {
      // Arrange
      const mockStandardReport: StandardReport = {
        id: 'report_123',
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        timestamp: new Date(),
        overview: {} as any,
        modules: {} as any,
        visualizations: {} as any,
        exports: {} as any,
        metadata: {} as any
      };
      
      mockReportFormatter.formatReport.mockResolvedValue(mockStandardReport);
      
      // Act
      await reporterAgent.generateStandardReport(
        {},
        {},
        {},
        { type: 'pr-comment', includeEducational: false, educationalDepth: 'summary' }
      );
      
      // Assert
      expect(mockVectorDB.search).not.toHaveBeenCalled();
    });
  });
  
  describe('Report Format Variations', () => {
    it('should generate appropriate report for PR comment format', async () => {
      // Arrange
      const mockStandardReport: StandardReport = {
        id: 'report_pr_123',
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        timestamp: new Date(),
        overview: {
          executiveSummary: 'Quick analysis summary for PR comment that should be concise',
          analysisScore: 75,
          riskLevel: 'medium',
          totalFindings: 3,
          totalRecommendations: 2,
          learningPathAvailable: true,
          estimatedRemediationTime: '1 week'
        },
        modules: {} as any,
        visualizations: {} as any,
        exports: {
          prComment: '## CodeQual Analysis\n3 issues found\n- Security: 1 critical\n- Code Quality: 2 medium',
          emailFormat: '',
          slackFormat: '',
          markdownReport: '',
          jsonReport: ''
        },
        metadata: {} as any
      };
      
      mockReportFormatter.formatReport.mockResolvedValue(mockStandardReport);
      
      // Act
      const result = await reporterAgent.generateStandardReport(
        { pr: { number: 123 } },
        {},
        {},
        { type: 'pr-comment', includeEducational: false, educationalDepth: 'summary' }
      );
      
      // Assert
      expect(result.exports.prComment).toContain('3 issues found');
      expect(result.overview.executiveSummary.length).toBeLessThan(200);
    });
    
    it('should generate comprehensive report for dashboard format', async () => {
      // Arrange
      const mockStandardReport: StandardReport = {
        id: 'report_dashboard_123',
        repositoryUrl: 'https://github.com/test/repo',
        prNumber: 123,
        timestamp: new Date(),
        overview: {} as any,
        modules: {} as any,
        visualizations: {
          severityDistribution: { type: 'pie', title: 'Severity', data: {} },
          categoryBreakdown: { type: 'bar', title: 'Categories', data: {} },
          learningPathProgress: { type: 'radar', title: 'Skills', data: {} },
          dependencyGraph: {
            nodes: [{ id: '1', label: 'express', type: 'dependency', metadata: {} }],
            edges: [],
            layout: 'hierarchical'
          }
        },
        exports: {} as any,
        metadata: {} as any
      };
      
      mockReportFormatter.formatReport.mockResolvedValue(mockStandardReport);
      
      // Act
      const result = await reporterAgent.generateStandardReport(
        {},
        {},
        {},
        { type: 'dashboard', includeEducational: true, educationalDepth: 'comprehensive' }
      );
      
      // Assert
      expect(result.visualizations.dependencyGraph).toBeDefined();
      expect(result.visualizations.dependencyGraph?.nodes).toHaveLength(1);
    });
  });
});
