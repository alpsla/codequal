import { Router } from 'express';
import { deepwikiStorageMonitor } from '../services/deepwiki-storage-monitor';
import { authMiddleware } from '../middleware/auth-middleware';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('deepwiki-storage-routes');

/**
 * @swagger
 * /api/deepwiki/storage/metrics:
 *   get:
 *     summary: Get current DeepWiki storage metrics
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usedGB:
 *                   type: number
 *                 totalGB:
 *                   type: number
 *                 percentageUsed:
 *                   type: number
 *                 availableGB:
 *                   type: number
 *                 repositoryCount:
 *                   type: number
 *                 averageRepoSizeMB:
 *                   type: number
 *                 growthRateGBPerDay:
 *                   type: number
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = await deepwikiStorageMonitor.getStorageMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get storage metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve storage metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/storage/status:
 *   get:
 *     summary: Get DeepWiki storage status with alerts
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage status retrieved successfully
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const [metrics, alert, prediction] = await Promise.all([
      deepwikiStorageMonitor.getStorageMetrics(),
      deepwikiStorageMonitor.checkStorageAndAlert(),
      deepwikiStorageMonitor.getStoragePrediction()
    ]);

    res.json({
      metrics,
      alert,
      prediction,
      status: alert ? alert.level : 'healthy'
    });
  } catch (error) {
    logger.error('Failed to get storage status:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve storage status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/storage/expand:
 *   post:
 *     summary: Manually expand DeepWiki storage
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
 *                 minimum: 20
 *                 maximum: 500
 *     responses:
 *       200:
 *         description: Storage expanded successfully
 */
router.post('/expand', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { sizeGB } = req.body;
    
    if (!sizeGB || sizeGB < 20 || sizeGB > 500) {
      return res.status(400).json({ 
        error: 'Invalid size. Must be between 20 and 500 GB' 
      });
    }

    const currentSize = await deepwikiStorageMonitor.getCurrentPVCSize();
    
    if (sizeGB <= currentSize) {
      return res.status(400).json({ 
        error: `New size must be larger than current size (${currentSize}GB)` 
      });
    }

    const success = await deepwikiStorageMonitor.expandPVC(sizeGB);
    
    if (success) {
      res.json({ 
        success: true,
        message: `Storage expanded from ${currentSize}GB to ${sizeGB}GB`,
        oldSize: currentSize,
        newSize: sizeGB
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to expand storage',
        message: 'Check logs for details'
      });
    }
  } catch (error) {
    logger.error('Failed to expand storage:', error as Error);
    res.status(500).json({ 
      error: 'Failed to expand storage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/storage/monitor:
 *   post:
 *     summary: Run storage monitoring check
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring check completed
 */
router.post('/monitor', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await deepwikiStorageMonitor.monitorAndAutoExpand();
    
    res.json({ 
      success: true,
      message: 'Storage monitoring check completed'
    });
  } catch (error) {
    logger.error('Failed to run monitoring:', error as Error);
    res.status(500).json({ 
      error: 'Failed to run monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/storage/optimization:
 *   get:
 *     summary: Get storage optimization recommendations
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Optimization recommendations retrieved successfully
 */
router.get('/optimization', authMiddleware, async (req, res) => {
  try {
    const { deepwikiStorageOptimizer } = await import('../services/deepwiki-storage-optimizer');
    const recommendation = await deepwikiStorageOptimizer.getOptimizationRecommendation();
    
    res.json(recommendation);
  } catch (error) {
    logger.error('Failed to get optimization recommendation:', error as Error);
    res.status(500).json({ 
      error: 'Failed to get optimization recommendation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/storage/archive-candidates:
 *   get:
 *     summary: Get list of repositories that can be archived
 *     tags: [DeepWiki]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Inactivity threshold in days
 *     responses:
 *       200:
 *         description: Archive candidates retrieved successfully
 */
router.get('/archive-candidates', authMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const { deepwikiStorageOptimizer } = await import('../services/deepwiki-storage-optimizer');
    const candidates = await deepwikiStorageOptimizer.identifyArchiveCandidates(days);
    
    const totalSizeMB = candidates.reduce((sum, c) => sum + c.sizeMB, 0);
    const totalSizeGB = (totalSizeMB / 1024).toFixed(2);
    
    res.json({
      candidates,
      summary: {
        count: candidates.length,
        totalSizeMB: totalSizeMB.toFixed(2),
        totalSizeGB,
        potentialSavingsPerMonth: (parseFloat(totalSizeGB) * 0.10).toFixed(2)
      }
    });
  } catch (error) {
    logger.error('Failed to get archive candidates:', error as Error);
    res.status(500).json({ 
      error: 'Failed to get archive candidates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/deepwiki/storage/archive:
 *   post:
 *     summary: Archive selected repositories to S3
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
 *               repositories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Repository names to archive
 *     responses:
 *       200:
 *         description: Repositories archived successfully
 */
router.post('/archive', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { repositories } = req.body;
    
    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
      return res.status(400).json({ 
        error: 'Please provide repositories to archive' 
      });
    }

    const { deepwikiStorageOptimizer } = await import('../services/deepwiki-storage-optimizer');
    
    // Get all candidates and filter by requested repositories
    const allCandidates = await deepwikiStorageOptimizer.identifyArchiveCandidates(0);
    const selectedCandidates = allCandidates.filter(c => 
      repositories.includes(c.repositoryName)
    );

    if (selectedCandidates.length === 0) {
      return res.status(404).json({ 
        error: 'No matching repositories found' 
      });
    }

    const result = await deepwikiStorageOptimizer.archiveRepositories(selectedCandidates);
    
    res.json({
      success: true,
      ...result,
      message: `Archived ${result.archived} repositories, freed ${result.freedSpaceGB.toFixed(2)}GB`
    });
  } catch (error) {
    logger.error('Failed to archive repositories:', error as Error);
    res.status(500).json({ 
      error: 'Failed to archive repositories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;