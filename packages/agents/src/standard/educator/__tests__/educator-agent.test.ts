import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EducatorAgent } from '../educator-agent';

describe('EducatorAgent', () => {
  let educatorAgent: EducatorAgent;

  beforeEach(() => {
    educatorAgent = new EducatorAgent();
  });

  describe('research()', () => {
    it('should generate educational content for security issues', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'SQL Injection vulnerability found',
          message: 'User input not sanitized',
          severity: 'critical'
        },
        {
          id: 'issue-2',
          title: 'XSS vulnerability in template',
          message: 'Unescaped user content',
          severity: 'high'
        }
      ];

      const result = await educatorAgent.research({
        issues: mockIssues,
        developerLevel: 'intermediate'
      });

      expect(result).toBeDefined();
      expect(result.summary).toContain('security');
      expect(result.learningPaths).toBeDefined();
      expect(result.learningPaths.length).toBeGreaterThan(0);
      expect(result.resources).toBeDefined();
      expect(result.resources.courses).toBeDefined();
      expect(result.resources.articles).toBeDefined();
      expect(result.resources.videos).toBeDefined();
      expect(result.priorityTopics).toContain('security');
    });

    it('should generate educational content for performance issues', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'N+1 query problem detected',
          message: 'Multiple database queries in loop',
          severity: 'high'
        },
        {
          id: 'issue-2',
          title: 'Missing cache implementation',
          message: 'Frequent database calls without caching',
          severity: 'medium'
        }
      ];

      const result = await educatorAgent.research({
        issues: mockIssues,
        developerLevel: 'beginner'
      });

      expect(result).toBeDefined();
      expect(result.summary).toContain('performance');
      expect(result.learningPaths).toBeDefined();
      expect(result.priorityTopics).toContain('performance');
      expect(result.estimatedLearningTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed issue types', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Security vulnerability',
          severity: 'critical'
        },
        {
          id: 'issue-2',
          title: 'Performance optimization needed',
          severity: 'medium'
        },
        {
          id: 'issue-3',
          title: 'Missing test coverage',
          severity: 'low'
        }
      ];

      const result = await educatorAgent.research({
        issues: mockIssues,
        developerLevel: 'senior'
      });

      expect(result.learningPaths.length).toBeGreaterThanOrEqual(3);
      expect(result.priorityTopics).toContain('security');
      expect(result.priorityTopics.length).toBeLessThanOrEqual(5);
    });

    it('should generate team recommendations when team profile is provided', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          title: 'Code quality issue',
          severity: 'medium'
        }
      ];

      const mockTeamProfile = {
        weakestSkills: ['testing', 'documentation']
      };

      const result = await educatorAgent.research({
        issues: mockIssues,
        developerLevel: 'intermediate',
        teamProfile: mockTeamProfile
      });

      expect(result.teamRecommendations).toBeDefined();
      expect(result.teamRecommendations.length).toBeGreaterThan(0);
      expect(result.teamRecommendations.some((rec: string) => 
        rec.includes('testing') || rec.includes('documentation')
      )).toBe(true);
    });

    it('should handle empty issues array', async () => {
      const result = await educatorAgent.research({
        issues: [],
        developerLevel: 'intermediate'
      });

      expect(result).toBeDefined();
      expect(result.learningPaths).toEqual([]);
      expect(result.resources.courses).toEqual([]);
      expect(result.resources.articles).toEqual([]);
      expect(result.resources.videos).toEqual([]);
      expect(result.estimatedLearningTime).toBe(0);
    });

    it('should return fallback response on error', async () => {
      // Mock the extractIssuePatterns to throw an error
      jest.spyOn(educatorAgent as any, 'extractIssuePatterns').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await educatorAgent.research({
        issues: [{ title: 'test', severity: 'low' }],
        developerLevel: 'intermediate'
      });

      expect(result).toBeDefined();
      expect(result.summary).toContain('failed');
      expect(result.learningPaths).toEqual([]);
      expect(result.resources).toEqual({ courses: [], articles: [], videos: [] });
      expect(result.estimatedLearningTime).toBe(0);
    });

    it('should categorize issues correctly', async () => {
      const mockIssues = [
        { title: 'SQL injection found', severity: 'critical' },
        { title: 'XSS vulnerability', severity: 'high' },
        { title: 'N+1 query problem', severity: 'medium' },
        { title: 'Missing tests', severity: 'low' },
        { title: 'Architecture improvement needed', severity: 'medium' },
        { title: 'Outdated dependency', severity: 'high' }
      ];

      const result = await educatorAgent.research({
        issues: mockIssues,
        developerLevel: 'intermediate'
      });

      const topics = result.priorityTopics;
      expect(topics).toContain('security');
      expect(topics).toContain('performance');
      
      // Security should be prioritized due to critical severity
      expect(topics[0]).toBe('security');
    });

    it('should calculate learning time based on resources', async () => {
      const mockIssues = [
        { title: 'Complex security issue', severity: 'critical' },
        { title: 'Performance problem', severity: 'high' }
      ];

      const result = await educatorAgent.research({
        issues: mockIssues,
        developerLevel: 'beginner'
      });

      // Should have some learning time for courses, articles, and videos
      expect(result.estimatedLearningTime).toBeGreaterThan(0);
      
      // The actual implementation deduplicates resources, so we get:
      // 1 course (120 min) + 1 article (15 min) + 1 video (30 min) = 165 minutes
      expect(result.estimatedLearningTime).toBe(165);
    });
  });

  describe('searchCourses()', () => {
    it('should return mock courses for any query', async () => {
      const result = await educatorAgent.searchCourses({
        query: 'security',
        filters: { level: 'intermediate', duration: 'any' }
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('provider');
    });
  });

  describe('searchArticles()', () => {
    it('should return mock articles for any query', async () => {
      const result = await educatorAgent.searchArticles({
        query: 'performance',
        filters: {}
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('author');
    });
  });

  describe('searchVideos()', () => {
    it('should return mock videos for any query', async () => {
      const result = await educatorAgent.searchVideos({
        query: 'testing',
        filters: {}
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('channel');
    });
  });

  describe('findMatchingCourses()', () => {
    it('should return educational enhancements with courses and learning path', async () => {
      const params = {
        suggestions: [
          { 
            issue: 'Security issue', 
            priority: 'immediate' as const,
            topic: 'security',
            reason: 'Critical security vulnerability found',
            category: 'security' as const,
            level: 'intermediate' as const
          },
          { 
            issue: 'Performance issue', 
            priority: 'short-term' as const,
            topic: 'performance',
            reason: 'Performance optimization needed',
            category: 'performance' as const,
            level: 'intermediate' as const
          }
        ],
        developerLevel: 'intermediate' as const
      };

      const result = await educatorAgent.findMatchingCourses(params);

      expect(result).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.articles).toBeDefined();
      expect(result.videos).toBeDefined();
      expect(result.personalizedPath).toBeDefined();
      expect(result.estimatedLearningTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty suggestions', async () => {
      const params = {
        suggestions: [],
        developerLevel: 'senior' as const
      };

      const result = await educatorAgent.findMatchingCourses(params);

      expect(result.courses).toEqual([]);
      expect(result.articles).toEqual([]);
      expect(result.videos).toEqual([]);
      expect(result.estimatedLearningTime).toBe(0);
    });
  });

  describe('createLearningPath()', () => {
    it('should create a learning path from resources', async () => {
      const mockResources = [
        {
          title: 'Security Course',
          provider: 'Udemy',
          duration: '2 hours',
          url: 'https://example.com/course1',
          relevance: 0.9
        },
        {
          title: 'Security Article',
          author: 'John Doe',
          readTime: '15 min',
          url: 'https://example.com/article1',
          relevance: 0.7
        }
      ];

      const mockProfile = {
        userId: 'test',
        username: 'test',
        overallScore: 70,
        categoryScores: { 
          security: 60, 
          performance: 70, 
          codeQuality: 75, 
          architecture: 70, 
          dependencies: 65 
        },
        level: { 
          current: 'intermediate' as const, 
          numeric: 70, 
          title: 'intermediate' 
        },
        trend: { direction: 'stable' as const, change: 0, period: '30d' },
        lastUpdated: new Date(),
        totalPRs: 10,
        issuesFixed: { critical: 2, high: 5, medium: 10, low: 20 },
        issuesIntroduced: { critical: 0, high: 1, medium: 3, low: 5 }
      };

      const result = await educatorAgent.createLearningPath(
        mockResources as any,
        mockProfile
      );

      expect(result).toBeDefined();
      expect(result.totalDuration).toBeDefined();
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].order).toBe(1);
      expect(result.steps[0].resource).toBeDefined();
      expect(result.steps[0].reason).toBeDefined();
    });

    it('should sort resources by relevance', async () => {
      const mockResources = [
        { title: 'Low Relevance', relevance: 0.3, duration: '1 hour' },
        { title: 'High Relevance', relevance: 0.9, duration: '1 hour' },
        { title: 'Medium Relevance', relevance: 0.6, duration: '1 hour' }
      ];

      const mockProfile = {
        userId: 'test',
        username: 'test',
        overallScore: 50,
        categoryScores: { 
          security: 50, 
          performance: 50, 
          codeQuality: 50, 
          architecture: 50, 
          dependencies: 50 
        },
        level: { current: 'beginner' as const, numeric: 50, title: 'beginner' },
        trend: { direction: 'stable' as const, change: 0, period: '30d' },
        lastUpdated: new Date(),
        totalPRs: 0,
        issuesFixed: { critical: 0, high: 0, medium: 0, low: 0 },
        issuesIntroduced: { critical: 0, high: 0, medium: 0, low: 0 }
      };

      const result = await educatorAgent.createLearningPath(
        mockResources as any,
        mockProfile
      );

      expect(result.steps[0].resource.title).toBe('High Relevance');
      expect(result.steps[1].resource.title).toBe('Medium Relevance');
      expect(result.steps[2].resource.title).toBe('Low Relevance');
    });
  });
});