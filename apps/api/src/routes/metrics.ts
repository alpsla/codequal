import { Router } from 'express';
import { metricsExporter } from '../services/metrics-exporter';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('metrics-routes');

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get Prometheus-formatted metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/', async (req, res) => {
  try {
    // Check for bearer token if configured
    if (process.env.PROMETHEUS_BEARER_TOKEN) {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (token !== process.env.PROMETHEUS_BEARER_TOKEN) {
        return res.status(401).send('Unauthorized');
      }
    }
    
    const metrics = await metricsExporter.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Failed to export metrics:', error as Error);
    res.status(500).send('Failed to export metrics');
  }
});

/**
 * @swagger
 * /api/metrics/json:
 *   get:
 *     summary: Get metrics in JSON format
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics in JSON format
 */
router.get('/json', async (req, res) => {
  try {
    const metrics = await metricsExporter.getJsonMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get JSON metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/metrics/push:
 *   post:
 *     summary: Manually push metrics to DigitalOcean
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics pushed successfully
 */
router.post('/push', async (req, res) => {
  try {
    // Admin only
    if (!req.user?.email?.includes('@codequal.dev')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    await metricsExporter.pushToDigitalOcean();
    res.json({ success: true, message: 'Metrics pushed to DigitalOcean' });
  } catch (error) {
    logger.error('Failed to push metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to push metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;