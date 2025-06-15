import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth-middleware';
import { getGlobalMonitoringService } from '../routes/monitoring';

// Extended Request interface to include monitoring data
interface MonitoredRequest extends Request {
  startTime?: number;
  monitoringLabels?: {
    userId?: string;
    userTier?: string;
    endpoint?: string;
    method?: string;
  };
}

/**
 * Monitoring middleware that automatically collects metrics for all API requests
 */
export const monitoringMiddleware = (
  req: MonitoredRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Skip monitoring for health checks and metrics endpoints
    if (req.path === '/health' || req.path === '/metrics' || req.path.startsWith('/api/monitoring/health')) {
      return next();
    }

    const startTime = Date.now();
    req.startTime = startTime;

    // Extract user information if available
    const authenticatedReq = req as AuthenticatedRequest;
    const user = authenticatedReq.user;

    // Set up monitoring labels
    req.monitoringLabels = {
      userId: user?.id,
      userTier: user?.role || 'anonymous',
      endpoint: sanitizeEndpoint(req.path),
      method: req.method
    };

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    const originalJson = res.json;

    // Track response completion
    res.end = function(chunk?: any, encoding?: any) {
      try {
        recordRequestMetrics(req as MonitoredRequest, res);
      } catch (error) {
        console.error('Error recording request metrics:', error);
      }
      
      return originalEnd.call(this, chunk, encoding);
    };

    // Track JSON responses specifically
    res.json = function(body?: any) {
      try {
        recordRequestMetrics(req as MonitoredRequest, res, body);
      } catch (error) {
        console.error('Error recording JSON response metrics:', error);
      }
      
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    console.error('Monitoring middleware error:', error);
    next(); // Continue even if monitoring fails
  }
};

/**
 * Record metrics for completed requests
 */
function recordRequestMetrics(req: MonitoredRequest, res: Response, responseBody?: any): void {
  try {
    const monitoringService = getGlobalMonitoringService();
    const duration = req.startTime ? (Date.now() - req.startTime) / 1000 : 0;
    const labels = req.monitoringLabels;

    if (!labels) return;

    // Record component latency
    monitoringService.recordComponentLatency(
      'api',
      `${labels.method}_${labels.endpoint}`,
      duration
    );

    // Record errors for 4xx and 5xx responses
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      const severity = res.statusCode >= 500 ? 'critical' : 'warning';
      
      monitoringService.recordError(
        errorType,
        'api',
        severity
      );
    }

    // Record business events for specific endpoints
    recordBusinessEvents(req, res, responseBody, monitoringService);

    // Record costs for expensive operations
    recordOperationCosts(req, res, duration, monitoringService);

  } catch (error) {
    console.error('Error in recordRequestMetrics:', error);
  }
}

/**
 * Record business-level events based on API endpoints
 */
function recordBusinessEvents(
  req: MonitoredRequest, 
  res: Response, 
  responseBody: any,
  monitoringService: any
): void {
  try {
    const labels = req.monitoringLabels;
    if (!labels) return;

    // Analysis-related events
    if (req.path.includes('/analyze-pr') && req.method === 'POST' && res.statusCode === 200) {
      monitoringService.recordBusinessEvent(
        'analysis_initiated',
        labels.userTier || 'unknown',
        extractRepositoryLanguage(req.body) || 'unknown'
      );
    }

    // Dashboard access events
    if (req.path.includes('/dashboards') && req.method === 'GET' && res.statusCode === 200) {
      monitoringService.recordBusinessEvent(
        'dashboard_accessed',
        labels.userTier || 'unknown',
        'web'
      );
    }

    // Widget embed events
    if (req.path.includes('/widgets') && req.method === 'GET' && res.statusCode === 200) {
      monitoringService.recordBusinessEvent(
        'widget_embedded',
        labels.userTier || 'unknown',
        'web'
      );
    }

    // Alert events
    if (req.path.includes('/alerts') && req.method === 'GET' && res.statusCode === 200) {
      monitoringService.recordBusinessEvent(
        'alerts_checked',
        labels.userTier || 'unknown',
        'web'
      );
    }
  } catch (error) {
    console.error('Error recording business events:', error);
  }
}

/**
 * Record operation costs for expensive API calls
 */
function recordOperationCosts(
  req: MonitoredRequest,
  res: Response,
  duration: number,
  monitoringService: any
): void {
  try {
    // Estimate costs based on operation type and duration
    let cost = 0;
    let operation = 'api_request';

    if (req.path.includes('/analyze-pr')) {
      // Analysis operations are more expensive
      cost = estimateAnalysisCost(req.body?.analysisMode, duration);
      operation = 'analysis';
    } else if (req.path.includes('/dashboards')) {
      // Dashboard queries have moderate cost
      cost = 0.001; // $0.001 per dashboard query
      operation = 'dashboard_query';
    } else if (req.path.includes('/widgets')) {
      // Widget queries are lightweight
      cost = 0.0001; // $0.0001 per widget query
      operation = 'widget_query';
    } else {
      // General API requests
      cost = 0.00001; // $0.00001 per general request
      operation = 'api_request';
    }

    if (cost > 0) {
      monitoringService.recordCost(operation, 'codequal', cost);
    }
  } catch (error) {
    console.error('Error recording operation costs:', error);
  }
}

/**
 * Estimate cost for analysis operations
 */
function estimateAnalysisCost(analysisMode: string, duration: number): number {
  const baseCosts = {
    'quick': 0.01,      // $0.01 for quick analysis
    'comprehensive': 0.05, // $0.05 for comprehensive analysis
    'deep': 0.10        // $0.10 for deep analysis
  };

  const baseCost = baseCosts[analysisMode as keyof typeof baseCosts] || 0.01;
  
  // Add duration-based cost (longer operations cost more)
  const durationCost = Math.max(0, (duration - 60) * 0.001); // $0.001 per second over 1 minute
  
  return baseCost + durationCost;
}

/**
 * Extract repository language from request body
 */
function extractRepositoryLanguage(body: any): string | null {
  try {
    // Try to extract from repository URL or other fields
    if (body?.repositoryUrl) {
      // Simple heuristic - could be enhanced with actual repo analysis
      const url = body.repositoryUrl.toLowerCase();
      if (url.includes('javascript') || url.includes('js')) return 'javascript';
      if (url.includes('typescript') || url.includes('ts')) return 'typescript';
      if (url.includes('python') || url.includes('py')) return 'python';
      if (url.includes('java')) return 'java';
      if (url.includes('go')) return 'go';
      if (url.includes('rust') || url.includes('rs')) return 'rust';
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Sanitize endpoint paths for metrics labels
 */
function sanitizeEndpoint(path: string): string {
  try {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-zA-Z0-9-_]{20,}/g, '/:token')
      .toLowerCase();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Middleware specifically for analysis operations
 */
export const analysisMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Only apply to analysis endpoints
    if (!req.path.includes('analyze') && !req.path.includes('analysis')) {
      return next();
    }

    const monitoringService = getGlobalMonitoringService();
    const user = (req as AuthenticatedRequest).user;

    // Override response methods to capture analysis-specific metrics
    const originalJson = res.json;
    
    res.json = function(body?: any) {
      try {
        // Record analysis events based on response
        if (req.method === 'POST' && req.path.includes('analyze-pr')) {
          const labels = {
            mode: req.body?.analysisMode || 'unknown',
            repository_size: estimateRepositorySize(req.body?.repositoryUrl) || 'unknown',
            user_tier: user?.role || 'unknown'
          };

          if (res.statusCode === 200) {
            monitoringService.recordAnalysisStarted(labels);
          } else {
            monitoringService.recordAnalysisFailed({
              mode: labels.mode,
              error_type: getErrorType(res.statusCode),
              component: 'api'
            });
          }
        }

        // Handle analysis progress/completion endpoints
        if (req.method === 'GET' && req.path.includes('/analysis/') && req.path.includes('/progress')) {
          if (body?.status === 'complete') {
            const analysisId = req.params?.id;
            const duration = body?.results?.duration || 0;
            
            // This would typically come from stored analysis data
            const labels = {
              mode: body?.request?.analysisMode || 'unknown',
              repository_size: 'unknown',
              user_tier: user?.role || 'unknown',
              duration_bucket: getDurationBucket(duration)
            };

            monitoringService.recordAnalysisCompleted(labels, duration);
          }
        }
      } catch (error) {
        console.error('Error in analysis monitoring:', error);
      }
      
      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    console.error('Analysis monitoring middleware error:', error);
    next();
  }
};

/**
 * Estimate repository size category
 */
function estimateRepositorySize(repositoryUrl: string): string {
  // This is a placeholder - in production, you'd query the repository API
  // or maintain a cache of repository metadata
  return 'medium'; // small, medium, large
}

/**
 * Get error type from status code
 */
function getErrorType(statusCode: number): string {
  if (statusCode >= 500) return 'server_error';
  if (statusCode >= 400) return 'client_error';
  return 'unknown';
}

/**
 * Get duration bucket for histogram metrics
 */
function getDurationBucket(duration: number): string {
  if (duration < 30) return 'fast';
  if (duration < 120) return 'normal';
  if (duration < 300) return 'slow';
  return 'very_slow';
}