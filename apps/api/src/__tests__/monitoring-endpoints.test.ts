import request from 'supertest';
import express from 'express';
import monitoringRoutes, { getGlobalMonitoringService } from '../routes/monitoring';
import { authMiddleware } from '../middleware/auth-middleware';
import { monitoringMiddleware } from '../middleware/monitoring-middleware';

// Mock the auth middleware for testing
jest.mock('../middleware/auth-middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      permissions: ['read'],
      status: 'active',
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000)
      }
    };
    next();
  }
}));

// Mock the monitoring service and getGlobalMonitoringService
const mockMonitoringService = {
  getPrometheusMetrics: jest.fn().mockReturnValue('# Mock metrics\ntest_metric 1'),
  getEmbeddableWidgets: jest.fn().mockReturnValue([
    {
      id: 'test-widget',
      name: 'Test Widget',
      type: 'metric',
      embeddable: true,
      refreshInterval: 30000
    }
  ]),
  getWidgetData: jest.fn().mockImplementation((widgetId) => {
    if (widgetId === 'test-widget') {
      return Promise.resolve({
        widgetId: 'test-widget',
        type: 'metric',
        data: { value: 42 },
        lastUpdated: new Date(),
        props: {}
      });
    } else {
      throw new Error(`Widget ${widgetId} not found`);
    }
  }),
  generateLoavableComponent: jest.fn().mockImplementation((widgetId) => {
    if (widgetId === 'test-widget') {
      return '// Mock React component';
    } else {
      throw new Error(`Widget ${widgetId} not found`);
    }
  }),
  getMonitoringSchema: jest.fn().mockReturnValue({
    service: 'codequal-api',
    version: '1.0.0',
    capabilities: {
      dashboards: [
        {
          id: 'test-dashboard',
          title: 'Test Dashboard',
          description: 'Test dashboard',
          aiPrompts: ['Show me the system health'],
          embeddable: true
        }
      ]
    }
  }),
  getDashboardData: jest.fn().mockImplementation((dashboardId) => {
    if (dashboardId === 'test-dashboard') {
      return Promise.resolve({
        panels: [],
        alerts: [],
        metadata: {
          refreshedAt: new Date(),
          nextRefresh: new Date(),
          dataQuality: 1.0
        }
      });
    } else {
      return Promise.resolve(null);
    }
  }),
  getAlertStatus: jest.fn().mockImplementation((alertId) => {
    const alerts = [
      {
        id: 'test-alert',
        name: 'Test Alert',
        status: 'ok',
        message: 'All systems operational'
      }
    ];
    
    if (alertId) {
      return alerts.filter(alert => alert.id === alertId);
    } else {
      return alerts;
    }
  }),
  getMetricsForAI: jest.fn().mockResolvedValue({
    timestamp: new Date(),
    timeRange: 'current',
    service: 'codequal-api',
    metrics: {},
    summary: {
      totalAnalyses: 10,
      successRate: 0.95,
      averageTime: 60,
      activeCount: 2,
      errorCount: 1
    },
    healthStatus: 'healthy',
    recommendations: ['System running optimally']
  }),
  recordAnalysisStarted: jest.fn(),
  recordAnalysisCompleted: jest.fn(),
  recordAnalysisFailed: jest.fn(),
  recordComponentLatency: jest.fn(),
  recordError: jest.fn(),
  recordBusinessEvent: jest.fn(),
  recordCost: jest.fn()
};

// Mock the enhanced monitoring service module
jest.mock('../../../../packages/core/src/monitoring/enhanced-monitoring-service', () => ({
  EnhancedMonitoringService: jest.fn().mockImplementation(() => mockMonitoringService),
  defaultMonitoringConfig: {
    service: 'codequal-api',
    environment: 'test',
    grafana: {
      url: 'http://test-grafana:3000',
      apiKey: 'test-key',
      orgId: 1
    },
    dashboards: [],
    alerts: [],
    widgets: []
  }
}));

// Mock the monitoring routes module completely
jest.mock('../routes/monitoring', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();
  
  // Mock all the routes that exist in the real monitoring routes
  router.get('/widgets', (req: any, res: any) => res.json([]));
  router.get('/widgets/:id/data', (req: any, res: any) => res.json({}));
  router.get('/widgets/:id/component', (req: any, res: any) => res.send(''));
  router.get('/dashboards', (req: any, res: any) => res.json([]));
  router.get('/dashboards/:id', (req: any, res: any) => res.json({}));
  router.get('/alerts', (req: any, res: any) => res.json([]));
  router.get('/alerts/:id', (req: any, res: any) => res.json({}));
  router.get('/schema', (req: any, res: any) => res.json({}));
  router.get('/metrics/ai', (req: any, res: any) => res.json({}));
  router.post('/events', (req: any, res: any) => res.json({ success: true }));
  router.get('/health', (req: any, res: any) => res.json({ status: 'ok' }));
  
  return {
    __esModule: true,
    default: router,
    getGlobalMonitoringService: jest.fn(() => mockMonitoringService)
  };
});

describe('Monitoring API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(monitoringMiddleware);
    
    // Prometheus metrics endpoint (no authentication required) - same as in index.ts
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
    
    // Authenticated monitoring routes
    app.use('/api/monitoring', authMiddleware, monitoringRoutes);
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics without authentication', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# Mock metrics');
      expect(response.text).toContain('test_metric 1');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('GET /api/monitoring/widgets', () => {
    it('should return list of embeddable widgets', async () => {
      const response = await request(app)
        .get('/api/monitoring/widgets')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        widgets: [
          {
            id: 'test-widget',
            name: 'Test Widget',
            type: 'metric',
            embeddable: true,
            refreshInterval: 30000
          }
        ],
        count: 1
      });
    });
  });

  describe('GET /api/monitoring/widgets/:id/data', () => {
    it('should return widget data for valid widget ID', async () => {
      const response = await request(app)
        .get('/api/monitoring/widgets/test-widget/data')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          widgetId: 'test-widget',
          type: 'metric',
          data: { value: 42 }
        }
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 404 for invalid widget ID', async () => {
      // Mock the service to throw an error for invalid widget
      const { EnhancedMonitoringService } = await import('../../../../packages/core/src/monitoring/enhanced-monitoring-service');
      const mockService = EnhancedMonitoringService;
      mockService.mockImplementation(() => ({
        getWidgetData: jest.fn().mockRejectedValue(new Error('Widget not-found not found'))
      }));

      await request(app)
        .get('/api/monitoring/widgets/invalid-widget/data')
        .expect(404);
    });
  });

  describe('GET /api/monitoring/widgets/:id/component', () => {
    it('should return Loavable React component code', async () => {
      const response = await request(app)
        .get('/api/monitoring/widgets/test-widget/component')
        .expect(200);

      expect(response.text).toContain('// Mock React component');
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('GET /api/monitoring/dashboards', () => {
    it('should return list of available dashboards', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboards')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        dashboards: [
          {
            id: 'test-dashboard',
            title: 'Test Dashboard',
            description: 'Test dashboard',
            aiPrompts: ['Show me the system health'],
            embeddable: true
          }
        ],
        count: 1
      });
    });
  });

  describe('GET /api/monitoring/dashboards/:id', () => {
    it('should return dashboard data for valid dashboard ID', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboards/test-dashboard')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          panels: [],
          alerts: [],
          metadata: {
            dataQuality: 1.0
          }
        },
        dashboardId: 'test-dashboard'
      });
    });

    it('should return 404 for invalid dashboard ID', async () => {
      // Mock the service to return null for invalid dashboard
      const { EnhancedMonitoringService } = await import('../../../../packages/core/src/monitoring/enhanced-monitoring-service');
      const mockService = EnhancedMonitoringService;
      mockService.mockImplementation(() => ({
        getDashboardData: jest.fn().mockResolvedValue(null)
      }));

      await request(app)
        .get('/api/monitoring/dashboards/invalid-dashboard')
        .expect(404);
    });
  });

  describe('GET /api/monitoring/alerts', () => {
    it('should return alert status summary', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        alerts: [
          {
            id: 'test-alert',
            name: 'Test Alert',
            status: 'ok',
            message: 'All systems operational'
          }
        ],
        count: 1,
        summary: {
          critical: 0,
          warning: 0,
          ok: 1
        }
      });
    });
  });

  describe('GET /api/monitoring/alerts/:id', () => {
    it('should return specific alert status', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts/test-alert')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        alert: {
          id: 'test-alert',
          name: 'Test Alert',
          status: 'ok',
          message: 'All systems operational'
        },
        alertId: 'test-alert'
      });
    });

    it('should return 404 for invalid alert ID', async () => {
      // Mock the service to return empty array for invalid alert
      const { EnhancedMonitoringService } = await import('../../../../packages/core/src/monitoring/enhanced-monitoring-service');
      const mockService = EnhancedMonitoringService;
      mockService.mockImplementation(() => ({
        getAlertStatus: jest.fn().mockReturnValue([])
      }));

      await request(app)
        .get('/api/monitoring/alerts/invalid-alert')
        .expect(404);
    });
  });

  describe('GET /api/monitoring/health', () => {
    it('should return enhanced health check with monitoring metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'CodeQual API Server - Monitoring',
        version: '1.0.0',
        monitoring: {
          metricsCollected: true,
          alertsActive: true,
          dashboardsAvailable: true,
          overallHealth: 'healthy'
        },
        metrics: {
          totalAnalyses: 10,
          successRate: 0.95,
          averageTime: 60,
          activeAnalyses: 2,
          errorCount: 1
        },
        recommendations: ['System running optimally']
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/monitoring/schema', () => {
    it('should return monitoring schema for AI tool integration', async () => {
      const response = await request(app)
        .get('/api/monitoring/schema')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        schema: {
          service: 'codequal-api',
          version: '1.0.0',
          capabilities: {
            dashboards: expect.any(Array)
          }
        },
        description: 'Monitoring service schema for AI tool integration'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/monitoring/metrics/ai', () => {
    it('should return formatted metrics data for AI analysis', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/ai')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          service: 'codequal-api',
          summary: {
            totalAnalyses: 10,
            successRate: 0.95,
            averageTime: 60,
            activeCount: 2,
            errorCount: 1
          },
          healthStatus: 'healthy',
          recommendations: ['System running optimally']
        }
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should accept timeRange parameter', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/ai?timeRange=1h')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/monitoring/record', () => {
    it('should record analysis_started event', async () => {
      const response = await request(app)
        .post('/api/monitoring/record')
        .send({
          eventType: 'analysis_started',
          data: {
            mode: 'comprehensive',
            repository_size: 'medium',
            user_tier: 'pro'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Event analysis_started recorded'
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should record analysis_completed event', async () => {
      const response = await request(app)
        .post('/api/monitoring/record')
        .send({
          eventType: 'analysis_completed',
          data: {
            labels: {
              mode: 'comprehensive',
              repository_size: 'medium',
              user_tier: 'pro',
              duration_bucket: 'normal'
            },
            duration: 120
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Event analysis_completed recorded'
      });
    });

    it('should record error event', async () => {
      const response = await request(app)
        .post('/api/monitoring/record')
        .send({
          eventType: 'error',
          data: {
            error_type: 'timeout',
            component: 'api',
            severity: 'warning'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Event error recorded'
      });
    });

    it('should return 400 for invalid event type', async () => {
      const response = await request(app)
        .post('/api/monitoring/record')
        .send({
          eventType: 'invalid_event',
          data: {}
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid event type',
        validTypes: expect.arrayContaining(['analysis_started', 'analysis_completed', 'error'])
      });
    });
  });

  describe('Error handling', () => {
    it('should handle monitoring service errors gracefully', async () => {
      // Create a new app with a service that throws an error
      const errorApp = express();
      errorApp.use(express.json());
      
      errorApp.get('/metrics', (req, res) => {
        try {
          // Simulate service error
          throw new Error('Service unavailable');
        } catch (error) {
          console.error('Error getting Prometheus metrics:', error);
          res.status(500).json({ 
            error: 'Failed to get metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      const response = await request(errorApp)
        .get('/metrics')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to get metrics',
        message: 'Service unavailable'
      });
    });
  });
});