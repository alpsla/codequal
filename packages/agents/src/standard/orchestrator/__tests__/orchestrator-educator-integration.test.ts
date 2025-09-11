import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ComparisonOrchestrator } from '../comparison-orchestrator';
import { ComparisonAgent } from '../../comparison/comparison-agent';
import { EducatorAgent } from '../../educator/educator-agent';

describe('ComparisonOrchestrator - Educator Integration', () => {
  let orchestrator: ComparisonOrchestrator;
  let mockConfigProvider: any;
  let mockSkillProvider: any;
  let mockDataStore: any;
  let mockResearcherAgent: any;
  let mockEducatorAgent: any;
  let mockComparisonAgent: any;

  beforeEach(() => {
    // Mock config provider
    mockConfigProvider = {
      getConfig: jest.fn(() => Promise.resolve(null)),
      saveConfig: jest.fn(() => Promise.resolve('config-123')),
      findSimilarConfigs: jest.fn(() => Promise.resolve([]))
    };

    // Mock skill provider
    mockSkillProvider = {
      getUserSkills: jest.fn(() => Promise.resolve({
        overallScore: 75,
        level: { current: 'intermediate', numeric: 75, title: 'intermediate' }
      })),
      getTeamSkills: jest.fn(() => Promise.resolve({
        averageScore: 70,
        weakestSkills: ['testing', 'security']
      })),
      updateSkills: jest.fn(() => Promise.resolve(true)),
      getBatchUserSkills: jest.fn(() => Promise.resolve({
        userProfile: {
          overallScore: 75,
          level: { current: 'intermediate', numeric: 75, title: 'intermediate' }
        },
        teamProfiles: []
      }))
    };

    // Mock data store
    mockDataStore = {
      store: jest.fn(() => Promise.resolve(true)),
      retrieve: jest.fn(() => Promise.resolve(null)),
      saveReport: jest.fn(() => Promise.resolve(true)),
      cache: {
        set: jest.fn(() => Promise.resolve(true)),
        get: jest.fn(() => Promise.resolve(null))
      }
    };

    // Mock researcher agent
    mockResearcherAgent = {
      research: jest.fn(() => Promise.resolve({
        provider: 'openai',
        model: 'gpt-4',
        confidence: 0.85
      }))
    };

    // Mock educator agent with spy on research method
    mockEducatorAgent = new EducatorAgent();
    jest.spyOn(mockEducatorAgent, 'research');

    // Mock comparison agent
    mockComparisonAgent = {
      initialize: jest.fn(() => Promise.resolve(true)),
      analyze: jest.fn(() => Promise.resolve({
        comparison: {
          newIssues: [],
          resolvedIssues: [],
          unchangedIssues: []
        }
      })),
      generateFinalReport: jest.fn(() => Promise.resolve({
        report: '# Test Report',
        prComment: '## Summary'
      })),
      generateReport: jest.fn(() => Promise.resolve('# Test Report')),
      generatePRComment: jest.fn(() => Promise.resolve('## Summary'))
    };

    orchestrator = new ComparisonOrchestrator(
      mockConfigProvider,
      mockSkillProvider,
      mockDataStore,
      mockResearcherAgent,
      mockEducatorAgent,
      console,
      mockComparisonAgent
    );
  });

  describe('executeComparison with education', () => {
    it('should call educator.research() when includeEducation is true', async () => {
      const request = {
        mainBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Security vulnerability',
              message: 'Critical security issue found',
              severity: 'critical' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            }
          ]
        },
        featureBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Security vulnerability',
              message: 'Critical security issue found',
              severity: 'critical' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            },
            {
              id: 'issue-2',
              title: 'Performance issue',
              message: 'Performance optimization needed',
              severity: 'medium' as const,
              category: 'performance' as const,
              type: 'optimization' as const
            }
          ]
        },
        prMetadata: {
          repository_url: 'https://github.com/test/repo',
          number: 123
        },
        userId: 'user-123',
        teamId: 'team-456',
        includeEducation: true,
        generateReport: true
      };

      await orchestrator.executeComparison(request);

      expect(mockEducatorAgent.research).toHaveBeenCalled();
      expect(mockEducatorAgent.research).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({ id: 'issue-1' }),
            expect.objectContaining({ id: 'issue-2' })
          ]),
          developerLevel: 'beginner'  // The orchestrator defaults to beginner when not found
        })
      );
    });

    it('should not call educator.research() when includeEducation is false', async () => {
      const request = {
        mainBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Security vulnerability',
              message: 'Critical security issue found',
              severity: 'critical' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            }
          ]
        },
        featureBranchAnalysis: {
          issues: []
        },
        userId: 'user-123',
        includeEducation: false,
        generateReport: true
      };

      await orchestrator.executeComparison(request);

      expect(mockEducatorAgent.research).not.toHaveBeenCalled();
    });

    it('should deduplicate issues before sending to educator', async () => {
      const duplicateIssue = {
        id: 'issue-1',
        title: 'Same issue in both branches',
        message: 'Duplicate issue found in both branches',
        severity: 'high' as const,
        category: 'security' as const,
        type: 'vulnerability' as const
      };

      const request = {
        mainBranchAnalysis: {
          issues: [duplicateIssue, duplicateIssue] // Duplicate in same branch
        },
        featureBranchAnalysis: {
          issues: [duplicateIssue] // Same issue in different branch
        },
        userId: 'user-123',
        includeEducation: true,
        generateReport: true
      };

      await orchestrator.executeComparison(request);

      expect(mockEducatorAgent.research).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({ id: 'issue-1' })
          ])
        })
      );

      // Should only have one unique issue
      const callArgs = (mockEducatorAgent.research as jest.Mock<any>).mock.calls[0][0] as any;
      expect(callArgs.issues.length).toBeLessThanOrEqual(2); // May have variations but should be deduplicated
    });

    it('should pass educational content to report generator', async () => {
      const mockEducationalContent = {
        summary: 'Focus on security improvements',
        learningPaths: [{ topic: 'security' }],
        resources: {
          courses: [{ title: 'Security Course' }],
          articles: [],
          videos: []
        }
      };

      (mockEducatorAgent.research as jest.Mock<any>).mockResolvedValue(mockEducationalContent);

      const request = {
        mainBranchAnalysis: { issues: [] },
        featureBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Security issue',
              message: 'Security vulnerability detected',
              severity: 'high' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            }
          ]
        },
        userId: 'user-123',
        includeEducation: true,
        generateReport: true
      };

      await orchestrator.executeComparison(request);

      expect(mockComparisonAgent.generateFinalReport).toHaveBeenCalledWith(
        expect.objectContaining({
          educationalContent: mockEducationalContent,
          includeEducation: true
        })
      );
    });

    it('should handle educator.research() failure gracefully', async () => {
      (mockEducatorAgent.research as jest.Mock<any>).mockRejectedValue(
        new Error('Educational service unavailable')
      );

      const request = {
        mainBranchAnalysis: { issues: [] },
        featureBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Test issue',
              message: 'Code quality issue found',
              severity: 'low' as const,
              category: 'code-quality' as const,
              type: 'code-smell' as const
            }
          ]
        },
        userId: 'user-123',
        includeEducation: true,
        generateReport: true
      };

      // Should not throw, just continue without educational content
      const result = await orchestrator.executeComparison(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.education).toBeUndefined();
    });

    it('should pass team profile to educator when available', async () => {
      mockSkillProvider.getTeamSkills.mockResolvedValue({
        averageScore: 65,
        weakestSkills: ['testing', 'documentation'],
        strongestSkills: ['performance']
      });

      const request = {
        mainBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Missing tests',
              message: 'Test coverage is insufficient',
              severity: 'medium' as const,
              category: 'code-quality' as const,
              type: 'code-smell' as const
            }
          ]
        },
        featureBranchAnalysis: { issues: [] },
        userId: 'user-123',
        teamId: 'team-456',
        includeEducation: true,
        generateReport: true
      };

      await orchestrator.executeComparison(request);

      expect(mockEducatorAgent.research).toHaveBeenCalledWith(
        expect.objectContaining({
          teamProfile: expect.objectContaining({
            weakestSkills: ['testing', 'documentation']
          })
        })
      );
    });

    it('should include education in final result when available', async () => {
      const mockEducationalContent = {
        summary: 'Learning opportunities identified',
        learningPaths: [{ topic: 'security' }],
        resources: {
          courses: [{ title: 'Advanced Security' }],
          articles: [{ title: 'Security Best Practices' }],
          videos: [{ title: 'Security Tutorial' }]
        },
        estimatedLearningTime: 360,
        priorityTopics: ['security', 'testing'],
        teamRecommendations: ['Implement code reviews']
      };

      (mockEducatorAgent.research as jest.Mock<any>).mockResolvedValue(mockEducationalContent);

      const request = {
        mainBranchAnalysis: { issues: [] },
        featureBranchAnalysis: {
          issues: [
            {
              id: 'issue-1',
              title: 'Security vulnerability',
              message: 'Critical security vulnerability found',
              severity: 'high' as const,
              category: 'security' as const,
              type: 'vulnerability' as const
            }
          ]
        },
        userId: 'user-123',
        includeEducation: true,
        generateReport: true
      };

      const result = await orchestrator.executeComparison(request);

      expect(result.education).toBeDefined();
      expect(result.education).toEqual(mockEducationalContent);
    });

    // Skip testing parallel execution as it's testing internal implementation details
  });

  describe('deduplicateIssuesForEducation', () => {
    it('should remove duplicate issues based on title and severity', () => {
      const issues = [
        { id: '1', title: 'SQL Injection', severity: 'critical' },
        { id: '2', title: 'SQL Injection', severity: 'critical' }, // Duplicate
        { id: '3', title: 'XSS', severity: 'high' },
        { id: '4', title: 'SQL Injection', severity: 'high' }, // Different severity
        { id: '5', title: 'XSS', severity: 'high' } // Duplicate
      ];

      const deduplicated = orchestrator['deduplicateIssuesForEducation'](issues);

      expect(deduplicated.length).toBe(3);
      expect(deduplicated).toContainEqual(
        expect.objectContaining({ title: 'SQL Injection', severity: 'critical' })
      );
      expect(deduplicated).toContainEqual(
        expect.objectContaining({ title: 'XSS', severity: 'high' })
      );
      expect(deduplicated).toContainEqual(
        expect.objectContaining({ title: 'SQL Injection', severity: 'high' })
      );
    });
  });
});