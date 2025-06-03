import { Router, Request, Response } from 'express';
import { checkRepositoryAccess } from '../middleware/auth-middleware';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { validatePRAnalysisRequest, validateAnalysisMode } from '../validators/request-validators';
import '../types/express';

export const resultOrchestratorRoutes = Router();

// Store for tracking active analyses
const activeAnalyses = new Map<string, any>();

interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep';
  githubToken?: string;
}

interface AnalysisResponse {
  analysisId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  estimatedTime: number;
  progress?: number;
  results?: any;
}

/**
 * POST /api/analyze-pr
 * Main endpoint for PR analysis requests
 */
resultOrchestratorRoutes.post('/analyze-pr', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = validatePRAnalysisRequest(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: validationResult.errors 
      });
    }

    const request: PRAnalysisRequest = req.body;
    const user = req.user;

    // Check repository access
    const hasAccess = await checkRepositoryAccess(user, request.repositoryUrl);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied to repository',
        repositoryUrl: request.repositoryUrl
      });
    }

    // Create result orchestrator instance
    const orchestrator = new ResultOrchestrator(user);

    // Generate analysis ID
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start analysis (async)
    const analysisPromise = orchestrator.analyzePR({
      ...request,
      authenticatedUser: user
    });

    // Store analysis promise for tracking
    activeAnalyses.set(analysisId, {
      promise: analysisPromise,
      status: 'processing',
      startTime: new Date(),
      request,
      user: user.id
    });

    // Estimate completion time based on analysis mode
    const estimatedTime = getEstimatedTime(request.analysisMode);

    // Handle analysis completion
    analysisPromise
      .then(result => {
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'complete';
          analysis.results = result;
          analysis.completedAt = new Date();
        }
      })
      .catch(error => {
        console.error(`Analysis ${analysisId} failed:`, error);
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'failed';
          analysis.error = error.message;
          analysis.completedAt = new Date();
        }
      });

    const response: AnalysisResponse = {
      analysisId,
      status: 'queued',
      estimatedTime
    };

    res.json(response);

  } catch (error) {
    console.error('PR analysis request error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analysis/:id/progress
 * Check analysis progress and get results
 */
resultOrchestratorRoutes.get('/analysis/:id/progress', (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const user = req.user;

    const analysis = activeAnalyses.get(analysisId);
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    // Check if user owns this analysis
    if (analysis.user !== user.id) {
      return res.status(403).json({ 
        error: 'Access denied to analysis results',
        analysisId 
      });
    }

    // Calculate progress
    const elapsed = Date.now() - analysis.startTime.getTime();
    const estimatedTotal = getEstimatedTime(analysis.request.analysisMode) * 1000;
    const progress = Math.min(95, (elapsed / estimatedTotal) * 100);

    const response = {
      analysisId,
      status: analysis.status,
      progress: analysis.status === 'complete' ? 100 : Math.round(progress),
      estimatedTimeRemaining: analysis.status === 'complete' ? 0 : Math.max(0, estimatedTotal - elapsed),
      currentStep: getCurrentStep(analysis.status, progress),
      ...(analysis.results && { results: analysis.results }),
      ...(analysis.error && { error: analysis.error })
    };

    res.json(response);

  } catch (error) {
    console.error('Progress check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/analysis/:id
 * Cancel an ongoing analysis
 */
resultOrchestratorRoutes.delete('/analysis/:id', (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const user = req.user;

    const analysis = activeAnalyses.get(analysisId);
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    // Check if user owns this analysis
    if (analysis.user !== user.id) {
      return res.status(403).json({ 
        error: 'Access denied to analysis',
        analysisId 
      });
    }

    // Mark as cancelled (we can't actually cancel the promise, but we can mark it)
    analysis.status = 'cancelled';
    analysis.cancelledAt = new Date();

    res.json({ 
      message: 'Analysis cancelled successfully',
      analysisId 
    });

  } catch (error) {
    console.error('Analysis cancellation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions
function getEstimatedTime(mode: string): number {
  switch (mode) {
    case 'quick': return 60; // 1 minute
    case 'comprehensive': return 180; // 3 minutes
    case 'deep': return 300; // 5 minutes
    default: return 180;
  }
}

function getCurrentStep(status: string, progress: number): string {
  if (status === 'complete') return 'Analysis complete';
  if (status === 'failed') return 'Analysis failed';
  if (status === 'cancelled') return 'Analysis cancelled';

  if (progress < 20) return 'Extracting PR context';
  if (progress < 40) return 'Checking repository analysis';
  if (progress < 60) return 'Coordinating agents';
  if (progress < 80) return 'Processing results';
  return 'Generating report';
}