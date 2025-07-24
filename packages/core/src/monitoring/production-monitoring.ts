import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase 1 Monitoring Implementation Starter
 * Essential monitoring for CodeQual production deployment
 */

// 1. Structured Logging Setup
export interface LogContext {
  service: string;
  traceId?: string;
  userId?: string;
  repositoryUrl?: string;
  analysisId?: string;
  action: string;
  duration?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

class ProductionLogger {
  private logger: winston.Logger;
  
  constructor(serviceName: string) {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        // Console output for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // File output for production
        new winston.transports.File({ 
          filename: 'error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'combined.log' 
        })
      ]
    });
  }

  info(message: string, context?: Partial<LogContext>) {
    this.logger.info(message, context);
  }

  error(message: string, error: Error, context?: Partial<LogContext>) {
    this.logger.error(message, {
      ...context,
      error: {
        type: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    // Send critical errors to alerting system
    if (context?.action && this.isCriticalAction(context.action)) {
      this.sendAlert(message, error, {
        ...context,
        service: context.service || 'unknown',
        action: context.action
      } as LogContext);
    }
  }

  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'deepwiki_failure',
      'vector_db_connection_lost',
      'authentication_failure',
      'payment_processing_error'
    ];
    return criticalActions.includes(action);
  }

  private sendAlert(message: string, error: Error, context: LogContext) {
    // Implement your alerting logic here (Slack, PagerDuty, etc.)
    console.error(`🚨 CRITICAL ERROR: ${message}`, { error, context });
  }
}

// 2. Metrics Collection
export class MetricsCollector {
  private register: promClient.Registry;
  
  // Core metrics
  public analysisStarted: promClient.Counter;
  public analysisCompleted: promClient.Counter;
  public analysisFailed: promClient.Counter;
  public analysisTime: promClient.Histogram;
  public activeAnalyses: promClient.Gauge;
  public deepWikiLatency: promClient.Histogram;
  public vectorDBLatency: promClient.Histogram;
  public agentExecutionTime: promClient.Histogram;
  public errorRate: promClient.Counter;

  constructor() {
    this.register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register: this.register });

    // Analysis metrics
    this.analysisStarted = new promClient.Counter({
      name: 'codequal_analysis_started_total',
      help: 'Total number of analyses started',
      labelNames: ['mode', 'repository_size'],
      registers: [this.register]
    });

    this.analysisCompleted = new promClient.Counter({
      name: 'codequal_analysis_completed_total',
      help: 'Total number of analyses completed',
      labelNames: ['mode', 'repository_size', 'status'],
      registers: [this.register]
    });

    this.analysisFailed = new promClient.Counter({
      name: 'codequal_analysis_failed_total',
      help: 'Total number of failed analyses',
      labelNames: ['mode', 'error_type'],
      registers: [this.register]
    });

    this.analysisTime = new promClient.Histogram({
      name: 'codequal_analysis_duration_seconds',
      help: 'Time taken for complete PR analysis',
      labelNames: ['mode', 'repository_size', 'status'],
      buckets: [10, 30, 60, 120, 300, 600],
      registers: [this.register]
    });

    this.activeAnalyses = new promClient.Gauge({
      name: 'codequal_active_analyses',
      help: 'Number of currently active analyses',
      registers: [this.register]
    });

    // Component latency metrics
    this.deepWikiLatency = new promClient.Histogram({
      name: 'codequal_deepwiki_latency_seconds',
      help: 'DeepWiki API latency',
      labelNames: ['operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register]
    });

    this.vectorDBLatency = new promClient.Histogram({
      name: 'codequal_vectordb_latency_seconds',
      help: 'Vector DB query latency',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.register]
    });

    this.agentExecutionTime = new promClient.Histogram({
      name: 'codequal_agent_execution_seconds',
      help: 'Agent execution time',
      labelNames: ['agent_type', 'provider'],
      buckets: [1, 5, 10, 30, 60, 120],
      registers: [this.register]
    });

    this.errorRate = new promClient.Counter({
      name: 'codequal_errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'service'],
      registers: [this.register]
    });
  }

  getMetrics(): promClient.Registry {
    return this.register;
  }
}

// 3. Request Tracing Middleware
export function requestTracing(logger: ProductionLogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const traceId = req.headers['x-trace-id'] as string || uuidv4();
    const startTime = Date.now();

    // Attach trace ID to request
    (req as Request & { traceId: string }).traceId = traceId;

    // Log request start
    logger.info('Request started', {
      traceId,
      action: 'http_request_start',
      metadata: {
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent']
      }
    });

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(body: unknown) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        traceId,
        action: 'http_request_complete',
        duration,
        metadata: {
          statusCode: res.statusCode,
          path: req.path
        }
      });

      return originalJson.call(this, body);
    };

    next();
  };
}

// 4. Error Tracking
export class ErrorTracker {
  constructor(private logger: ProductionLogger) {}

  captureException(error: Error, context: Partial<LogContext>) {
    // Log the error
    this.logger.error('Exception captured', error, context);

    // In production, also send to Sentry or similar
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      // Sentry.captureException(error, { extra: context });
    }

    // Track error metrics
    const errorType = this.categorizeError(error);
    metrics.errorRate.inc({ error_type: errorType, service: context.service || 'unknown' });
  }

  private categorizeError(error: Error): string {
    if (error.message.includes('DeepWiki')) return 'deepwiki_error';
    if (error.message.includes('Vector')) return 'vectordb_error';
    if (error.message.includes('timeout')) return 'timeout_error';
    if (error.message.includes('auth')) return 'auth_error';
    return 'unknown_error';
  }
}

// 5. Health Check Implementation
export function setupHealthChecks(app: any, logger: ProductionLogger) {
  // Basic health check
  app.get('/health', async (req: Request, res: Response) => {
    const health: {
      status: string;
      timestamp: string;
      uptime: number;
      checks: Record<string, any>;
    } = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {}
    };

    try {
      // Check database
      health.checks['database'] = await checkDatabase();
      
      // Check Vector DB
      health.checks['vectorDB'] = await checkVectorDB();
      
      // Check DeepWiki
      health.checks['deepWiki'] = await checkDeepWiki();
      
      // Check Redis if used
      if (process.env.REDIS_URL) {
        health.checks['redis'] = await checkRedis();
      }

      const allHealthy = Object.values(health.checks).every(
        (check: any) => check.status === 'ok'
      );

      res.status(allHealthy ? 200 : 503).json(health);
    } catch (error) {
      logger.error('Health check failed', error as Error, { action: 'health_check' });
      res.status(503).json({
        status: 'unhealthy',
        error: (error as Error).message
      });
    }
  });

  // Kubernetes liveness probe
  app.get('/live', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // Kubernetes readiness probe
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check if critical services are ready
      const dbReady = await checkDatabase();
      const vectorReady = await checkVectorDB();
      
      if (dbReady.status === 'ok' && vectorReady.status === 'ok') {
        res.status(200).send('Ready');
      } else {
        res.status(503).send('Not Ready');
      }
    } catch (error) {
      res.status(503).send('Not Ready');
    }
  });
}

// Health check implementations
async function checkDatabase(): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  try {
    // Your database ping logic here
    // await db.query('SELECT 1');
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return { status: 'error', latency: Date.now() - start };
  }
}

async function checkVectorDB(): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  try {
    // Your Vector DB ping logic here
    // await vectorDB.health();
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return { status: 'error', latency: Date.now() - start };
  }
}

async function checkDeepWiki(): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  try {
    // Your DeepWiki health check logic here
    // await deepWiki.ping();
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return { status: 'error', latency: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: string; latency?: number }> {
  const start = Date.now();
  try {
    // Your Redis ping logic here
    // await redis.ping();
    return { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return { status: 'error', latency: Date.now() - start };
  }
}

// Usage Example
export function initializeMonitoring(app: any, serviceName: string) {
  // Initialize logger
  const logger = new ProductionLogger(serviceName);
  
  // Initialize metrics
  const metrics = new MetricsCollector();
  
  // Initialize error tracker
  const errorTracker = new ErrorTracker(logger);

  // Add request tracing
  app.use(requestTracing(logger));

  // Add metrics endpoint
  app.get('/metrics', (req: Request, res: Response) => {
    res.set('Content-Type', metrics.getMetrics().contentType);
    res.end(metrics.getMetrics().metrics());
  });

  // Setup health checks
  setupHealthChecks(app, logger);

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorTracker.captureException(err, {
      service: serviceName,
      traceId: (req as any).traceId,
      userId: (req as any).user?.id,
      action: 'unhandled_error'
    });

    res.status(500).json({
      error: 'Internal server error',
      traceId: (req as any).traceId
    });
  });

  return { logger, metrics, errorTracker };
}

// Export a singleton instance for metrics
export const metrics = new MetricsCollector();
