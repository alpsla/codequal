import { describe, it, expect, beforeEach } from '@jest/globals';
import { EducationalAgent } from '@codequal/agents/multi-agent/educational-agent';
import { RecommendationService } from '@codequal/agents/services/recommendation-service';
import { EducationalCompilationService } from '@codequal/agents/services/educational-compilation-service';

describe('Complete Educational Compilation Flow Tests', () => {
  let educationalAgent: EducationalAgent;
  let recommendationService: RecommendationService;
  let compilationService: EducationalCompilationService;
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
    compilationService = new EducationalCompilationService();
  });

  describe('Complete End-to-End Flow', () => {
    it('should demonstrate complete flow from findings to compiled educational data', async () => {
      // Step 1: Mock processed results (what comes from specialized agents)
      const processedResults = {
        findings: {
          security: [
            { 
              id: 'sec-1', 
              type: 'sql-injection', 
              severity: 'critical', 
              file: 'src/db/query.ts',
              description: 'Critical SQL injection vulnerability'
            },
            {
              id: 'sec-2',
              type: 'xss',
              severity: 'high',
              file: 'src/api/render.ts',
              description: 'XSS vulnerability in user input'
            }
          ],
          performance: [
            {
              id: 'perf-1',
              type: 'memory-leak',
              severity: 'medium',
              file: 'src/cache/manager.ts',
              description: 'Memory leak in cache manager'
            }
          ],
          architecture: [
            {
              id: 'arch-1',
              type: 'circular-dependency',
              severity: 'low',
              file: 'src/services/user.ts',
              description: 'Circular dependency detected'
            }
          ],
          codeQuality: [
            {
              id: 'quality-1',
              type: 'complexity',
              severity: 'medium',
              file: 'src/utils/processor.ts',
              description: 'High cyclomatic complexity'
            }
          ]
        }
      };

      // Step 2: Generate Recommendation Module
      console.log('🔄 Step 1: Generating recommendations from findings...');
      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      
      // Verify recommendation module
      expect(recommendationModule).toHaveProperty('summary');
      expect(recommendationModule).toHaveProperty('recommendations');
      expect(recommendationModule).toHaveProperty('learningPathGuidance');
      expect(recommendationModule).toHaveProperty('metadata');
      
      expect(recommendationModule.summary.totalRecommendations).toBe(5); // One per finding
      expect(recommendationModule.recommendations.length).toBe(5);
      
      // Verify security recommendations are prioritized
      const securityRecs = recommendationModule.recommendations.filter(r => r.category === 'security');
      expect(securityRecs.length).toBe(2);
      expect(securityRecs[0].priority.level).toBe('critical');
      expect(securityRecs[1].priority.level).toBe('high');

      console.log(`✅ Generated ${recommendationModule.summary.totalRecommendations} recommendations`);

      // Step 3: Generate Educational Content from Recommendations
      console.log('🔄 Step 2: Generating educational content from recommendations...');
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      
      // Verify educational result
      expect(educationalResult).toHaveProperty('learningPath');
      expect(educationalResult).toHaveProperty('explanations');
      expect(educationalResult).toHaveProperty('tutorials');
      expect(educationalResult).toHaveProperty('bestPractices');
      expect(educationalResult).toHaveProperty('skillGaps');
      expect(educationalResult).toHaveProperty('relatedTopics');
      
      expect(educationalResult.learningPath.steps.length).toBeGreaterThan(0);
      expect(educationalResult.explanations.length).toBeGreaterThan(0);
      expect(educationalResult.tutorials.length).toBeGreaterThan(0);
      expect(educationalResult.bestPractices.length).toBeGreaterThan(0);

      console.log(`✅ Generated educational content with ${educationalResult.learningPath.steps.length} learning steps`);

      // Step 4: Compile Educational Data for Reporter Agent
      console.log('🔄 Step 3: Compiling educational data for Reporter Agent...');
      const compiledEducationalData = await compilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        processedResults
      );
      
      // Verify compiled structure
      expect(compiledEducationalData).toHaveProperty('educational');
      expect(compiledEducationalData).toHaveProperty('recommendationMapping');
      expect(compiledEducationalData).toHaveProperty('metadata');
      
      // Verify educational section
      const educational = compiledEducationalData.educational;
      expect(educational).toHaveProperty('learningPath');
      expect(educational).toHaveProperty('content');
      expect(educational).toHaveProperty('insights');
      
      // Verify learning path compilation
      expect(educational.learningPath.totalSteps).toBe(educationalResult.learningPath.steps.length);
      expect(educational.learningPath.steps.length).toBeGreaterThan(0);
      expect(educational.learningPath.steps[0]).toHaveProperty('stepNumber');
      expect(educational.learningPath.steps[0]).toHaveProperty('title');
      expect(educational.learningPath.steps[0]).toHaveProperty('category');
      expect(educational.learningPath.steps[0]).toHaveProperty('priority');
      
      // Verify content compilation
      expect(educational.content.explanations.length).toBeGreaterThan(0);
      expect(educational.content.tutorials.length).toBeGreaterThan(0);
      expect(educational.content.bestPractices.length).toBeGreaterThan(0);
      expect(educational.content.resources.length).toBeGreaterThan(0);
      
      // Verify each content item has required metadata
      const explanation = educational.content.explanations[0];
      expect(explanation).toHaveProperty('id');
      expect(explanation).toHaveProperty('category');
      expect(explanation).toHaveProperty('difficulty');
      expect(explanation.id).toMatch(/^explanation-\d+$/);
      
      const tutorial = educational.content.tutorials[0];
      expect(tutorial).toHaveProperty('id');
      expect(tutorial).toHaveProperty('category');
      expect(tutorial).toHaveProperty('totalSteps');
      expect(tutorial.id).toMatch(/^tutorial-\d+$/);
      
      // Verify insights compilation
      expect(educational.insights.skillGaps.length).toBeGreaterThan(0);
      expect(educational.insights.relatedTopics.length).toBeGreaterThan(0);
      expect(educational.insights.nextSteps.length).toBeGreaterThan(0);
      
      // Verify skill gap structure
      const skillGap = educational.insights.skillGaps[0];
      expect(skillGap).toHaveProperty('skill');
      expect(skillGap).toHaveProperty('category');
      expect(skillGap).toHaveProperty('priority');
      expect(skillGap).toHaveProperty('description');
      
      // Verify recommendation mapping
      const mapping = compiledEducationalData.recommendationMapping;
      expect(mapping.totalRecommendations).toBe(5);
      expect(mapping.priorityBreakdown).toHaveProperty('critical');
      expect(mapping.priorityBreakdown).toHaveProperty('high');
      expect(mapping.priorityBreakdown).toHaveProperty('medium');
      expect(mapping.categoryBreakdown).toHaveProperty('security');
      expect(mapping.learningPathMapping.length).toBeGreaterThan(0);
      
      // Verify metadata
      const metadata = compiledEducationalData.metadata;
      expect(metadata).toHaveProperty('compiledAt');
      expect(metadata).toHaveProperty('sourceDataQuality');
      expect(metadata).toHaveProperty('processingInfo');
      expect(metadata.sourceDataQuality.recommendationConfidence).toBeGreaterThan(0);
      expect(metadata.processingInfo.recommendationsProcessed).toBe(5);

      console.log(`✅ Compiled educational data with ${educational.content.explanations.length + educational.content.tutorials.length + educational.content.bestPractices.length} content items`);
      console.log(`📊 Compilation quality: ${Math.round(metadata.sourceDataQuality.recommendationConfidence)}% confidence`);

      // Step 5: Verify Data is Ready for Reporter Agent
      console.log('🔄 Step 4: Verifying data structure for Reporter Agent...');
      
      // The compiled data should be structured for easy consumption by Reporter Agent
      expect(compiledEducationalData.educational.learningPath.steps.every(step => 
        step.category && step.priority && step.estimatedTime
      )).toBe(true);
      
      expect(compiledEducationalData.educational.content.explanations.every(exp => 
        exp.id && exp.category && exp.difficulty
      )).toBe(true);
      
      expect(compiledEducationalData.recommendationMapping.learningPathMapping.every(mapping =>
        mapping.recommendationId && mapping.contentIds && Array.isArray(mapping.contentIds)
      )).toBe(true);

      console.log('✅ Data structure verified and ready for Reporter Agent');
      console.log('🎉 Complete educational compilation flow successful!');
    });

    it('should handle complex security-focused scenario', async () => {
      // Test with heavy security focus
      const securityHeavyResults = {
        findings: {
          security: [
            { id: 'sec-1', type: 'sql-injection', severity: 'critical', file: 'src/db/query.ts' },
            { id: 'sec-2', type: 'xss', severity: 'critical', file: 'src/api/render.ts' },
            { id: 'sec-3', type: 'csrf', severity: 'high', file: 'src/auth/token.ts' },
            { id: 'sec-4', type: 'insecure-crypto', severity: 'high', file: 'src/crypto/hash.ts' }
          ],
          codeQuality: [
            { id: 'quality-1', type: 'complexity', severity: 'low', file: 'src/utils/helper.ts' }
          ]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(securityHeavyResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      const compiledData = await compilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        securityHeavyResults
      );

      // Should heavily prioritize security
      const securitySteps = compiledData.educational.learningPath.steps.filter(step => 
        step.category === 'security');
      expect(securitySteps.length).toBeGreaterThanOrEqual(3);
      
      // Learning path should be advanced due to critical security issues
      expect(compiledData.educational.learningPath.difficulty).toBe('advanced');
      
      // Should have security-focused skill gaps
      const securitySkillGaps = compiledData.educational.insights.skillGaps.filter(gap =>
        gap.category === 'security');
      expect(securitySkillGaps.length).toBeGreaterThan(0);
      
      // Category breakdown should show security dominance
      expect(compiledData.recommendationMapping.categoryBreakdown.security).toBeGreaterThanOrEqual(4);
    });

    it('should maintain traceability from findings to educational content', async () => {
      const processedResults = {
        findings: {
          security: [{ id: 'sec-1', type: 'sql-injection', severity: 'high', file: 'src/db.ts' }],
          performance: [{ id: 'perf-1', type: 'n+1-query', severity: 'medium', file: 'src/query.ts' }]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      const compiledData = await compilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        processedResults
      );

      // Verify traceability through mapping
      const mappings = compiledData.recommendationMapping.learningPathMapping;
      expect(mappings.length).toBe(2); // One for each recommendation
      
      // Each mapping should connect recommendation to content
      mappings.forEach(mapping => {
        expect(mapping.recommendationId).toBeDefined();
        expect(mapping.learningStepIndex).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(mapping.contentIds)).toBe(true);
        
        // Verify content IDs actually exist in compiled content
        mapping.contentIds.forEach(contentId => {
          const allContentIds = [
            ...compiledData.educational.content.explanations.map(e => e.id),
            ...compiledData.educational.content.tutorials.map(t => t.id),
            ...compiledData.educational.content.bestPractices.map(bp => bp.id),
            ...compiledData.educational.content.resources.map(r => r.id)
          ];
          expect(allContentIds).toContain(contentId);
        });
      });
    });
  });

  describe('Data Quality and Validation', () => {
    it('should provide quality metrics for Reporter Agent decision making', async () => {
      const processedResults = {
        findings: {
          security: [{ id: 'sec-1', type: 'xss', severity: 'high', file: 'src/api.ts' }]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      const compiledData = await compilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        processedResults
      );

      const quality = compiledData.metadata.sourceDataQuality;
      
      // Quality metrics should be available for Reporter Agent
      expect(quality.recommendationConfidence).toBeGreaterThanOrEqual(0);
      expect(quality.recommendationConfidence).toBeLessThanOrEqual(100);
      expect(quality.educationalContentCoverage).toBeGreaterThanOrEqual(0);
      expect(quality.educationalContentCoverage).toBeLessThanOrEqual(1.0);
      expect(quality.totalDataPoints).toBeGreaterThan(0);
      
      // Processing info should help Reporter Agent understand the data
      const processing = compiledData.metadata.processingInfo;
      expect(processing.recommendationsProcessed).toBeGreaterThan(0);
      expect(processing.educationalItemsGenerated).toBeGreaterThan(0);
      expect(processing.compilationMethod).toBe('recommendation-based-compilation');
    });

    it('should ensure all required fields are present for Reporter Agent', async () => {
      const processedResults = {
        findings: {
          codeQuality: [{ id: 'quality-1', type: 'complexity', severity: 'medium', file: 'src/app.ts' }]
        }
      };

      const recommendationModule = await recommendationService.generateRecommendations(processedResults);
      const educationalResult = await educationalAgent.analyzeFromRecommendations(recommendationModule);
      const compiledData = await compilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        processedResults
      );

      // Verify all required top-level fields
      const requiredFields = ['educational', 'recommendationMapping', 'metadata'];
      requiredFields.forEach(field => {
        expect(compiledData).toHaveProperty(field);
      });

      // Verify educational section completeness
      const educationalFields = ['learningPath', 'content', 'insights'];
      educationalFields.forEach(field => {
        expect(compiledData.educational).toHaveProperty(field);
      });

      // Verify content section completeness
      const contentFields = ['explanations', 'tutorials', 'bestPractices', 'resources'];
      contentFields.forEach(field => {
        expect(compiledData.educational.content).toHaveProperty(field);
        expect(Array.isArray(compiledData.educational.content[field])).toBe(true);
      });

      // Verify insights section completeness
      const insightFields = ['skillGaps', 'relatedTopics', 'nextSteps'];
      insightFields.forEach(field => {
        expect(compiledData.educational.insights).toHaveProperty(field);
        expect(Array.isArray(compiledData.educational.insights[field])).toBe(true);
      });
    });
  });
});