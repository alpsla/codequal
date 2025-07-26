// Load environment variables FIRST before any other imports
import './setup';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { authMiddleware } from './middleware/auth-middleware';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('api-server');
import { resultOrchestratorRoutes } from './routes/result-orchestrator';
import { repositoryRoutes } from './routes/repository';
import analysisRoutes from './routes/analysis';
import webhookRoutes from './routes/webhooks';
import scheduleRoutes from './routes/schedules';
import monitoringRoutes, { getGlobalMonitoringService } from './routes/monitoring';
import progressRoutes from './routes/progress';
import vectorRetentionRoutes from './routes/vector-retention';
import reportRoutes from './routes/reports';
import analysisReportsRoutes from './routes/analysis-reports';
import apiKeyRoutes from './routes/api-keys';
import openapiDocsRoutes from './routes/openapi-docs';
// import languageRoutes from './routes/languages';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import vectorSearchRoutes from './routes/vector-search';
import embeddingConfigRoutes from './routes/embedding-config';
import usersRoutes from './routes/users';
import organizationsRoutes from './routes/organizations';
import billingRoutes from './routes/billing';
import stripeWebhookRoutes from './routes/stripe-webhooks';
import simpleScanRoutes from './routes/simple-scan-fixed';
import usageStatsRoutes from './routes/usage-stats';
import researcherRoutes from './routes/researcher';
import deepwikiTempStorageRoutes from './routes/deepwiki-temp-storage';
import metricsRoutes from './routes/metrics';
import { errorHandler } from './middleware/error-handler';
// import { i18nMiddleware, translateResponse, validateLanguage } from './middleware/i18n-middleware';
import { requestLogger } from './middleware/request-logger';
import { monitoringMiddleware, analysisMonitoringMiddleware } from './middleware/monitoring-middleware';
import { apiKeyAuth } from './middleware/api-key-auth';
import { trackApiUsage, requireApiAccess } from './middleware/api-usage-tracking';
import { globalRateLimiter, authRateLimiter, apiRateLimiter, webhookRateLimiter, reportRateLimiter, readOnlyRateLimiter } from './middleware/rate-limiter';
import { setupSwagger } from './middleware/swagger';
// import { initializeTranslators } from './services/translator-initialization-service';

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
  origin: function(origin, callback) {
    // Allow requests with no origin (like file:// or Postman)
    if (!origin) return callback(null, true);
    
    // Allow configured origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow localhost on any port for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Block other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use(requestLogger);

// Global rate limiting - applies to all routes
app.use(globalRateLimiter);

// Internationalization middleware
// app.use(i18nMiddleware);
// app.use(validateLanguage);

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
    logger.error('Error getting Prometheus metrics:', error as Error);
    res.status(500).json({ 
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Setup Swagger UI documentation
setupSwagger(app);


// Language endpoints (no authentication required)
// app.use('/languages', languageRoutes);
// app.use('/v1/languages', languageRoutes);

// Authentication routes (no authentication required, but rate limited)
app.use('/auth', authRateLimiter, authRoutes);
app.use('/api/auth', authRateLimiter, authRoutes);

// Webhook routes (no authentication required for external webhooks, but rate limited)
app.use('/api/webhooks', webhookRateLimiter, webhookRoutes);

// API Key management routes (requires user authentication)
app.use('/api/keys', authMiddleware, apiKeyRoutes);

// Test auth routes

// Public API routes (authenticated via API key)
app.use('/v1', apiKeyAuth); // All v1 API routes require API key
app.use('/v1', apiRateLimiter); // Apply API rate limiting
app.use('/v1', trackApiUsage); // Track API usage based on subscription
// app.use('/v1', requireApiAccess); // Temporarily disabled - limits enforced in trackApiUsage
// app.use('/v1', translateResponse('api')); // Auto-translate API responses
app.use('/v1', analysisMonitoringMiddleware);

// Map existing routes to v1 API
app.use('/v1', analysisReportsRoutes); // Register analysis reports first to catch specific routes
app.use('/v1', resultOrchestratorRoutes);
app.use('/v1/repository', repositoryRoutes);
app.use('/v1/analysis', analysisRoutes);
app.use('/v1/reports', reportRateLimiter, reportRoutes); // Apply stricter rate limiting for reports

// Vector search routes (requires user authentication)
app.use('/api/vector', authMiddleware, vectorSearchRoutes);

// Embedding configuration routes (requires user authentication)
app.use('/api/embedding-config', authMiddleware, embeddingConfigRoutes);

// User management routes (requires user authentication)
app.use('/api/users', authMiddleware, usersRoutes);

// Usage statistics routes (requires user authentication)
app.use('/api', authMiddleware, usageStatsRoutes);

// Organization management routes (requires user authentication)
app.use('/api/organizations', authMiddleware, organizationsRoutes);

// Billing routes (requires user authentication)
app.use('/api/billing', authMiddleware, billingRoutes);

// Progress tracking routes (requires user authentication)
app.use('/api/progress', authMiddleware, progressRoutes);

// Vector DB retention management routes (requires admin authentication)
app.use('/api/vector-retention', authMiddleware, vectorRetentionRoutes);

// Simple scan routes (for testing) - also track API usage for subscribed users
app.use('/api/simple-scan', authMiddleware, trackApiUsage, simpleScanRoutes);
// Other simple routes without tracking
// app.use('/api', simpleScanRoutes);  // Commented out to avoid duplicate registration

// Stripe webhook routes (no authentication required)
app.use('/stripe', stripeWebhookRoutes);

// Internal API routes (requires user authentication)
app.use('/api', authMiddleware);
app.use('/api', apiRateLimiter); // Apply API rate limiting
// app.use('/api', translateResponse('api')); // Auto-translate API responses
app.use('/api', analysisMonitoringMiddleware);
app.use('/api', analysisReportsRoutes); // Register analysis reports first to catch specific routes
app.use('/api', resultOrchestratorRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', reportRateLimiter, reportRoutes); // Apply stricter rate limiting for reports
app.use('/api/monitoring', monitoringRoutes);

// Researcher routes (requires user authentication)
app.use('/api/researcher', authMiddleware, researcherRoutes);

// DeepWiki temp storage monitoring routes (requires user authentication)
app.use('/api/deepwiki/temp', authMiddleware, deepwikiTempStorageRoutes);

// Metrics endpoint for Prometheus/monitoring (token auth via middleware)
app.use('/api/metrics', metricsRoutes);

// Dev test routes (NO AUTH - DEV ONLY)
if (process.env.NODE_ENV !== 'production') {
  // Dev routes removed - use specific development endpoints instead
}

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
      logger.info(`CodeQual API Server running on port ${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`Auth endpoints available at http://localhost:${PORT}/auth`);
      logger.info(`Test OAuth at http://localhost:${PORT}/auth-test.html`);
      
      // Start metrics auto-push if configured
      if (process.env.DO_METRICS_TOKEN) {
        const { metricsExporter } = require('./services/metrics-exporter');
        metricsExporter.startAutoPush(60000); // Push every minute
        logger.info('Started metrics auto-push to DigitalOcean');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app; 
