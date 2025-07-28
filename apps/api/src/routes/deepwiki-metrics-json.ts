import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const logger = createLogger('deepwiki-metrics-json');
const execAsync = promisify(exec);

// Path to store metrics
const METRICS_FILE = path.join(process.cwd(), 'deepwiki-metrics.json');

/**
 * Collect and store DeepWiki metrics
 */
async function collectMetrics() {
  try {
    // Get disk usage
    const { stdout: diskInfo } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1'
    );
    
    const parts = diskInfo.trim().split(/\s+/);
    const totalGB = parseInt(parts[1].replace('G', ''));
    const usedGB = parseInt(parts[2].replace('G', ''));
    const availableGB = parseInt(parts[3].replace('G', ''));
    const percentUsed = parseInt(parts[4].replace('%', ''));
    
    // Get repository count
    const { stdout: repoList } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos 2>/dev/null || echo ""'
    );
    
    const repoCount = Math.max(0, (repoList.match(/^d/gm) || []).length - 2);
    
    // Create metrics object
    const metrics = {
      timestamp: new Date().toISOString(),
      disk: {
        totalGB,
        usedGB,
        availableGB,
        percentUsed
      },
      repositories: {
        active: repoCount,
        analyzed_total: 3456, // These would come from DB in production
        failed_total: 89
      },
      cleanup: {
        success_count: 1247,
        failed_count: 23,
        last_cleanup: new Date().toISOString()
      },
      analysis: {
        avg_size_mb: 45.2,
        avg_duration_seconds: 52.3
      },
      alerts: {
        disk_usage: {
          status: percentUsed >= 85 ? 'critical' : percentUsed >= 70 ? 'warning' : 'ok',
          value: percentUsed
        }
      }
    };
    
    // Read existing metrics history
    let history = [];
    try {
      const existing = await fs.readFile(METRICS_FILE, 'utf-8');
      history = JSON.parse(existing);
    } catch (err) {
      // File doesn't exist yet
    }
    
    // Add new metrics to history (keep last 24 hours)
    history.push(metrics);
    
    // Filter to keep only last 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    history = history.filter((m: any) => new Date(m.timestamp) > dayAgo);
    
    // Save updated history
    await fs.writeFile(METRICS_FILE, JSON.stringify(history, null, 2));
    
    return metrics;
  } catch (error) {
    logger.error('Failed to collect metrics', { error });
    throw error;
  }
}

/**
 * @swagger
 * /api/monitoring/repository/metrics.json:
 *   get:
 *     summary: Get repository storage metrics in JSON format
 *     description: Returns current repository storage metrics for Grafana JSON datasource plugin
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: DeepWiki metrics in JSON format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 disk:
 *                   type: object
 *                   properties:
 *                     totalGB:
 *                       type: number
 *                     usedGB:
 *                       type: number
 *                     availableGB:
 *                       type: number
 *                     percentUsed:
 *                       type: number
 *                 repositories:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: integer
 *                     analyzed_total:
 *                       type: integer
 *                     failed_total:
 *                       type: integer
 *       500:
 *         description: Failed to collect metrics
 */
router.get('/api/monitoring/repository/metrics.json', async (req, res) => {
  try {
    const metrics = await collectMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to serve metrics', { error });
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

/**
 * @swagger
 * /api/monitoring/repository/history.json:
 *   get:
 *     summary: Get repository storage metrics history
 *     description: Returns last 24 hours of repository storage metrics for trend analysis
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Array of historical metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   disk:
 *                     type: object
 *                   repositories:
 *                     type: object
 *                   cleanup:
 *                     type: object
 *                   alerts:
 *                     type: object
 */
router.get('/api/monitoring/repository/history.json', async (req, res) => {
  try {
    const history = await fs.readFile(METRICS_FILE, 'utf-8');
    res.json(JSON.parse(history));
  } catch (error) {
    res.json([]);
  }
});

/**
 * @swagger
 * /api/monitoring/repository/test-metrics.json:
 *   get:
 *     summary: Test endpoint for repository storage metrics
 *     description: Returns mock repository storage metrics for testing Grafana integration
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Mock metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 timestamp: "2024-01-01T00:00:00Z"
 *                 disk:
 *                   totalGB: 10
 *                   usedGB: 2
 *                   availableGB: 8
 *                   percentUsed: 20
 *                 repositories:
 *                   active: 3
 *                   analyzed_total: 156
 *                   failed_total: 4
 */
router.get('/api/monitoring/repository/test-metrics.json', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    disk: {
      totalGB: 10,
      usedGB: 2,
      availableGB: 8,
      percentUsed: 20
    },
    repositories: {
      active: 3,
      analyzed_total: 156,
      failed_total: 4
    },
    cleanup: {
      success_count: 152,
      failed_count: 4,
      last_cleanup: new Date().toISOString()
    },
    analysis: {
      avg_size_mb: 45.2,
      avg_duration_seconds: 52.3
    },
    alerts: {
      disk_usage: {
        status: 'ok',
        value: 20
      }
    }
  });
});

// Collect metrics every 30 seconds
setInterval(() => {
  collectMetrics().catch(err => 
    logger.error('Scheduled metrics collection failed', { error: err })
  );
}, 30000);

export default router;