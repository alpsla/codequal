/**
 * Test Suite for Security Logging Service
 * 
 * Tests security event logging, metrics export, alerting, and storage backends.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  SecurityLoggingService,
  createSecurityLoggingService,
  defaultSecurityLoggingConfig,
  productionSecurityLoggingConfig
} from '../security-logging-service';
import { SecurityEvent } from '../types/auth';

// Mock Supabase client
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  mockResolvedValue: (jest.fn() as any).mockResolvedValue({ error: null, data: [] })
});

const mockSupabaseClient = {
  from: jest.fn(() => {
    const builder = createMockQueryBuilder();
    // Make insert resolve properly
    (builder.insert as any).mockResolvedValue({ error: null });
    // Make the chain methods return data
    builder.select.mockReturnValue({
      ...builder,
      order: jest.fn().mockReturnValue({
        ...builder,
        limit: (jest.fn() as any).mockResolvedValue({ error: null, data: [] })
      })
    });
    return builder;
  })
} as any;

describe('SecurityLoggingService', () => {
  let loggingService: SecurityLoggingService;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Use fake timers to prevent async timer issues
    jest.useFakeTimers();
    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create service with test configuration
    const testConfig = {
      ...defaultSecurityLoggingConfig,
      backends: {
        console: { enabled: true, level: 'info' as const },
        supabase: { enabled: true, table: 'security_events', retentionDays: 90 }
      }
    };

    loggingService = createSecurityLoggingService(testConfig, mockSupabaseClient);
  });

  afterEach(async () => {
    // Clean up timers to prevent memory leaks and async warnings
    if (loggingService) {
      await loggingService.destroy();
    }
    // Clear all timers and restore real timers
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Security Event Logging', () => {
    it('should log security events successfully', async () => {
      const securityEvent: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-456',
        repositoryId: 'test-org/test-repo',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(),
        details: { loginMethod: 'password' },
        severity: 'low'
      };

      await loggingService.logSecurityEvent(securityEvent);

      // Verify console logging
      expect(consoleLogSpy).toHaveBeenCalled();
      
      // Verify event was buffered for batch processing
      const eventBuffer = (loggingService as any).eventBuffer;
      expect(eventBuffer.length).toBeGreaterThan(0);
    });

    it('should enrich events with metadata', async () => {
      const basicEvent: SecurityEvent = {
        type: 'AUTH_FAILURE',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'medium'
      };

      await loggingService.logSecurityEvent(basicEvent);

      const eventBuffer = (loggingService as any).eventBuffer;
      const enrichedEvent = eventBuffer[eventBuffer.length - 1];

      expect(enrichedEvent.eventId).toBeDefined();
      expect(enrichedEvent.riskScore).toBeDefined();
      expect(enrichedEvent.geoLocation).toBeDefined();
      expect(enrichedEvent.deviceFingerprint).toBeDefined();
    });

    it('should calculate risk scores correctly', async () => {
      const testCases = [
        { type: 'AUTH_SUCCESS', severity: 'low', expectedScore: 5 },
        { type: 'AUTH_FAILURE', severity: 'medium', expectedScore: 45 }, // 30 * 1.5
        { type: 'PERMISSION_ESCALATION', severity: 'critical', expectedScore: 100 }, // 80 * 3, capped at 100
        { type: 'ACCESS_DENIED', severity: 'high', expectedScore: 80 } // 40 * 2
      ];

      for (const testCase of testCases) {
        const event: SecurityEvent = {
          type: testCase.type as any,
          userId: 'user-123',
          sessionId: 'session-456',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: testCase.severity as any
        };

        await loggingService.logSecurityEvent(event);

        const eventBuffer = (loggingService as any).eventBuffer;
        const enrichedEvent = eventBuffer[eventBuffer.length - 1];

        expect(enrichedEvent.riskScore).toBe(testCase.expectedScore);
      }
    });

    it('should handle logging errors gracefully', async () => {
      // Disable the service to test error handling
      const disabledService = createSecurityLoggingService({
        enabled: false,
        backends: {},
        alerting: { 
          enabled: false, 
          thresholds: {
            failedAuthPerMinute: 10,
            accessDeniedPerHour: 50,
            rateLimitHitsPerHour: 100,
            criticalEvents: ['SESSION_HIJACK_DETECTED']
          }, 
          channels: {} 
        },
        metrics: { prometheus: { enabled: false, port: 9090, path: '/metrics' } }
      });

      const event: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      };

      // Should not throw or crash
      await expect(disabledService.logSecurityEvent(event)).resolves.toBeUndefined();
    });
  });

  describe('Metrics Collection and Export', () => {
    it('should collect security metrics', async () => {
      const events: SecurityEvent[] = [
        {
          type: 'AUTH_SUCCESS',
          userId: 'user-1',
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: 'low'
        },
        {
          type: 'AUTH_FAILURE',
          userId: 'user-2',
          sessionId: 'session-2',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: 'medium'
        },
        {
          type: 'ACCESS_DENIED',
          userId: 'user-3',
          sessionId: 'session-3',
          ipAddress: '192.168.1.3',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: 'high'
        }
      ];

      for (const event of events) {
        await loggingService.logSecurityEvent(event);
      }

      const metrics = loggingService.getMetrics();

      expect(metrics.auth.successful).toBe(1);
      expect(metrics.auth.failed).toBe(1);
      expect(metrics.access.denied).toBe(1);
    });

    it('should export Prometheus metrics format', async () => {
      // Log some events first
      await loggingService.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        userId: 'user-1',
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      });

      await loggingService.logSecurityEvent({
        type: 'AUTH_FAILURE',
        userId: 'user-2',
        sessionId: 'session-2',
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'medium'
      });

      const prometheusMetrics = loggingService.exportPrometheusMetrics();

      expect(prometheusMetrics).toContain('codequal_auth_events_total{result="success"} 1');
      expect(prometheusMetrics).toContain('codequal_auth_events_total{result="failure"} 1');
      expect(prometheusMetrics).toContain('# HELP codequal_auth_events_total');
      expect(prometheusMetrics).toContain('# TYPE codequal_auth_events_total counter');
    });

    it('should calculate event rates correctly', async () => {
      const startTime = Date.now();
      
      // Simulate events over time
      for (let i = 0; i < 10; i++) {
        await loggingService.logSecurityEvent({
          type: 'AUTH_SUCCESS',
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(startTime + i * 1000),
          details: {},
          severity: 'low'
        });
      }

      const metrics = loggingService.getMetrics();
      expect(metrics.auth.rate).toBeGreaterThan(0);
    });
  });

  describe('Event Search and Querying', () => {
    let searchService: SecurityLoggingService;
    
    beforeEach(async () => {
      // Create service without Supabase for search tests to use in-memory buffer
      const searchConfig = {
        ...defaultSecurityLoggingConfig,
        backends: {
          console: { enabled: true, level: 'info' as const },
          supabase: { enabled: false, table: 'security_events', retentionDays: 90 }
        }
      };

      searchService = createSecurityLoggingService(searchConfig);
      
      // Populate with test events
      const testEvents = [
        {
          type: 'AUTH_SUCCESS' as const,
          userId: 'user-search-1',
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(Date.now() - 60000), // 1 minute ago
          details: {},
          severity: 'low' as const
        },
        {
          type: 'AUTH_FAILURE' as const,
          userId: 'user-search-1',
          sessionId: 'session-2',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(Date.now() - 30000), // 30 seconds ago
          details: {},
          severity: 'medium' as const
        },
        {
          type: 'ACCESS_DENIED' as const,
          userId: 'user-search-2',
          sessionId: 'session-3',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: 'high' as const
        }
      ];

      for (const event of testEvents) {
        await searchService.logSecurityEvent(event);
      }
    });

    it('should search events by user ID', async () => {
      const results = await searchService.searchEvents({
        userId: 'user-search-1',
        limit: 10
      });

      expect(results.length).toBe(2);
      expect(results.every(event => event.userId === 'user-search-1')).toBe(true);
    });

    it('should search events by type', async () => {
      const results = await searchService.searchEvents({
        type: 'AUTH_FAILURE',
        limit: 10
      });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('AUTH_FAILURE');
    });

    it('should search events by severity', async () => {
      const results = await searchService.searchEvents({
        severity: 'high',
        limit: 10
      });

      expect(results.length).toBe(1);
      expect(results[0].severity).toBe('high');
    });

    it('should search events by time range', async () => {
      const results = await searchService.searchEvents({
        startTime: new Date(Date.now() - 45000), // 45 seconds ago
        endTime: new Date(),
        limit: 10
      });

      expect(results.length).toBe(2); // Should exclude the 1-minute-old event
    });

    it('should limit search results', async () => {
      const results = await searchService.searchEvents({
        limit: 1
      });

      expect(results.length).toBe(1);
    });
  });

  describe('Storage Backend Integration', () => {
    it('should flush events to Supabase', async () => {
      // Configure service with Supabase enabled
      const supabaseConfig = {
        enabled: true,
        backends: {
          supabase: { enabled: true, table: 'security_events', retentionDays: 90 }
        },
        alerting: { 
          enabled: false, 
          thresholds: {
            failedAuthPerMinute: 10,
            accessDeniedPerHour: 50,
            rateLimitHitsPerHour: 100,
            criticalEvents: ['SESSION_HIJACK_DETECTED']
          }, 
          channels: {} 
        },
        metrics: { prometheus: { enabled: false, port: 9090, path: '/metrics' } }
      };

      // Create proper mock for this test
      const insertMock = jest.fn() as jest.MockedFunction<any>;
      insertMock.mockResolvedValue({ error: null });
      
      const flushMockClient = {
        from: jest.fn().mockReturnValue({
          insert: insertMock
        })
      } as any;

      const supabaseService = createSecurityLoggingService(supabaseConfig, flushMockClient);

      await supabaseService.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      });

      // Manually trigger flush
      await (supabaseService as any).flushEventBuffer();

      expect(flushMockClient.from).toHaveBeenCalledWith('security_events');
      expect(insertMock).toHaveBeenCalled();
    });

    it('should handle Supabase errors gracefully', async () => {
      // Mock Supabase error
      const errorSupabaseClient = {
        from: jest.fn(() => ({
          insert: (jest.fn() as any).mockResolvedValue({ 
            error: { message: 'Database connection failed' } 
          }),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: (jest.fn() as any).mockResolvedValue({ error: { message: 'Database connection failed' }, data: null })
        }))
      } as any;

      const supabaseService = createSecurityLoggingService(
        defaultSecurityLoggingConfig, 
        errorSupabaseClient
      );

      await supabaseService.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      });

      // Should not throw, but handle error internally
      await expect((supabaseService as any).flushEventBuffer()).resolves.toBeUndefined();
    });
  });

  describe('Geolocation and Device Fingerprinting', () => {
    it('should detect local IP addresses', async () => {
      const localEvent: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      };

      await loggingService.logSecurityEvent(localEvent);

      const eventBuffer = (loggingService as any).eventBuffer;
      const enrichedEvent = eventBuffer[eventBuffer.length - 1];

      expect(enrichedEvent.geoLocation.country).toBe('Local');
      expect(enrichedEvent.geoLocation.region).toBe('Local');
    });

    it('should parse user agent strings', async () => {
      const testCases = [
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expectedOS: 'Windows',
          expectedBrowser: 'Chrome'
        },
        {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expectedOS: 'macOS',
          expectedBrowser: 'Chrome'
        },
        {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          expectedOS: 'Linux',
          expectedBrowser: 'Chrome'
        }
      ];

      for (const testCase of testCases) {
        const event: SecurityEvent = {
          type: 'AUTH_SUCCESS',
          userId: 'user-123',
          sessionId: 'session-456',
          ipAddress: '192.168.1.1',
          userAgent: testCase.userAgent,
          timestamp: new Date(),
          details: {},
          severity: 'low'
        };

        await loggingService.logSecurityEvent(event);

        const eventBuffer = (loggingService as any).eventBuffer;
        const enrichedEvent = eventBuffer[eventBuffer.length - 1];

        expect(enrichedEvent.deviceFingerprint.os).toBe(testCase.expectedOS);
        expect(enrichedEvent.deviceFingerprint.browser).toBe(testCase.expectedBrowser);
      }
    });
  });

  describe('Background Processing', () => {
    it('should handle batch processing', async () => {
      // Create multiple events
      for (let i = 0; i < 5; i++) {
        await loggingService.logSecurityEvent({
          type: 'AUTH_SUCCESS',
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: 'low'
        });
      }

      const eventBuffer = (loggingService as any).eventBuffer;
      expect(eventBuffer.length).toBe(5);

      // Manually trigger flush
      await (loggingService as any).flushEventBuffer();

      // Buffer should be empty after flush
      expect(eventBuffer.length).toBe(0);
      
      // Ensure no pending async operations
      await (loggingService as any).flushEventBuffer();
    });

    it('should reset rate metrics periodically', () => {
      const service = loggingService as any;
      
      // Set some metrics
      service.metricsBuffer.set('auth_total', 100);
      service.metricsBuffer.set('access_total', 50);

      // Trigger reset
      service.resetRateMetrics();

      // Rate metrics should be cleared
      expect(service.metricsBuffer.get('auth_total')).toBeUndefined();
      expect(service.metricsBuffer.get('access_total')).toBeUndefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should use default configuration correctly', () => {
      const defaultService = createSecurityLoggingService(defaultSecurityLoggingConfig);
      
      expect(defaultSecurityLoggingConfig.enabled).toBe(true);
      expect(defaultSecurityLoggingConfig.backends.console?.enabled).toBe(true);
      expect(defaultSecurityLoggingConfig.metrics.prometheus.enabled).toBe(true);
    });

    it('should use production configuration correctly', () => {
      const prodService = createSecurityLoggingService(productionSecurityLoggingConfig);
      
      expect(productionSecurityLoggingConfig.enabled).toBe(true);
      expect(productionSecurityLoggingConfig.backends.supabase?.enabled).toBe(true);
      expect(productionSecurityLoggingConfig.alerting.enabled).toBe(true);
    });

    it('should handle missing configuration gracefully', () => {
      const minimalConfig = {
        enabled: true,
        backends: {},
        alerting: { 
          enabled: false, 
          thresholds: {
            failedAuthPerMinute: 10,
            accessDeniedPerHour: 50,
            rateLimitHitsPerHour: 100,
            criticalEvents: ['SESSION_HIJACK_DETECTED']
          }, 
          channels: {} 
        },
        metrics: { prometheus: { enabled: false, port: 9090, path: '/metrics' } }
      };

      const service = createSecurityLoggingService(minimalConfig);
      
      // Should create service without errors
      expect(service).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should handle many events without errors', async () => {
      // Create many events to test memory management
      const initialBufferLength = (loggingService as any).eventBuffer.length;
      
      for (let i = 0; i < 100; i++) {
        await loggingService.logSecurityEvent({
          type: 'AUTH_SUCCESS',
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          details: {},
          severity: 'low'
        });
      }

      const eventBuffer = (loggingService as any).eventBuffer;
      
      // Buffer should contain the new events
      expect(eventBuffer.length).toBe(initialBufferLength + 100);
      
      // Service should still be functional
      const metrics = loggingService.getMetrics();
      expect(metrics.auth.successful).toBeGreaterThan(0);
      
      // Manually flush the buffer to prevent async timer issues
      await (loggingService as any).flushEventBuffer();
    });

    it('should clean up old metrics', () => {
      const service = loggingService as any;
      
      // Set old metrics
      service.metricsBuffer.set('old_metric', 100);
      service.metricsBuffer.set('auth_success', 50);
      
      // Verify metrics exist
      expect(service.metricsBuffer.get('old_metric')).toBe(100);
      expect(service.metricsBuffer.get('auth_success')).toBe(50);
      
      // Clean up (this would normally happen automatically)
      service.resetRateMetrics();
      
      // Rate metrics should be cleaned but persistent metrics remain
      expect(service.metricsBuffer.get('auth_success')).toBe(50);
    });
  });
});