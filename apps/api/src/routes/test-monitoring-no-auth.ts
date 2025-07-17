import { Router, Request, Response } from 'express';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { AuthenticatedUser } from '../middleware/auth-middleware';

const router = Router();

// Test endpoint that bypasses auth for monitoring tests
router.post('/test-monitoring-flow', async (req: Request, res: Response) => {
  try {
    console.log('Test monitoring endpoint called (no auth required)');
    
    // Create a test authenticated user
    const testUser: AuthenticatedUser = {
      id: 'test-user-id',
      email: 'test@codequal.dev',
      organizationId: 'test-org-id',
      permissions: ['read', 'write', 'admin'],
      role: 'user',
      status: 'active',
      session: {
        token: 'test-session-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    };

    // Create orchestrator instance
    const orchestrator = new ResultOrchestrator(testUser);

    // Use provided request body or default test PR
    const analysisRequest = {
      repositoryUrl: req.body.repositoryUrl || 'https://github.com/facebook/react',
      prNumber: req.body.prNumber || 28000,
      analysisMode: req.body.analysisMode || 'comprehensive',
      authenticatedUser: testUser
    };

    console.log('Starting PR analysis with monitoring:', analysisRequest);

    // Run the analysis
    const result = await orchestrator.analyzePR(analysisRequest);

    console.log('Analysis completed successfully');
    res.json({
      success: true,
      analysisId: result.analysisId,
      status: result.status,
      summary: result.report.summary,
      totalFindings: result.metrics.totalFindings,
      processingSteps: result.metadata.processingSteps
    });

  } catch (error) {
    console.error('Test monitoring error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

export default router;