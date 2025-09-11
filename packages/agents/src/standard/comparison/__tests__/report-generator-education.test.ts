import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReportGeneratorV7EnhancedComplete } from '../report-generator-v7-enhanced-complete';

describe('ReportGenerator - Educational Insights', () => {
  let reportGenerator: ReportGeneratorV7EnhancedComplete;
  let mockSkillProvider: any;

  beforeEach(() => {
    mockSkillProvider = {
      getUserSkills: jest.fn(() => Promise.resolve({
        overallScore: 75,
        categoryScores: {
          security: 70,
          performance: 80,
          codeQuality: 75,
          architecture: 70,
          dependencies: 80
        }
      })),
      updateSkills: jest.fn(() => Promise.resolve(true))
    };

    reportGenerator = new ReportGeneratorV7EnhancedComplete(
      mockSkillProvider,
      true // isAuthorizedCaller
    );
  });

  describe('generateEducationalInsights()', () => {
    it('should generate basic insights when no educational content provided', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'SQL Injection vulnerability',
          message: 'User input not sanitized',
          severity: 'critical' as const,
          category: 'security' as const,
          type: 'vulnerability' as const,
          location: { file: 'api/users.ts', line: 45, column: 1 }
        },
        {
          id: 'issue-2',
          title: 'N+1 query problem',
          message: 'Multiple database queries in loop',
          severity: 'high' as const,
          category: 'performance' as const,
          type: 'optimization' as const,
          location: { file: 'services/data.ts', line: 120, column: 1 }
        }
      ];

      const result = (reportGenerator as any).generateEducationalInsights(mockIssues);

      expect(result).toContain('## 8. Educational Insights');
      expect(result).toContain('Security Best Practices');
      expect(result).toContain('Performance Optimization');
      expect(result).toContain('Based on the 1 security issue');
      expect(result).toContain('Based on the 1 performance issue');
    });

    it('should generate enhanced insights when educational content is provided', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Security issue',
          severity: 'critical' as const,
          category: 'security' as const,
          type: 'vulnerability' as const
        }
      ];

      const mockEducationalContent = {
        summary: 'Focus on security improvements',
        priorityTopics: ['security', 'testing'],
        learningPaths: [
          {
            topic: 'security',
            description: 'Security learning path',
            suggestedResources: ['OWASP Top 10', 'Secure Coding']
          }
        ],
        resources: {
          courses: [
            {
              title: 'Web Security Fundamentals',
              provider: 'Udemy',
              duration: '10 hours',
              url: 'https://example.com/course1',
              description: 'Learn security basics'
            }
          ],
          articles: [
            {
              title: 'Preventing SQL Injection',
              author: 'Security Expert',
              url: 'https://example.com/article1'
            }
          ],
          videos: [
            {
              title: 'Security Best Practices',
              channel: 'Tech Channel',
              duration: '30 min',
              url: 'https://example.com/video1'
            }
          ]
        },
        estimatedLearningTime: 660, // 11 hours
        teamRecommendations: [
          'Implement security code reviews',
          'Add security testing to CI/CD'
        ]
      };

      const result = (reportGenerator as any).generateEducationalInsights(
        mockIssues, 
        mockEducationalContent
      );

      expect(result).toContain('## 8. Educational Insights');
      expect(result).toContain('Focus on security improvements');
      expect(result).toContain('Priority Learning Topics');
      expect(result).toContain('Security');
      expect(result).toContain('Testing');
      expect(result).toContain('Recommended Learning Paths');
      expect(result).toContain('Security learning path');
      expect(result).toContain('Educational Resources');
      expect(result).toContain('Web Security Fundamentals');
      expect(result).toContain('Preventing SQL Injection');
      expect(result).toContain('Security Best Practices');
      expect(result).toContain('11h 0m'); // Estimated time
      expect(result).toContain('Team Recommendations');
      expect(result).toContain('Implement security code reviews');
    });

    it('should handle empty issues with educational content', async () => {
      const mockEducationalContent = {
        summary: 'No issues found, keep up the good work!',
        priorityTopics: [],
        learningPaths: [],
        resources: {
          courses: [],
          articles: [],
          videos: []
        },
        estimatedLearningTime: 0,
        teamRecommendations: ['Continue best practices']
      };

      const result = (reportGenerator as any).generateEducationalInsights(
        [], 
        mockEducationalContent
      );

      expect(result).toContain('## 8. Educational Insights');
      expect(result).toContain('No issues found, keep up the good work!');
      expect(result).toContain('Continue best practices');
    });

    it('should format topic names correctly', () => {
      const formatted = (reportGenerator as any).formatTopicName('code-quality');
      expect(formatted).toBe('Code Quality');

      const formatted2 = (reportGenerator as any).formatTopicName('security');
      expect(formatted2).toBe('Security');

      const formatted3 = (reportGenerator as any).formatTopicName('test-coverage-analysis');
      expect(formatted3).toBe('Test Coverage Analysis');
    });

    it('should categorize issues correctly for educational content', () => {
      const mockIssues = [
        { title: 'SQL injection vulnerability', message: 'Security issue' },
        { title: 'Performance optimization needed', message: 'Slow query' },
        { title: 'Missing test coverage', message: 'No tests' },
        { title: 'Architecture improvement', message: 'Design issue' },
        { title: 'Outdated dependency', message: 'Old package' },
        { title: 'Code duplication', message: 'Repeated code' }
      ];

      const categories = (reportGenerator as any).categorizeIssues(mockIssues);

      expect(categories.has('security')).toBe(true);
      expect(categories.has('performance')).toBe(true);
      expect(categories.has('testing')).toBe(true);
      expect(categories.has('architecture')).toBe(true);
      expect(categories.has('dependencies')).toBe(true);
      expect(categories.has('code-quality')).toBe(true);
    });

    it('should limit resources to top 5 per category', () => {
      const mockEducationalContent = {
        resources: {
          courses: Array(10).fill({
            title: 'Course',
            provider: 'Provider',
            url: 'https://example.com'
          }),
          articles: Array(10).fill({
            title: 'Article',
            author: 'Author',
            url: 'https://example.com'
          }),
          videos: Array(10).fill({
            title: 'Video',
            channel: 'Channel',
            url: 'https://example.com'
          })
        }
      };

      const result = (reportGenerator as any).generateEducationalInsights(
        [],
        mockEducationalContent
      );

      // Count occurrences of each resource type header
      const courseMatches = (result.match(/\*\*Course\*\*/g) || []).length;
      const articleMatches = (result.match(/\*\*Article\*\*/g) || []).length;
      const videoMatches = (result.match(/\*\*Video\*\*/g) || []).length;

      expect(courseMatches).toBeLessThanOrEqual(5);
      expect(articleMatches).toBeLessThanOrEqual(5);
      expect(videoMatches).toBeLessThanOrEqual(5);
    });
  });

  describe('decimal precision fixes', () => {
    it('should round scores to 2 decimal places', () => {
      const rounded = (reportGenerator as any).roundToTwo(55.010000000000005);
      expect(rounded).toBe(55.01);

      const rounded2 = (reportGenerator as any).roundToTwo(75.999999999999);
      expect(rounded2).toBe(76);

      const rounded3 = (reportGenerator as any).roundToTwo(33.333333333);
      expect(rounded3).toBe(33.33);
    });

    it('should format scores with exactly 2 decimal places', () => {
      const formatted = (reportGenerator as any).formatScore(55.010000000000005);
      expect(formatted).toBe('55.01');

      const formatted2 = (reportGenerator as any).formatScore(75);
      expect(formatted2).toBe('75.00');

      const formatted3 = (reportGenerator as any).formatScore(33.3);
      expect(formatted3).toBe('33.30');
    });
  });

  describe('generateReport() with educational content', () => {
    it('should include educational insights in the full report', async () => {
      const mockComparison = {
        mainBranchAnalysis: {
          issues: [],
          score: 75
        },
        featureBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Security issue',
              severity: 'high' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            }
          ],
          score: 70
        },
        prMetadata: {
          repository_url: 'https://github.com/test/repo',
          number: 123,
          author: 'developer123'
        },
        educationalInsights: {
          summary: 'Security improvements needed',
          resources: {
            courses: [{ title: 'Security Course' }],
            articles: [],
            videos: []
          }
        },
        comparison: {
          newIssues: [
            {
              id: 'issue-1',
              title: 'Security issue',
              severity: 'high' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            }
          ],
          resolvedIssues: [],
          unchangedIssues: []
        }
      };

      const report = await reportGenerator.generateReport(mockComparison as any);

      expect(report).toContain('## 8. Educational Insights');
      expect(report).toContain('Security improvements needed');
      expect(report).toContain('Security Course');
    });
  });
});