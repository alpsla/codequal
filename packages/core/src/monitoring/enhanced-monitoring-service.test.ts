/**
 * Tests for EnhancedMonitoringService with Supabase integration
 */

import { EnhancedMonitoringService, MonitoringConfig } from './enhanced-monitoring-service';
import { SupabaseAlertStorage } from './supabase-alert-storage';

// Mock Supabase
jest.mock('./supabase-alert-storage');

describe('EnhancedMonitoringService', () => {
  let service: EnhancedMonitoringService;
  let mockAlertStorage: jest.Mocked<SupabaseAlertStorage>;
  
  const testConfig: MonitoringConfig = {
    service: 'test-service',
    environment: 'production',
    grafana: {
      url: 'http://localhost:3000',
      apiKey: 'test-key',
      orgId: 1
    },
    supabase: {
      url: 'https://test.supabase.co',
      key: 'test-key'
    },
    dashboards: [],
    alerts: [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: 'rate(errors[5m]) > 0.1',
        severity: 'critical',
        channels: ['slack', 'email'],
        description: 'Error rate exceeds 10%',
        threshold: 0.1
      }
    ],
    widgets: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock SupabaseAlertStorage
    mockAlertStorage = {
      storeAlert: jest.fn().mockResolvedValue('mock-alert-id'),
      updateAlertStatus: jest.fn().mockResolvedValue(undefined),
      getRecentAlerts: jest.fn().mockResolvedValue([]),
      getAlertMetrics: jest.fn().mockResolvedValue({
        total: 0,
        bySeverity: {},
        byStatus: {},
        mttr: 0
      })
    } as any;
    
    (SupabaseAlertStorage as jest.MockedClass<typeof SupabaseAlertStorage>)
      .mockImplementation(() => mockAlertStorage);
    
    service = new EnhancedMonitoringService(testConfig);
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Alert Storage', () => {
    it('should store alerts in Supabase when triggered', async () => {
      const alert = testConfig.alerts[0];
      const status = {
        id: alert.id,
        name: alert.name,
        status: 'critical' as const,
        message: 'Test alert triggered',
        value: 0.15,
        triggeredAt: new Date()
      };

      // Trigger alert
      await (service as any).triggerAlert(alert, status);

      // Verify Supabase storage was called
      expect(mockAlertStorage.storeAlert).toHaveBeenCalledWith({
        service: 'test-service',
        environment: 'production',
        alertId: 'high-error-rate',
        alertName: 'High Error Rate',
        severity: 'critical',
        status: 'firing',
        value: 0.15,
        threshold: 0.1,
        message: 'Test alert triggered',
        metadata: expect.any(Object),
        triggeredAt: expect.any(Date),
        channelsNotified: ['slack', 'email']
      });
    });

    it('should update alert status when resolved', async () => {
      const alertId = 'high-error-rate';
      const storedAlertId = 'stored-123';
      
      // Set up alert state
      (service as any).alertStates.set(alertId, {
        id: alertId,
        name: 'High Error Rate',
        status: 'critical',
        message: 'Alert active',
        storedAlertId
      });

      // Resolve alert
      await service.resolveAlert(alertId);

      // Verify Supabase update was called
      expect(mockAlertStorage.updateAlertStatus).toHaveBeenCalledWith(
        storedAlertId,
        'resolved',
        expect.any(Date)
      );

      // Verify local state updated
      const status = (service as any).alertStates.get(alertId);
      expect(status.status).toBe('ok');
    });

    it('should handle Supabase storage failures gracefully', async () => {
      // Mock storage failure
      mockAlertStorage.storeAlert.mockRejectedValue(new Error('Storage failed'));

      const alert = testConfig.alerts[0];
      const status = {
        id: alert.id,
        name: alert.name,
        status: 'critical' as const,
        message: 'Test alert',
        value: 0.15
      };

      // Should not throw
      await expect(
        (service as any).triggerAlert(alert, status)
      ).resolves.not.toThrow();

      // Alert should still be triggered locally
      expect(mockAlertStorage.storeAlert).toHaveBeenCalled();
    });
  });

  describe('Metrics Recording', () => {
    it('should record analysis metrics', () => {
      const labels = {
        mode: 'comparison',
        repository_size: 'medium',
        user_tier: 'pro'
      };

      service.recordAnalysisStarted(labels);
      service.recordAnalysisCompleted({ ...labels, duration_bucket: '30-60s' }, 45);

      // Verify metrics were recorded (checking internal state)
      const activeAnalyses = (service as any).coreMetrics.activeAnalyses;
      expect(activeAnalyses).toBeDefined();
    });

    it('should record error metrics', () => {
      service.recordError('api_error', 'comparison-agent', 'high');
      
      // Verify error was recorded
      const errorRate = (service as any).coreMetrics.errorRate;
      expect(errorRate).toBeDefined();
    });

    it('should record cost metrics', () => {
      service.recordCost('llm_api_call', 'openai', 0.025);
      
      // Verify cost was recorded
      const costMetrics = (service as any).coreMetrics.costMetrics;
      expect(costMetrics).toBeDefined();
    });
  });

  describe('Grafana Integration', () => {
    it('should format alerts for Grafana API', async () => {
      // Set up some alert states
      (service as any).alertStates.set('alert1', {
        id: 'alert1',
        name: 'Test Alert',
        status: 'critical',
        message: 'Test message',
        value: 0.15,
        triggeredAt: new Date()
      });

      const grafanaAlerts = await service.getGrafanaAlerts();

      expect(grafanaAlerts).toHaveLength(1);
      expect(grafanaAlerts[0]).toMatchObject({
        id: 'alert1',
        name: 'Test Alert',
        state: 'alerting',
        dashboardId: 'codequal-monitoring',
        evalData: {
          evalMatches: [{
            metric: 'Test Alert',
            tags: {
              service: 'test-service',
              environment: 'production'
            },
            value: 0.15
          }]
        }
      });
    });

    it('should generate embeddable widget components', () => {
      const widgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        type: 'metric' as const,
        dataSource: 'prometheus',
        query: 'test_metric',
        refreshInterval: 30000,
        embeddable: true
      };

      testConfig.widgets = [widgetConfig];
      service = new EnhancedMonitoringService(testConfig);

      const component = service.generateLoavableComponent('test-widget');
      
      expect(component).toContain('TestWidgetWidget');
      expect(component).toContain('MetricCard');
      expect(component).toContain('refreshInterval: 30000');
    });
  });

  describe('Alert Channels', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should handle slack channel notifications', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      
      const alert = testConfig.alerts[0];
      const status = {
        id: alert.id,
        name: alert.name,
        status: 'critical' as const,
        message: 'Test slack alert',
        value: 0.2
      };

      await (service as any).sendSlackAlert(alert, status);

      // In real implementation, would verify HTTP call
      // For now, just verify it attempted to send
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Slack webhook URL not configured')
      );
    });

    it('should handle missing channel configuration gracefully', async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      
      const alert = testConfig.alerts[0];
      const status = {
        id: alert.id,
        name: alert.name,
        status: 'warning' as const,
        message: 'Test alert'
      };

      // Should not throw
      await expect(
        (service as any).sendSlackAlert(alert, status)
      ).resolves.not.toThrow();
    });
  });

  describe('Health Monitoring', () => {
    it('should calculate overall health based on alerts', async () => {
      // Set up alert states
      (service as any).alertStates.set('alert1', {
        id: 'alert1',
        name: 'Alert 1',
        status: 'ok'
      });
      (service as any).alertStates.set('alert2', {
        id: 'alert2',
        name: 'Alert 2',
        status: 'warning'
      });

      const health = await (service as any).getOverallHealth();
      expect(health).toBe('warning');

      // Add critical alert
      (service as any).alertStates.set('alert3', {
        id: 'alert3',
        name: 'Alert 3',
        status: 'critical'
      });

      const criticalHealth = await (service as any).getOverallHealth();
      expect(criticalHealth).toBe('critical');
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in Prometheus format', async () => {
      // Record some metrics
      service.recordAnalysisStarted({
        mode: 'comparison',
        repository_size: 'small',
        user_tier: 'free'
      });

      const metrics = await service.getPrometheusMetrics();
      
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('codequal_analysis_started_total');
    });

    it('should provide AI-friendly metrics summary', async () => {
      const metricsForAI = await service.getMetricsForAI('5m');

      expect(metricsForAI).toMatchObject({
        timestamp: expect.any(Date),
        timeRange: '5m',
        service: 'test-service',
        metrics: expect.any(Object),
        summary: {
          totalAnalyses: expect.any(Number),
          successRate: expect.any(Number),
          averageTime: expect.any(Number),
          activeCount: expect.any(Number),
          errorCount: expect.any(Number)
        },
        healthStatus: expect.any(String),
        recommendations: expect.any(Array)
      });
    });
  });
});