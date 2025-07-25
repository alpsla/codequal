import { Router } from 'express';
import { digitalOceanStorageMonitor } from '../services/digitalocean-storage-monitor';
import { authMiddleware } from '../middleware/auth-middleware';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('database-storage-routes');

/**
 * @swagger
 * /api/database/storage/metrics:
 *   get:
 *     summary: Get current database storage metrics
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database storage metrics retrieved successfully
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = await digitalOceanStorageMonitor.getDatabaseMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get database metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve database metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/database/storage/status:
 *   get:
 *     summary: Get database storage status with alerts
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database storage status retrieved successfully
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const status = await digitalOceanStorageMonitor.monitorAndAlert();
    res.json(status);
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
 * /api/database/storage/cleanup-recommendations:
 *   get:
 *     summary: Get database cleanup recommendations
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup recommendations retrieved successfully
 */
router.get('/cleanup-recommendations', authMiddleware, async (req, res) => {
  try {
    const recommendations = await digitalOceanStorageMonitor.getCleanupRecommendations();
    
    // Calculate total potential savings
    const totalSpaceGB = recommendations.reduce((sum, r) => sum + r.potentialSpaceGB, 0);
    
    res.json({
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        totalPotentialSpaceGB: parseFloat(totalSpaceGB.toFixed(2)),
        estimatedTimeToClean: `${Math.ceil(recommendations.length * 5)} minutes`
      }
    });
  } catch (error) {
    logger.error('Failed to get cleanup recommendations:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve cleanup recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/database/storage/report:
 *   get:
 *     summary: Generate comprehensive storage report
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage report generated successfully
 */
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const report = await digitalOceanStorageMonitor.generateStorageReport();
    
    // Return as markdown or HTML based on accept header
    const acceptHeader = req.headers.accept || '';
    
    if (acceptHeader.includes('text/html')) {
      // Convert markdown to HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Database Storage Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    h3 { color: #888; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
    ul { line-height: 1.6; }
    .warning { color: #ff9800; }
    .critical { color: #f44336; }
    .healthy { color: #4caf50; }
  </style>
</head>
<body>
  <pre>${report}</pre>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.setHeader('Content-Type', 'text/markdown');
      res.send(report);
    }
  } catch (error) {
    logger.error('Failed to generate report:', error as Error);
    res.status(500).json({ 
      error: 'Failed to generate storage report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/database/storage/cleanup:
 *   post:
 *     summary: Execute cleanup operations (Admin only)
 *     tags: [Database]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [expired_chunks, old_analyses, duplicate_vectors, orphaned_data]
 *     responses:
 *       200:
 *         description: Cleanup operations executed successfully
 */
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ 
        error: 'Please specify cleanup operations to execute' 
      });
    }

    const results: any[] = [];
    
    // Execute each cleanup operation
    for (const operation of operations) {
      try {
        let result;
        switch (operation) {
          case 'expired_chunks':
            result = await cleanupExpiredChunks();
            break;
          case 'old_analyses':
            result = await cleanupOldAnalyses();
            break;
          case 'duplicate_vectors':
            result = await cleanupDuplicateVectors();
            break;
          case 'orphaned_data':
            result = await cleanupOrphanedData();
            break;
          default:
            result = { error: `Unknown operation: ${operation}` };
        }
        results.push({ operation, ...result });
      } catch (error) {
        results.push({ 
          operation, 
          error: error instanceof Error ? error.message : 'Operation failed' 
        });
      }
    }

    // Get metrics after cleanup
    const metricsAfter = await digitalOceanStorageMonitor.getDatabaseMetrics();

    res.json({
      success: true,
      results,
      metricsAfter,
      message: 'Cleanup operations completed'
    });
  } catch (error) {
    logger.error('Failed to execute cleanup:', error as Error);
    res.status(500).json({ 
      error: 'Failed to execute cleanup operations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup functions
async function cleanupExpiredChunks() {
  // Implementation would execute the cleanup query
  return { 
    cleaned: 0, 
    spaceFreedGB: 0,
    message: 'Expired chunks cleanup not yet implemented' 
  };
}

async function cleanupOldAnalyses() {
  return { 
    cleaned: 0, 
    spaceFreedGB: 0,
    message: 'Old analyses cleanup not yet implemented' 
  };
}

async function cleanupDuplicateVectors() {
  return { 
    cleaned: 0, 
    spaceFreedGB: 0,
    message: 'Duplicate vectors cleanup not yet implemented' 
  };
}

async function cleanupOrphanedData() {
  return { 
    cleaned: 0, 
    spaceFreedGB: 0,
    message: 'Orphaned data cleanup not yet implemented' 
  };
}

export default router;