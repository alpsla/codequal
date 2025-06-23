import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth-middleware';
import { resultOrchestratorRoutes } from './routes/result-orchestrator';
import { repositoryRoutes } from './routes/repository';
import { analysisRoutes } from './routes/analysis';
import webhookRoutes from './routes/webhooks';
import scheduleRoutes from './routes/schedules';
import monitoringRoutes, { getGlobalMonitoringService } from './routes/monitoring';
import reportRoutes from './routes/reports';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { monitoringMiddleware, analysisMonitoringMiddleware } from './middleware/monitoring-middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Monitoring middleware (collect metrics for all requests)
app.use(monitoringMiddleware);

// Basic health check endpoint (lightweight)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'CodeQual API Server',
    version: '1.0.0'
  });
});


// Prometheus metrics endpoint (no authentication required)
app.get('/metrics', (req, res) => {
  try {
    const service = getGlobalMonitoringService();
    const metrics = service.getPrometheusMetrics();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Error getting Prometheus metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Webhook routes (no authentication required for external webhooks)
app.use('/api/webhooks', webhookRoutes);

// API routes with authentication
app.use('/api', authMiddleware);
app.use('/api', analysisMonitoringMiddleware); // Additional monitoring for analysis endpoints
app.use('/api', resultOrchestratorRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', reportRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`CodeQual API Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

export default app;