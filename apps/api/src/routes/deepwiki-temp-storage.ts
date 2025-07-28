import { Router } from 'express';
import { deepWikiTempManager } from '../services/deepwiki-temp-manager';
import { deepWikiMetricsProxy } from '../services/deepwiki-metrics-proxy';
import { deepWikiAlertService } from '../services/deepwiki-alerts';
import { authMiddleware } from '../middleware/auth-middleware';
import { serviceAuthMiddleware } from '../middleware/service-auth-middleware';
import { createLogger } from '@codequal/core/utils';
import { ActiveAnalysis } from '../types/deepwiki';

const router = Router();
const logger = createLogger('deepwiki-temp-routes');

/**
 * @swagger
 * /api/deepwiki/temp/metrics:
 *   get:
 *     summary: Get current temp storage metrics
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Temp storage metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeepWikiMetrics'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 */
// Temporarily disable auth for testing
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await deepWikiTempManager.getMetrics();
    
    // Add recommendations based on metrics
    const recommendations = [];
    
    if (metrics.percentUsed > 80) {
      recommendations.push({
        type: 'scale-up',
        urgency: 'high',
        message: `Usage at ${metrics.percentUsed}%, consider scaling up`,
        suggestedSize: metrics.totalGB + 20
      });
    }
    
    if (metrics.maxConcurrentCapacity < 3) {
      recommendations.push({
        type: 'capacity',
        urgency: 'medium',
        message: `Only ${metrics.maxConcurrentCapacity} concurrent analyses possible`,
        suggestedSize: metrics.totalGB + 10
      });
    }
    
    res.json({
      ...metrics,
      recommendations,
      status: metrics.percentUsed > 85 ? 'critical' : 
              metrics.percentUsed > 70 ? 'warning' : 'healthy'
    });
  } catch (error) {
    logger.error('Failed to get temp metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve temp storage metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/temp/active-analyses:
 *   get:
 *     summary: Get list of active analyses
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active analyses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActiveAnalyses'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
 */
router.get('/active-analyses', authMiddleware, async (req, res) => {
  try {
    // Get active analyses from temp manager
    interface TempManagerWithActiveAnalyses {
      activeAnalyses: Map<string, ActiveAnalysis>;
    }
    const activeAnalyses = (deepWikiTempManager as unknown as TempManagerWithActiveAnalyses).activeAnalyses;
    
    const analyses = Array.from(activeAnalyses.entries()).map(([id, data]: [string, ActiveAnalysis]) => ({
      analysisId: id,
      ...data,
      duration: Date.now() - data.startTime,
      status: Date.now() - data.startTime > 30 * 60 * 1000 ? 'long-running' : 'active'
    }));
    
    res.json({
      active: analyses.length,
      analyses,
      longRunning: analyses.filter(a => a.status === 'long-running').length
    });
  } catch (error) {
    logger.error('Failed to get active analyses:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve active analyses',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/temp/estimate-capacity:
 *   post:
 *     summary: Estimate capacity for queued analyses
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               queuedAnalyses:
 *                 type: number
 *                 description: Number of analyses in queue
 *     responses:
 *       200:
 *         description: Capacity estimate calculated successfully
 */
router.post('/estimate-capacity', authMiddleware, async (req, res) => {
  try {
    const { queuedAnalyses = 0 } = req.body;
    
    const estimate = await deepWikiTempManager.estimateRequiredSpace(queuedAnalyses);
    const metrics = await deepWikiTempManager.getMetrics();
    
    res.json({
      ...estimate,
      current: {
        totalGB: metrics.totalGB,
        availableGB: metrics.availableGB,
        activeAnalyses: metrics.activeAnalyses
      },
      recommendation: (estimate.requiredSpaceGB > metrics.availableGB) ? {
        action: 'scale-up',
        reason: `Need ${estimate.requiredSpaceGB.toFixed(1)}GB but only ${metrics.availableGB.toFixed(1)}GB available`,
        suggestedSize: Math.ceil(metrics.totalGB + estimate.requiredSpaceGB - metrics.availableGB + 5)
      } : null
    });
  } catch (error) {
    logger.error('Failed to estimate capacity:', error as Error);
    res.status(500).json({ 
      error: 'Failed to estimate capacity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


/**
 * @swagger
 * /api/deepwiki/temp/cleanup-orphaned:
 *   post:
 *     summary: Clean up orphaned temp directories
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post('/cleanup-orphaned', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const cleaned = await deepWikiTempManager.cleanupOrphaned();
    const metricsAfter = await deepWikiTempManager.getMetrics();
    
    res.json({
      success: true,
      cleaned,
      metricsAfter,
      message: `Cleaned up ${cleaned} orphaned directories`
    });
  } catch (error) {
    logger.error('Failed to cleanup orphaned:', error as Error);
    res.status(500).json({ 
      error: 'Failed to cleanup orphaned directories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/temp/scale:
 *   post:
 *     summary: Request PVC scaling (Admin only)
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sizeGB:
 *                 type: number
 *                 description: New size in GB
 *                 minimum: 10
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Scale request submitted
 */
router.post('/scale', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { sizeGB } = req.body;
    
    if (!sizeGB || sizeGB < 10 || sizeGB > 100) {
      return res.status(400).json({ 
        error: 'Invalid size. Must be between 10 and 100 GB' 
      });
    }
    
    const currentMetrics = await deepWikiTempManager.getMetrics();
    
    if (sizeGB <= currentMetrics.totalGB) {
      return res.status(400).json({ 
        error: `New size must be larger than current size (${currentMetrics.totalGB}GB)` 
      });
    }
    
    const success = await deepWikiTempManager.scalePVC(sizeGB);
    
    res.json({
      success,
      message: success 
        ? `Scale request submitted: ${currentMetrics.totalGB}GB → ${sizeGB}GB`
        : 'Scale request failed',
      currentSize: currentMetrics.totalGB,
      requestedSize: sizeGB
    });
  } catch (error) {
    logger.error('Failed to scale PVC:', error as Error);
    res.status(500).json({ 
      error: 'Failed to scale PVC',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/temp/alerts:
 *   get:
 *     summary: Get active disk usage alerts
 *     tags: [DeepWiki]
 *     responses:
 *       200:
 *         description: Active alerts retrieved successfully
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = deepWikiAlertService.getActiveAlerts();
    res.json({
      active: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error('Failed to get alerts:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Listen for temp manager events and log them
// Type assertions to fix TypeScript errors - stub implementation doesn't support events
interface TempManagerWithEvents {
  on?: (event: string, handler: (data: Record<string, unknown>) => void) => void;
}

(deepWikiTempManager as TempManagerWithEvents).on?.('scale-up-needed', (data: Record<string, unknown>) => {
  logger.warn('Scale up needed:', data);
});

(deepWikiTempManager as TempManagerWithEvents).on?.('scale-down-possible', (data: Record<string, unknown>) => {
  logger.info('Scale down possible:', data);
});

(deepWikiTempManager as TempManagerWithEvents).on?.('long-running-analysis', (data: Record<string, unknown>) => {
  logger.warn('Long running analysis detected:', data);
});

export default router;