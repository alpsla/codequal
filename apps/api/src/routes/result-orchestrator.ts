import { Router, Request, Response } from 'express';
import { checkRepositoryAccess } from '../middleware/auth-middleware';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { validatePRAnalysisRequest, validateAnalysisMode } from '../validators/request-validators';
import { enforceTrialLimits, incrementScanCount } from '../middleware/trial-enforcement';

export const resultOrchestratorRoutes = Router();

// Store for tracking active analyses
export const activeAnalyses = new Map<string, any>();

interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep' | 'auto';
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
 * @swagger
 * /analyze-pr:
 *   post:
 *     summary: Analyze a pull request
 *     description: Submit a pull request for comprehensive AI-powered code review analysis
 *     tags: [Analysis]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - repositoryUrl
 *               - prNumber
 *               - analysisMode
 *             properties:
 *               repositoryUrl:
 *                 type: string
 *                 format: uri
 *                 description: GitHub repository URL
 *                 example: https://github.com/owner/repo
 *               prNumber:
 *                 type: integer
 *                 description: Pull request number
 *                 example: 123
 *               analysisMode:
 *                 type: string
 *                 enum: [quick, comprehensive, deep, auto]
 *                 description: |
 *                   Analysis depth level. 'auto' (default) automatically selects based on PR complexity:
 *                   - quick: For simple changes (docs, small UI updates)
 *                   - comprehensive: For medium complexity changes
 *                   - deep: For complex changes or high-risk modifications
 *                   Note: Manual mode selection overrides automatic detection (not recommended)
 *                 default: auto
 *               githubToken:
 *                 type: string
 *                 description: Optional GitHub personal access token for private repos
 *     responses:
 *       202:
 *         description: Analysis request accepted and processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysisId:
 *                   type: string
 *                   description: Unique analysis identifier
 *                 status:
 *                   type: string
 *                   enum: [queued, processing]
 *                 estimatedTime:
 *                   type: integer
 *                   description: Estimated completion time in seconds
 *                 checkStatusUrl:
 *                   type: string
 *                   description: URL to check analysis status
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied to repository
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
resultOrchestratorRoutes.post('/analyze-pr', enforceTrialLimits, incrementScanCount, async (req: Request, res: Response) => {
  console.log('🚀 POST /analyze-pr received', {
    repositoryUrl: req.body.repositoryUrl,
    prNumber: req.body.prNumber,
    analysisMode: req.body.analysisMode,
    timestamp: new Date().toISOString()
  });
  
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

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

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
    console.log(`📋 Creating analysis promise for ${analysisId}`);
    const analysisPromise = orchestrator.analyzePR({
      ...request,
      authenticatedUser: user
    });
    console.log(`✅ Analysis promise created for ${analysisId}`);

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
        console.log(`✅ Analysis promise resolved for ${analysisId}`, {
          report: result?.report ? 'present' : 'missing',
          status: result?.status,
          timestamp: new Date().toISOString()
        });
        
        const analysis = activeAnalyses.get(analysisId);
        if (analysis) {
          analysis.status = 'complete';
          analysis.results = result;
          analysis.completedAt = new Date();
          console.log(`📊 Analysis marked as complete: ${analysisId}`);
        } else {
          console.error(`⚠️ Analysis ${analysisId} not found in activeAnalyses map`);
        }
      })
      .catch(error => {
        console.error(`❌ Analysis ${analysisId} promise rejected:`, error);
        console.error('Stack trace:', error.stack);
        
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
 * @swagger
 * /analysis/{id}/progress:
 *   get:
 *     summary: Check analysis progress
 *     description: Get the current status and results of an analysis request
 *     tags: [Analysis]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID from the initial request
 *     responses:
 *       200:
 *         description: Analysis status and results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analysisId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [queued, processing, complete, failed]
 *                 progress:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                   description: Progress percentage (0-100)
 *                 estimatedTime:
 *                   type: integer
 *                   description: Remaining time estimate in seconds
 *                 results:
 *                   type: object
 *                   description: Analysis results (only when status is complete)
 *                 error:
 *                   type: string
 *                   description: Error message (only when status is failed)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
resultOrchestratorRoutes.get('/analysis/:id/progress', (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

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
 * GET /v1/analysis/:id
 * Get analysis status and results
 */
resultOrchestratorRoutes.get('/analysis/:id', (req: Request, res: Response) => {
  try {
    const analysisId = req.params.id;
    const user = req.user;

    // For test API key, we don't require user authentication
    const isTestKey = req.headers['x-api-key'] === 'test_key';
    
    if (!isTestKey && !user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

    const analysis = activeAnalyses.get(analysisId);
    if (!analysis) {
      return res.status(404).json({ 
        error: 'Analysis not found',
        analysisId 
      });
    }

    // Check if user owns this analysis (skip for test key)
    if (!isTestKey && user && analysis.user !== user.id) {
      return res.status(403).json({ 
        error: 'Access denied to analysis results',
        analysisId 
      });
    }

    // Calculate progress
    const elapsed = Date.now() - analysis.startTime.getTime();
    const estimatedTotal = getEstimatedTime(analysis.request.analysisMode) * 1000;
    const progress = Math.min(95, (elapsed / estimatedTotal) * 100);

    // Build response based on status
    const response: any = {
      analysisId,
      status: analysis.status,
      progress: analysis.status === 'complete' ? 100 : Math.round(progress),
      startTime: analysis.startTime,
      currentStep: getCurrentStep(analysis.status, progress)
    };

    // Add completion data if available
    if (analysis.status === 'complete' && analysis.results) {
      response.status = 'completed'; // Normalize to 'completed'
      response.result = analysis.results;
      response.completedTime = new Date();
      response.processingTime = elapsed;
    } else if (analysis.status === 'failed' && analysis.error) {
      response.error = analysis.error;
      response.failedTime = new Date();
    } else {
      // Still processing
      response.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
      response.elapsedTime = Math.floor(elapsed / 1000);
    }

    res.json(response);

  } catch (error) {
    console.error('Analysis status check error:', error);
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

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication required' 
      });
    }

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