// Load environment variables FIRST before any other imports
import './setup';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authMiddleware } from './middleware/auth-middleware';
import { resultOrchestratorRoutes } from './routes/result-orchestrator';
import { repositoryRoutes } from './routes/repository';
import analysisRoutes from './routes/analysis';
import webhookRoutes from './routes/webhooks';
import scheduleRoutes from './routes/schedules';
import monitoringRoutes, { getGlobalMonitoringService } from './routes/monitoring';
import reportRoutes from './routes/reports';
import apiKeyRoutes from './routes/api-keys';
import openapiDocsRoutes from './routes/openapi-docs';
import languageRoutes from './routes/languages';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import vectorSearchRoutes from './routes/vector-search';
import embeddingConfigRoutes from './routes/embedding-config';
import usersRoutes from './routes/users';
import organizationsRoutes from './routes/organizations';
import { errorHandler } from './middleware/error-handler';
import { i18nMiddleware, translateResponse, validateLanguage } from './middleware/i18n-middleware';
import { requestLogger } from './middleware/request-logger';
import { monitoringMiddleware, analysisMonitoringMiddleware } from './middleware/monitoring-middleware';
import { apiKeyAuth } from './middleware/api-key-auth';
import { initializeTranslators } from './services/translator-initialization-service';

// Environment variables are already loaded in setup.ts

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Serve static files from public directory
app.use(express.static('public'));

// Request logging
app.use(requestLogger);

// Internationalization middleware
app.use(i18nMiddleware);
app.use(validateLanguage);

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

// OpenAPI documentation (no authentication required)
app.use('/docs', openapiDocsRoutes);
app.use('/api/docs', openapiDocsRoutes);

// Language endpoints (no authentication required)
app.use('/languages', languageRoutes);
app.use('/v1/languages', languageRoutes);

// Authentication routes (no authentication required)
app.use('/auth', authRoutes);

// Webhook routes (no authentication required for external webhooks)
app.use('/api/webhooks', webhookRoutes);

// API Key management routes (requires user authentication)
app.use('/api/keys', authMiddleware, apiKeyRoutes);

// Public API routes (authenticated via API key)
app.use('/v1', apiKeyAuth); // All v1 API routes require API key
app.use('/v1', translateResponse('api')); // Auto-translate API responses
app.use('/v1', analysisMonitoringMiddleware);

// Map existing routes to v1 API
app.use('/v1/analyze-pr', resultOrchestratorRoutes);
app.use('/v1/repository', repositoryRoutes);
app.use('/v1/analysis', analysisRoutes);
app.use('/v1/reports', reportRoutes);

// Vector search routes (requires user authentication)
app.use('/api/vector', authMiddleware, vectorSearchRoutes);

// Embedding configuration routes (requires user authentication)
app.use('/api/embedding-config', authMiddleware, embeddingConfigRoutes);

// User management routes (requires user authentication)
app.use('/api/users', authMiddleware, usersRoutes);

// Organization management routes (requires user authentication)
app.use('/api/organizations', authMiddleware, organizationsRoutes);

// Internal API routes (requires user authentication)
app.use('/api', authMiddleware);
app.use('/api', translateResponse('api')); // Auto-translate API responses
app.use('/api', analysisMonitoringMiddleware);
app.use('/api', resultOrchestratorRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', reportRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Error handling
app.use(errorHandler);

// Initialize services before starting server
async function startServer() {
  try {
    // Initialize translators with Vector DB configurations
    // Temporarily disabled to get server running
    // await initializeTranslators();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`CodeQual API Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`Auth endpoints available at http://localhost:${PORT}/auth`);
      console.log(`Test OAuth at http://localhost:${PORT}/auth-test.html`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;