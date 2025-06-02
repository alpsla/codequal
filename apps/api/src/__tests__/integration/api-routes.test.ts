import request from 'supertest';
import express from 'express';
import { authMiddleware } from '../../middleware/auth-middleware';
import { resultOrchestratorRoutes } from '../../routes/result-orchestrator';
import { repositoryRoutes } from '../../routes/repository';
import { analysisRoutes } from '../../routes/analysis';
import { createMockAuthenticatedUser } from '../setup';

// Mock authentication middleware
jest.mock('../../middleware/auth-middleware', () => ({
  authMiddleware: jest.fn((req: any, res: any, next: any) => {
    req.user = createMockAuthenticatedUser();
    next();
  }),
  checkRepositoryAccess: jest.fn().mockResolvedValue(true)
}));

// Mock all services
const mockAnalysisResult = {
  analysisId: 'test-analysis-123',
  status: 'complete',
  repository: { url: 'https://github.com/owner/repo', name: 'repo', primaryLanguage: 'typescript' },
  pr: { number: 123, title: 'Test PR', changedFiles: 5 },
  analysis: { mode: 'comprehensive', agentsUsed: ['security'], totalFindings: 0, processingTime: 1000 },
  findings: { security: [], architecture: [], performance: [], codeQuality: [] },
  educationalContent: [],
  metrics: { severity: { critical: 0, high: 0, medium: 0, low: 0 }, confidence: 0.9, coverage: 95 },
  report: { summary: 'No issues found', recommendations: [], prComment: 'All good!' },
  metadata: { timestamp: new Date(), modelVersions: {}, processingSteps: [] }
};

const mockResultOrchestrator = {
  analyzePR: jest.fn().mockResolvedValue(mockAnalysisResult)
};

jest.mock('../../services/result-orchestrator', () => ({
  ResultOrchestrator: jest.fn().mockImplementation(() => mockResultOrchestrator)
}));

jest.mock('../../services/deepwiki-manager');
jest.mock('../../validators/request-validators', () => ({
  validatePRAnalysisRequest: jest.fn().mockReturnValue({ isValid: true, errors: [] })
}));

describe('API Routes Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Apply authentication middleware
    app.use('/api', authMiddleware);
    
    // Add all routes
    app.use('/api', resultOrchestratorRoutes);
    app.use('/api/repository', repositoryRoutes);
    app.use('/api/analysis', analysisRoutes);
    
    // Add health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
    
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'healthy' });
    });
  });

  describe('Authentication Integration', () => {
    test('should apply authentication to all API routes', async () => {
      // Test that authentication middleware is applied
      await request(app)
        .get('/api/analysis/history')
        .expect(200);

      expect(authMiddleware).toHaveBeenCalled();
    });
  });

  describe('Result Orchestrator Integration', () => {
    test('should handle PR analysis request through full stack', async () => {
      const validRequest = {
        repositoryUrl: 'https://github.com/owner/repo',
        prNumber: 123,
        analysisMode: 'comprehensive'
      };

      const response = await request(app)
        .post('/api/analyze-pr')
        .send(validRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        analysisId: expect.stringMatching(/^analysis_\d+_[a-z0-9]+$/),
        status: 'queued',
        estimatedTime: expect.any(Number)
      });
    });
  });

  describe('Repository Routes Integration', () => {
    test('should handle repository status check', async () => {
      const mockDeepWikiManager = {
        checkRepositoryExists: jest.fn().mockResolvedValue(true)
      };

      jest.doMock('../../services/deepwiki-manager', () => ({
        DeepWikiManager: jest.fn().mockImplementation(() => mockDeepWikiManager)
      }));

      const response = await request(app)
        .get('/api/repository/status')
        .query({ repositoryUrl: 'https://github.com/owner/repo' })
        .expect(200);

      expect(response.body).toMatchObject({
        repositoryUrl: 'https://github.com/owner/repo',
        existsInVectorDB: true,
        analysisQuality: expect.oneOf(['fresh', 'stale', 'outdated', 'none']),
        canTriggerAnalysis: expect.any(Boolean)
      });
    });

    test('should require repositoryUrl for status check', async () => {
      const response = await request(app)
        .get('/api/repository/status')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'repositoryUrl query parameter is required'
      });
    });
  });

  describe('Analysis Routes Integration', () => {
    test('should handle analysis history request', async () => {
      const response = await request(app)
        .get('/api/analysis/history')
        .expect(200);

      expect(response.body).toMatchObject({
        analyses: expect.any(Array),
        pagination: expect.objectContaining({
          total: expect.any(Number),
          offset: expect.any(Number),
          limit: expect.any(Number),
          hasMore: expect.any(Boolean)
        })
      });
    });

    test('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/analysis/history')
        .query({ limit: 10, offset: 5 })
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        offset: 5,
        limit: 10
      });
    });

    test('should handle analysis stats request', async () => {
      const response = await request(app)
        .get('/api/analysis/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        totalAnalyses: expect.any(Number),
        repositoriesAnalyzed: expect.any(Number),
        averageFindings: expect.any(Number),
        severityBreakdown: expect.objectContaining({
          critical: expect.any(Number),
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number)
        }),
        timeRange: expect.any(String)
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle service errors gracefully', async () => {
      const mockDeepWikiManager = {
        checkRepositoryExists: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      };

      jest.doMock('../../services/deepwiki-manager', () => ({
        DeepWikiManager: jest.fn().mockImplementation(() => mockDeepWikiManager)
      }));

      const response = await request(app)
        .get('/api/repository/status')
        .query({ repositoryUrl: 'https://github.com/owner/repo' })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error',
        message: expect.any(String)
      });
    });

    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/analyze-pr')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Express should handle JSON parsing errors
    });
  });

  describe('CORS and Security Headers', () => {
    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/analyze-pr')
        .set('Origin', 'https://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      // Should not error, though exact behavior depends on CORS setup
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Content-Type Handling', () => {
    test('should handle JSON content type', async () => {
      const validRequest = {
        repositoryUrl: 'https://github.com/owner/repo',
        prNumber: 123,
        analysisMode: 'quick'
      };

      const response = await request(app)
        .post('/api/analyze-pr')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(validRequest))
        .expect(200);

      expect(response.body).toBeDefined();
    });

    test('should handle markdown report requests', async () => {
      // Create a mock analysis first
      const analysisId = 'test-analysis-123';
      
      // This would normally exist in analysis history
      const response = await request(app)
        .get(`/api/analysis/${analysisId}/report`)
        .query({ format: 'markdown' })
        .expect(404); // Since no analysis exists

      expect(response.body).toMatchObject({
        error: 'Analysis not found',
        analysisId
      });
    });
  });

  describe('Parameter Validation Integration', () => {
    test('should validate query parameters across routes', async () => {
      // Test invalid query parameter
      const response = await request(app)
        .get('/api/repository/status')
        .query({ repositoryUrl: 123 })
        .expect(400);

      expect(response.body.error).toContain('repositoryUrl');
    });

    test('should validate path parameters', async () => {
      const response = await request(app)
        .get('/api/analysis/invalid-analysis-id/results')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Analysis not found',
        analysisId: 'invalid-analysis-id'
      });
    });
  });

  describe('Rate Limiting Preparedness', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/analysis/history')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});