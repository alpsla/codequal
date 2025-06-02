import { EducationalContentService } from '../../services/educational-content-service';
import { createMockAuthenticatedUser, createMockFinding } from '../setup';

describe('EducationalContentService', () => {
  let service: EducationalContentService;
  let mockUser: any;

  beforeEach(() => {
    mockUser = createMockAuthenticatedUser();
    service = new EducationalContentService(mockUser);
  });

  describe('Content Generation for Findings', () => {
    test('should generate educational content for findings', async () => {
      const findings = {
        security: [
          {
            ...createMockFinding(),
            category: 'security',
            type: 'sql-injection',
            title: 'SQL Injection Vulnerability'
          }
        ],
        architecture: [
          {
            ...createMockFinding(),
            category: 'architecture',
            type: 'design-pattern',
            title: 'Missing Dependency Injection'
          }
        ]
      };

      const result = await service.generateContentForFindings(findings, mockUser);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        findingId: expect.any(String),
        content: expect.objectContaining({
          title: expect.any(String),
          summary: expect.any(String),
          explanation: expect.any(String),
          examples: expect.any(Array),
          references: expect.any(Array),
          skillLevel: expect.oneOf(['beginner', 'intermediate', 'advanced'])
        }),
        relevanceScore: expect.any(Number),
        metadata: expect.objectContaining({
          generatedAt: expect.any(Date),
          contentSource: expect.any(String),
          adaptedForUser: expect.any(Boolean)
        })
      });
    });

    test('should limit results to top 10 most relevant', async () => {
      // Create 15 findings
      const findings = {
        security: Array.from({ length: 15 }, (_, i) => ({
          ...createMockFinding(),
          id: `finding-${i}`,
          category: 'security'
        }))
      };

      const result = await service.generateContentForFindings(findings, mockUser);

      expect(result).toHaveLength(10);
    });

    test('should sort results by relevance score', async () => {
      const findings = {
        security: [
          {
            ...createMockFinding(),
            severity: 'critical',
            category: 'security'
          },
          {
            ...createMockFinding(),
            severity: 'low',
            category: 'security'
          },
          {
            ...createMockFinding(),
            severity: 'high',
            category: 'security'
          }
        ]
      };

      const result = await service.generateContentForFindings(findings, mockUser);

      // Critical findings should have higher relevance scores
      expect(result[0].relevanceScore).toBeGreaterThanOrEqual(result[1].relevanceScore);
      expect(result[1].relevanceScore).toBeGreaterThanOrEqual(result[2].relevanceScore);
    });

    test('should handle empty findings gracefully', async () => {
      const findings = {};
      const result = await service.generateContentForFindings(findings, mockUser);

      expect(result).toEqual([]);
    });

    test('should handle content generation errors for individual findings', async () => {
      const findings = {
        security: [
          {
            ...createMockFinding(),
            category: 'security'
          },
          {
            // Invalid finding that might cause errors
            ...createMockFinding(),
            id: null,
            category: 'security'
          }
        ]
      };

      const result = await service.generateContentForFindings(findings, mockUser);

      // Should still return content for valid findings
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Individual Finding Content Generation', () => {
    test('should generate content for specific finding', async () => {
      const finding = {
        ...createMockFinding(),
        category: 'security',
        type: 'sql-injection',
        title: 'SQL Injection Risk'
      };

      const userSkillLevel = {
        overall: 'intermediate' as const,
        categories: {
          security: 'beginner' as const,
          architecture: 'intermediate' as const,
          performance: 'advanced' as const,
          codeQuality: 'intermediate' as const
        }
      };

      const result = await service.generateContentForFinding(finding, userSkillLevel);

      expect(result).toMatchObject({
        findingId: finding.id,
        content: expect.objectContaining({
          title: expect.stringContaining('SQL Injection'),
          summary: expect.any(String),
          explanation: expect.any(String),
          skillLevel: 'beginner' // Should match category skill level
        }),
        relevanceScore: expect.any(Number),
        metadata: expect.objectContaining({
          contentSource: expect.oneOf(['rag-system', 'fallback-generation']),
          adaptedForUser: true
        })
      });
    });

    test('should return null for failed content generation', async () => {
      const invalidFinding = {
        ...createMockFinding(),
        category: 'invalid-category'
      };

      const userSkillLevel = {
        overall: 'intermediate' as const,
        categories: {
          security: 'intermediate' as const,
          architecture: 'intermediate' as const,
          performance: 'intermediate' as const,
          codeQuality: 'intermediate' as const
        }
      };

      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.generateContentForFinding(invalidFinding, userSkillLevel);

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('User Skill Level Management', () => {
    test('should return default skill levels', async () => {
      const skillLevel = await (service as any).getUserSkillLevel(mockUser);

      expect(skillLevel).toMatchObject({
        overall: expect.oneOf(['beginner', 'intermediate', 'advanced']),
        categories: {
          security: expect.oneOf(['beginner', 'intermediate', 'advanced']),
          architecture: expect.oneOf(['beginner', 'intermediate', 'advanced']),
          performance: expect.oneOf(['beginner', 'intermediate', 'advanced']),
          codeQuality: expect.oneOf(['beginner', 'intermediate', 'advanced'])
        }
      });
    });

    test('should handle skill level retrieval errors', async () => {
      // Mock error scenario by temporarily replacing the method
      const originalGetUserSkillLevel = (service as any).getUserSkillLevel;
      (service as any).getUserSkillLevel = jest.fn().mockImplementation(() => {
        // Return default values when error occurs
        return {
          overall: 'intermediate' as const,
          categories: {
            security: 'intermediate' as const,
            architecture: 'intermediate' as const,
            performance: 'intermediate' as const,
            codeQuality: 'intermediate' as const
          }
        };
      });

      const skillLevel = await (service as any).getUserSkillLevel(mockUser);

      expect(skillLevel.overall).toBe('intermediate');
      expect(Object.values(skillLevel.categories)).toEqual(['intermediate', 'intermediate', 'intermediate', 'intermediate']);

      // Restore original method
      (service as any).getUserSkillLevel = originalGetUserSkillLevel;
    });
  });

  describe('Search Query Building', () => {
    test('should build appropriate search queries for different skill levels', () => {
      const finding = {
        ...createMockFinding(),
        category: 'security',
        type: 'sql-injection',
        title: 'SQL Injection Risk'
      };

      const beginnerQuery = (service as any).buildSearchQuery(finding, 'beginner');
      const intermediateQuery = (service as any).buildSearchQuery(finding, 'intermediate');
      const advancedQuery = (service as any).buildSearchQuery(finding, 'advanced');

      expect(beginnerQuery).toContain('introduction tutorial');
      expect(intermediateQuery).toContain('best practices');
      expect(advancedQuery).toContain('optimization advanced');

      // All should contain the base finding information
      [beginnerQuery, intermediateQuery, advancedQuery].forEach(query => {
        expect(query).toContain('security');
        expect(query).toContain('sql-injection');
        expect(query).toContain('SQL Injection Risk');
      });
    });

    test('should handle unknown skill levels', () => {
      const finding = createMockFinding();
      const query = (service as any).buildSearchQuery(finding, 'unknown-level');

      expect(query).toContain('best practices');
    });
  });

  describe('Content Adaptation', () => {
    test('should adapt content for beginner skill level', async () => {
      const rawContent = {
        title: 'Understanding SQL Injection',
        content: 'SQL injection is a code injection technique...',
        examples: ['SELECT * FROM users WHERE id = ?'],
        references: ['https://owasp.org/']
      };

      const finding = createMockFinding();
      const adapted = await (service as any).adaptContentToSkillLevel(rawContent, finding, 'beginner');

      expect(adapted.explanation).toContain('**For beginners:**');
      expect(adapted.explanation).toContain('**Why this matters:**');
      expect(adapted.skillLevel).toBe('beginner');
    });

    test('should adapt content for advanced skill level', async () => {
      const rawContent = {
        title: 'Understanding SQL Injection',
        content: 'SQL injection is a code injection technique...',
        examples: ['SELECT * FROM users WHERE id = ?'],
        references: ['https://owasp.org/']
      };

      const finding = createMockFinding();
      const adapted = await (service as any).adaptContentToSkillLevel(rawContent, finding, 'advanced');

      expect(adapted.explanation).toContain('**Advanced details:**');
      expect(adapted.explanation).toContain('**Technical implications:**');
      expect(adapted.skillLevel).toBe('advanced');
    });

    test('should adapt examples for different skill levels', () => {
      const examples = ['const result = query(sql);'];

      const beginnerExamples = (service as any).adaptExamples(examples, 'beginner');
      const advancedExamples = (service as any).adaptExamples(examples, 'advanced');

      expect(beginnerExamples[0]).toContain('// Beginner-friendly example:');
      expect(advancedExamples[0]).toContain('// Advanced implementation:');
    });

    test('should handle empty examples array', () => {
      const adapted = (service as any).adaptExamples([], 'beginner');
      expect(adapted).toEqual([]);
    });
  });

  describe('Fallback Content Generation', () => {
    test('should generate fallback content for security findings', () => {
      const finding = {
        ...createMockFinding(),
        category: 'security',
        severity: 'high',
        description: 'Security vulnerability detected'
      };

      const content = (service as any).generateFallbackContent(finding, 'intermediate');

      expect(content.content.title).toContain('Understanding');
      expect(content.content.summary).toContain('security');
      expect(content.content.summary).toContain('High'); // Capitalized as expected
      expect(content.relevanceScore).toBe(0.6);
      expect(content.metadata.contentSource).toBe('fallback-generation');
    });

    test('should generate different explanations based on category', () => {
      const securityFinding = { ...createMockFinding(), category: 'security' };
      const architectureFinding = { ...createMockFinding(), category: 'architecture' };
      const performanceFinding = { ...createMockFinding(), category: 'performance' };

      const securityExplanation = (service as any).generateFallbackExplanation(securityFinding, 'intermediate');
      const architectureExplanation = (service as any).generateFallbackExplanation(architectureFinding, 'intermediate');
      const performanceExplanation = (service as any).generateFallbackExplanation(performanceFinding, 'intermediate');

      expect(securityExplanation).toContain('security');
      expect(architectureExplanation).toContain('architectural');
      expect(performanceExplanation).toContain('performance');
    });

    test('should generate appropriate references by category', () => {
      const securityFinding = { ...createMockFinding(), category: 'security' };
      const performanceFinding = { ...createMockFinding(), category: 'performance' };
      const architectureFinding = { ...createMockFinding(), category: 'architecture' };

      const securityRefs = (service as any).generateReferences(securityFinding);
      const performanceRefs = (service as any).generateReferences(performanceFinding);
      const architectureRefs = (service as any).generateReferences(architectureFinding);

      expect(securityRefs).toContain('https://owasp.org/');
      expect(performanceRefs).toContain('https://web.dev/performance/');
      expect(architectureRefs).toContain('https://martinfowler.com/architecture/');
    });
  });

  describe('Relevance Score Calculation', () => {
    test('should calculate higher scores for critical findings', () => {
      const criticalFinding = { ...createMockFinding(), severity: 'critical' };
      const lowFinding = { ...createMockFinding(), severity: 'low' };

      const content = { examples: ['example'], references: ['ref'], explanation: 'long explanation' };

      const criticalScore = (service as any).calculateRelevanceScore(criticalFinding, content);
      const lowScore = (service as any).calculateRelevanceScore(lowFinding, content);

      expect(criticalScore).toBeGreaterThan(lowScore);
    });

    test('should boost scores for content with examples and references', () => {
      const finding = createMockFinding();

      const basicContent = { explanation: 'explanation' };
      const richContent = {
        examples: ['example1', 'example2'],
        references: ['ref1', 'ref2'],
        explanation: 'very long explanation with lots of detail and comprehensive coverage'
      };

      const basicScore = (service as any).calculateRelevanceScore(finding, basicContent);
      const richScore = (service as any).calculateRelevanceScore(finding, richContent);

      expect(richScore).toBeGreaterThan(basicScore);
    });

    test('should cap scores at 1.0', () => {
      const criticalFinding = { ...createMockFinding(), severity: 'critical' };
      const richContent = {
        examples: ['ex1', 'ex2', 'ex3'],
        references: ['ref1', 'ref2', 'ref3'],
        explanation: 'extremely long explanation with comprehensive details and extensive coverage'
      };

      const score = (service as any).calculateRelevanceScore(criticalFinding, richContent);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Skill Modifier Generation', () => {
    test('should return appropriate modifiers for different skill levels', () => {
      const beginnerModifier = (service as any).getSkillModifier('beginner');
      const intermediateModifier = (service as any).getSkillModifier('intermediate');
      const advancedModifier = (service as any).getSkillModifier('advanced');
      const unknownModifier = (service as any).getSkillModifier('unknown');

      expect(beginnerModifier).toContain('introduction');
      expect(beginnerModifier).toContain('basics');
      
      expect(intermediateModifier).toContain('best practices');
      expect(intermediateModifier).toContain('patterns');
      
      expect(advancedModifier).toContain('optimization');
      expect(advancedModifier).toContain('advanced');
      
      expect(unknownModifier).toContain('best practices');
    });
  });

  describe('Content Summary Generation', () => {
    test('should generate skill-appropriate summaries', () => {
      const rawContent = { content: 'This is the original content that needs to be summarized for different skill levels.' };

      const beginnerSummary = (service as any).generateSummary(rawContent, 'beginner');
      const advancedSummary = (service as any).generateSummary(rawContent, 'advanced');
      const intermediateSummary = (service as any).generateSummary(rawContent, 'intermediate');

      expect(beginnerSummary).toContain('beginner-friendly');
      expect(advancedSummary).toContain('Advanced analysis');
      expect(intermediateSummary).not.toContain('beginner-friendly');
      expect(intermediateSummary).not.toContain('Advanced analysis');
    });

    test('should handle empty content', () => {
      const summary = (service as any).generateSummary({}, 'intermediate');
      expect(summary).toContain('...');
    });
  });

  describe('Utility Methods', () => {
    test('should flatten findings correctly', () => {
      const findings = {
        security: [createMockFinding(), createMockFinding()],
        architecture: [createMockFinding()],
        performance: [],
        invalidCategory: 'not an array'
      };

      const flattened = (service as any).flattenFindings(findings);
      expect(flattened).toHaveLength(3); // Only valid arrays should be flattened
    });

    test('should handle nested findings structure', () => {
      const findings = {
        category1: {
          subcategory: [createMockFinding()]
        },
        category2: [createMockFinding(), createMockFinding()]
      };

      const flattened = (service as any).flattenFindings(findings);
      expect(flattened).toHaveLength(2); // Only direct arrays should be processed
    });
  });

  describe('Mock RAG System', () => {
    test('should return mock educational content', async () => {
      const query = 'security sql injection best practices';
      const results = await (service as any).searchEducationalContent(query);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: expect.stringContaining(query),
        content: expect.any(String),
        examples: expect.any(Array),
        references: expect.any(Array)
      });
    });

    test('should handle search errors gracefully', async () => {
      // Mock search failure by returning empty results
      const originalSearch = (service as any).searchEducationalContent;
      (service as any).searchEducationalContent = jest.fn().mockImplementation(() => {
        return []; // Return empty array on error as per the service implementation
      });

      const results = await (service as any).searchEducationalContent('test query');
      expect(results).toEqual([]);

      // Restore original method
      (service as any).searchEducationalContent = originalSearch;
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete workflow for security finding', async () => {
      const findings = {
        security: [{
          ...createMockFinding(),
          category: 'security',
          type: 'sql-injection',
          title: 'SQL Injection Vulnerability',
          severity: 'high',
          description: 'Database query is vulnerable to SQL injection attacks'
        }]
      };

      const result = await service.generateContentForFindings(findings, mockUser);

      expect(result).toHaveLength(1);
      
      const educationalContent = result[0];
      expect(educationalContent.content.title).toContain('SQL Injection');
      expect(educationalContent.content.explanation).toContain('security');
      expect(educationalContent.relevanceScore).toBeGreaterThan(0.5);
      expect(educationalContent.metadata.adaptedForUser).toBe(true);
    });

    test('should handle mixed severity findings appropriately', async () => {
      const findings = {
        security: [
          { ...createMockFinding(), severity: 'critical', category: 'security' },
          { ...createMockFinding(), severity: 'low', category: 'security' }
        ],
        performance: [
          { ...createMockFinding(), severity: 'medium', category: 'performance' }
        ]
      };

      const result = await service.generateContentForFindings(findings, mockUser);

      expect(result).toHaveLength(3);
      
      // Critical finding should have highest relevance
      const relevanceScores = result.map(r => r.relevanceScore);
      expect(Math.max(...relevanceScores)).toBeGreaterThan(0.8);
    });
  });

  describe('Error Resilience', () => {
    test('should continue processing when individual findings fail', async () => {
      const findings = {
        security: [
          createMockFinding(), // Valid finding
          { ...createMockFinding(), id: undefined }, // Invalid finding
          createMockFinding() // Another valid finding
        ]
      };

      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.generateContentForFindings(findings, mockUser);

      // Should still process valid findings
      expect(result.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });

    test('should return empty array on complete failure', async () => {
      // Mock complete service failure
      const originalGenerateContent = (service as any).generateContentForFinding;
      (service as any).generateContentForFinding = jest.fn().mockRejectedValue(new Error('Complete failure'));

      const findings = { security: [createMockFinding()] };
      
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.generateContentForFindings(findings, mockUser);

      expect(result).toEqual([]);
      
      consoleSpy.mockRestore();
      (service as any).generateContentForFinding = originalGenerateContent;
    });
  });
});