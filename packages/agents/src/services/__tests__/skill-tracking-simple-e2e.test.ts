/**
 * Simplified End-to-End tests for Skill Tracking System
 * Tests core functionality with working interfaces
 */

import { SkillTrackingService } from '../skill-tracking-service';
import { SkillAwareRAGService } from '../skill-aware-rag-service';

// Mock authenticated user with complete interface
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

// Mock skill database
const mockSkillModel = {
  createCategory: jest.fn(),
  createSkill: jest.fn(),
  updateSkill: jest.fn(),
  getUserSkills: jest.fn(),  // Fixed method name
  getSkillsByUser: jest.fn(),
  getSkillHistory: jest.fn(),
  recordSkillHistory: jest.fn()
};

import { SkillModel } from '@codequal/database/models/skill';

jest.mock('@codequal/database/models/skill', () => ({
  SkillModel: {
    getUserSkills: jest.fn(),
    updateSkill: jest.fn(),
    createSkill: jest.fn(),
    recordSkillHistory: jest.fn(),
    getSkillHistory: jest.fn()
  }
}));

jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('Skill Tracking System - Simplified E2E Tests', () => {
  let skillTrackingService: SkillTrackingService;
  let skillAwareRAGService: SkillAwareRAGService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    skillTrackingService = new SkillTrackingService(mockAuthenticatedUser);
    skillAwareRAGService = new SkillAwareRAGService(mockAuthenticatedUser);
  });

  describe('Core Skill Assessment Workflow', () => {
    it('should assess skills from PR analysis and track progression', async () => {
      // Mock current user skills
      SkillModel.getUserSkills.mockResolvedValue([
        { categoryId: 'security', level: 4, confidence: 0.8 },
        { categoryId: 'codeQuality', level: 6, confidence: 0.9 }
      ]);

      // Simple PR analysis data
      const prAnalysis = {
        findings: {
          security: [
            {
              title: 'SQL Injection vulnerability',
              severity: 'critical',
              file: 'src/database.ts',
              confidence: 0.95
            }
          ],
          codeQuality: [
            {
              title: 'Complex function',
              severity: 'medium', 
              file: 'src/utils.ts',
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
        complexity: 8
      };

      mockSkillModel.updateSkill.mockResolvedValue({ success: true });

      // Step 1: Assess skills from PR
      const skillAssessments = await skillTrackingService.assessSkillsFromPR(prAnalysis, prMetadata);

      expect(skillAssessments).toHaveLength(2);
      expect(skillAssessments[0]).toMatchObject({
        category: expect.any(String),
        demonstratedLevel: expect.any(Number),
        confidence: expect.any(Number),
        evidence: expect.objectContaining({
          type: expect.any(String),
          sourceId: expect.any(String),
          description: expect.any(String)
        })
      });

      // Step 2: Update skills with assessments
      await skillTrackingService.updateSkillsFromAssessments(skillAssessments);

      expect(mockSkillModel.updateSkill).toHaveBeenCalled();

      // Step 3: Track learning engagement
      const learningEngagement = {
        educationalContentId: 'security-tutorial-1',
        engagementType: 'completed' as const,
        skillsTargeted: ['security'],
        improvementObserved: true,
        timestamp: new Date()
      };

      await skillTrackingService.trackLearningEngagement(learningEngagement);

      expect(mockSkillModel.recordSkillHistory).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        expect.objectContaining({
          engagementType: 'completed',
          improvementObserved: true
        })
      );
    });

    it('should enhance RAG queries with skill context', async () => {
      // Mock user skills for RAG enhancement
      mockSkillModel.getUserSkills.mockResolvedValue([
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
        learningIntent: true,
        personalizationApplied: expect.any(Array)
      });

      // Test result re-ranking based on skills with complete interface
      const mockSearchResults = [
        {
          content: 'Advanced JWT implementation with custom claims',
          score: 0.9,
          metadata: { difficulty: 'advanced', topic: 'security' },
          skillAdjustedScore: 0.85,
          skillRelevance: {
            appropriateLevel: false,
            skillGap: 3,
            learningOpportunity: false,
            recommendedPrerequisites: ['Build foundational skills']
          },
          personalizedRanking: 70
        },
        {
          content: 'Basic JWT tutorial for beginners',
          score: 0.7,
          metadata: { difficulty: 'beginner', topic: 'security' },
          skillAdjustedScore: 0.9,
          skillRelevance: {
            appropriateLevel: true,
            skillGap: 0,
            learningOpportunity: true,
            recommendedPrerequisites: []
          },
          personalizedRanking: 90
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

    it('should generate learning recommendations based on skill levels', async () => {
      mockSkillModel.getUserSkills.mockResolvedValue([
        { categoryId: 'security', level: 2, confidence: 0.6 },
        { categoryId: 'performance', level: 8, confidence: 0.9 },
        { categoryId: 'architecture', level: 5, confidence: 0.8 }
      ]);

      const searchResults = [
        {
          content: 'Advanced performance optimization techniques',
          score: 0.9,
          metadata: { difficulty: 'advanced', topic: 'performance' },
          skillAdjustedScore: 0.95,
          skillRelevance: {
            appropriateLevel: true,
            skillGap: 0,
            learningOpportunity: false,
            recommendedPrerequisites: []
          },
          personalizedRanking: 95
        },
        {
          content: 'Security fundamentals for beginners',
          score: 0.8,
          metadata: { difficulty: 'beginner', topic: 'security' },
          skillAdjustedScore: 0.9,
          skillRelevance: {
            appropriateLevel: true,
            skillGap: 1,
            learningOpportunity: true,
            recommendedPrerequisites: []
          },
          personalizedRanking: 90
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

  describe('Error Handling', () => {
    it('should handle missing user skills gracefully', async () => {
      mockSkillModel.getUserSkills.mockResolvedValue([]);

      const skills = await skillTrackingService.getCurrentSkills();
      expect(skills).toEqual([]);

      // Should still work with empty skills
      const query = await skillAwareRAGService.enhanceQueryWithSkills('test query');
      expect(query.skillContext.userLevel).toBe(5); // Default level
    });

    it('should handle database errors gracefully', async () => {
      mockSkillModel.getUserSkills.mockRejectedValue(new Error('Database connection failed'));

      // Should not throw, but return defaults
      const skills = await skillTrackingService.getCurrentSkills();
      expect(skills).toEqual([]);

      // Skill assessment should still work without throwing
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
      const validAssessment = {
        category: 'security',
        demonstratedLevel: 8,
        confidence: 0.9,
        evidence: {
          type: 'pr_analysis' as const,
          sourceId: 'PR-123',
          description: 'Fixed security vulnerability',
          severity: 'high' as const,
          complexity: 7
        }
      };

      mockSkillModel.updateSkill.mockResolvedValue({ success: true });

      // Should work with valid assessment
      await expect(skillTrackingService.updateSkillsFromAssessments([validAssessment]))
        .resolves.not.toThrow();

      expect(mockSkillModel.updateSkill).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        'security',
        expect.objectContaining({
          level: 8,
          confidence: 0.9
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

      mockSkillModel.getUserSkills.mockResolvedValue(manySkills);

      const startTime = Date.now();
      const skills = await skillTrackingService.getCurrentSkills();
      const endTime = Date.now();

      expect(skills).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should track search engagement appropriately', async () => {
      const searchResults = [
        {
          content: 'Test content',
          score: 0.8,
          metadata: { topic: 'security' },
          skillAdjustedScore: 0.9,
          skillRelevance: {
            appropriateLevel: true,
            skillGap: 1,
            learningOpportunity: true,
            recommendedPrerequisites: []
          },
          personalizedRanking: 85
        }
      ];

      // Should not throw when tracking engagement
      await expect(skillAwareRAGService.trackSearchEngagement(
        'security best practices',
        searchResults,
        true
      )).resolves.not.toThrow();
    });
  });
});