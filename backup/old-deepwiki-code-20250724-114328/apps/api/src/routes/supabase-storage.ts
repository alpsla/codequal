import { Router } from 'express';
import { supabaseStorageMonitor } from '../services/supabase-storage-monitor';
import { authMiddleware } from '../middleware/auth-middleware';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('supabase-storage-routes');

/**
 * @swagger
 * /api/supabase/storage/metrics:
 *   get:
 *     summary: Get comprehensive Supabase storage metrics
 *     tags: [Supabase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supabase metrics retrieved successfully
 */
router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const metrics = await supabaseStorageMonitor.getSupabaseMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get Supabase metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve Supabase metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/supabase/storage/vector-health:
 *   get:
 *     summary: Get pgvector index health metrics
 *     tags: [Supabase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vector index health retrieved successfully
 */
router.get('/vector-health', authMiddleware, async (req, res) => {
  try {
    const health = await supabaseStorageMonitor.getVectorIndexHealth();
    
    res.json({
      indexes: health,
      summary: {
        totalIndexes: health?.length || 0,
        inefficientIndexes: health?.filter((idx: any) => idx.efficiency < 0.5).length || 0,
        unusedIndexes: health?.filter((idx: any) => idx.scans === 0).length || 0
      }
    });
  } catch (error) {
    logger.error('Failed to get vector health:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve vector index health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/supabase/storage/recommendations:
 *   get:
 *     summary: Get Supabase-specific cleanup recommendations
 *     tags: [Supabase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const recommendations = await supabaseStorageMonitor.getCleanupRecommendations();
    
    const totalSavingsGB = recommendations.reduce((sum, r) => sum + r.potentialSavingsGB, 0);
    const totalSavingsMonthly = totalSavingsGB * 0.125; // Supabase pricing
    
    res.json({
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        totalPotentialSavingsGB: parseFloat(totalSavingsGB.toFixed(2)),
        totalPotentialSavingsMonthly: parseFloat(totalSavingsMonthly.toFixed(2)),
        estimatedCleanupTime: `${recommendations.length * 10}-${recommendations.length * 20} minutes`
      }
    });
  } catch (error) {
    logger.error('Failed to get recommendations:', error as Error);
    res.status(500).json({ 
      error: 'Failed to retrieve recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/supabase/storage/optimization-report:
 *   get:
 *     summary: Generate comprehensive Supabase optimization report
 *     tags: [Supabase]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Optimization report generated successfully
 */
router.get('/optimization-report', authMiddleware, async (req, res) => {
  try {
    const report = await supabaseStorageMonitor.generateOptimizationReport();
    
    const acceptHeader = req.headers.accept || '';
    
    if (acceptHeader.includes('text/html')) {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Supabase Storage Optimization Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
      max-width: 1000px; 
      margin: 0 auto; 
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #1a1a1a; 
      border-bottom: 3px solid #3FCF8E; 
      padding-bottom: 10px;
    }
    h2 { 
      color: #444; 
      margin-top: 30px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
    }
    h3 { color: #666; }
    pre { 
      background: #f8f8f8; 
      padding: 15px; 
      border-radius: 5px;
      border: 1px solid #e0e0e0;
      overflow-x: auto;
    }
    .metric {
      display: inline-block;
      padding: 10px 20px;
      margin: 5px;
      background: #f0f0f0;
      border-radius: 5px;
      border: 1px solid #ddd;
    }
    .warning { color: #ff9800; }
    .critical { color: #f44336; }
    .healthy { color: #4caf50; }
    .supabase-green { color: #3FCF8E; }
    ul { line-height: 1.8; }
    .recommendation {
      margin: 15px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #3FCF8E;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="supabase-green">Supabase Storage Optimization Report</h1>
    <pre>${report}</pre>
  </div>
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
      error: 'Failed to generate optimization report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/supabase/storage/cleanup-vectors:
 *   post:
 *     summary: Clean up vector data (Admin only)
 *     tags: [Supabase]
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
 *                   enum: [expired_chunks, duplicate_vectors, unused_indexes]
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post('/cleanup-vectors', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { operations, dryRun = false } = req.body;
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ 
        error: 'Please specify cleanup operations' 
      });
    }

    const results: any[] = [];
    
    for (const operation of operations) {
      try {
        let result;
        switch (operation) {
          case 'expired_chunks':
            result = await cleanupExpiredChunks(dryRun);
            break;
          case 'duplicate_vectors':
            result = await cleanupDuplicateVectors(dryRun);
            break;
          case 'unused_indexes':
            result = await cleanupUnusedIndexes(dryRun);
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

    res.json({
      success: true,
      dryRun,
      results,
      message: dryRun ? 'Dry run completed - no changes made' : 'Cleanup operations completed'
    });
  } catch (error) {
    logger.error('Failed to execute cleanup:', error as Error);
    res.status(500).json({ 
      error: 'Failed to execute cleanup operations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup helper functions
async function cleanupExpiredChunks(dryRun: boolean) {
  const supabase = (supabaseStorageMonitor as any).supabase;
  
  // Check what would be cleaned
  const { data: checkData } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT 
        COUNT(*) as count,
        SUM(octet_length(embedding::text) + octet_length(content))::float8 / (1024*1024*1024) as size_gb
      FROM analysis_chunks
      WHERE storage_type != 'permanent' 
      AND expires_at < NOW();
    `
  });

  if (!dryRun && checkData?.[0]?.count > 0) {
    const { data: deleteData } = await supabase
      .from('analysis_chunks')
      .delete()
      .neq('storage_type', 'permanent')
      .lt('expires_at', new Date().toISOString());
    
    return {
      cleaned: checkData[0].count,
      spaceFreedGB: checkData[0].size_gb,
      message: 'Expired chunks cleaned successfully'
    };
  }

  return {
    cleaned: checkData?.[0]?.count || 0,
    spaceFreedGB: checkData?.[0]?.size_gb || 0,
    message: dryRun ? 'Dry run - no changes made' : 'No expired chunks found'
  };
}

async function cleanupDuplicateVectors(dryRun: boolean) {
  const supabase = (supabaseStorageMonitor as any).supabase;
  
  const { data: checkData } = await supabase.rpc('execute_sql', {
    sql: `
      WITH duplicates AS (
        SELECT 
          content_hash,
          COUNT(*) as dup_count,
          MIN(id) as keep_id
        FROM analysis_chunks
        WHERE content_hash IS NOT NULL
        GROUP BY content_hash
        HAVING COUNT(*) > 1
      )
      SELECT 
        COUNT(DISTINCT content_hash) as groups,
        SUM(dup_count - 1) as total_duplicates
      FROM duplicates;
    `
  });

  if (!dryRun && checkData?.[0]?.total_duplicates > 0) {
    // Delete duplicates keeping the oldest
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        WITH duplicates AS (
          SELECT content_hash, MIN(id) as keep_id
          FROM analysis_chunks
          WHERE content_hash IS NOT NULL
          GROUP BY content_hash
          HAVING COUNT(*) > 1
        )
        DELETE FROM analysis_chunks
        WHERE content_hash IN (SELECT content_hash FROM duplicates)
        AND id NOT IN (SELECT keep_id FROM duplicates);
      `
    });

    if (error) throw error;
  }

  return {
    cleaned: checkData?.[0]?.total_duplicates || 0,
    duplicateGroups: checkData?.[0]?.groups || 0,
    message: dryRun ? 'Dry run - no changes made' : 'Duplicate vectors cleaned'
  };
}

async function cleanupUnusedIndexes(dryRun: boolean) {
  // This would require more careful consideration
  // as dropping indexes can impact performance
  return {
    cleaned: 0,
    message: 'Index cleanup requires manual review'
  };
}

export default router;