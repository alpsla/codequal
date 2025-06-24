/**
 * Integration E2E tests for Skill Tracking + Educational Agent
 * Tests the complete integration between skill assessment and educational content generation
 */

import { EducationalAgent } from '../educational-agent';
import { SkillTrackingService } from '../../services/skill-tracking-service';
import { PRSkillAssessmentService } from '../../services/pr-skill-assessment-service';
import { SkillAwareRAGService } from '../../services/skill-aware-rag-service';

// Mock authenticated user
const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test Developer',
  permissions: ['read', 'write'],
  role: 'developer',
  status: 'active',
  session: {
    token: 'mock-token',
    expiresAt: new Date(Date.now() + 86400000)
  }
};

// Mock vector database
const mockVectorDB = {
  search: jest.fn(),
  store: jest.fn(),
  delete: jest.fn()
};

// Mock skill database
const mockSkillModel = {
  createCategory: jest.fn(),
  createSkill: jest.fn(),
  updateSkill: jest.fn(),
  getSkillsByUser: jest.fn(),
  getSkillHistory: jest.fn(),
  recordSkillHistory: jest.fn()
};

jest.mock('@codequal/database/models/skill', () => ({
  SkillModel: jest.fn().mockImplementation(() => mockSkillModel)
}));

jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

describe('Skill Tracking + Educational Agent Integration E2E', () => {
  let educationalAgent: EducationalAgent;
  let skillTrackingService: SkillTrackingService;
  let prSkillAssessmentService: PRSkillAssessmentService;
  let skillAwareRAGService: SkillAwareRAGService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup vector DB responses
    mockVectorDB.search.mockResolvedValue([
      {
        id: 'resource-1',
        title: 'Advanced Security Patterns',
        content: 'Comprehensive security guide for experienced developers...',
        metadata: { difficulty: 'advanced', category: 'security', rating: 4.8 },
        score: 0.92
      },
      {
        id: 'resource-2', 
        title: 'Security Basics for Beginners',
        content: 'Introduction to web application security fundamentals...',
        metadata: { difficulty: 'beginner', category: 'security', rating: 4.5 },
        score: 0.88
      },
      {
        id: 'resource-3',
        title: 'Code Quality Best Practices',
        content: 'Learn how to write maintainable, clean code...',
        metadata: { difficulty: 'intermediate', category: 'codeQuality', rating: 4.6 },
        score: 0.85
      }
    ]);

    // Initialize services
    educationalAgent = new EducationalAgent(mockVectorDB, mockAuthenticatedUser);
    skillTrackingService = new SkillTrackingService(mockAuthenticatedUser);
    prSkillAssessmentService = new PRSkillAssessmentService(mockAuthenticatedUser);
    skillAwareRAGService = new SkillAwareRAGService(mockAuthenticatedUser);

    // Inject skill tracking service into educational agent
    (educationalAgent as any).skillTrackingService = skillTrackingService;
  });

  describe('Complete Skill-Aware Educational Workflow', () => {
    it('should generate personalized educational content based on user skill levels', async () => {
      // Step 1: Setup user with specific skill levels
      const userSkills = [
        { categoryId: 'security', level: 2, confidence: 0.6 }, // Beginner
        { categoryId: 'codeQuality', level: 7, confidence: 0.9 }, // Advanced  
        { categoryId: 'performance', level: 5, confidence: 0.8 } // Intermediate
      ];

      mockSkillModel.getSkillsByUser.mockResolvedValue(userSkills);

      // Step 2: Simulate PR with security and code quality findings
      const prAnalysis = {
        findings: {
          security: [
            {
              title: 'SQL Injection vulnerability',
              severity: 'critical',
              file: 'src/auth.ts',
              description: 'User input not sanitized in login query',
              confidence: 0.95
            },
            {
              title: 'Weak password hashing',
              severity: 'high', 
              file: 'src/users.ts',
              description: 'Using deprecated MD5 for password hashing',
              confidence: 0.88
            }
          ],
          codeQuality: [
            {
              title: 'Function too complex',
              severity: 'medium',
              file: 'src/validation.ts',
              description: 'Cyclomatic complexity of 12 exceeds threshold',
              confidence: 0.85
            }
          ]
        },
        metrics: {
          totalFindings: 3,
          severity: { critical: 1, high: 1, medium: 1, low: 0 }
        }
      };

      const prMetadata = {
        number: 456,
        title: 'Implement user authentication system',
        author: mockAuthenticatedUser.email,
        changedFiles: ['src/auth.ts', 'src/users.ts', 'src/validation.ts'],
        additions: 120,
        deletions: 25,
        timestamp: new Date()
      };

      // Step 3: Assess skills from PR
      const skillAssessments = await prSkillAssessmentService.assessSkillsFromPR(prAnalysis, prMetadata);

      expect(skillAssessments).toHaveLength(2); // security and codeQuality
      
      // Security skill should remain low due to critical issues found
      const securityAssessment = skillAssessments.find(s => s.categoryId === 'security');
      expect(securityAssessment).toMatchObject({
        categoryId: 'security',
        skillLevel: expect.any(Number),
        confidence: expect.any(Number),
        evidence: expect.arrayContaining([
          expect.stringContaining('SQL Injection')
        ])
      });

      // Step 4: Update user skills
      mockSkillModel.updateSkill.mockResolvedValue({ success: true });
      await skillTrackingService.updateSkillsFromAssessments(skillAssessments);

      // Step 5: Generate recommendations based on findings
      const recommendations = {
        summary: {
          totalRecommendations: 3,
          focusAreas: ['Security', 'Code Quality'],
          description: 'Critical security vulnerabilities require immediate attention'
        },
        recommendations: [
          {
            id: 'rec-1',
            title: 'Fix SQL injection vulnerability',
            category: 'security',
            priority: { level: 'critical', score: 10 },
            description: 'Implement parameterized queries to prevent SQL injection',
            estimatedEffort: '2 hours',
            implementation: {
              steps: [
                'Replace string concatenation with parameterized queries',
                'Validate and sanitize all user inputs',
                'Add input validation middleware'
              ]
            }
          },
          {
            id: 'rec-2', 
            title: 'Upgrade password hashing',
            category: 'security',
            priority: { level: 'high', score: 8 },
            description: 'Replace MD5 with bcrypt for secure password hashing',
            estimatedEffort: '1 hour'
          },
          {
            id: 'rec-3',
            title: 'Refactor complex validation function',
            category: 'codeQuality',
            priority: { level: 'medium', score: 6 },
            description: 'Break down complex function to improve maintainability',
            estimatedEffort: '3 hours'
          }
        ]
      };

      // Step 6: Generate skill-aware educational content
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendations);

      // Verify educational content is personalized based on skill levels
      expect(educationalResult.educational.learningPath).toMatchObject({
        difficulty: 'guided', // Should be guided due to low security skills
        totalSteps: expect.any(Number),
        estimatedTime: expect.any(String),
        steps: expect.arrayContaining([
          expect.objectContaining({
            topic: expect.stringContaining('Security'), // Security content prioritized
            difficulty: expect.stringMatching(/beginner|guided/) // Appropriate for skill level
          })
        ])
      });

      // Step 7: Verify skill-aware content recommendations
      expect(educationalResult.educational.content.explanations).toContainEqual(
        expect.objectContaining({
          concept: expect.stringContaining('SQL Injection'),
          simpleExplanation: expect.any(String), // Should have beginner-friendly explanation
          technicalDetails: expect.any(String)
        })
      );

      // Beginner security content should be prioritized over advanced
      const securityExplanations = educationalResult.educational.content.explanations
        .filter(exp => exp.concept.toLowerCase().includes('security'));
      
      expect(securityExplanations.length).toBeGreaterThan(0);

      // Step 8: Verify skill gaps are identified correctly
      expect(educationalResult.educational.insights.skillGaps).toContainEqual(
        expect.objectContaining({
          skill: expect.stringContaining('Security'),
          currentLevel: expect.any(Number),
          requiredLevel: expect.any(Number),
          priority: 'high' // High priority due to critical findings and low skill
        })
      );

      // Step 9: Verify next steps are appropriate for skill level
      expect(educationalResult.educational.insights.nextSteps).toContainEqual(
        expect.stringMatching(/basic|fundamental|beginner|introduction/i)
      );
    });

    it('should adapt RAG search based on user skill progression', async () => {
      // Scenario: User has improved security skills over time
      const initialSkills = [
        { categoryId: 'security', level: 2, confidence: 0.6 }
      ];

      const improvedSkills = [
        { categoryId: 'security', level: 6, confidence: 0.85 }
      ];

      // Test RAG enhancement for beginner user
      mockSkillModel.getSkillsByUser.mockResolvedValueOnce(initialSkills);
      
      const beginnerQuery = await skillAwareRAGService.enhanceQueryWithSkills(
        'how to prevent SQL injection attacks'
      );

      expect(beginnerQuery).toMatchObject({
        enhancedQuery: expect.stringContaining('beginner'),
        difficultyFilter: 'beginner',
        skillContext: expect.objectContaining({
          userLevel: 2,
          focusAreas: expect.arrayContaining(['security'])
        }),
        learningIntent: true
      });

      // Test RAG enhancement for improved user  
      mockSkillModel.getSkillsByUser.mockResolvedValueOnce(improvedSkills);

      const intermediateQuery = await skillAwareRAGService.enhanceQueryWithSkills(
        'advanced SQL injection prevention techniques'
      );

      expect(intermediateQuery).toMatchObject({
        difficultyFilter: 'intermediate',
        skillContext: expect.objectContaining({
          userLevel: 6,
          strongAreas: expect.arrayContaining(['security'])
        })
      });

      // Verify search results are re-ranked appropriately
      const searchResults = [
        {
          content: 'Advanced SQL injection prevention with prepared statements',
          score: 0.9,
          metadata: { difficulty: 'advanced', topic: 'security' }
        },
        {
          content: 'Basic guide to preventing SQL injection',
          score: 0.8,
          metadata: { difficulty: 'beginner', topic: 'security' }
        }
      ];

      // For beginner user, beginner content should rank higher
      const beginnerResults = await skillAwareRAGService.reRankResultsWithSkills(
        searchResults,
        beginnerQuery
      );

      expect(beginnerResults[0].content).toContain('Basic guide');
      expect(beginnerResults[0].skillRelevance.appropriateLevel).toBe(true);

      // For intermediate user, advanced content should rank higher
      const intermediateResults = await skillAwareRAGService.reRankResultsWithSkills(
        searchResults,
        intermediateQuery
      );

      expect(intermediateResults[0].content).toContain('Advanced SQL injection');
      expect(intermediateResults[0].skillRelevance.appropriateLevel).toBe(true);
    });

    it('should track learning engagement and adjust future recommendations', async () => {
      // Setup user with moderate skills
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 4, confidence: 0.7 }
      ]);

      // Step 1: Generate initial educational content
      const initialRecommendations = {
        summary: { totalRecommendations: 2 },
        recommendations: [
          {
            category: 'security',
            priority: { level: 'high', score: 8 },
            title: 'Implement JWT authentication'
          }
        ]
      };

      const educationalResult = await educationalAgent.analyzeFromRecommendations(initialRecommendations);

      // Step 2: Simulate user engaging with educational content
      const learningEngagements = [
        {
          educationalContentId: 'security-tutorial-jwt',
          engagementType: 'viewed' as const,
          skillsTargeted: ['security'],
          improvementObserved: false,
          timestamp: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
          educationalContentId: 'security-tutorial-jwt',
          engagementType: 'completed' as const,
          skillsTargeted: ['security'],
          improvementObserved: true,
          timestamp: new Date()
        }
      ];

      mockSkillModel.recordSkillHistory.mockResolvedValue({ success: true });

      for (const engagement of learningEngagements) {
        await skillTrackingService.trackLearningEngagement(engagement);
      }

      // Verify learning engagements were recorded
      expect(mockSkillModel.recordSkillHistory).toHaveBeenCalledTimes(2);
      expect(mockSkillModel.recordSkillHistory).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        expect.objectContaining({
          engagementType: 'completed',
          improvementObserved: true
        })
      );

      // Step 3: Simulate skill improvement due to learning
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 6, confidence: 0.85 } // Improved
      ]);

      // Step 4: Generate new recommendations with improved skill level
      const followUpRecommendations = {
        summary: { totalRecommendations: 1 },
        recommendations: [
          {
            category: 'security',
            priority: { level: 'medium', score: 6 },
            title: 'Implement OAuth 2.0 flow'
          }
        ]
      };

      const updatedEducationalResult = await educationalAgent.analyzeFromRecommendations(followUpRecommendations);

      // Verify content difficulty has increased due to skill improvement
      expect(updatedEducationalResult.educational.learningPath.difficulty).toBe('intermediate');

      // Verify more advanced content is now recommended
      const advancedExplanations = updatedEducationalResult.educational.content.explanations
        .filter(exp => exp.technicalDetails.includes('OAuth') || exp.technicalDetails.includes('advanced'));
      
      expect(advancedExplanations.length).toBeGreaterThan(0);
    });

    it('should handle cross-domain skill relationships', async () => {
      // Setup user with mixed skill levels across domains
      mockSkillModel.getSkillsByUser.mockResolvedValue([
        { categoryId: 'security', level: 3, confidence: 0.7 },
        { categoryId: 'architecture', level: 8, confidence: 0.95 },
        { categoryId: 'performance', level: 2, confidence: 0.5 }
      ]);

      // Recommendations touching multiple skill domains
      const crossDomainRecommendations = {
        summary: { totalRecommendations: 3 },
        recommendations: [
          {
            category: 'security',
            priority: { level: 'high', score: 8 },
            title: 'Implement microservice authentication',
            description: 'Secure communication between microservices'
          },
          {
            category: 'architecture', 
            priority: { level: 'medium', score: 6 },
            title: 'Optimize service mesh configuration',
            description: 'Improve microservice architecture performance'
          },
          {
            category: 'performance',
            priority: { level: 'high', score: 8 },
            title: 'Implement caching strategy',
            description: 'Add Redis caching for improved performance'
          }
        ]
      };

      const educationalResult = await educationalAgent.analyzeFromRecommendations(crossDomainRecommendations);

      // Verify learning path considers skill relationships
      const learningSteps = educationalResult.educational.learningPath.steps;
      
      // Architecture content should be more advanced due to high skill level
      const architectureSteps = learningSteps.filter(step => 
        step.topic.toLowerCase().includes('architecture') || 
        step.topic.toLowerCase().includes('microservice')
      );
      
      // Security and performance content should be more basic
      const securitySteps = learningSteps.filter(step =>
        step.topic.toLowerCase().includes('security') ||
        step.topic.toLowerCase().includes('authentication')
      );

      const performanceSteps = learningSteps.filter(step =>
        step.topic.toLowerCase().includes('performance') ||
        step.topic.toLowerCase().includes('caching')
      );

      // Verify appropriate difficulty levels
      if (architectureSteps.length > 0) {
        expect(architectureSteps[0].difficulty).toMatch(/intermediate|advanced/);
      }
      
      if (securitySteps.length > 0) {
        expect(securitySteps[0].difficulty).toMatch(/beginner|guided/);
      }

      if (performanceSteps.length > 0) {
        expect(performanceSteps[0].difficulty).toMatch(/beginner|guided/);
      }

      // Verify skill gaps identify areas needing most improvement
      const skillGaps = educationalResult.educational.insights.skillGaps;
      
      expect(skillGaps).toContainEqual(
        expect.objectContaining({
          skill: expect.stringMatching(/Security|Performance/),
          priority: 'high'
        })
      );

      // Architecture should not be in skill gaps due to high level
      const architectureGaps = skillGaps.filter(gap => 
        gap.skill.toLowerCase().includes('architecture')
      );
      expect(architectureGaps.length).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle skill tracking service failures gracefully', async () => {
      // Mock skill service failure
      mockSkillModel.getSkillsByUser.mockRejectedValue(new Error('Database connection failed'));

      const recommendations = {
        summary: { totalRecommendations: 1 },
        recommendations: [
          { category: 'security', priority: { level: 'high', score: 8 } }
        ]
      };

      // Should not throw error, but fall back to default behavior
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendations);

      expect(educationalResult).toBeDefined();
      expect(educationalResult.educational.learningPath).toBeDefined();
      // Should use default difficulty when skills unavailable
      expect(educationalResult.educational.learningPath.difficulty).toBe('intermediate');
    });

    it('should handle users with no skill history', async () => {
      // New user with no skills recorded
      mockSkillModel.getSkillsByUser.mockResolvedValue([]);

      const recommendations = {
        summary: { totalRecommendations: 2 },
        recommendations: [
          { category: 'security', priority: { level: 'critical', score: 10 } },
          { category: 'codeQuality', priority: { level: 'medium', score: 6 } }
        ]
      };

      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendations);

      // Should provide beginner-friendly content for new users
      expect(educationalResult.educational.learningPath.difficulty).toBe('guided');
      
      // Should include foundational content
      expect(educationalResult.educational.content.explanations).toContainEqual(
        expect.objectContaining({
          simpleExplanation: expect.any(String)
        })
      );

      // Should identify all areas as skill gaps for new users
      expect(educationalResult.educational.insights.skillGaps.length).toBeGreaterThan(0);
    });

    it('should validate and sanitize skill assessment data', async () => {
      // Provide invalid skill data
      const invalidAssessments = [
        {
          categoryId: 'security',
          skillLevel: -5, // Invalid negative
          confidence: 2.5, // Invalid > 1.0
          evidence: [],
          timestamp: new Date()
        },
        {
          categoryId: 'performance',
          skillLevel: 15, // Invalid > 10
          confidence: -0.2, // Invalid negative
          evidence: ['test'],
          timestamp: new Date()
        }
      ];

      mockSkillModel.updateSkill.mockResolvedValue({ success: true });

      // Should normalize invalid values
      await skillTrackingService.updateSkillsFromAssessments(invalidAssessments);

      expect(mockSkillModel.updateSkill).toHaveBeenCalledWith(
        mockAuthenticatedUser.id,
        'security',
        expect.objectContaining({
          level: expect.any(Number), // Should be normalized
          confidence: expect.any(Number) // Should be normalized
        })
      );

      // Verify normalization happened
      const securityCall = mockSkillModel.updateSkill.mock.calls
        .find(call => call[1] === 'security');
      
      expect(securityCall[2]?.level).toBeGreaterThanOrEqual(1);
      expect(securityCall[2]?.level).toBeLessThanOrEqual(10);
      expect(securityCall[2]?.confidence).toBeGreaterThanOrEqual(0);
      expect(securityCall[2]?.confidence).toBeLessThanOrEqual(1);
    });
  });
});