/**
 * Unified Progress API Routes
 * Provides comprehensive progress tracking combining user-facing and debug information
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { getUnifiedProgressTracer } from '../services/unified-progress-tracer';
import { createLogger } from '@codequal/core/utils';
import { getProgressTracker } from '@codequal/agents/services/progress-tracker';
import { dataFlowMonitor } from '../services/data-flow-monitor';

interface ProgressStep {
  name: string;
  status: string;
}

interface DebugProgress {
  steps: ProgressStep[];
  sessionId?: string;
}

interface DataFlowStep {
  id: string;
  name: string;
  duration?: number;
  status: string;
}

const router = Router();
const logger = createLogger('UnifiedProgressAPI');

/**
 * Get comprehensive progress for an analysis
 */
router.get('/:analysisId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const tracer = getUnifiedProgressTracer();
    
    const progress = tracer.getProgress(analysisId);
    
    if (!progress) {
      return res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      analysisId,
      userProgress: progress.userProgress,
      debugInfo: {
        sessionId: progress.debugProgress?.sessionId,
        steps: progress.debugProgress?.steps.length || 0,
        status: progress.debugProgress?.status,
        warnings: progress.debugProgress?.summary?.warnings || []
      }
    });
  } catch (error) {
    logger.error('Failed to get unified progress', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve progress',
      code: 'PROGRESS_ERROR' 
    });
  }
});

/**
 * Get detailed debug progress
 */
router.get('/:analysisId/debug', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const tracer = getUnifiedProgressTracer();
    
    const progress = tracer.getProgress(analysisId);
    
    if (!progress) {
      return res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      analysisId,
      debugProgress: progress.debugProgress,
      visualization: progress.visualization
    });
  } catch (error) {
    logger.error('Failed to get debug progress', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve debug information',
      code: 'DEBUG_ERROR' 
    });
  }
});

/**
 * Get all active analyses with unified tracking
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const tracer = getUnifiedProgressTracer();
    const activeAnalyses = tracer.getActiveAnalyses();
    
    res.json({
      success: true,
      count: activeAnalyses.length,
      analyses: activeAnalyses
    });
  } catch (error) {
    logger.error('Failed to get active analyses', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve active analyses',
      code: 'ACTIVE_ERROR' 
    });
  }
});

/**
 * Stream unified progress updates (SSE)
 */
router.get('/:analysisId/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const tracer = getUnifiedProgressTracer();
    
    const progress = tracer.getProgress(analysisId);
    if (!progress) {
      return res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND'
      });
    }
    
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send initial state
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      analysisId,
      userProgress: progress.userProgress,
      debugSummary: {
        steps: progress.debugProgress?.steps.length || 0,
        currentStep: (progress.debugProgress as DebugProgress | undefined)?.steps.find((s) => s.status === 'in-progress')?.name
      }
    })}\n\n`);
    
    // Listen to both progress systems
    const progressTracker = getProgressTracker();
    // dataFlowMonitor already imported
    
    // Forward progress tracker events
    const onProgressUpdate = (id: string, update: unknown) => {
      if (id === analysisId) {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          source: 'user',
          update
        })}\n\n`);
      }
    };
    
    // Forward data flow monitor events if we have sessionId
    const sessionId = progress.debugProgress?.sessionId;
    const onStepComplete = (step: DataFlowStep) => {
      if (sessionId && (progress.debugProgress as DebugProgress | undefined)?.steps.find((s) => s.name === step.name)) {
        res.write(`data: ${JSON.stringify({
          type: 'debug',
          source: 'dataflow',
          step: {
            name: step.name,
            duration: step.duration,
            status: step.status
          }
        })}\n\n`);
      }
    };
    
    progressTracker.on('progressUpdate', onProgressUpdate);
    if (sessionId) {
      dataFlowMonitor.on('step:complete', onStepComplete);
    }
    
    // Heartbeat
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30000);
    
    // Cleanup
    req.on('close', () => {
      clearInterval(heartbeat);
      progressTracker.off('progressUpdate', onProgressUpdate);
      if (sessionId) {
        dataFlowMonitor.off('step:complete', onStepComplete);
      }
    });
    
  } catch (error) {
    logger.error('Failed to set up stream', { error });
    res.status(500).json({ 
      error: 'Failed to establish stream',
      code: 'STREAM_ERROR' 
    });
  }
});

export default router;