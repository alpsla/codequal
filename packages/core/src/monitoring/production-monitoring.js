"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = exports.ErrorTracker = exports.MetricsCollector = void 0;
exports.requestTracing = requestTracing;
exports.setupHealthChecks = setupHealthChecks;
exports.initializeMonitoring = initializeMonitoring;
const winston_1 = require("winston");
const prom_client_1 = require("prom-client");
const uuid_1 = require("uuid");
class ProductionLogger {
    constructor(serviceName) {
        this.logger = winston_1.default.createLogger({
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            defaultMeta: { service: serviceName },
            transports: [
                // Console output for development
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                }),
                // File output for production
                new winston_1.default.transports.File({
                    filename: 'error.log',
                    level: 'error'
                }),
                new winston_1.default.transports.File({
                    filename: 'combined.log'
                })
            ]
        });
    }
    info(message, context) {
        this.logger.info(message, context);
    }
    error(message, error, context) {
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
            });
        }
    }
    isCriticalAction(action) {
        const criticalActions = [
            'deepwiki_failure',
            'vector_db_connection_lost',
            'authentication_failure',
            'payment_processing_error'
        ];
        return criticalActions.includes(action);
    }
    sendAlert(message, error, context) {
        // Implement your alerting logic here (Slack, PagerDuty, etc.)
        console.error(`🚨 CRITICAL ERROR: ${message}`, { error, context });
    }
}
// 2. Metrics Collection
class MetricsCollector {
    constructor() {
        this.register = new prom_client_1.default.Registry();
        prom_client_1.default.collectDefaultMetrics({ register: this.register });
        // Analysis metrics
        this.analysisStarted = new prom_client_1.default.Counter({
            name: 'codequal_analysis_started_total',
            help: 'Total number of analyses started',
            labelNames: ['mode', 'repository_size'],
            registers: [this.register]
        });
        this.analysisCompleted = new prom_client_1.default.Counter({
            name: 'codequal_analysis_completed_total',
            help: 'Total number of analyses completed',
            labelNames: ['mode', 'repository_size', 'status'],
            registers: [this.register]
        });
        this.analysisFailed = new prom_client_1.default.Counter({
            name: 'codequal_analysis_failed_total',
            help: 'Total number of failed analyses',
            labelNames: ['mode', 'error_type'],
            registers: [this.register]
        });
        this.analysisTime = new prom_client_1.default.Histogram({
            name: 'codequal_analysis_duration_seconds',
            help: 'Time taken for complete PR analysis',
            labelNames: ['mode', 'repository_size', 'status'],
            buckets: [10, 30, 60, 120, 300, 600],
            registers: [this.register]
        });
        this.activeAnalyses = new prom_client_1.default.Gauge({
            name: 'codequal_active_analyses',
            help: 'Number of currently active analyses',
            registers: [this.register]
        });
        // Component latency metrics
        this.deepWikiLatency = new prom_client_1.default.Histogram({
            name: 'codequal_deepwiki_latency_seconds',
            help: 'DeepWiki API latency',
            labelNames: ['operation'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
            registers: [this.register]
        });
        this.vectorDBLatency = new prom_client_1.default.Histogram({
            name: 'codequal_vectordb_latency_seconds',
            help: 'Vector DB query latency',
            labelNames: ['operation'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
            registers: [this.register]
        });
        this.agentExecutionTime = new prom_client_1.default.Histogram({
            name: 'codequal_agent_execution_seconds',
            help: 'Agent execution time',
            labelNames: ['agent_type', 'provider'],
            buckets: [1, 5, 10, 30, 60, 120],
            registers: [this.register]
        });
        this.errorRate = new prom_client_1.default.Counter({
            name: 'codequal_errors_total',
            help: 'Total number of errors',
            labelNames: ['error_type', 'service'],
            registers: [this.register]
        });
    }
    getMetrics() {
        return this.register;
    }
}
exports.MetricsCollector = MetricsCollector;
// 3. Request Tracing Middleware
function requestTracing(logger) {
    return (req, res, next) => {
        const traceId = req.headers['x-trace-id'] || (0, uuid_1.v4)();
        const startTime = Date.now();
        // Attach trace ID to request
        req.traceId = traceId;
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
        res.json = function (body) {
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
class ErrorTracker {
    constructor(logger) {
        this.logger = logger;
    }
    captureException(error, context) {
        // Log the error
        this.logger.error('Exception captured', error, context);
        // In production, also send to Sentry or similar
        if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
            // Sentry.captureException(error, { extra: context });
        }
        // Track error metrics
        const errorType = this.categorizeError(error);
        exports.metrics.errorRate.inc({ error_type: errorType, service: context.service || 'unknown' });
    }
    categorizeError(error) {
        if (error.message.includes('DeepWiki'))
            return 'deepwiki_error';
        if (error.message.includes('Vector'))
            return 'vectordb_error';
        if (error.message.includes('timeout'))
            return 'timeout_error';
        if (error.message.includes('auth'))
            return 'auth_error';
        return 'unknown_error';
    }
}
exports.ErrorTracker = ErrorTracker;
// 5. Health Check Implementation
function setupHealthChecks(app, logger) {
    // Basic health check
    app.get('/health', async (req, res) => {
        const health = {
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
            const allHealthy = Object.values(health.checks).every((check) => check.status === 'ok');
            res.status(allHealthy ? 200 : 503).json(health);
        }
        catch (error) {
            logger.error('Health check failed', error, { action: 'health_check' });
            res.status(503).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    });
    // Kubernetes liveness probe
    app.get('/live', (req, res) => {
        res.status(200).send('OK');
    });
    // Kubernetes readiness probe
    app.get('/ready', async (req, res) => {
        try {
            // Check if critical services are ready
            const dbReady = await checkDatabase();
            const vectorReady = await checkVectorDB();
            if (dbReady.status === 'ok' && vectorReady.status === 'ok') {
                res.status(200).send('Ready');
            }
            else {
                res.status(503).send('Not Ready');
            }
        }
        catch (error) {
            res.status(503).send('Not Ready');
        }
    });
}
// Health check implementations
async function checkDatabase() {
    const start = Date.now();
    try {
        // Your database ping logic here
        // await db.query('SELECT 1');
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (error) {
        return { status: 'error', latency: Date.now() - start };
    }
}
async function checkVectorDB() {
    const start = Date.now();
    try {
        // Your Vector DB ping logic here
        // await vectorDB.health();
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (error) {
        return { status: 'error', latency: Date.now() - start };
    }
}
async function checkDeepWiki() {
    const start = Date.now();
    try {
        // Your DeepWiki health check logic here
        // await deepWiki.ping();
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (error) {
        return { status: 'error', latency: Date.now() - start };
    }
}
async function checkRedis() {
    const start = Date.now();
    try {
        // Your Redis ping logic here
        // await redis.ping();
        return { status: 'ok', latency: Date.now() - start };
    }
    catch (error) {
        return { status: 'error', latency: Date.now() - start };
    }
}
// Usage Example
function initializeMonitoring(app, serviceName) {
    // Initialize logger
    const logger = new ProductionLogger(serviceName);
    // Initialize metrics
    const metrics = new MetricsCollector();
    // Initialize error tracker
    const errorTracker = new ErrorTracker(logger);
    // Add request tracing
    app.use(requestTracing(logger));
    // Add metrics endpoint
    app.get('/metrics', (req, res) => {
        res.set('Content-Type', metrics.getMetrics().contentType);
        res.end(metrics.getMetrics().metrics());
    });
    // Setup health checks
    setupHealthChecks(app, logger);
    // Global error handler
    app.use((err, req, res, next) => {
        errorTracker.captureException(err, {
            service: serviceName,
            traceId: req.traceId,
            userId: req.user?.id,
            action: 'unhandled_error'
        });
        res.status(500).json({
            error: 'Internal server error',
            traceId: req.traceId
        });
    });
    return { logger, metrics, errorTracker };
}
// Export a singleton instance for metrics
exports.metrics = new MetricsCollector();
