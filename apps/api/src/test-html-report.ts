import { HtmlReportGenerator } from './services/html-report-generator';
import { StandardReport } from '@codequal/agents';

// Example of how to use the HTML Report Generator

async function generateTestReport() {
  const generator = new HtmlReportGenerator();
  
  // This would normally come from ReportFormatterService
  const mockStandardReport: StandardReport = {
    id: 'report_test_123',
    repositoryUrl: 'https://github.com/alpinro/codequal-api',
    prNumber: 142,
    timestamp: new Date(),
    
    overview: {
      executiveSummary: 'PR analysis completed with 8 issues found across security, performance, and code quality categories.',
      analysisScore: 68,
      riskLevel: 'medium',
      totalFindings: 8,
      totalRecommendations: 4,
      learningPathAvailable: true,
      estimatedRemediationTime: '4-6 hours'
    },
    
    modules: {
      findings: {
        summary: 'Found 8 issues with 2 critical security concerns',
        categories: {
          security: {
            name: 'Security',
            icon: '🔒',
            count: 3,
            findings: [
              {
                id: 'sec_1',
                title: 'SQL Injection Vulnerability',
                description: 'User input is directly concatenated into SQL query',
                severity: 'critical',
                category: 'security',
                file: 'src/controllers/userController.js',
                line: 42,
                codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + req.params.id;',
                recommendation: 'Use parameterized queries',
                confidence: 0.95,
                tags: ['sql-injection', 'security', 'critical']
              },
              {
                id: 'sec_2',
                title: 'XSS Vulnerability',
                description: 'Unescaped user input rendered in HTML',
                severity: 'critical',
                category: 'security',
                file: 'src/views/renderer.js',
                line: 78,
                recommendation: 'Sanitize user input before rendering',
                confidence: 0.9,
                tags: ['xss', 'security', 'critical']
              }
            ],
            summary: 'Found 3 security issues: 2 critical, 1 high'
          },
          architecture: {
            name: 'Architecture',
            icon: '🏗️',
            count: 0,
            findings: [],
            summary: 'No architecture issues found'
          },
          performance: {
            name: 'Performance',
            icon: '⚡',
            count: 1,
            findings: [
              {
                id: 'perf_1',
                title: 'N+1 Query Problem',
                description: 'Database queries in loop causing performance issues',
                severity: 'medium',
                category: 'performance',
                file: 'src/services/postService.js',
                line: 102,
                recommendation: 'Use JOIN query instead of multiple queries',
                confidence: 0.8,
                tags: ['performance', 'database', 'n+1']
              }
            ],
            summary: 'Found 1 performance issue: 1 medium'
          },
          codeQuality: {
            name: 'Code Quality',
            icon: '✨',
            count: 2,
            findings: [],
            summary: 'Found 2 code quality issues: 2 low'
          },
          dependencies: {
            name: 'Dependencies',
            icon: '📦',
            count: 2,
            findings: [],
            summary: 'Found 2 dependency issues: 1 high, 1 medium'
          }
        },
        criticalFindings: [],
        totalCount: 8
      },
      
      recommendations: {
        summary: 'Prioritized recommendations to improve code quality',
        totalRecommendations: 4,
        categories: [
          {
            name: 'Security',
            recommendations: [
              {
                id: 'rec_1',
                title: 'Fix SQL Injection Vulnerability',
                description: 'Replace string concatenation with parameterized queries',
                rationale: 'Prevents database manipulation attacks',
                priority: {
                  level: 'critical',
                  score: 10,
                  justification: 'Security vulnerability'
                },
                implementation: {
                  steps: ['Use prepared statements', 'Test with various inputs'],
                  estimatedTime: '1 hour',
                  difficulty: 'easy',
                  requiredSkills: ['SQL', 'Security']
                },
                relatedFindings: ['sec_1'],
                educationalResources: [],
                category: 'security'
              }
            ],
            estimatedEffort: '2 hours',
            impactScore: 9
          }
        ],
        priorityMatrix: {
          critical: [],
          high: [],
          medium: [],
          low: []
        },
        implementationPlan: {
          phases: [],
          totalEstimatedTime: '4 hours',
          teamSizeRecommendation: 2
        }
      },
      
      educational: {
        summary: 'Personalized learning path to address skill gaps',
        learningPath: {
          id: 'path_1',
          title: 'Security Best Practices',
          description: 'Learn to write secure code',
          difficulty: 'intermediate',
          estimatedTime: '4 hours',
          steps: [
            {
              id: 'step_1',
              order: 1,
              title: 'Understanding SQL Injection',
              description: 'Learn about SQL injection attacks and prevention',
              type: 'concept',
              estimatedTime: '1 hour',
              resources: []
            }
          ]
        },
        content: {
          explanations: [],
          tutorials: [
            {
              id: 'tut_1',
              title: 'Secure Coding Practices',
              description: 'Learn how to write secure code',
              type: 'tutorial',
              content: 'Tutorial content here',
              relevance: 0.9,
              difficulty: 'intermediate',
              tags: ['security', 'best-practices'],
              relatedTo: ['sec_1', 'sec_2']
            }
          ],
          bestPractices: [],
          resources: []
        },
        skillGaps: [
          {
            skill: 'Security',
            currentLevel: 4,
            requiredLevel: 8,
            importance: 'high',
            resources: []
          }
        ],
        certifications: []
      },
      
      metrics: {
        summary: 'Code quality metrics',
        scores: {
          overall: {
            name: 'Overall Quality',
            score: 68,
            rating: 'C',
            description: 'Good with room for improvement',
            factors: []
          },
          security: {
            name: 'Security',
            score: 45,
            rating: 'F',
            description: 'Critical issues found',
            factors: []
          },
          maintainability: {
            name: 'Maintainability',
            score: 75,
            rating: 'C',
            description: 'Generally maintainable',
            factors: []
          },
          performance: {
            name: 'Performance',
            score: 70,
            rating: 'C',
            description: 'Some optimization needed',
            factors: []
          },
          reliability: {
            name: 'Reliability',
            score: 80,
            rating: 'B',
            description: 'Good error handling',
            factors: []
          }
        },
        trends: [],
        benchmarks: [],
        improvements: []
      },
      
      insights: {
        summary: 'Key insights from analysis',
        keyInsights: [
          {
            id: 'insight_1',
            title: 'Security Vulnerabilities Require Immediate Attention',
            description: 'Critical security issues found that could lead to data breaches',
            significance: 'high',
            category: 'security',
            evidence: ['SQL injection', 'XSS vulnerability']
          }
        ],
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
        title: 'Skill Progress',
        data: {}
      }
    },
    
    exports: {
      prComment: '## CodeQual Analysis Results\n\nFound 8 issues requiring attention.',
      emailFormat: 'Email format here',
      slackFormat: 'Slack format here',
      markdownReport: 'Markdown report here',
      jsonReport: '{}'
    },
    
    metadata: {
      analysisMode: 'comprehensive',
      agentsUsed: ['security', 'performance', 'codeQuality'],
      toolsExecuted: ['eslint', 'npm-audit'],
      processingTime: 4523,
      modelVersions: {},
      reportVersion: '1.0.0'
    }
  };
  
  // Mock PR context
  const prContext = {
    primaryLanguage: 'TypeScript',
    changedFiles: { length: 23 },
    linesAdded: 487,
    linesRemoved: 132
  };
  
  // Generate HTML
  const html = generator.generateHtmlReport(mockStandardReport, prContext);
  
  // Save to file
  const outputPath = './test-generated-report.html';
  generator.saveHtmlReport(html, outputPath);
  
  console.log(`✅ HTML report generated successfully!`);
  console.log(`📄 Saved to: ${outputPath}`);
}

// Run the test
generateTestReport().catch(console.error);