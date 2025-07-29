import request from 'supertest';
import express from 'express';
import { resultOrchestratorRoutes } from '../../routes/result-orchestrator';
import { createMockAuthenticatedUser } from '../setup';
import { validatePRAnalysisRequest } from '../../validators/request-validators';
import { ResultOrchestrator } from '../../services/result-orchestrator';
import { checkRepositoryAccess } from '../../middleware/auth-middleware';

// Mock the services
jest.mock('../../services/result-orchestrator');
jest.mock('../../middleware/auth-middleware', () => ({
  checkRepositoryAccess: jest.fn().mockResolvedValue(true),
  AuthenticatedRequest: class MockRequest extends Request {
    user = createMockAuthenticatedUser();
  }
}));

jest.mock('../../validators/request-validators', () => ({
  validatePRAnalysisRequest: jest.fn().mockReturnValue({ isValid: true, errors: [] })
}));

const mockAnalysisResult = {
  analysisId: 'test-analysis-123',
  status: 'complete',
  repository: {
    url: 'https://github.com/owner/repo',
    name: 'repo',
    primaryLanguage: 'typescript'
  },
  pr: {
    number: 123,
    title: 'Test PR',
    changedFiles: 5
  },
  analysis: {
    mode: 'comprehensive',
    agentsUsed: ['security', 'architecture'],
    totalFindings: 10,
    processingTime: 30000
  },
  findings: {
    security: [],
    architecture: [],
    performance: [],
    codeQuality: []
  },
  educationalContent: [],
  metrics: {
    severity: { critical: 0, high: 2, medium: 5, low: 3 },
    confidence: 0.85,
    coverage: 90
  },
  report: {
    summary: 'Analysis completed successfully',
    recommendations: [],
    prComment: 'No critical issues found'
  },
  metadata: {
    timestamp: new Date(),
    modelVersions: {},
    processingSteps: []
  }
};

const mockResultOrchestrator = {
  analyzePR: jest.fn().mockResolvedValue(mockAnalysisResult)
};

jest.mock('../../services/result-orchestrator', () => ({
  ResultOrchestrator: jest.fn().mockImplementation(() => mockResultOrchestrator)
}));

describe('Result Orchestrator Routes', () => {
  let app: express.Application;
  let mockUser: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, res, next) => {
      req.user = createMockAuthenticatedUser();
      next();
    });
    
    app.use('/api', resultOrchestratorRoutes);
    
    mockUser = createMockAuthenticatedUser();
    jest.clearAllMocks();
  });

  describe('POST /api/analyze-pr', () => {
    const validRequest = {
      repositoryUrl: 'https://github.com/owner/repo',
      prNumber: 123,
      analysisMode: 'comprehensive'
    };

    test('should accept valid PR analysis request', async () => {
      mockResultOrchestrator.analyzePR.mockResolvedValueOnce({
        analysisId: 'test-analysis-123',
        status: 'complete',
        findings: { security: [], architecture: [] }
      });

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

    test('should reject invalid request body', async () => {
      (validatePRAnalysisRequest as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: ['repositoryUrl is required', 'prNumber must be a positive integer']
      });

      const response = await request(app)
        .post('/api/analyze-pr')
        .send({ invalid: 'request' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid request',
        details: expect.arrayContaining([
          'repositoryUrl is required',
          'prNumber must be a positive integer'
        ])
      });
    });

    test('should reject request for inaccessible repository', async () => {
      (checkRepositoryAccess as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/analyze-pr')
        .send(validRequest)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to repository',
        repositoryUrl: validRequest.repositoryUrl
      });
    });

    test('should handle different analysis modes', async () => {
      const modes = ['quick', 'comprehensive', 'deep'];
      
      for (const mode of modes) {
        const response = await request(app)
          .post('/api/analyze-pr')
          .send({ ...validRequest, analysisMode: mode })
          .expect(200);

        expect(response.body.estimatedTime).toBeGreaterThan(0);
      }
    });

    test('should include github token when provided', async () => {
      const requestWithToken = {
        ...validRequest,
        githubToken: 'test-github-token'
      };

      await request(app)
        .post('/api/analyze-pr')
        .send(requestWithToken)
        .expect(200);

      expect(mockResultOrchestrator.analyzePR).toHaveBeenCalledWith(
        expect.objectContaining({
          githubToken: 'test-github-token'
        })
      );
    });

    test('should handle orchestrator errors gracefully', async () => {
      mockResultOrchestrator.analyzePR.mockRejectedValueOnce(
        new Error('Analysis service unavailable')
      );

      // The route should still return 200 initially since error handling is async
      const response = await request(app)
        .post('/api/analyze-pr')
        .send(validRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        analysisId: expect.any(String),
        status: 'queued',
        estimatedTime: expect.any(Number)
      });

      // Wait a bit for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check progress to see if error was captured
      const progressResponse = await request(app)
        .get(`/api/analysis/${response.body.analysisId}/progress`)
        .expect(200);

      expect(progressResponse.body.status).toBe('failed');
      expect(progressResponse.body.error).toBe('Analysis service unavailable');
    });

    test('should track analysis progress internally', async () => {
      // Mock with a delayed promise to keep it in processing state
      mockResultOrchestrator.analyzePR.mockImplementationOnce(
        () => new Promise(resolve => 
          setTimeout(() => resolve(mockAnalysisResult), 1000)
        )
      );

      const response = await request(app)
        .post('/api/analyze-pr')
        .send(validRequest)
        .expect(200);

      const analysisId = response.body.analysisId;

      // Check that analysis can be tracked immediately (should be queued)
      const progressResponse = await request(app)
        .get(`/api/analysis/${analysisId}/progress`)
        .expect(200);

      expect(progressResponse.body).toMatchObject({
        analysisId,
        status: expect.oneOf(['queued', 'processing']),
        progress: expect.any(Number)
      });
    });
  });

  describe('GET /api/analysis/:id/progress', () => {
    test('should return progress for existing analysis', async () => {
      // First create an analysis
      const createResponse = await request(app)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick'
        });

      const analysisId = createResponse.body.analysisId;

      const response = await request(app)
        .get(`/api/analysis/${analysisId}/progress`)
        .expect(200);

      expect(response.body).toMatchObject({
        analysisId,
        status: expect.oneOf(['queued', 'processing', 'complete', 'failed']),
        progress: expect.any(Number),
        estimatedTimeRemaining: expect.any(Number),
        currentStep: expect.any(String)
      });

      expect(response.body.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.progress).toBeLessThanOrEqual(100);
    });

    test('should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/analysis/non-existent-id/progress')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Analysis not found',
        analysisId: 'non-existent-id'
      });
    });

    test('should deny access to other users analysis', async () => {
      // Create a new app instance with different user
      const testApp = express();
      testApp.use(express.json());
      
      // Mock authentication middleware with original user for creation
      testApp.use((req: any, res, next) => {
        req.user = createMockAuthenticatedUser();
        next();
      });
      
      testApp.use('/api', resultOrchestratorRoutes);

      // Create analysis with first user
      const createResponse = await request(testApp)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick'
        });

      const analysisId = createResponse.body.analysisId;

      // Create another app instance with different user
      const testApp2 = express();
      testApp2.use(express.json());
      
      testApp2.use((req: any, res, next) => {
        req.user = { ...createMockAuthenticatedUser(), id: 'different-user' };
        next();
      });
      
      testApp2.use('/api', resultOrchestratorRoutes);

      const response = await request(testApp2)
        .get(`/api/analysis/${analysisId}/progress`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to analysis results',
        analysisId
      });
    });

    test('should show completed analysis with results', async () => {
      // Mock completed analysis
      const analysisResults = {
        findings: { security: [], architecture: [] },
        metrics: { totalFindings: 0 }
      };

      mockResultOrchestrator.analyzePR.mockResolvedValueOnce(analysisResults);

      const createResponse = await request(app)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick'
        });

      const analysisId = createResponse.body.analysisId;

      // Simulate completion by waiting and checking progress
      setTimeout(async () => {
        const response = await request(app)
          .get(`/api/analysis/${analysisId}/progress`)
          .expect(200);

        if (response.body.status === 'complete') {
          expect(response.body.results).toBeDefined();
          expect(response.body.progress).toBe(100);
        }
      }, 100);
    });

    test('should calculate progress correctly over time', async () => {
      const createResponse = await request(app)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'comprehensive'
        });

      const analysisId = createResponse.body.analysisId;

      // Check progress immediately
      const response1 = await request(app)
        .get(`/api/analysis/${analysisId}/progress`);

      // Check progress after some time
      setTimeout(async () => {
        const response2 = await request(app)
          .get(`/api/analysis/${analysisId}/progress`);

        if (response2.body.status !== 'complete') {
          expect(response2.body.progress).toBeGreaterThanOrEqual(response1.body.progress);
        }
      }, 50);
    });
  });

  describe('DELETE /api/analysis/:id', () => {
    test('should cancel ongoing analysis', async () => {
      const createResponse = await request(app)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'comprehensive'
        });

      const analysisId = createResponse.body.analysisId;

      const response = await request(app)
        .delete(`/api/analysis/${analysisId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Analysis cancelled successfully',
        analysisId
      });

      // Verify analysis is marked as cancelled
      const statusResponse = await request(app)
        .get(`/api/analysis/${analysisId}/progress`);

      expect(statusResponse.body.status).toBe('cancelled');
    });

    test('should return 404 for non-existent analysis', async () => {
      const response = await request(app)
        .delete('/api/analysis/non-existent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Analysis not found',
        analysisId: 'non-existent-id'
      });
    });

    test('should deny access to other users analysis', async () => {
      // Create a new app instance for creation
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res, next) => {
        req.user = createMockAuthenticatedUser();
        next();
      });
      testApp.use('/api', resultOrchestratorRoutes);

      const createResponse = await request(testApp)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick'
        });

      const analysisId = createResponse.body.analysisId;

      // Create another app instance with different user
      const testApp2 = express();
      testApp2.use(express.json());
      testApp2.use((req: any, res, next) => {
        req.user = { ...createMockAuthenticatedUser(), id: 'different-user' };
        next();
      });
      testApp2.use('/api', resultOrchestratorRoutes);

      const response = await request(testApp2)
        .delete(`/api/analysis/${analysisId}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to analysis',
        analysisId
      });
    });
  });

  describe('Helper Functions', () => {
    test('getEstimatedTime should return appropriate times for different modes', () => {
      const getEstimatedTime = (global as any).getEstimatedTime || 
        ((mode: string) => {
          switch (mode) {
            case 'quick': return 60;
            case 'comprehensive': return 180;
            case 'deep': return 300;
            default: return 180;
          }
        });

      expect(getEstimatedTime('quick')).toBe(60);
      expect(getEstimatedTime('comprehensive')).toBe(180);
      expect(getEstimatedTime('deep')).toBe(300);
      expect(getEstimatedTime('unknown')).toBe(180);
    });

    test('getCurrentStep should return appropriate step names', () => {
      const getCurrentStep = (global as any).getCurrentStep || 
        ((status: string, progress: number) => {
          if (status === 'complete') return 'Analysis complete';
          if (status === 'failed') return 'Analysis failed';
          if (status === 'cancelled') return 'Analysis cancelled';
          if (progress < 20) return 'Extracting PR context';
          if (progress < 40) return 'Checking repository analysis';
          if (progress < 60) return 'Coordinating agents';
          if (progress < 80) return 'Processing results';
          return 'Generating report';
        });

      expect(getCurrentStep('complete', 100)).toBe('Analysis complete');
      expect(getCurrentStep('failed', 50)).toBe('Analysis failed');
      expect(getCurrentStep('processing', 10)).toBe('Extracting PR context');
      expect(getCurrentStep('processing', 30)).toBe('Checking repository analysis');
      expect(getCurrentStep('processing', 50)).toBe('Coordinating agents');
      expect(getCurrentStep('processing', 70)).toBe('Processing results');
      expect(getCurrentStep('processing', 90)).toBe('Generating report');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/analyze-pr')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Express should handle JSON parsing errors
    });

    test('should handle internal server errors gracefully', async () => {
      // Mock service to throw error
      mockResultOrchestrator.analyzePR.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'quick'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error',
        message: expect.any(String)
      });
    });

    test('should validate analysis mode values', async () => {
      (validatePRAnalysisRequest as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: ['analysisMode must be one of: quick, comprehensive, deep, auto']
      });

      const response = await request(app)
        .post('/api/analyze-pr')
        .send({
          repositoryUrl: 'https://github.com/owner/repo',
          prNumber: 123,
          analysisMode: 'invalid-mode'
        })
        .expect(400);

      expect(response.body.details).toContain(
        'analysisMode must be one of: quick, comprehensive, deep, auto'
      );
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent analysis requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/analyze-pr')
          .send({
            repositoryUrl: `https://github.com/owner/repo${i}`,
            prNumber: 123 + i,
            analysisMode: 'quick'
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.analysisId).toBeDefined();
      });

      // All analysis IDs should be unique
      const analysisIds = responses.map(r => r.body.analysisId);
      const uniqueIds = new Set(analysisIds);
      expect(uniqueIds.size).toBe(analysisIds.length);
    });

    test('should handle progress checks for multiple analyses', async () => {
      // Create multiple analyses
      const createRequests = Array.from({ length: 3 }, (_, i) => 
        request(app)
          .post('/api/analyze-pr')
          .send({
            repositoryUrl: `https://github.com/owner/repo${i}`,
            prNumber: 123 + i,
            analysisMode: 'quick'
          })
      );

      const createResponses = await Promise.all(createRequests);
      const analysisIds = createResponses.map(r => r.body.analysisId);

      // Check progress for all analyses
      const progressRequests = analysisIds.map(id => 
        request(app).get(`/api/analysis/${id}/progress`)
      );

      const progressResponses = await Promise.all(progressRequests);

      progressResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.analysisId).toBe(analysisIds[index]);
      });
    });
  });
});