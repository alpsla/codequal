import { describe, it, expect, beforeEach } from '@jest/globals';
import { EducationalAgent } from '@codequal/agents/multi-agent/educational-agent';
import { RecommendationService } from '@codequal/agents/services/recommendation-service';

describe('Recommendation-Based Educational Flow Tests', () => {
  let educationalAgent: EducationalAgent;
  let recommendationService: RecommendationService;
  let mockVectorDB: any;

  beforeEach(() => {
    // Initialize mock Vector DB
    mockVectorDB = {
      searchEducationalContent: jest.fn().mockImplementation(() => Promise.resolve([
        {
          type: 'explanation',
          content: {
            concept: 'Security Best Practices',
            simpleExplanation: 'Keep your code safe by validating inputs',
            technicalDetails: 'Input validation prevents injection attacks',
            whyItMatters: 'Security vulnerabilities can compromise your entire system',
            examples: [{
              title: 'Input Validation Example',
              language: 'typescript',
              code: 'function validate(input: string) { /* validation logic */ }',
              explanation: 'Always validate user inputs',
              type: 'good' as const
            }]
          }
        }
      ]))
    };

    // Initialize services
    educationalAgent = new EducationalAgent(mockVectorDB);
    recommendationService = new RecommendationService();
  });

  describe('New Recommendation-Based Flow', () => {
    it('should generate recommendations and create educational content', async () => {
      // Mock processed results with findings
      const processedResults = {
        findings: {
          security: [
            { 
              id: 'sec-1', 
              type: 'sql-injection', 
              severity: 'high', 
              file: 'src/db/query.ts',
              description: 'SQL injection vulnerability found'
            }
          ],
          performance: [
            {
              id: 'perf-1',
              type: 'n+1-query',
              severity: 'medium',
              file: 'src/services/user.ts',
              description: 'N+1 query detected'
            }
          ],
          codeQuality: [
            {
              id: 'quality-1',
              type: 'complexity',
              severity: 'low',
              file: 'src/utils/processor.ts',
              description: 'High complexity function'
            }
          ]
        }
      };

      // Step 1: Generate recommendations
      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      
      // Verify recommendation module structure
      expect(recommendationModule).toHaveProperty('summary');
      expect(recommendationModule).toHaveProperty('recommendations');
      expect(recommendationModule).toHaveProperty('learningPathGuidance');
      expect(recommendationModule).toHaveProperty('metadata');
      
      expect(recommendationModule.summary.totalRecommendations).toBeGreaterThan(0);
      expect(recommendationModule.recommendations.length).toBeGreaterThan(0);
      
      // Verify security recommendation is prioritized
      const securityRec = recommendationModule.recommendations.find(r => r.category === 'security');
      expect(securityRec).toBeDefined();
      expect(securityRec.priority.level).toBe('high');
      expect(securityRec.title).toContain('Vulnerability');

      // Step 2: Generate educational content from recommendations
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      
      // Verify educational result structure
      expect(educationalResult).toHaveProperty('learningPath');
      expect(educationalResult).toHaveProperty('explanations');
      expect(educationalResult).toHaveProperty('tutorials');
      expect(educationalResult).toHaveProperty('bestPractices');
      expect(educationalResult).toHaveProperty('skillGaps');
      expect(educationalResult).toHaveProperty('relatedTopics');
      
      // Verify learning path is based on recommendations
      expect(educationalResult.learningPath.title).toBe('Personalized Learning Path');
      expect(educationalResult.learningPath.steps.length).toBeGreaterThan(0);
      expect(educationalResult.learningPath.description).toContain('actionable recommendations');
      
      // Verify educational content is generated
      expect(educationalResult.explanations.length).toBeGreaterThan(0);
      expect(educationalResult.tutorials.length).toBeGreaterThan(0);
      expect(educationalResult.bestPractices.length).toBeGreaterThan(0);
      
      // Verify skill gaps are identified from recommendations
      expect(educationalResult.skillGaps).toContain('Security awareness and secure coding practices');
      
      // Verify related topics are extracted
      expect(educationalResult.relatedTopics).toContain('OWASP Top 10');
    });

    it('should prioritize security recommendations in learning path', async () => {
      const processedResults = {
        findings: {
          security: [
            { 
              id: 'sec-1', 
              type: 'xss', 
              severity: 'critical', 
              file: 'src/api/render.ts',
              description: 'Critical XSS vulnerability'
            }
          ],
          codeQuality: [
            {
              id: 'quality-1',
              type: 'complexity',
              severity: 'low',
              file: 'src/utils/helper.ts',
              description: 'Minor complexity issue'
            }
          ]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      
      // Security should be prioritized first due to critical severity
      const firstStep = educationalResult.learningPath.steps[0];
      expect(firstStep).toContain('Vulnerability');
      
      // Learning path difficulty should reflect security criticality
      expect(educationalResult.learningPath.difficulty).toBe('advanced');
    });

    it('should handle empty recommendations gracefully', async () => {
      const processedResults = {
        findings: {
          security: [],
          performance: [],
          codeQuality: [],
          architecture: [],
          dependency: []
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      
      expect(recommendationModule.summary.totalRecommendations).toBe(0);
      expect(educationalResult.learningPath.steps.length).toBe(0);
      expect(educationalResult.skillGaps.length).toBe(0);
      expect(educationalResult.explanations.length).toBe(0);
    });

    it('should generate actionable tutorials from recommendation steps', async () => {
      const processedResults = {
        findings: {
          security: [
            { 
              id: 'sec-1', 
              type: 'input-validation', 
              severity: 'high', 
              file: 'src/api/validate.ts',
              description: 'Missing input validation'
            }
          ]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      
      const tutorial = educationalResult.tutorials[0];
      expect(tutorial).toBeDefined();
      expect(tutorial.title).toContain('How to');
      expect(tutorial.steps.length).toBeGreaterThan(0);
      expect(tutorial.steps[0]).toHaveProperty('stepNumber');
      expect(tutorial.steps[0]).toHaveProperty('title');
      expect(tutorial.steps[0]).toHaveProperty('description');
      expect(tutorial.estimatedTime).toMatch(/\d+\s+(minutes?|hours?)/);
    });

    it('should create category-specific best practices', async () => {
      const processedResults = {
        findings: {
          security: [{ id: 'sec-1', type: 'csrf', severity: 'high', file: 'src/api/auth.ts' }],
          performance: [{ id: 'perf-1', type: 'memory-leak', severity: 'medium', file: 'src/cache.ts' }]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      
      const securityBestPractice = educationalResult.bestPractices.find(bp => bp.category === 'security');
      const performanceBestPractice = educationalResult.bestPractices.find(bp => bp.category === 'performance');
      
      expect(securityBestPractice).toBeDefined();
      expect(securityBestPractice.title).toContain('Best Practice');
      expect(securityBestPractice.guidelines.length).toBeGreaterThan(0);
      
      expect(performanceBestPractice).toBeDefined();
      expect(performanceBestPractice.title).toContain('Best Practice');
      expect(performanceBestPractice.guidelines.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Orchestrator Flow', () => {
    it('should demonstrate complete orchestrator workflow', async () => {
      // This test demonstrates how the new flow would work in the orchestrator
      
      // 1. Mock processed results (from agents)
      const processedResults = {
        findings: {
          security: [{ id: 'sec-1', type: 'sqli', severity: 'critical', file: 'src/db.ts' }],
          architecture: [{ id: 'arch-1', type: 'pattern-violation', severity: 'medium', file: 'src/service.ts' }]
        }
      };

      // 2. Mock DeepWiki summary
      const deepWikiSummary = {
        suggestions: [
          { 
            title: 'Improve Database Layer',
            description: 'Consider using ORM for better security',
            category: 'security',
            impact: 'Reduces SQL injection risk'
          }
        ]
      };

      // 3. Generate Recommendation Module (Orchestrator Step 8)
      const recommendationModule = await recommendationService.generateRecommendations(
        processedResults, 
        deepWikiSummary
      );

      // 4. Generate Educational Content (Orchestrator Step 9)
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);

      // 5. Verify complete workflow
      expect(recommendationModule.summary.totalRecommendations).toBeGreaterThanOrEqual(3); // 2 findings + 1 DeepWiki
      expect(educationalResult.learningPath.steps.length).toBeGreaterThan(0);
      expect(educationalResult.explanations.length).toBeGreaterThan(0);
      
      // Verify DeepWiki suggestions are incorporated
      const deepWikiRec = recommendationModule.recommendations.find(r => r.id.startsWith('deepwiki'));
      expect(deepWikiRec).toBeDefined();
      expect(deepWikiRec.title).toBe('Improve Database Layer');
    });
  });
});