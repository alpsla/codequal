/**
 * Tests for Educational Agent with MCP Tool Integration
 */

import { EducationalAgent } from '../educational-agent';
// Mock EducationalToolOrchestrator since it's in a different package
class EducationalToolOrchestrator {
  constructor(private authenticatedUser: any) {}
  
  async generateEducationalContent(params: any) {
    return {
      content: 'Mock educational content',
      exercises: [],
      resources: []
    };
  }
}
import { RecommendationModule } from '../../types/recommendation-types';
import { createLogger } from '@codequal/core/utils';

// Mock dependencies
jest.mock('@codequal/core/utils', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

const mockVectorDB = {
  search: jest.fn(),
  store: jest.fn(),
  delete: jest.fn()
};

const mockAuthenticatedUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'developer',
  permissions: ['read', 'write'],
  status: 'active'
};

const mockToolOrchestrator = {
  executeEducationalTools: jest.fn()
};

describe('Educational Agent with Tool Integration', () => {
  let educationalAgent: EducationalAgent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    educationalAgent = new EducationalAgent(mockVectorDB, mockAuthenticatedUser);
  });

  describe('analyzeFromRecommendationsWithTools', () => {
    it('should process recommendations with tool results correctly', async () => {
      // Setup mock data
      const mockRecommendations: RecommendationModule = {
        summary: {
          totalRecommendations: 5,
          focusAreas: ['Security', 'Code Quality'],
          description: 'Critical security issues need attention',
          estimatedEffort: '8 hours',
          priorityBreakdown: { critical: 1, high: 2, medium: 2, low: 0 }
        },
        recommendations: [
          {
            id: 'rec-1',
            title: 'Fix SQL Injection vulnerability',
            description: 'Parameterize SQL queries',
            priority: { level: 'critical', score: 10, justification: 'Security risk' },
            category: 'security',
            estimatedEffort: '2 hours',
            impact: 'high',
            tags: ['security', 'sql']
          },
          {
            id: 'rec-2',
            title: 'Reduce function complexity',
            description: 'Break down complex functions',
            priority: { level: 'high', score: 8, justification: 'Maintainability' },
            category: 'codeQuality',
            estimatedEffort: '3 hours',
            impact: 'medium',
            tags: ['complexity', 'refactoring']
          }
        ],
        implementationPlan: {
          phase1: {
            name: 'Critical Fixes',
            timeframe: '1 day',
            recommendations: ['rec-1'],
            totalEffort: '2 hours'
          },
          phase2: {
            name: 'Quality Improvements',
            timeframe: '1 week',
            recommendations: ['rec-2'],
            totalEffort: '3 hours'
          }
        }
      };

      const mockToolResults = {
        documentationResults: [
          {
            source: 'Context7',
            title: 'SQL Injection Prevention Guide',
            content: 'Use parameterized queries...',
            relevance: 0.95
          }
        ],
        workingExamples: [
          {
            source: 'GitHub',
            title: 'Secure SQL Query Example',
            code: 'const query = "SELECT * FROM users WHERE id = ?";',
            language: 'javascript',
            rating: 4.8
          }
        ],
        compiledContext: {
          securityPatterns: ['input-validation', 'parameterized-queries'],
          bestPractices: ['Never concatenate user input in SQL'],
          learningResources: ['OWASP SQL Injection Prevention']
        },
        metadata: {
          toolsExecuted: ['context7-mcp', 'working-examples-mcp'],
          executionTime: 1500,
          cacheHits: 2,
          costSaved: 0.15
        }
      };

      // Execute the method
      const result = await educationalAgent.analyzeFromRecommendationsWithTools(
        mockRecommendations,
        mockToolResults
      );

      // Verify the results
      expect(result).toBeDefined();
      expect(result.learningPath).toBeDefined();
      expect(result.learningPath.steps).toHaveLength(4); // Should have learning steps
      expect(result.learningPath.totalSteps).toBe(4);
      
      // Check that tool results were integrated
      expect(result.content.resources).toContainEqual(
        expect.objectContaining({
          type: 'documentation',
          title: 'SQL Injection Prevention Guide',
          status: 'available'
        })
      );

      // Verify working examples were included
      expect(result.content.examples).toContainEqual(
        expect.objectContaining({
          title: 'Secure SQL Query Example',
          language: 'javascript'
        })
      );

      // Check skill gaps identification
      expect(result.insights.skillGaps).toContainEqual(
        expect.objectContaining({
          skill: 'Security Best Practices',
          priority: 'high'
        })
      );
    });

    it('should handle tiered storage strategy correctly', async () => {
      const mockRecommendations: RecommendationModule = {
        summary: {
          totalRecommendations: 1,
          focusAreas: ['Performance'],
          description: 'Optimize database queries',
          estimatedEffort: '2 hours',
          priorityBreakdown: { critical: 0, high: 1, medium: 0, low: 0 }
        },
        recommendations: [{
          id: 'rec-1',
          title: 'Optimize N+1 queries',
          description: 'Use eager loading',
          priority: { level: 'high', score: 8, justification: 'Performance impact' },
          category: 'performance',
          estimatedEffort: '2 hours',
          impact: 'high',
          tags: ['database', 'optimization']
        }]
      };

      const mockToolResults = {
        documentationResults: [
          {
            source: 'Internet',
            title: 'Query Optimization Guide',
            content: 'Generic optimization tips...',
            relevance: 0.7,
            storageType: 'cache-only' // Should not be stored permanently
          }
        ],
        workingExamples: [],
        compiledContext: {},
        metadata: {
          toolsExecuted: ['context7-mcp'],
          executionTime: 800,
          cacheHits: 0,
          costSaved: 0
        }
      };

      const result = await educationalAgent.analyzeFromRecommendationsWithTools(
        mockRecommendations,
        mockToolResults
      );

      // Verify cache-only content is marked appropriately
      const internetResource = result.content.resources.find(
        r => r.title === 'Query Optimization Guide'
      );
      expect(internetResource).toBeDefined();
      expect(internetResource?.status).toBe('research_requested'); // Not permanently available
    });

    it('should generate educational content without tool results', async () => {
      const mockRecommendations: RecommendationModule = {
        summary: {
          totalRecommendations: 1,
          focusAreas: ['Architecture'],
          description: 'Improve code structure',
          estimatedEffort: '4 hours',
          priorityBreakdown: { critical: 0, high: 0, medium: 1, low: 0 }
        },
        recommendations: [{
          id: 'rec-1',
          title: 'Apply SOLID principles',
          description: 'Refactor to follow SOLID',
          priority: { level: 'medium', score: 6, justification: 'Better architecture' },
          category: 'architecture',
          estimatedEffort: '4 hours',
          impact: 'medium',
          tags: ['architecture', 'solid']
        }]
      };

      // No tool results provided
      const emptyToolResults = {
        documentationResults: [],
        workingExamples: [],
        compiledContext: {},
        metadata: {
          toolsExecuted: [],
          executionTime: 0,
          cacheHits: 0,
          costSaved: 0
        }
      };

      const result = await educationalAgent.analyzeFromRecommendationsWithTools(
        mockRecommendations,
        emptyToolResults
      );

      // Should still generate educational content
      expect(result).toBeDefined();
      expect(result.learningPath.steps.length).toBeGreaterThan(0);
      expect(result.content.bestPractices.length).toBeGreaterThan(0);
      
      // But resources should be marked as needing research
      expect(result.content.resources.every(r => r.status === 'research_requested')).toBe(true);
    });

    it('should prioritize curated content over generic internet results', async () => {
      const mockRecommendations: RecommendationModule = {
        summary: {
          totalRecommendations: 1,
          focusAreas: ['Security'],
          description: 'Security improvements needed',
          estimatedEffort: '3 hours',
          priorityBreakdown: { critical: 0, high: 1, medium: 0, low: 0 }
        },
        recommendations: [{
          id: 'rec-1',
          title: 'Implement authentication',
          description: 'Add proper auth system',
          priority: { level: 'high', score: 9, justification: 'Security requirement' },
          category: 'security',
          estimatedEffort: '3 hours',
          impact: 'high',
          tags: ['security', 'authentication']
        }]
      };

      const mockToolResults = {
        documentationResults: [
          {
            source: 'CodeQual-Curated',
            title: 'Authentication Best Practices',
            content: 'Curated guide for secure auth...',
            relevance: 0.98,
            storageType: 'permanent'
          },
          {
            source: 'Internet',
            title: 'Basic Auth Tutorial',
            content: 'Generic auth tutorial...',
            relevance: 0.85,
            storageType: 'cache-only'
          }
        ],
        workingExamples: [],
        compiledContext: {},
        metadata: {
          toolsExecuted: ['context7-mcp'],
          executionTime: 1200,
          cacheHits: 1,
          costSaved: 0.05
        }
      };

      const result = await educationalAgent.analyzeFromRecommendationsWithTools(
        mockRecommendations,
        mockToolResults
      );

      // Should prioritize curated content
      const resources = result.content.resources;
      const curatedResource = resources.find(r => r.title === 'Authentication Best Practices');
      const genericResource = resources.find(r => r.title === 'Basic Auth Tutorial');

      expect(curatedResource).toBeDefined();
      expect(curatedResource?.status).toBe('available');
      
      // Generic resource should be lower priority or marked differently
      if (genericResource) {
        expect(genericResource.status).toBe('research_requested');
      }
    });
  });

  describe('Cost Control Mechanisms', () => {
    it('should track and report cost savings from cache hits', async () => {
      const mockRecommendations: RecommendationModule = {
        summary: {
          totalRecommendations: 2,
          focusAreas: ['Performance', 'Security'],
          description: 'Multiple improvements needed',
          estimatedEffort: '5 hours',
          priorityBreakdown: { critical: 0, high: 2, medium: 0, low: 0 }
        },
        recommendations: [
          {
            id: 'rec-1',
            title: 'Cache implementation',
            description: 'Add caching layer',
            priority: { level: 'high', score: 8, justification: 'Performance' },
            category: 'performance',
            estimatedEffort: '3 hours',
            impact: 'high',
            tags: ['performance', 'caching']
          },
          {
            id: 'rec-2',
            title: 'Add rate limiting',
            description: 'Prevent API abuse',
            priority: { level: 'high', score: 8, justification: 'Security' },
            category: 'security',
            estimatedEffort: '2 hours',
            impact: 'high',
            tags: ['security', 'api']
          }
        ]
      };

      const mockToolResults = {
        documentationResults: [
          {
            source: 'Cache',
            title: 'Redis Caching Guide',
            content: 'Previously fetched content...',
            relevance: 0.92,
            fromCache: true
          },
          {
            source: 'Cache',
            title: 'Rate Limiting Best Practices',
            content: 'Previously fetched content...',
            relevance: 0.89,
            fromCache: true
          }
        ],
        workingExamples: [],
        compiledContext: {},
        metadata: {
          toolsExecuted: ['context7-mcp'],
          executionTime: 200, // Fast due to cache
          cacheHits: 2,
          costSaved: 0.30 // Saved API calls
        }
      };

      const result = await educationalAgent.analyzeFromRecommendationsWithTools(
        mockRecommendations,
        mockToolResults
      );

      // Verify cost tracking is included
      expect(result.metadata).toBeDefined();
      expect(result.metadata.costOptimization).toMatchObject({
        cacheHits: 2,
        costSaved: 0.30,
        executionTime: expect.any(Number)
      });

      // Resources should be available despite being from cache
      const resources = result.content.resources;
      expect(resources.length).toBeGreaterThanOrEqual(2);
      expect(resources.filter(r => r.status === 'available').length).toBeGreaterThanOrEqual(2);
    });
  });
});