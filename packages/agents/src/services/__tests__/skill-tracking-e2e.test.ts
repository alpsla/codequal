/**
 * End-to-End tests for Skill Tracking System
 * Tests the complete skill tracking workflow from PR analysis to skill progression
 */

import { SkillTrackingService } from '../skill-tracking-service';
import { PRSkillAssessmentService } from '../pr-skill-assessment-service';
import { SkillIntegrationService } from '../skill-integration-service';
import { SkillAwareRAGService } from '../skill-aware-rag-service';

// Mock dependencies
const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  permissions: ['read', 'write'],
  role: 'developer',
  status: 'active',
  session: {
    token: 'mock-token',
    expiresAt: new Date(Date.now() + 86400000)
  }
};

const mockSkillModel = {
  createCategory: jest.fn(),
  createSkill: jest.fn(),
  updateSkill: jest.fn(),
  getSkillsByUser: jest.fn(),
  getUserSkills: jest.fn(),
  getSkillHistory: jest.fn(),
  recordSkillHistory: jest.fn()
};

// Mock database module
jest.mock('@codequal/database/models/skill', () => ({
  SkillModel: mockSkillModel
}));

describe('Skill Tracking System - End-to-End Tests', () => {
  let skillTrackingService: SkillTrackingService;
  let prSkillAssessmentService: PRSkillAssessmentService;
  let skillIntegrationService: SkillIntegrationService;
  let skillAwareRAGService: SkillAwareRAGService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock responses that both getSkillsByUser and getUserSkills return the same data
    const defaultSkills = [
      { categoryId: 'security', level: 4, confidence: 0.8 },
      { categoryId: 'codeQuality', level: 6, confidence: 0.9 }
    ];
    mockSkillModel.getSkillsByUser.mockResolvedValue(defaultSkills);
    mockSkillModel.getUserSkills.mockResolvedValue(defaultSkills);
    
    skillTrackingService = new SkillTrackingService(mockAuthenticatedUser);
    prSkillAssessmentService = new PRSkillAssessmentService(mockAuthenticatedUser);
    skillIntegrationService = new SkillIntegrationService(mockAuthenticatedUser);
    skillAwareRAGService = new SkillAwareRAGService(mockAuthenticatedUser);
  });

  describe('Complete Skill Assessment Workflow', () => {
    it('should perform end-to-end skill assessment from PR analysis', async () => {
      // Mock current user skills
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 4, confidence: 0.8 },
        { categoryId: 'codeQuality', level: 6, confidence: 0.9 }
      ]);

      // Mock PR analysis data
      const prAnalysis = {
        findings: {
          security: [
            {
              title: 'SQL Injection vulnerability',
              severity: 'critical',
              file: 'src/database.ts',
              line: 45,
              description: 'User input not sanitized',
              confidence: 0.95
            }
          ],
          codeQuality: [
            {
              title: 'Complex function',
              severity: 'medium', 
              file: 'src/utils.ts',
              line: 120,
              description: 'Function has high cyclomatic complexity',
              confidence: 0.85
            }
          ]
        },
        metrics: {
          totalFindings: 2,
          severity: { critical: 1, high: 0, medium: 1, low: 0 }
        }
      };

      const prMetadata = {
        prNumber: 123,
        repository: 'test-repo',
        filesChanged: 2,
        linesChanged: 57,
        complexity: 8,
        branch: 'feature/security-fixes',
        author: mockAuthenticatedUser.email,
        reviewers: ['reviewer@example.com']
      };

      mockSkillModel.createSkill.mockResolvedValue({ id: 'skill-1' });
      mockSkillModel.updateSkill.mockResolvedValue({ id: 'skill-1' });
      mockSkillModel.recordSkillHistory.mockResolvedValue({ id: 'history-1' });

      // Step 1: Assess skills from PR
      const skillAssessments = await skillTrackingService.assessSkillsFromPR(prAnalysis, prMetadata);

      expect(skillAssessments).toHaveLength(2);
      expect(skillAssessments[0]).toMatchObject({
        categoryId: 'security',
        skillLevel: expect.any(Number),
        confidence: expect.any(Number),
        evidence: expect.any(Array)
      });

      // Step 2: Update skills with assessments
      await skillTrackingService.updateSkillsFromAssessments(skillAssessments);

      expect(mockSkillModel.updateSkill).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        'security',
        expect.objectContaining({
          level: expect.any(Number),
          confidence: expect.any(Number)
        })
      );

      // Step 3: Track learning engagement
      const learningEngagement = {
        educationalContentId: 'security-tutorial-1',
        engagementType: 'completed' as const,
        skillsTargeted: ['security'],
        improvementObserved: true,
        timestamp: new Date()
      };

      await skillTrackingService.trackLearningEngagement(learningEngagement);

      expect(mockSkillModel.recordSkillHistory).toHaveBeenCalled();
    });

    it('should integrate skill tracking with result orchestrator workflow', async () => {
      // Mock existing skills
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 3, confidence: 0.7 },
        { categoryId: 'performance', level: 7, confidence: 0.9 }
      ]);

      const processedResults = {
        findings: {
          security: [{ severity: 'high', category: 'auth' }],
          performance: [{ severity: 'medium', category: 'optimization' }]
        },
        recommendations: [
          { category: 'security', priority: { level: 'high', score: 8 } },
          { category: 'performance', priority: { level: 'medium', score: 6 } }
        ]
      };

      // Test skill integration with results - using available method
      const skillContext = await skillIntegrationService.integrateSkillTracking(
        processedResults,
        {
          prNumber: 123,
          repository: 'test-repo',
          filesChanged: 2,
          linesChanged: 57,
          complexity: 8,
          branch: 'feature/security-fixes',
          author: mockAuthenticatedUser.email,
          reviewers: ['reviewer@example.com']
        },
        processedResults
      );

      expect(skillContext).toMatchObject({
        skillAssessment: expect.objectContaining({
          assessments: expect.any(Array),
          skillsUpdated: expect.any(Array)
        }),
        personalizedRecommendations: expect.any(Object),
        learningPathUpdated: expect.any(Boolean),
        engagementTracked: expect.any(Boolean)
      });

      // Verify skill assessment was performed
      expect(skillContext.skillAssessment.assessments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryId: expect.any(String)
          })
        ])
      );
    });

    it('should enhance RAG queries with skill context', async () => {
      // Mock user skills for RAG enhancement
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 2, confidence: 0.6 }, // Beginner
        { categoryId: 'architecture', level: 8, confidence: 0.95 } // Advanced
      ]);

      // Test skill-aware query enhancement
      const originalQuery = 'how to implement JWT authentication securely';
      
      const enhancedQuery = await skillAwareRAGService.enhanceQueryWithSkills(originalQuery);

      expect(enhancedQuery).toMatchObject({
        originalQuery,
        enhancedQuery: expect.stringContaining('beginner'),
        difficultyFilter: 'beginner',
        skillContext: expect.objectContaining({
          userLevel: expect.any(Number),
          focusAreas: expect.arrayContaining(['security'])
        }),
        learningIntent: true
      });

      // Test result re-ranking based on skills
      const mockSearchResults = [
        {
          content: 'Advanced JWT implementation with custom claims',
          score: 0.9,
          metadata: { difficulty: 'advanced', topic: 'security' }
        },
        {
          content: 'Basic JWT tutorial for beginners',
          score: 0.7,
          metadata: { difficulty: 'beginner', topic: 'security' }
        }
      ];

      const reRankedResults = await skillAwareRAGService.reRankResultsWithSkills(
        mockSearchResults,
        enhancedQuery
      );

      // Beginner content should be ranked higher for beginner user
      expect(reRankedResults[0].content).toContain('Basic JWT tutorial');
      expect(reRankedResults[0].skillRelevance.appropriateLevel).toBe(true);
      expect(reRankedResults[1].skillRelevance.appropriateLevel).toBe(false);
    });
  });

  describe('Skill Progression Tracking', () => {
    it('should track skill improvement over time', async () => {
      const initialSkills = [
        { categoryId: 'security', level: 3, confidence: 0.7 }
      ];
      
      const improvedSkills = [
        { categoryId: 'security', level: 5, confidence: 0.85 }
      ];

      mockSkillModel.getSkillsByUser
        .mockResolvedValueOnce(initialSkills)
        .mockResolvedValueOnce(improvedSkills);

      mockSkillModel.getSkillHistory.mockResolvedValue([
        {
          categoryId: 'security',
          oldLevel: 3,
          newLevel: 5,
          improvementReason: 'completed security training',
          timestamp: new Date()
        }
      ]);

      // Get initial skills
      const initial = await skillTrackingService.getCurrentSkills();
      expect(initial[0].level).toBe(3);

      // Simulate skill improvement through learning
      const improvement = {
        categoryId: 'security',
        improvementType: 'learning_completion' as const,
        evidence: ['Completed advanced security course'],
        confidenceBoost: 0.15,
        timestamp: new Date()
      };

      // Simulate skill improvement through learning engagement
      await skillTrackingService.trackLearningEngagement({
        educationalContentId: 'security-course-advanced',
        engagementType: 'completed',
        skillsTargeted: ['security'],
        improvementObserved: true,
        timestamp: new Date()
      });

      // Get updated skills
      const updated = await skillTrackingService.getCurrentSkills();
      expect(updated[0].level).toBe(5);

      // Verify skill history was recorded
      expect(mockSkillModel.recordSkillHistory).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        expect.objectContaining({
          engagementType: 'completed',
          improvementObserved: true
        })
      );
    });

    it('should generate personalized learning recommendations', async () => {
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 2, confidence: 0.6 },
        { categoryId: 'performance', level: 8, confidence: 0.9 },
        { categoryId: 'architecture', level: 5, confidence: 0.8 }
      ]);

      const searchResults = [
        {
          content: 'Advanced performance optimization techniques',
          score: 0.9,
          skillAdjustedScore: 0.85,
          skillRelevance: { appropriateLevel: false, skillGap: 3, learningOpportunity: true, recommendedPrerequisites: ['basic optimization'] },
          personalizedRanking: 2,
          metadata: { difficulty: 'advanced', topic: 'performance' }
        },
        {
          content: 'Security fundamentals for beginners',
          score: 0.8,
          skillAdjustedScore: 0.95,
          skillRelevance: { appropriateLevel: true, skillGap: 0, learningOpportunity: false, recommendedPrerequisites: [] },
          personalizedRanking: 1,
          metadata: { difficulty: 'beginner', topic: 'security' }
        }
      ];

      const queryEnhancement = {
        originalQuery: 'improve application security',
        enhancedQuery: 'improve application security beginner fundamentals',
        difficultyFilter: 'beginner' as const,
        skillContext: {
          userLevel: 5,
          categoryLevels: { security: 2, performance: 8, architecture: 5 },
          focusAreas: ['security'],
          strongAreas: ['performance']
        },
        learningIntent: true,
        personalizationApplied: ['learning-focused', 'beginner-friendly']
      };

      const recommendations = await skillAwareRAGService.generateLearningRecommendations(
        searchResults,
        queryEnhancement
      );

      expect(recommendations).toMatchObject({
        recommendations: expect.arrayContaining([
          expect.stringContaining('Security fundamentals')
        ]),
        prerequisites: expect.any(Array),
        nextSteps: expect.arrayContaining([
          expect.stringContaining('security')
        ]),
        difficultyProgression: expect.arrayContaining([
          expect.stringContaining('basic concepts')
        ])
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing user skills gracefully', async () => {
      mockSkillModel.getSkillsByUser.mockResolvedValue([]);

      const skills = await skillTrackingService.getCurrentSkills();
      expect(skills).toEqual([]);

      // Should still work with empty skills
      const query = await skillAwareRAGService.enhanceQueryWithSkills('test query');
      expect(query.skillContext.userLevel).toBe(5); // Default level
    });

    it('should handle database errors gracefully', async () => {
      mockSkillModel.getSkillsByUser.mockRejectedValue(new Error('Database connection failed'));

      // Should not throw, but return defaults
      const skills = await skillTrackingService.getCurrentSkills();
      expect(skills).toEqual([]);

      // Skill assessment should still work
      const assessment = await skillTrackingService.assessSkillsFromPR({
        findings: { security: [] },
        metrics: { totalFindings: 0, severity: { critical: 0, high: 0, medium: 0, low: 0 } }
      }, {
        prNumber: 1,
        repository: 'test-repo',
        filesChanged: 0,
        linesChanged: 0,
        complexity: 1
      });

      expect(assessment).toEqual([]);
    });

    it('should validate skill level boundaries', async () => {
      const invalidAssessment = {
        category: 'security',
        demonstratedLevel: 15, // Invalid: > 10
        confidence: 1.5, // Invalid: > 1.0
        evidence: {
          type: 'pr_analysis' as const,
          sourceId: 'test-pr-123',
          description: 'Test assessment',
          severity: 'high' as const,
          complexity: 8
        }
      };

      // Should normalize invalid values
      await expect(skillTrackingService.updateSkillsFromAssessments([invalidAssessment]))
        .resolves.not.toThrow();

      expect(mockSkillModel.updateSkill).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        'security',
        expect.objectContaining({
          level: 10, // Capped at 10
          confidence: 1.0 // Capped at 1.0
        })
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large skill datasets efficiently', async () => {
      // Create large dataset
      const manySkills = Array.from({ length: 50 }, (_, i) => ({
        categoryId: `skill-${i}`,
        level: Math.floor(Math.random() * 10) + 1,
        confidence: Math.random()
      }));

      mockSkillModel.getSkillsByUser.mockResolvedValue(manySkills);

      const startTime = Date.now();
      const skills = await skillTrackingService.getCurrentSkills();
      const endTime = Date.now();

      expect(skills).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should cache skill queries appropriately', async () => {
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 5, confidence: 0.8 }
      ]);

      // Multiple calls should use cache
      await skillTrackingService.getCurrentSkills();
      await skillTrackingService.getCurrentSkills();
      await skillTrackingService.getCurrentSkills();

      // Should only call database once due to caching
      expect(mockSkillModel.getSkillsByUser).toHaveBeenCalledTimes(1);
    });
  });
});