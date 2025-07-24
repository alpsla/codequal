/**
 * Vector DB Retention Policy API Routes
 * Manages data lifecycle and storage optimization
 */

import { Router, Request, Response } from 'express';
import { createLogger } from '@codequal/core';
import { authMiddleware } from '../middleware/auth-middleware';
import { getVectorDBRetentionPolicy, RetentionPolicyConfig } from '@codequal/agents/services/vector-db-retention-policy';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const logger = createLogger('VectorRetentionAPI');

// Get Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

/**
 * @swagger
 * /vector-retention/stats:
 *   get:
 *     summary: Get retention policy statistics
 *     description: Retrieve current storage usage and retention statistics
 *     tags: [Vector DB Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Retention statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalRecords:
 *                       type: integer
 *                     recordsByAge:
 *                       type: object
 *                     recordsByType:
 *                       type: object
 *                     storageUsagePercent:
 *                       type: number
 *                     lastCleanup:
 *                       type: string
 *                       format: date-time
 *                     nextScheduledCleanup:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check if user is admin (in production, implement proper role checks)
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    const supabase = getSupabaseClient();
    const retentionPolicy = getVectorDBRetentionPolicy(supabase);
    
    const stats = await retentionPolicy.getRetentionStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.error('Failed to get retention stats', { error });
    res.status(500).json({
      error: 'Failed to retrieve retention statistics',
      code: 'STATS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /vector-retention/config:
 *   get:
 *     summary: Get retention policy configuration
 *     description: Retrieve current retention policy settings
 *     tags: [Vector DB Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Retention policy configuration
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/config', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    // Return default configuration (in production, load from DB)
    const config: RetentionPolicyConfig = {
      toolResults: {
        maxAgeInDays: 90,
        maxRecordsPerRepo: 10000,
        keepCriticalFindings: true,
        aggregateBeforeDelete: true
      },
      analysisResults: {
        maxAgeInDays: 180,
        maxAnalysesPerRepo: 1000,
        keepFailedAnalyses: false
      },
      embeddings: {
        compactionEnabled: true,
        similarityThreshold: 0.95,
        maxEmbeddingsPerCategory: 5000
      },
      storage: {
        maxTotalRecords: 1000000,
        warningThreshold: 80,
        criticalThreshold: 95
      }
    };
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    logger.error('Failed to get retention config', { error });
    res.status(500).json({
      error: 'Failed to retrieve configuration',
      code: 'CONFIG_ERROR'
    });
  }
});

/**
 * @swagger
 * /vector-retention/cleanup:
 *   post:
 *     summary: Trigger manual cleanup
 *     description: Manually trigger retention policy cleanup (admin only)
 *     tags: [Vector DB Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               aggressive:
 *                 type: boolean
 *                 description: Enable aggressive cleanup mode
 *     responses:
 *       200:
 *         description: Cleanup triggered successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/cleanup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    const { aggressive = false } = req.body;
    
    logger.info('Manual cleanup triggered', {
      userId: user.id,
      aggressive
    });
    
    const supabase = getSupabaseClient();
    const retentionPolicy = getVectorDBRetentionPolicy(supabase);
    
    // Run cleanup in background
    setImmediate(async () => {
      try {
        if (aggressive) {
          await retentionPolicy.triggerEmergencyCleanup();
        } else {
          await retentionPolicy.executeRetentionPolicy();
        }
      } catch (error) {
        logger.error('Background cleanup failed', { error });
      }
    });
    
    res.json({
      success: true,
      message: 'Cleanup initiated in background',
      aggressive
    });
    
  } catch (error) {
    logger.error('Failed to trigger cleanup', { error });
    res.status(500).json({
      error: 'Failed to trigger cleanup',
      code: 'CLEANUP_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /vector-retention/schedule:
 *   put:
 *     summary: Update retention schedule
 *     description: Update the cron schedule for automatic retention policy execution
 *     tags: [Vector DB Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schedule:
 *                 type: string
 *                 description: Cron schedule expression
 *                 example: "0 2 * * *"
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/schedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    const { schedule } = req.body;
    
    if (!schedule || typeof schedule !== 'string') {
      return res.status(400).json({
        error: 'Invalid schedule format',
        code: 'INVALID_SCHEDULE'
      });
    }
    
    const supabase = getSupabaseClient();
    const retentionPolicy = getVectorDBRetentionPolicy(supabase);
    
    // Stop current schedule and start new one
    retentionPolicy.stopRetentionPolicy();
    retentionPolicy.startRetentionPolicy(schedule);
    
    logger.info('Retention schedule updated', {
      userId: user.id,
      newSchedule: schedule
    });
    
    res.json({
      success: true,
      message: 'Retention schedule updated',
      schedule
    });
    
  } catch (error) {
    logger.error('Failed to update schedule', { error });
    res.status(500).json({
      error: 'Failed to update schedule',
      code: 'SCHEDULE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /vector-retention/preview:
 *   get:
 *     summary: Preview cleanup impact
 *     description: Preview what would be deleted by retention policy
 *     tags: [Vector DB Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: aggressive
 *         schema:
 *           type: boolean
 *         description: Preview aggressive cleanup
 *     responses:
 *       200:
 *         description: Cleanup preview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preview:
 *                   type: object
 *                   properties:
 *                     toolResultsToDelete:
 *                       type: integer
 *                     analysisResultsToDelete:
 *                       type: integer
 *                     estimatedSpaceSaved:
 *                       type: string
 *                     oldestRecordDate:
 *                       type: string
 *                       format: date-time
 */
router.get('/preview', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    const aggressive = req.query.aggressive === 'true';
    const supabase = getSupabaseClient();
    
    // Calculate what would be deleted
    const toolCutoff = new Date();
    toolCutoff.setDate(toolCutoff.getDate() - 90); // Default 90 days
    
    const analysisCutoff = new Date();
    analysisCutoff.setDate(analysisCutoff.getDate() - 180); // Default 180 days
    
    // Count records that would be deleted
    const { count: toolCount } = await supabase
      .from('tool_results_vectors')
      .select('*', { count: 'exact', head: true })
      .lt('metadata->>created_at', toolCutoff.toISOString());
    
    const { count: analysisCount } = await supabase
      .from('analysis_vectors')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', analysisCutoff.toISOString());
    
    const preview = {
      toolResultsToDelete: toolCount || 0,
      analysisResultsToDelete: analysisCount || 0,
      estimatedSpaceSaved: `${((toolCount || 0) + (analysisCount || 0)) * 0.5}MB`, // Rough estimate
      oldestRecordDate: toolCutoff.toISOString(),
      aggressive
    };
    
    res.json({
      success: true,
      preview
    });
    
  } catch (error) {
    logger.error('Failed to generate preview', { error });
    res.status(500).json({
      error: 'Failed to generate preview',
      code: 'PREVIEW_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize retention policy on startup
const initializeRetentionPolicy = () => {
  try {
    const supabase = getSupabaseClient();
    const retentionPolicy = getVectorDBRetentionPolicy(supabase);
    
    // Start with daily cleanup at 2 AM
    retentionPolicy.startRetentionPolicy('0 2 * * *');
    
    logger.info('Retention policy initialized with default schedule');
  } catch (error) {
    logger.error('Failed to initialize retention policy', { error });
  }
};

// Initialize on module load
if (process.env.NODE_ENV !== 'test') {
  initializeRetentionPolicy();
}

export default router;