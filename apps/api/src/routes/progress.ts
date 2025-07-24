/**
 * Progress Tracking API Routes
 * Provides real-time status updates for PR analysis
 */

import { Router, Request, Response } from 'express';
import { getProgressTracker } from '@codequal/agents/services/progress-tracker';
import { createLogger } from '@codequal/core';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();
const logger = createLogger('ProgressAPI');

/**
 * @swagger
 * /progress/{analysisId}:
 *   get:
 *     summary: Get progress for a specific analysis
 *     description: Retrieve detailed progress information for an ongoing or completed analysis
 *     tags: [Progress]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The analysis ID
 *     responses:
 *       200:
 *         description: Analysis progress information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 progress:
 *                   $ref: '#/components/schemas/AnalysisProgress'
 *       404:
 *         description: Analysis not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:analysisId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const progressTracker = getProgressTracker();
    
    const progress = progressTracker.getProgress(analysisId);
    
    if (!progress) {
      return res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND',
        message: `No progress found for analysis ID: ${analysisId}`
      });
    }
    
    // Check if user has access to this analysis
    // For now, we'll allow access if they're authenticated
    // In production, you'd check if they own the repository or have permissions
    
    res.json({
      success: true,
      progress
    });
    
  } catch (error) {
    logger.error('Failed to get progress', { error });
    res.status(500).json({
      error: 'Failed to retrieve progress',
      code: 'PROGRESS_RETRIEVAL_ERROR',
      message: 'An error occurred while retrieving analysis progress'
    });
  }
});

/**
 * @swagger
 * /progress:
 *   get:
 *     summary: Get all active analyses
 *     description: Retrieve a list of all active analyses for the current user
 *     tags: [Progress]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of active analyses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analyses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AnalysisProgress'
 *                 count:
 *                   type: integer
 *                   description: Total number of active analyses
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const progressTracker = getProgressTracker();
    const activeAnalyses = progressTracker.getActiveAnalyses();
    
    // In production, filter by user's repositories
    // For now, return all active analyses
    
    res.json({
      success: true,
      analyses: activeAnalyses,
      count: activeAnalyses.length
    });
    
  } catch (error) {
    logger.error('Failed to get active analyses', { error });
    res.status(500).json({
      error: 'Failed to retrieve active analyses',
      code: 'ACTIVE_ANALYSES_ERROR',
      message: 'An error occurred while retrieving active analyses'
    });
  }
});

/**
 * @swagger
 * /progress/{analysisId}/updates:
 *   get:
 *     summary: Get recent updates for an analysis
 *     description: Retrieve recent progress updates for a specific analysis with optional filtering
 *     tags: [Progress]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The analysis ID
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter updates after this timestamp
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of updates to return
 *     responses:
 *       200:
 *         description: Progress updates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analysisId:
 *                   type: string
 *                 updates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProgressUpdate'
 *                 count:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       404:
 *         description: Analysis not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:analysisId/updates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const { since, limit = 50 } = req.query;
    
    const progressTracker = getProgressTracker();
    const progress = progressTracker.getProgress(analysisId);
    
    if (!progress) {
      return res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND',
        message: `No progress found for analysis ID: ${analysisId}`
      });
    }
    
    let updates = progress.updates;
    
    // Filter by timestamp if 'since' is provided
    if (since) {
      const sinceDate = new Date(since as string);
      updates = updates.filter(u => u.timestamp > sinceDate);
    }
    
    // Apply limit
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    updates = updates.slice(-limitNum);
    
    res.json({
      success: true,
      analysisId,
      updates,
      count: updates.length,
      hasMore: updates.length < progress.updates.length
    });
    
  } catch (error) {
    logger.error('Failed to get updates', { error });
    res.status(500).json({
      error: 'Failed to retrieve updates',
      code: 'UPDATES_RETRIEVAL_ERROR',
      message: 'An error occurred while retrieving progress updates'
    });
  }
});

/**
 * @swagger
 * /progress/{analysisId}/stream:
 *   get:
 *     summary: Stream real-time progress updates
 *     description: Server-Sent Events (SSE) endpoint for receiving real-time progress updates
 *     tags: [Progress]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The analysis ID
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: |
 *                 Event stream format:
 *                 - Event: data
 *                 - Data: JSON object with type and payload
 *                 - Types: initial, update, phase, agent, tool, complete
 *               example: |
 *                 data: {"type":"initial","progress":{...}}
 *                 
 *                 data: {"type":"phase","timestamp":"2024-01-01T00:00:00Z","data":{"phase":"toolExecution","progress":{...}}}
 *                 
 *                 data: {"type":"complete","timestamp":"2024-01-01T00:01:00Z","data":{...}}
 *       404:
 *         description: Analysis not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:analysisId/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { analysisId } = req.params;
    const progressTracker = getProgressTracker();
    
    const progress = progressTracker.getProgress(analysisId);
    if (!progress) {
      return res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND',
        message: `No progress found for analysis ID: ${analysisId}`
      });
    }
    
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial progress
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      progress
    })}\n\n`);
    
    // Set up event listeners
    const sendUpdate = (eventType: string, data: unknown) => {
      res.write(`data: ${JSON.stringify({
        type: eventType,
        timestamp: new Date(),
        data
      })}\n\n`);
    };
    
    const onProgressUpdate = (id: string, update: unknown) => {
      if (id === analysisId) {
        sendUpdate('update', update);
      }
    };
    
    const onPhaseUpdate = (id: string, phase: string, phaseProgress: unknown) => {
      if (id === analysisId) {
        sendUpdate('phase', { phase, progress: phaseProgress });
      }
    };
    
    const onAgentUpdate = (id: string, agentName: string, agentProgress: unknown) => {
      if (id === analysisId) {
        sendUpdate('agent', { agentName, progress: agentProgress });
      }
    };
    
    const onToolUpdate = (id: string, toolId: string, toolProgress: unknown) => {
      if (id === analysisId) {
        sendUpdate('tool', { toolId, progress: toolProgress });
      }
    };
    
    const onComplete = (id: string, finalProgress: unknown) => {
      if (id === analysisId) {
        sendUpdate('complete', finalProgress);
        cleanup();
      }
    };
    
    // Subscribe to events
    progressTracker.on('progressUpdate', onProgressUpdate);
    progressTracker.on('phaseUpdate', onPhaseUpdate);
    progressTracker.on('agentUpdate', onAgentUpdate);
    progressTracker.on('toolUpdate', onToolUpdate);
    progressTracker.on('analysisComplete', onComplete);
    
    // Keep connection alive
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30000);
    
    // Clean up on client disconnect
    const cleanup = () => {
      clearInterval(heartbeat);
      progressTracker.off('progressUpdate', onProgressUpdate);
      progressTracker.off('phaseUpdate', onPhaseUpdate);
      progressTracker.off('agentUpdate', onAgentUpdate);
      progressTracker.off('toolUpdate', onToolUpdate);
      progressTracker.off('analysisComplete', onComplete);
    };
    
    req.on('close', cleanup);
    
  } catch (error) {
    logger.error('Failed to set up SSE stream', { error });
    res.status(500).json({
      error: 'Failed to establish stream',
      code: 'STREAM_ERROR',
      message: 'An error occurred while setting up real-time updates'
    });
  }
});

/**
 * @swagger
 * /progress/cleanup:
 *   post:
 *     summary: Clean up old analyses
 *     description: Remove old analysis progress data (admin only)
 *     tags: [Progress]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAgeHours:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 720
 *                 default: 24
 *                 description: Maximum age of analyses to keep (in hours)
 *     responses:
 *       200:
 *         description: Cleanup successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/cleanup', authMiddleware, async (req: Request, res: Response) => {
  try {
    // In production, check for admin privileges
    const { maxAgeHours = 24 } = req.body;
    
    const progressTracker = getProgressTracker();
    progressTracker.cleanupOldAnalyses(maxAgeHours * 60 * 60 * 1000);
    
    res.json({
      success: true,
      message: 'Old analyses cleaned up successfully'
    });
    
  } catch (error) {
    logger.error('Failed to cleanup analyses', { error });
    res.status(500).json({
      error: 'Cleanup failed',
      code: 'CLEANUP_ERROR',
      message: 'An error occurred while cleaning up old analyses'
    });
  }
});

export default router;