/**
 * End-to-End tests for Reporter Agent
 * Tests the complete workflow from analysis input to final report generation
 */

import { ReporterAgent } from '../reporter-agent';
import { EducationalAgent } from '../educational-agent';

// Mock all dependencies
const mockVectorDB = {
  search: jest.fn(),
  store: jest.fn(),
  delete: jest.fn()
};

const mockReportingService = {
  generateDependencyGraph: jest.fn(),
  generateTrendAnalysis: jest.fn(),
  generateMetricsReport: jest.fn()
};

const mockSkillTrackingService = {
  getCurrentSkills: jest.fn(),
  assessSkillsFromPR: jest.fn(),
  updateSkillsFromAssessments: jest.fn(),
  trackLearningEngagement: jest.fn()
};

const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User'
};

// Mock database and external dependencies
jest.mock('@codequal/database/models/skill', () => ({
  SkillModel: jest.fn().mockImplementation(() => ({
    getSkillsByUser: jest.fn().mockResolvedValue([]),
    createSkill: jest.fn(),
    updateSkill: jest.fn(),
    recordSkillHistory: jest.fn()
  }))
}));

jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('Reporter Agent - End-to-End Workflow Tests', () => {
  let reporterAgent: ReporterAgent;
  let educationalAgent: EducationalAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock responses
    mockVectorDB.search.mockResolvedValue([
      {
        id: 'edu-resource-1',
        title: 'Security Best Practices',
        content: 'Comprehensive security guide...',
        metadata: { difficulty: 'intermediate', category: 'security' },
        score: 0.9
      }
    ]);

    mockReportingService.generateDependencyGraph.mockResolvedValue({
      nodes: [
        { id: 'express', label: 'Express.js', type: 'dependency', metadata: { version: '4.18.0' } },
        { id: 'react', label: 'React', type: 'dependency', metadata: { version: '18.2.0' } }
      ],
      edges: [
        { source: 'express', target: 'react', label: 'serves' }
      ],
      layout: 'hierarchical'
    });

    mockReportingService.generateTrendAnalysis.mockResolvedValue({
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Code Quality Score',
        data: [65, 70, 75, 80],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)'
      }]
    });

    reporterAgent = new ReporterAgent(mockVectorDB, mockReportingService);
    educationalAgent = new EducationalAgent(mockVectorDB, mockAuthenticatedUser);
  });

  describe('Complete Analysis to Report Workflow', () => {
    it('should generate comprehensive report from realistic analysis data', async () => {
      // Step 1: Setup realistic analysis input
      const analysisResult = {
        repository: {
          url: 'https://github.com/example/ecommerce-app',
          name: 'ecommerce-app',
          primaryLanguage: 'TypeScript',
          description: 'Modern e-commerce application',
          stars: 1250,
          forks: 180
        },
        pr: {
          number: 456,
          title: 'Implement user authentication and authorization system',
          author: 'developer@company.com',
          changedFiles: 12,
          additions: 324,
          deletions: 45,
          timestamp: new Date('2024-06-15T10:30:00Z')
        },
        findings: {
          security: [
            {
              title: 'Hardcoded API key in configuration',
              severity: 'critical',
              file: 'src/config/api.ts',
              line: 15,
              description: 'API key is hardcoded and exposed in source code',
              recommendation: 'Move API key to environment variables',
              confidence: 0.95,
              category: 'secrets',
              impact: 'high',
              effort: '30 minutes'
            },
            {
              title: 'Weak password validation',
              severity: 'high',
              file: 'src/auth/validation.ts',
              line: 28,
              description: 'Password validation allows weak passwords',
              recommendation: 'Implement stronger password policy',
              confidence: 0.88,
              category: 'authentication',
              impact: 'medium',
              effort: '2 hours'
            }
          ],
          codeQuality: [
            {
              title: 'Function exceeds complexity threshold',
              severity: 'medium',
              file: 'src/services/user-service.ts',
              line: 156,
              description: 'Function has cyclomatic complexity of 15 (threshold: 10)',
              recommendation: 'Refactor function into smaller, focused methods',
              confidence: 0.92,
              category: 'complexity',
              impact: 'low',
              effort: '4 hours'
            },
            {
              title: 'Duplicate code detected',
              severity: 'low',
              file: 'src/utils/helpers.ts',
              line: 42,
              description: '85% code similarity with src/components/form-utils.ts',
              recommendation: 'Extract common logic into shared utility',
              confidence: 0.79,
              category: 'duplication',
              impact: 'low',
              effort: '1 hour'
            }
          ],
          architecture: [
            {
              title: 'Circular dependency detected',
              severity: 'medium',
              file: 'src/models/user.ts',
              description: 'Circular dependency between User and Order models',
              recommendation: 'Refactor to use dependency injection or interfaces',
              confidence: 0.85,
              category: 'dependencies',
              impact: 'medium',
              effort: '3 hours'
            }
          ],
          performance: [
            {
              title: 'N+1 query problem',
              severity: 'high',
              file: 'src/services/order-service.ts',
              line: 89,
              description: 'Database queries in loop causing N+1 problem',
              recommendation: 'Use eager loading or batch queries',
              confidence: 0.91,
              category: 'database',
              impact: 'high',
              effort: '2 hours'
            }
          ],
          dependencies: [
            {
              title: 'Vulnerable dependency detected',
              severity: 'high',
              file: 'package.json',
              description: 'lodash@4.17.20 has known security vulnerabilities',
              recommendation: 'Update to lodash@4.17.21 or higher',
              confidence: 1.0,
              category: 'vulnerability',
              impact: 'high',
              effort: '15 minutes'
            }
          ]
        },
        metrics: {
          totalFindings: 7,
          severity: { critical: 1, high: 3, medium: 2, low: 1 },
          confidence: 0.89,
          coverage: 78,
          maintainabilityIndex: 65,
          technicalDebt: '2.5 days',
          qualityGate: 'failed'
        }
      };

      // Step 2: Generate educational data
      const mockCompiledEducationalData = {
        educational: {
          learningPath: {
            totalSteps: 4,
            steps: [
              {
                topic: 'Environment Variable Security',
                description: 'Learn to secure API keys and sensitive data',
                estimatedTime: '45 minutes',
                difficulty: 'beginner',
                resources: ['https://docs.example.com/env-vars']
              },
              {
                topic: 'Password Security Best Practices',
                description: 'Implement robust password validation',
                estimatedTime: '1.5 hours',
                difficulty: 'intermediate',
                resources: ['https://owasp.org/password-security']
              },
              {
                topic: 'Code Complexity Management',
                description: 'Techniques for managing cyclomatic complexity',
                estimatedTime: '2 hours',
                difficulty: 'intermediate',
                resources: ['https://refactoring.guru/complexity']
              },
              {
                topic: 'Database Query Optimization',
                description: 'Solving N+1 queries and performance issues',
                estimatedTime: '2.5 hours',
                difficulty: 'advanced',
                resources: ['https://docs.example.com/db-optimization']
              }
            ],
            difficulty: 'intermediate',
            estimatedTime: '6.5 hours',
            description: 'Comprehensive security and code quality improvement path'
          },
          content: {
            explanations: [
              {
                id: 'exp-1',
                title: 'Why Environment Variables Matter for Security',
                content: 'Storing sensitive data like API keys in source code exposes them to anyone with repository access...',
                difficulty: 'beginner',
                tags: ['security', 'configuration'],
                relatedFindings: ['Hardcoded API key in configuration']
              },
              {
                id: 'exp-2',
                title: 'Understanding Cyclomatic Complexity',
                content: 'Cyclomatic complexity measures the number of linearly independent paths through code...',
                difficulty: 'intermediate',
                tags: ['code-quality', 'complexity'],
                relatedFindings: ['Function exceeds complexity threshold']
              }
            ],
            tutorials: [
              {
                id: 'tut-1',
                title: 'Setting Up Environment Variables in Node.js',
                content: 'Step-by-step guide to using dotenv and securing configuration...',
                steps: [
                  'Install dotenv package',
                  'Create .env file',
                  'Add .env to .gitignore',
                  'Load environment variables in application'
                ],
                estimatedTime: '30 minutes',
                difficulty: 'beginner'
              }
            ],
            bestPractices: [
              {
                id: 'bp-1',
                practice: 'Never commit secrets to version control',
                rationale: 'Secrets in version control can be accessed by anyone with repository access',
                implementation: 'Use environment variables, secret management services, or encrypted configuration',
                category: 'security'
              },
              {
                id: 'bp-2',
                practice: 'Keep functions focused and small',
                rationale: 'Small functions are easier to understand, test, and maintain',
                implementation: 'Extract complex logic into separate functions with single responsibilities',
                category: 'code-quality'
              }
            ],
            resources: [
              {
                type: 'documentation',
                title: 'OWASP Security Guidelines',
                url: 'https://owasp.org/top10',
                description: 'Comprehensive security best practices',
                difficulty: 'intermediate'
              }
            ]
          },
          insights: {
            skillGaps: [
              { skill: 'Security Best Practices', currentLevel: 4, requiredLevel: 8, priority: 'high' },
              { skill: 'Code Architecture', currentLevel: 6, requiredLevel: 7, priority: 'medium' },
              { skill: 'Database Optimization', currentLevel: 5, requiredLevel: 8, priority: 'high' }
            ],
            relatedTopics: [
              'OWASP Top 10',
              'SOLID Principles',
              'Database Performance Tuning',
              'Dependency Management'
            ],
            nextSteps: [
              'Implement security linting in CI/CD pipeline',
              'Set up automated dependency vulnerability scanning',
              'Establish code review guidelines for complexity',
              'Create database query performance monitoring'
            ]
          }
        },
        metadata: {
          compiledAt: new Date(),
          confidence: 0.87,
          agentsUsed: ['security', 'codeQuality', 'architecture', 'performance'],
          processingTime: 45000
        }
      };

      // Step 3: Generate recommendations
      const mockRecommendationModule = {
        summary: {
          totalRecommendations: 7,
          focusAreas: ['Security', 'Code Quality', 'Performance'],
          description: 'Critical security vulnerabilities require immediate attention. Performance and code quality improvements will enhance maintainability.',
          estimatedEffort: '12.75 hours',
          priorityBreakdown: { critical: 1, high: 3, medium: 2, low: 1 }
        },
        recommendations: [
          {
            id: 'rec-1',
            title: 'Secure API key configuration',
            description: 'Move hardcoded API key to environment variables to prevent exposure',
            priority: { level: 'critical', score: 10, justification: 'Critical security vulnerability' },
            category: 'security',
            estimatedEffort: '30 minutes',
            impact: 'high',
            implementation: {
              steps: [
                'Create .env file in project root',
                'Move API key from src/config/api.ts to .env',
                'Add .env to .gitignore',
                'Update code to use process.env.API_KEY',
                'Document environment setup in README'
              ],
              tools: ['dotenv package'],
              testing: 'Verify API functionality with environment variable',
              rollback: 'Revert to previous configuration if issues arise'
            },
            tags: ['security', 'configuration', 'quick-fix']
          },
          {
            id: 'rec-2',
            title: 'Update vulnerable lodash dependency',
            description: 'Update lodash to latest secure version to address known vulnerabilities',
            priority: { level: 'high', score: 9, justification: 'Known security vulnerability with easy fix' },
            category: 'dependencies',
            estimatedEffort: '15 minutes',
            impact: 'high',
            implementation: {
              steps: [
                'Run npm update lodash',
                'Verify application functionality',
                'Run security audit to confirm fix'
              ]
            }
          },
          {
            id: 'rec-3',
            title: 'Optimize database queries',
            description: 'Implement eager loading to resolve N+1 query performance issue',
            priority: { level: 'high', score: 8, justification: 'Significant performance impact' },
            category: 'performance',
            estimatedEffort: '2 hours',
            impact: 'high'
          },
          {
            id: 'rec-4',
            title: 'Strengthen password validation',
            description: 'Implement comprehensive password policy with complexity requirements',
            priority: { level: 'high', score: 8, justification: 'Authentication security issue' },
            category: 'security',
            estimatedEffort: '2 hours',
            impact: 'medium'
          },
          {
            id: 'rec-5',
            title: 'Refactor complex user service function',
            description: 'Break down complex function to improve maintainability and testability',
            priority: { level: 'medium', score: 6, justification: 'Code maintainability improvement' },
            category: 'codeQuality',
            estimatedEffort: '4 hours',
            impact: 'low'
          },
          {
            id: 'rec-6',
            title: 'Resolve circular dependency',
            description: 'Refactor User and Order models to eliminate circular dependency',
            priority: { level: 'medium', score: 6, justification: 'Architecture improvement' },
            category: 'architecture',
            estimatedEffort: '3 hours',
            impact: 'medium'
          },
          {
            id: 'rec-7',
            title: 'Extract duplicate utility code',
            description: 'Create shared utility module to eliminate code duplication',
            priority: { level: 'low', score: 4, justification: 'Minor maintainability improvement' },
            category: 'codeQuality',
            estimatedEffort: '1 hour',
            impact: 'low'
          }
        ],
        implementationPlan: {
          phase1: {
            name: 'Critical Security Fixes',
            timeframe: '1 day',
            recommendations: ['rec-1', 'rec-2'],
            totalEffort: '45 minutes'
          },
          phase2: {
            name: 'High-Priority Improvements',
            timeframe: '1 week',
            recommendations: ['rec-3', 'rec-4'],
            totalEffort: '4 hours'
          },
          phase3: {
            name: 'Code Quality Enhancements',
            timeframe: '2 weeks',
            recommendations: ['rec-5', 'rec-6', 'rec-7'],
            totalEffort: '8 hours'
          }
        }
      };

      // Step 4: Generate report with different formats
      const reportFormats = [
        { type: 'full-report' as const, includeEducational: true, educationalDepth: 'comprehensive' as const },
        { type: 'pr-comment' as const, includeEducational: false, educationalDepth: 'summary' as const },
        { type: 'dashboard' as const, includeEducational: true, educationalDepth: 'detailed' as const },
        { type: 'email' as const, includeEducational: true, educationalDepth: 'summary' as const }
      ];

      for (const reportFormat of reportFormats) {
        const report = await reporterAgent.generateStandardReport(
          analysisResult,
          mockCompiledEducationalData,
          mockRecommendationModule,
          reportFormat
        );

        // Verify report structure
        expect(report).toMatchObject({
          id: expect.stringMatching(/^report_\d+_[a-z0-9]+$/),
          repositoryUrl: 'https://github.com/example/ecommerce-app',
          prNumber: 456,
          timestamp: expect.any(Date),
          overview: {
            executiveSummary: expect.stringContaining('7 findings'),
            analysisScore: expect.any(Number),
            riskLevel: 'critical', // Due to critical security finding
            totalFindings: 7,
            totalRecommendations: 7,
            learningPathAvailable: reportFormat.includeEducational,
            estimatedRemediationTime: expect.stringContaining('hours')
          }
        });

        // Verify modules are populated correctly
        expect(report.modules.findings).toMatchObject({
          summary: expect.any(String),
          totalCount: 7,
          categories: expect.objectContaining({
            security: expect.objectContaining({
              count: 2,
              findings: expect.any(Array)
            }),
            codeQuality: expect.objectContaining({
              count: 2
            }),
            performance: expect.objectContaining({
              count: 1
            })
          })
        });

        expect(report.modules.recommendations).toMatchObject({
          summary: expect.stringContaining('Critical security vulnerabilities'),
          totalRecommendations: 7,
          priorityMatrix: expect.objectContaining({
            critical: expect.arrayContaining([
              expect.objectContaining({ title: 'Secure API key configuration' })
            ]),
            high: expect.any(Array),
            medium: expect.any(Array),
            low: expect.any(Array)
          })
        });

        // Verify educational content based on format
        if (reportFormat.includeEducational) {
          expect(report.modules.educational).toMatchObject({
            summary: expect.stringContaining('learning path'),
            learningPath: expect.objectContaining({
              title: expect.any(String),
              difficulty: 'intermediate',
              estimatedTime: '6.5 hours',
              steps: expect.arrayContaining([
                expect.objectContaining({
                  title: 'Environment Variable Security'
                })
              ])
            }),
            skillGaps: expect.arrayContaining([
              expect.objectContaining({
                skill: 'Security Best Practices'
              })
            ])
          });
        }

        // Verify visualizations
        expect(report.visualizations).toMatchObject({
          severityDistribution: expect.objectContaining({
            type: 'pie',
            title: expect.any(String)
          }),
          categoryBreakdown: expect.objectContaining({
            type: 'bar'
          }),
          learningPathProgress: expect.objectContaining({
            type: 'radar'
          })
        });

        // Verify export formats are appropriate for the report type
        expect(report.exports).toMatchObject({
          prComment: expect.stringContaining('CodeQual Analysis'),
          emailFormat: expect.stringContaining('Repository: ecommerce-app'),
          slackFormat: expect.stringContaining('CodeQual Analysis Complete'),
          markdownReport: expect.stringContaining('# CodeQual Analysis Report'),
          jsonReport: expect.any(String)
        });

        // Format-specific validations
        if (reportFormat.type === 'pr-comment') {
          expect(report.exports.prComment.length).toBeLessThan(3000); // GitHub comment limit
          expect(report.overview.executiveSummary.length).toBeLessThan(200);
        }

        if (reportFormat.type === 'email') {
          expect(report.exports.emailFormat).toContain('Total Issues: 7');
          expect(report.exports.emailFormat).toContain('Critical: 1');
        }

        if (reportFormat.type === 'dashboard') {
          expect(report.visualizations.dependencyGraph).toBeDefined();
          expect(report.visualizations.trendAnalysis).toBeDefined();
        }

        // Verify metadata
        expect(report.metadata).toMatchObject({
          analysisMode: expect.any(String),
          agentsUsed: expect.any(Array),
          toolsExecuted: expect.any(Array),
          processingTime: expect.any(Number),
          modelVersions: expect.any(Object),
          reportVersion: '1.0.0'
        });
      }

      // Verify external service calls
      expect(mockReportingService.generateDependencyGraph).toHaveBeenCalledTimes(reportFormats.length);
      expect(mockReportingService.generateTrendAnalysis).toHaveBeenCalledTimes(reportFormats.length);
    });

    it('should handle skill tracking integration throughout workflow', async () => {
      // Mock skill tracking responses
      mockSkillTrackingService.getCurrentSkills.mockResolvedValue([
        { categoryId: 'security', level: 3, confidence: 0.7 },
        { categoryId: 'codeQuality', level: 7, confidence: 0.9 }
      ]);

      mockSkillTrackingService.assessSkillsFromPR.mockResolvedValue([
        {
          categoryId: 'security',
          skillLevel: 4, // Improved
          confidence: 0.75,
          evidence: ['Fixed critical security issue'],
          timestamp: new Date()
        }
      ]);

      const analysisWithSkills = {
        repository: { url: 'https://github.com/test/repo', name: 'test-repo' },
        pr: { number: 123, title: 'Security fixes', changedFiles: 3 },
        findings: {
          security: [
            { title: 'Fixed XSS vulnerability', severity: 'high', confidence: 0.9 }
          ]
        },
        metrics: { totalFindings: 1, severity: { critical: 0, high: 1, medium: 0, low: 0 } }
      };

      // Inject skill tracking service into educational agent
      (educationalAgent as any).skillTrackingService = mockSkillTrackingService;

      // Generate educational recommendations with skill context
      const educationalResult = await educationalAgent.analyzeFromRecommendations({
        summary: { totalRecommendations: 1 },
        recommendations: [
          { category: 'security', priority: { level: 'high', score: 8 } }
        ]
      } as any);

      expect(mockSkillTrackingService.getCurrentSkills).toHaveBeenCalled();

      // Verify skill-aware content generation
      expect(educationalResult.learningPath.difficulty).toBe('beginner'); // Adjusted for beginner security skills

      // Generate report that includes skill progression
      const report = await reporterAgent.generateStandardReport(
        analysisWithSkills,
        { educational: educationalResult, metadata: {} },
        { summary: { totalRecommendations: 1 }, recommendations: [] },
        { type: 'full-report', includeEducational: true, educationalDepth: 'comprehensive' }
      );

      expect(report.modules.educational.skillGaps).toContainEqual(
        expect.objectContaining({
          skill: expect.any(String),
          currentLevel: expect.any(Number),
          requiredLevel: expect.any(Number)
        })
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large analysis datasets efficiently', async () => {
      // Create large dataset
      const largeAnalysis = {
        repository: { url: 'https://github.com/large/repo', name: 'large-repo' },
        pr: { number: 999, title: 'Major refactoring', changedFiles: 150 },
        findings: {
          security: Array.from({ length: 25 }, (_, i) => ({
            title: `Security issue ${i}`,
            severity: ['critical', 'high', 'medium', 'low'][i % 4],
            file: `src/file${i}.ts`,
            confidence: 0.8 + (Math.random() * 0.2)
          })),
          codeQuality: Array.from({ length: 50 }, (_, i) => ({
            title: `Code quality issue ${i}`,
            severity: ['high', 'medium', 'low'][i % 3],
            file: `src/quality${i}.ts`,
            confidence: 0.7 + (Math.random() * 0.3)
          }))
        },
        metrics: { 
          totalFindings: 75,
          severity: { critical: 6, high: 19, medium: 35, low: 15 }
        }
      };

      const startTime = Date.now();
      
      const report = await reporterAgent.generateStandardReport(
        largeAnalysis,
        { educational: { learningPath: { totalSteps: 10 }, content: {}, insights: {} }, metadata: {} },
        { summary: { totalRecommendations: 30 }, recommendations: [] },
        { type: 'full-report', includeEducational: true, educationalDepth: 'comprehensive' }
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(report).toBeDefined();
      expect(report.overview.totalFindings).toBe(75);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should gracefully handle service failures', async () => {
      // Mock service failures
      mockVectorDB.search.mockRejectedValue(new Error('Vector DB unavailable'));
      mockReportingService.generateDependencyGraph.mockRejectedValue(new Error('Dependency service down'));

      const basicAnalysis = {
        repository: { url: 'https://github.com/test/repo', name: 'test-repo' },
        pr: { number: 1, title: 'Test PR', changedFiles: 1 },
        findings: { security: [] },
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 } }
      };

      // Should not throw errors, but gracefully degrade
      const report = await reporterAgent.generateStandardReport(
        basicAnalysis,
        { educational: { learningPath: { totalSteps: 0 }, content: {}, insights: {} }, metadata: {} },
        { summary: { totalRecommendations: 0 }, recommendations: [] },
        { type: 'pr-comment', includeEducational: false, educationalDepth: 'summary' }
      );

      expect(report).toBeDefined();
      expect(report.overview.riskLevel).toBe('low');
      // Should have basic structure even with service failures
      expect(report.exports.prComment).toContain('CodeQual Analysis');
    });

    it('should validate input data and provide meaningful errors', async () => {
      const invalidAnalysis = {
        // Missing required fields
        repository: {},
        pr: { number: 'invalid' }, // Wrong type
        findings: null,
        metrics: undefined
      };

      // Should handle invalid input gracefully
      await expect(reporterAgent.generateStandardReport(
        invalidAnalysis as any,
        {},
        {},
        { type: 'pr-comment', includeEducational: false, educationalDepth: 'summary' }
      )).resolves.toBeDefined();
    });
  });

  describe('Integration with External Services', () => {
    it('should properly integrate with vector database for educational content', async () => {
      mockVectorDB.search.mockResolvedValue([
        {
          id: 'tutorial-1',
          title: 'Advanced Security Patterns',
          content: 'Comprehensive guide to security implementation...',
          metadata: { difficulty: 'advanced', category: 'security', rating: 4.8 },
          score: 0.95
        }
      ]);

      const securityAnalysis = {
        repository: { url: 'https://github.com/test/repo', name: 'test-repo' },
        pr: { number: 1, title: 'Security improvements' },
        findings: {
          security: [
            { title: 'Authentication bypass', severity: 'critical', category: 'auth' }
          ]
        },
        metrics: { totalFindings: 1, severity: { critical: 1, high: 0, medium: 0, low: 0 } }
      };

      const report = await reporterAgent.generateStandardReport(
        securityAnalysis,
        { educational: { learningPath: { totalSteps: 1 }, content: {}, insights: {} }, metadata: {} },
        { summary: { totalRecommendations: 1 }, recommendations: [] },
        { type: 'full-report', includeEducational: true, educationalDepth: 'comprehensive' }
      );

      // Verify vector DB was queried for relevant educational content
      expect(mockVectorDB.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('security'),
          filters: expect.objectContaining({
            contentType: 'educational'
          })
        })
      );

      // Verify educational content was enhanced with vector search results
      expect(report.modules.educational.content.resources).toContainEqual(
        expect.objectContaining({
          title: 'Advanced Security Patterns',
          type: 'tutorial'
        })
      );
    });

    it('should generate appropriate visualizations for different data types', async () => {
      const visualizationTestAnalysis = {
        repository: { url: 'https://github.com/test/repo', name: 'test-repo' },
        pr: { number: 1, title: 'Comprehensive changes' },
        findings: {
          security: [{ severity: 'critical' }, { severity: 'high' }],
          codeQuality: [{ severity: 'medium' }, { severity: 'low' }],
          performance: [{ severity: 'high' }]
        },
        metrics: {
          totalFindings: 5,
          severity: { critical: 1, high: 2, medium: 1, low: 1 },
          coverage: 85,
          maintainabilityIndex: 70
        }
      };

      const report = await reporterAgent.generateStandardReport(
        visualizationTestAnalysis,
        { educational: { learningPath: { totalSteps: 3 }, content: {}, insights: {} }, metadata: {} },
        { summary: { totalRecommendations: 5 }, recommendations: [] },
        { type: 'dashboard', includeEducational: true, educationalDepth: 'detailed' }
      );

      // Verify severity distribution chart
      expect(report.visualizations.severityDistribution).toMatchObject({
        type: 'pie',
        title: 'Issue Severity Distribution',
        data: expect.objectContaining({
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: expect.arrayContaining([
            expect.objectContaining({
              data: [1, 2, 1, 1] // Matches the severity counts
            })
          ])
        })
      });

      // Verify category breakdown chart
      expect(report.visualizations.categoryBreakdown).toMatchObject({
        type: 'bar',
        title: 'Issues by Category',
        data: expect.objectContaining({
          labels: expect.arrayContaining(['Security', 'Code Quality', 'Performance'])
        })
      });

      // Verify dependency graph from external service
      expect(report.visualizations.dependencyGraph).toMatchObject({
        nodes: expect.arrayContaining([
          expect.objectContaining({ id: 'express', label: 'Express.js' })
        ]),
        edges: expect.any(Array),
        layout: 'hierarchical'
      });
    });
  });
});