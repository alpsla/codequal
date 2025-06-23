import { jest } from '@jest/globals';
import { ReporterAgent } from '@codequal/agents/multi-agent/reporter-agent';
import { StandardReport } from '@codequal/agents/services/report-formatter.service';

describe('Reporter Agent - StandardReport Generation Tests', () => {
  let reporterAgent: ReporterAgent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    reporterAgent = new ReporterAgent();
  });
  
  describe('generateStandardReport', () => {
    it('should generate a complete StandardReport with all modules', async () => {
      // Arrange
      const analysisResult = {
        repository: {
          url: 'https://github.com/codequal/test-repo',
          name: 'test-repo',
          primaryLanguage: 'TypeScript'
        },
        pr: {
          number: 42,
          title: 'Add new feature',
          changedFiles: 8
        },
        findings: {
          security: [
            {
              title: 'Hardcoded API key detected',
              severity: 'critical',
              file: 'src/config.ts',
              line: 15,
              description: 'API key should be stored in environment variables',
              recommendation: 'Move API key to .env file',
              confidence: 0.95
            }
          ],
          codeQuality: [
            {
              title: 'Function exceeds complexity threshold',
              severity: 'medium',
              file: 'src/utils/parser.ts',
              line: 45,
              description: 'Cyclomatic complexity is 15 (threshold: 10)',
              recommendation: 'Refactor into smaller functions',
              confidence: 0.85
            },
            {
              title: 'Unused variable',
              severity: 'low',
              file: 'src/index.ts',
              line: 23,
              description: 'Variable "tempData" is declared but never used',
              recommendation: 'Remove unused variable',
              confidence: 1.0
            }
          ],
          architecture: [],
          performance: [],
          dependencies: []
        },
        metrics: {
          totalFindings: 3,
          severity: { critical: 1, high: 0, medium: 1, low: 1 },
          confidence: 0.93,
          coverage: 82
        }
      };
      
      const compiledEducationalData = {
        educational: {
          learningPath: {
            totalSteps: 3,
            steps: [
              { topic: 'Environment Variable Management', estimatedTime: '30 min' },
              { topic: 'Code Complexity and Refactoring', estimatedTime: '1 hour' },
              { topic: 'Clean Code Principles', estimatedTime: '2 hours' }
            ],
            difficulty: 'intermediate',
            estimatedTime: '3.5 hours',
            description: 'Learn secure coding practices and code quality improvements'
          },
          content: {
            explanations: [
              { 
                id: 'exp-1',
                title: 'Why Environment Variables Matter',
                content: 'Storing sensitive data in code is a security risk...'
              }
            ],
            tutorials: [
              {
                id: 'tut-1',
                title: 'Setting Up Environment Variables in Node.js',
                content: 'Step-by-step guide to using dotenv...'
              }
            ],
            bestPractices: [
              {
                id: 'bp-1',
                practice: 'Never commit sensitive data to version control'
              }
            ],
            resources: []
          },
          insights: {
            skillGaps: [
              { skill: 'Security Best Practices', currentLevel: 4, requiredLevel: 8 },
              { skill: 'Refactoring Techniques', currentLevel: 5, requiredLevel: 7 }
            ],
            relatedTopics: ['OWASP Top 10', 'SOLID Principles'],
            nextSteps: ['Implement security linting', 'Set up pre-commit hooks']
          }
        },
        metadata: {
          compiledAt: new Date(),
          confidence: 0.87
        }
      };
      
      const recommendationModule = {
        summary: {
          totalRecommendations: 3,
          focusAreas: ['Security', 'Code Quality', 'Development Process'],
          description: 'Critical security issue requires immediate attention'
        },
        recommendations: [
          {
            id: 'rec-1',
            title: 'Remove hardcoded API key',
            description: 'Move sensitive configuration to environment variables',
            priority: { level: 'critical', score: 10, justification: 'Security vulnerability' },
            category: 'security',
            estimatedEffort: '30 minutes',
            implementation: {
              steps: [
                'Create .env file',
                'Move API key to .env',
                'Update .gitignore',
                'Use process.env in code'
              ]
            }
          },
          {
            id: 'rec-2',
            title: 'Refactor complex parser function',
            description: 'Break down into smaller, testable functions',
            priority: { level: 'medium', score: 6, justification: 'Maintainability' },
            category: 'codeQuality',
            estimatedEffort: '2 hours'
          },
          {
            id: 'rec-3',
            title: 'Implement automated security scanning',
            description: 'Add security linting to CI/CD pipeline',
            priority: { level: 'high', score: 8, justification: 'Prevent future issues' },
            category: 'process',
            estimatedEffort: '1 hour'
          }
        ]
      };
      
      const reportFormat = {
        type: 'full-report' as const,
        includeEducational: true,
        educationalDepth: 'comprehensive' as const
      };
      
      // Act
      const report = await reporterAgent.generateStandardReport(
        analysisResult,
        compiledEducationalData,
        recommendationModule,
        reportFormat
      );
      
      // Assert - Verify report structure
      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report_\d+_[a-z0-9]+$/);
      expect(report.repositoryUrl).toBe('https://github.com/codequal/test-repo');
      expect(report.prNumber).toBe(42);
      expect(report.timestamp).toBeInstanceOf(Date);
      
      // Verify overview
      expect(report.overview).toMatchObject({
        executiveSummary: expect.stringContaining('3 findings'),
        analysisScore: expect.any(Number),
        riskLevel: 'critical', // Due to critical security finding
        totalFindings: 3,
        totalRecommendations: 3,
        learningPathAvailable: true,
        estimatedRemediationTime: expect.any(String)
      });
      
      // Verify findings module
      expect(report.modules.findings).toMatchObject({
        summary: expect.any(String),
        totalCount: 3,
        criticalFindings: expect.arrayContaining([
          expect.objectContaining({
            title: 'Hardcoded API key detected',
            severity: 'critical'
          })
        ])
      });
      
      expect(report.modules.findings.categories.security.count).toBe(1);
      expect(report.modules.findings.categories.codeQuality.count).toBe(2);
      
      // Verify recommendations module
      expect(report.modules.recommendations).toMatchObject({
        summary: 'Critical security issue requires immediate attention',
        totalRecommendations: 3,
        categories: expect.any(Array),
        priorityMatrix: expect.objectContaining({
          critical: expect.arrayContaining([
            expect.objectContaining({ title: 'Remove hardcoded API key' })
          ]),
          high: expect.any(Array),
          medium: expect.any(Array),
          low: expect.any(Array)
        })
      });
      
      // Verify educational module
      expect(report.modules.educational).toMatchObject({
        summary: expect.stringContaining('learning path'),
        learningPath: expect.objectContaining({
          title: expect.any(String),
          difficulty: 'intermediate',
          estimatedTime: '3.5 hours',
          steps: expect.arrayContaining([
            expect.objectContaining({
              title: 'Environment Variable Management',
              estimatedTime: '30 min'
            })
          ])
        }),
        skillGaps: expect.arrayContaining([
          expect.objectContaining({
            skill: 'Security Best Practices',
            currentLevel: 4,
            requiredLevel: 8
          })
        ])
      });
      
      // Verify metrics module
      expect(report.modules.metrics).toMatchObject({
        summary: expect.stringContaining('score'),
        scores: expect.objectContaining({
          overall: expect.objectContaining({
            name: 'Overall Quality',
            score: expect.any(Number),
            rating: expect.stringMatching(/[A-F]/)
          }),
          security: expect.objectContaining({
            score: expect.any(Number),
            rating: expect.stringMatching(/[A-F]/)
          })
        })
      });
      
      // Verify insights module
      expect(report.modules.insights).toMatchObject({
        summary: expect.any(String),
        keyInsights: expect.any(Array),
        patterns: expect.any(Array),
        predictions: expect.any(Array),
        contextualAdvice: expect.any(Array)
      });
      
      // Verify visualizations
      expect(report.visualizations).toMatchObject({
        severityDistribution: expect.objectContaining({
          type: 'pie',
          title: expect.any(String),
          data: expect.objectContaining({
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: expect.any(Array)
          })
        }),
        categoryBreakdown: expect.objectContaining({
          type: 'bar',
          title: expect.any(String)
        }),
        learningPathProgress: expect.objectContaining({
          type: 'radar',
          title: expect.any(String)
        })
      });
      
      // Verify export formats
      expect(report.exports).toMatchObject({
        prComment: expect.stringContaining('CodeQual Analysis'),
        emailFormat: expect.stringContaining('Repository: test-repo'),
        slackFormat: expect.stringContaining('*CodeQual Analysis Complete*'),
        markdownReport: expect.stringContaining('# CodeQual Analysis Report'),
        jsonReport: expect.any(String)
      });
      
      // Verify metadata
      expect(report.metadata).toMatchObject({
        analysisMode: expect.any(String),
        agentsUsed: expect.any(Array),
        toolsExecuted: expect.any(Array),
        processingTime: expect.any(Number),
        modelVersions: expect.any(Object),
        reportVersion: '1.0.0'
      });
    });
    
    it('should adapt report format for PR comment', async () => {
      // Arrange
      const minimalAnalysis = {
        repository: { url: 'https://github.com/test/repo', name: 'repo', primaryLanguage: 'JS' },
        pr: { number: 1, title: 'Quick fix', changedFiles: 1 },
        findings: { security: [], codeQuality: [], architecture: [], performance: [], dependencies: [] },
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 } }
      };
      
      const reportFormat = {
        type: 'pr-comment' as const,
        includeEducational: false,
        educationalDepth: 'summary' as const
      };
      
      // Act
      const report = await reporterAgent.generateStandardReport(
        minimalAnalysis,
        { educational: { learningPath: { totalSteps: 0 }, content: {}, insights: {} } },
        { summary: { totalRecommendations: 0 }, recommendations: [] },
        reportFormat
      );
      
      // Assert
      expect(report.exports.prComment).toBeDefined();
      expect(report.exports.prComment).toContain('CodeQual Analysis');
      expect(report.exports.prComment).not.toContain('View the full analysis'); // Concise for PR
      expect(report.overview.executiveSummary.length).toBeLessThanOrEqual(200);
    });
    
    it('should handle missing data gracefully', async () => {
      // Arrange
      const incompleteAnalysis = {
        repository: { url: 'https://github.com/test/repo' },
        pr: { number: 1 },
        findings: {},
        metrics: {}
      };
      
      // Act
      const report = await reporterAgent.generateStandardReport(
        incompleteAnalysis,
        {},
        {},
        { type: 'dashboard', includeEducational: true, educationalDepth: 'detailed' }
      );
      
      // Assert
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.overview.totalFindings).toBe(0);
      expect(report.overview.riskLevel).toBe('low');
      expect(report.modules.findings.totalCount).toBe(0);
    });
  });
  
  describe('Export Format Variations', () => {
    const baseAnalysis = {
      repository: { url: 'https://github.com/test/repo', name: 'repo' },
      pr: { number: 1, title: 'Test PR' },
      findings: {
        security: [{ title: 'Issue 1', severity: 'high' }],
        codeQuality: [{ title: 'Issue 2', severity: 'low' }]
      },
      metrics: { totalFindings: 2, severity: { critical: 0, high: 1, medium: 0, low: 1 } }
    };
    
    it('should generate email-friendly format', async () => {
      // Act
      const report = await reporterAgent.generateStandardReport(
        baseAnalysis,
        { educational: { learningPath: { totalSteps: 1, steps: [{ topic: 'Security' }] } } },
        { summary: {}, recommendations: [] },
        { type: 'email', includeEducational: true, educationalDepth: 'detailed' }
      );
      
      // Assert
      expect(report.exports.emailFormat).toContain('Repository: repo');
      expect(report.exports.emailFormat).toContain('PR #1: Test PR');
      expect(report.exports.emailFormat).toContain('Total Issues: 2');
      expect(report.exports.emailFormat).toContain('Learning Path');
    });
    
    it('should generate Slack-friendly format', async () => {
      // Act
      const report = await reporterAgent.generateStandardReport(
        baseAnalysis,
        { educational: {} },
        { summary: {}, recommendations: [] },
        { type: 'slack', includeEducational: false, educationalDepth: 'summary' }
      );
      
      // Assert
      expect(report.exports.slackFormat).toContain('⚠️'); // Warning emoji for high severity
      expect(report.exports.slackFormat).toContain('*CodeQual Analysis Complete*');
      expect(report.exports.slackFormat).toContain('Findings:');
      expect(report.exports.slackFormat).toContain('High: 1');
      expect(report.exports.slackFormat.length).toBeLessThan(500); // Slack-friendly length
    });
    
    it('should generate comprehensive markdown report', async () => {
      // Act
      const report = await reporterAgent.generateStandardReport(
        baseAnalysis,
        { 
          educational: { 
            learningPath: { totalSteps: 2, steps: [{ topic: 'Security' }, { topic: 'Quality' }] },
            insights: { skillGaps: ['Security', 'Testing'] }
          } 
        },
        { 
          summary: { totalRecommendations: 2 },
          recommendations: [
            { title: 'Fix security issue', priority: { level: 'high' } },
            { title: 'Improve code quality', priority: { level: 'low' } }
          ]
        },
        { type: 'full-report', includeEducational: true, educationalDepth: 'comprehensive' }
      );
      
      // Assert
      const markdown = report.exports.markdownReport;
      expect(markdown).toContain('# CodeQual Analysis Report');
      expect(markdown).toContain('## Repository Information');
      expect(markdown).toContain('## Findings Overview');
      expect(markdown).toContain('| Severity | Count |');
      expect(markdown).toContain('## Recommendations');
      expect(markdown).toContain('## Learning Path');
      expect(markdown).toContain('### Learning Steps');
    });
  });
});
