import { Router, Request, Response, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { EnhancedMonitoringService, MonitoringConfig, defaultMonitoringConfig } from '../../../../packages/core/src/monitoring/enhanced-monitoring-service';

export const monitoringRoutes = Router();

// Global monitoring service instance
let monitoringService: EnhancedMonitoringService | null = null;

// Initialize monitoring service with configuration
const initializeMonitoringService = (): EnhancedMonitoringService => {
  if (!monitoringService) {
    const config: MonitoringConfig = {
      ...defaultMonitoringConfig,
      service: 'codequal-api',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      grafana: {
        url: process.env.GRAFANA_URL || 'http://localhost:3000',
        apiKey: process.env.GRAFANA_API_KEY,
        orgId: parseInt(process.env.GRAFANA_ORG_ID || '1')
      }
    };
    
    monitoringService = new EnhancedMonitoringService(config);
    
    // Set up event listeners for logging
    monitoringService.on('alertTriggered', (data) => {
      console.log('Alert triggered:', data.alert.name, data.status.status);
    });
    
    monitoringService.on('dashboardRefresh', (data) => {
      console.log('Dashboard refreshed:', data.dashboardId);
    });
  }
  
  return monitoringService;
};

// Ensure monitoring service is available
const getMonitoringService = (): EnhancedMonitoringService => {
  return initializeMonitoringService();
};

// Note: /metrics endpoint is handled directly in index.ts for public access

/**
 * GET /api/monitoring/widgets/:id/data
 * Get data for a specific Loavable widget
 */
monitoringRoutes.get('/widgets/:id/data', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const widgetId = req.params.id;
    const service = getMonitoringService();
    
    const widgetData = await service.getWidgetData(widgetId);
    
    res.json({
      success: true,
      data: widgetData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting widget data:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        error: 'Widget not found',
        widgetId: req.params.id
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to get widget data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/monitoring/widgets
 * Get list of available embeddable widgets
 */
monitoringRoutes.get('/widgets', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const service = getMonitoringService();
    const widgets = service.getEmbeddableWidgets();
    
    res.json({
      success: true,
      widgets: widgets.map(widget => ({
        id: widget.id,
        name: widget.name,
        type: widget.type,
        embeddable: widget.embeddable,
        refreshInterval: widget.refreshInterval
      })),
      count: widgets.length
    });
  } catch (error) {
    console.error('Error getting widgets:', error);
    res.status(500).json({ 
      error: 'Failed to get widgets',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/widgets/:id/component
 * Generate Loavable React component code for a widget
 */
monitoringRoutes.get('/widgets/:id/component', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const widgetId = req.params.id;
    const service = getMonitoringService();
    
    const componentCode = service.generateLoavableComponent(widgetId);
    
    res.set('Content-Type', 'text/plain');
    res.send(componentCode);
  } catch (error) {
    console.error('Error generating widget component:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        error: 'Widget not found',
        widgetId: req.params.id
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate component',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/monitoring/dashboards
 * Get list of available dashboards
 */
monitoringRoutes.get('/dashboards', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const service = getMonitoringService();
    const schema = service.getMonitoringSchema();
    
    res.json({
      success: true,
      dashboards: (schema as any).capabilities.dashboards,
      count: (schema as any).capabilities.dashboards.length
    });
  } catch (error) {
    console.error('Error getting dashboards:', error);
    res.status(500).json({ 
      error: 'Failed to get dashboards',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/dashboards/:id
 * Get specific dashboard data
 */
monitoringRoutes.get('/dashboards/:id', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const dashboardId = req.params.id;
    const service = getMonitoringService();
    
    const dashboardData = await service.getDashboardData(dashboardId);
    
    if (!dashboardData) {
      return res.status(404).json({ 
        error: 'Dashboard not found',
        dashboardId
      });
    }
    
    res.json({
      success: true,
      data: dashboardData,
      dashboardId
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to get dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get current alert status
 */
monitoringRoutes.get('/alerts', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const service = getMonitoringService();
    const alerts = service.getAlertStatus();
    
    res.json({
      success: true,
      alerts,
      count: alerts.length,
      summary: {
        critical: alerts.filter(a => a.status === 'critical').length,
        warning: alerts.filter(a => a.status === 'warning').length,
        ok: alerts.filter(a => a.status === 'ok').length
      }
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ 
      error: 'Failed to get alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/alerts/:id
 * Get specific alert status
 */
monitoringRoutes.get('/alerts/:id', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const alertId = req.params.id;
    const service = getMonitoringService();
    
    const alerts = service.getAlertStatus(alertId);
    
    if (alerts.length === 0) {
      return res.status(404).json({ 
        error: 'Alert not found',
        alertId
      });
    }
    
    res.json({
      success: true,
      alert: alerts[0],
      alertId
    });
  } catch (error) {
    console.error('Error getting alert status:', error);
    res.status(500).json({ 
      error: 'Failed to get alert status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/health
 * Enhanced health check with monitoring metrics
 */
monitoringRoutes.get('/health', async (req: Request, res: Response) => {
  try {
    const service = getMonitoringService();
    const metricsData = await service.getMetricsForAI();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CodeQual API Server - Monitoring',
      version: '1.0.0',
      monitoring: {
        metricsCollected: true,
        alertsActive: metricsData.summary.errorCount > 0,
        dashboardsAvailable: true,
        overallHealth: metricsData.healthStatus
      },
      metrics: {
        totalAnalyses: metricsData.summary.totalAnalyses,
        successRate: metricsData.summary.successRate,
        averageTime: metricsData.summary.averageTime,
        activeAnalyses: metricsData.summary.activeCount,
        errorCount: metricsData.summary.errorCount
      },
      recommendations: metricsData.recommendations
    };
    
    // Set status based on health
    const statusCode = metricsData.healthStatus === 'critical' ? 503 : 
                      metricsData.healthStatus === 'warning' ? 200 : 200;
    
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Error in monitoring health check:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'CodeQual API Server - Monitoring',
      error: 'Monitoring service error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/schema
 * Get monitoring schema for AI tool integration
 */
monitoringRoutes.get('/schema', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const service = getMonitoringService();
    const schema = service.getMonitoringSchema();
    
    res.json({
      success: true,
      schema,
      timestamp: new Date().toISOString(),
      description: 'Monitoring service schema for AI tool integration'
    });
  } catch (error) {
    console.error('Error getting monitoring schema:', error);
    res.status(500).json({ 
      error: 'Failed to get monitoring schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/metrics/ai
 * Get formatted metrics data for AI analysis
 */
monitoringRoutes.get('/metrics/ai', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const timeRange = req.query.timeRange as string;
    const service = getMonitoringService();
    
    const metricsData = await service.getMetricsForAI(timeRange);
    
    res.json({
      success: true,
      data: metricsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting AI metrics:', error);
    res.status(500).json({ 
      error: 'Failed to get AI metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/monitoring/record
 * Manually record monitoring events (for development/testing)
 */
monitoringRoutes.post('/record', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { eventType, data } = req.body;
    const service = getMonitoringService();
    
    // Handle different event types
    switch (eventType) {
      case 'analysis_started':
        service.recordAnalysisStarted(data);
        break;
      case 'analysis_completed':
        service.recordAnalysisCompleted(data.labels, data.duration);
        break;
      case 'analysis_failed':
        service.recordAnalysisFailed(data);
        break;
      case 'component_latency':
        service.recordComponentLatency(data.component, data.operation, data.duration);
        break;
      case 'error':
        service.recordError(data.error_type, data.component, data.severity);
        break;
      case 'business_event':
        service.recordBusinessEvent(data.event_type, data.user_tier, data.repository_language);
        break;
      case 'cost':
        service.recordCost(data.operation, data.provider, data.cost);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid event type',
          validTypes: ['analysis_started', 'analysis_completed', 'analysis_failed', 'component_latency', 'error', 'business_event', 'cost']
        });
    }
    
    res.json({
      success: true,
      message: `Event ${eventType} recorded`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error recording monitoring event:', error);
    res.status(500).json({ 
      error: 'Failed to record event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export monitoring service for use in other parts of the API
export const getGlobalMonitoringService = (): EnhancedMonitoringService => {
  return getMonitoringService();
};

export default monitoringRoutes;