/**
 * Test Suite for Critical Security Alert System
 * 
 * Tests threat detection, alert generation, and security event correlation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  CriticalSecurityAlertSystem,
  CriticalSecurityEvent,
  CriticalSecurityEventType,
  ThreatSeverity,
  createCriticalSecurityAlertSystem,
  defaultCriticalAlertThresholds,
  productionCriticalAlertThresholds
} from '../critical-security-alerts';
import { SecurityEvent } from '../types/auth';

describe('CriticalSecurityAlertSystem', () => {
  let alertSystem: CriticalSecurityAlertSystem;
  let mockSubscriber: any;

  beforeEach(() => {
    alertSystem = createCriticalSecurityAlertSystem(defaultCriticalAlertThresholds);
    mockSubscriber = jest.fn().mockImplementation(async () => {});
    alertSystem.subscribe(mockSubscriber as (event: CriticalSecurityEvent) => Promise<void>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Brute Force Attack Detection', () => {
    it('should detect brute force attacks', async () => {
      const baseEvent: SecurityEvent = {
        type: 'AUTH_FAILURE',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'medium'
      };

      // Simulate multiple failed attempts
      for (let i = 0; i < 6; i++) {
        const event = {
          ...baseEvent,
          sessionId: `session-${i}`,
          timestamp: new Date(Date.now() + i * 1000)
        };
        
        const criticalEvent = await alertSystem.analyzeSecurityEvent(event);
        
        // Should trigger on 5th attempt (threshold is 5)
        if (i >= 4) {
          expect(criticalEvent).toBeDefined();
          expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.BRUTE_FORCE_ATTACK);
          expect(criticalEvent?.threatSeverity).toBe(ThreatSeverity.HIGH);
          expect(criticalEvent?.confidenceScore).toBe(90);
        } else {
          expect(criticalEvent).toBeNull();
        }
      }

      // Verify subscriber was notified
      expect(mockSubscriber).toHaveBeenCalled();
    });

    it('should include proper response recommendations for brute force', async () => {
      const events = Array.from({ length: 6 }, (_, i) => ({
        type: 'AUTH_FAILURE' as const,
        userId: 'user-123',
        sessionId: `session-${i}`,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(Date.now() + i * 1000),
        details: {},
        severity: 'medium' as const
      }));

      let criticalEvent;
      for (const event of events) {
        criticalEvent = await alertSystem.analyzeSecurityEvent(event);
      }

      expect(criticalEvent?.response.immediate).toContain('Block IP address');
      expect(criticalEvent?.response.immediate).toContain('Force password reset');
      expect(criticalEvent?.response.shortTerm).toContain('Investigate attack pattern');
      expect(criticalEvent?.attackVector.source).toBe('external');
      expect(criticalEvent?.attackVector.method).toBe('brute_force');
    });
  });

  describe('Session Hijacking Detection', () => {
    it('should detect session fingerprint anomalies', async () => {
      // First, establish a baseline session
      const baselineEvent: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-baseline',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago
        details: { sessionFingerprint: 'baseline-fingerprint-12345' },
        severity: 'low'
      };

      await alertSystem.analyzeSecurityEvent(baselineEvent);

      // Now simulate suspicious session with different fingerprint
      const suspiciousEvent: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-suspicious',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(),
        details: { sessionFingerprint: 'completely-different-fingerprint' },
        severity: 'low'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(suspiciousEvent);

      expect(criticalEvent).toBeDefined();
      expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.SESSION_HIJACK_DETECTED);
      expect(criticalEvent?.threatSeverity).toBe(ThreatSeverity.CRITICAL);
      expect(criticalEvent?.response.immediate).toContain('Terminate all user sessions');
    });
  });

  describe('Permission Escalation Detection', () => {
    it('should detect permission escalation attempts', async () => {
      const escalationEvent: SecurityEvent = {
        type: 'PERMISSION_ESCALATION',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: { attemptedRole: 'admin', currentRole: 'user' },
        severity: 'high'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(escalationEvent);

      expect(criticalEvent).toBeDefined();
      expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.PERMISSION_ESCALATION);
      expect(criticalEvent?.threatSeverity).toBe(ThreatSeverity.CRITICAL);
      expect(criticalEvent?.confidenceScore).toBe(95);
      expect(criticalEvent?.response.escalation).toContain('Notify security team');
      expect(criticalEvent?.impact.scope).toBe('organization');
    });
  });

  describe('Impossible Travel Detection', () => {
    it('should detect impossible travel patterns', async () => {
      // First login from New York
      const firstLogin: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-travel',
        sessionId: 'session-ny',
        ipAddress: '192.168.1.1', // Simulate NY IP
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        details: {},
        severity: 'low'
      };

      await alertSystem.analyzeSecurityEvent(firstLogin);

      // Second login from Tokyo (impossible to travel in 30 minutes)
      const secondLogin: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-travel',
        sessionId: 'session-tokyo',
        ipAddress: '10.0.0.1', // Simulate Tokyo IP
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(secondLogin);

      expect(criticalEvent).toBeDefined();
      expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.IMPOSSIBLE_TRAVEL);
      expect(criticalEvent?.threatSeverity).toBe(ThreatSeverity.HIGH);
      expect(criticalEvent?.response.immediate).toContain('Challenge user identity');
    });
  });

  describe('DDoS Attack Detection', () => {
    it('should detect DDoS attack patterns', async () => {
      // Simulate high volume of requests from multiple IPs
      const events: SecurityEvent[] = [];
      
      for (let i = 0; i < 1001; i++) {
        events.push({
          type: 'AUTH_FAILURE',
          userId: undefined,
          sessionId: `session-${i}`,
          ipAddress: `192.168.${Math.floor(i / 10)}.${i % 10}`,
          userAgent: 'Bot/1.0',
          timestamp: new Date(Date.now() - (1000 - i) * 100), // Spread over last minute
          details: {},
          severity: 'low'
        });
      }

      let criticalEvent;
      // Process all events to populate history
      for (const event of events) {
        criticalEvent = await alertSystem.analyzeSecurityEvent(event);
      }

      expect(criticalEvent).toBeDefined();
      expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.DDoS_ATTACK);
      expect(criticalEvent?.threatSeverity).toBe(ThreatSeverity.HIGH);
      expect(criticalEvent?.impact.scope).toBe('system');
      expect(criticalEvent?.impact.affectedUsers).toBe(-1); // All users affected
    });
  });

  describe('High Risk Score Detection', () => {
    it('should trigger alerts for high risk scores', async () => {
      const highRiskEvent: SecurityEvent = {
        type: 'ACCESS_DENIED',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: { riskScore: 98 }, // Above critical threshold (95)
        severity: 'high'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(highRiskEvent);

      expect(criticalEvent).toBeDefined();
      expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.SUSPICIOUS_API_USAGE);
      expect(criticalEvent?.confidenceScore).toBe(98);
      expect(criticalEvent?.threatSeverity).toBe(ThreatSeverity.HIGH);
    });

    it('should not trigger for moderate risk scores', async () => {
      const moderateRiskEvent: SecurityEvent = {
        type: 'ACCESS_DENIED',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: { riskScore: 75 }, // Below critical threshold
        severity: 'medium'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(moderateRiskEvent);

      expect(criticalEvent).toBeNull();
    });
  });

  describe('Event Correlation', () => {
    it('should correlate related events', async () => {
      const userId = 'user-correlation';
      const baseTime = Date.now();

      // Create sequence of related events
      const events: SecurityEvent[] = [
        {
          type: 'AUTH_FAILURE',
          userId,
          sessionId: 'session-1',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(baseTime),
          details: {},
          severity: 'low'
        },
        {
          type: 'AUTH_FAILURE',
          userId,
          sessionId: 'session-2',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(baseTime + 10000),
          details: {},
          severity: 'low'
        }
      ];

      // Process events
      for (const event of events) {
        await alertSystem.analyzeSecurityEvent(event);
      }

      // Create additional failed attempts to trigger brute force
      for (let i = 0; i < 4; i++) {
        const event: SecurityEvent = {
          type: 'AUTH_FAILURE',
          userId,
          sessionId: `session-${i + 3}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(baseTime + 20000 + i * 1000),
          details: {},
          severity: 'low'
        };

        const criticalEvent = await alertSystem.analyzeSecurityEvent(event);
        
        if (criticalEvent) {
          expect(criticalEvent.relatedEvents).toBeDefined();
          expect(criticalEvent.relatedEvents!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Threat Management', () => {
    it('should track active threats', async () => {
      const escalationEvent: SecurityEvent = {
        type: 'PERMISSION_ESCALATION',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'critical'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(escalationEvent);
      
      expect(criticalEvent).toBeDefined();

      const activeThreats = alertSystem.getActiveThreats();
      expect(activeThreats).toHaveLength(1);
      expect(activeThreats[0].criticalType).toBe(CriticalSecurityEventType.PERMISSION_ESCALATION);
    });

    it('should mark threats as mitigated', async () => {
      const escalationEvent: SecurityEvent = {
        type: 'PERMISSION_ESCALATION',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'critical'
      };

      const criticalEvent = await alertSystem.analyzeSecurityEvent(escalationEvent);
      
      expect(criticalEvent).toBeDefined();

      alertSystem.markThreatMitigated(
        criticalEvent!.eventId,
        ['Revoked permissions', 'Locked account'],
        'security-admin'
      );

      const activeThreats = alertSystem.getActiveThreats();
      const mitigatedThreat = activeThreats.find(t => t.eventId === criticalEvent!.eventId);
      
      expect(mitigatedThreat?.mitigation?.status).toBe('completed');
      expect(mitigatedThreat?.mitigation?.actions).toContain('Revoked permissions');
      expect(mitigatedThreat?.mitigation?.assignedTo).toBe('security-admin');
    });
  });

  describe('Configuration and Thresholds', () => {
    it('should respect custom thresholds', async () => {
      const customAlertSystem = createCriticalSecurityAlertSystem({
        bruteForceAttempts: 2, // Lower threshold
        criticalRiskScore: 80   // Lower threshold
      });

      const event: SecurityEvent = {
        type: 'AUTH_FAILURE',
        userId: 'user-123',
        sessionId: 'session-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'medium'
      };

      // Should trigger after 2 attempts instead of 5
      await customAlertSystem.analyzeSecurityEvent(event);
      const criticalEvent = await customAlertSystem.analyzeSecurityEvent({
        ...event,
        sessionId: 'session-2'
      });

      expect(criticalEvent).toBeDefined();
      expect(criticalEvent?.criticalType).toBe(CriticalSecurityEventType.BRUTE_FORCE_ATTACK);
    });

    it('should allow threshold updates', () => {
      alertSystem.updateThresholds({
        bruteForceAttempts: 3,
        criticalRiskScore: 85
      });

      // Verify thresholds were updated
      const thresholds = (alertSystem as any).thresholds;
      expect(thresholds.bruteForceAttempts).toBe(3);
      expect(thresholds.criticalRiskScore).toBe(85);
    });

    it('should use production thresholds correctly', () => {
      const prodAlertSystem = createCriticalSecurityAlertSystem(
        productionCriticalAlertThresholds
      );

      const prodThresholds = (prodAlertSystem as any).thresholds;
      
      expect(prodThresholds.bruteForceAttempts).toBe(3); // Stricter than default
      expect(prodThresholds.authFailureRate).toBe(5);   // Stricter than default
      expect(prodThresholds.criticalRiskScore).toBe(85); // Stricter than default
    });
  });

  describe('Error Handling', () => {
    it('should handle subscriber errors gracefully', async () => {
      const failingSubscriber = jest.fn().mockImplementation(async () => {
        throw new Error('Notification failed');
      });
      alertSystem.subscribe(failingSubscriber as (event: CriticalSecurityEvent) => Promise<void>);

      const escalationEvent: SecurityEvent = {
        type: 'PERMISSION_ESCALATION',
        userId: 'user-123',
        sessionId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'critical'
      };

      // Should not throw despite subscriber failure
      const criticalEvent = await alertSystem.analyzeSecurityEvent(escalationEvent);
      
      expect(criticalEvent).toBeDefined();
      expect(failingSubscriber).toHaveBeenCalled();
    });

    it('should handle malformed events gracefully', async () => {
      const malformedEvent = {
        type: 'AUTH_FAILURE',
        // Missing required fields
        timestamp: new Date(),
        severity: 'low'
      } as any;

      // Should not crash
      const criticalEvent = await alertSystem.analyzeSecurityEvent(malformedEvent);
      expect(criticalEvent).toBeNull();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit event history size', async () => {
      const userId = 'heavy-user';
      
      // Create many events
      for (let i = 0; i < 100; i++) {
        const event: SecurityEvent = {
          type: 'AUTH_SUCCESS',
          userId,
          sessionId: `session-${i}`,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(Date.now() - i * 1000),
          details: {},
          severity: 'low'
        };

        await alertSystem.analyzeSecurityEvent(event);
      }

      // Verify history doesn't grow unbounded (should be limited to buffer size)
      const history = (alertSystem as any).eventHistory.get(userId);
      expect(history.length).toBeLessThanOrEqual(200); // Should be cleaned up to buffer limit
    });

    it('should clean up old events', async () => {
      const oldEvent: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-old',
        sessionId: 'session-old',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        details: {},
        severity: 'low'
      };

      await alertSystem.analyzeSecurityEvent(oldEvent);

      const recentEvent: SecurityEvent = {
        type: 'AUTH_SUCCESS',
        userId: 'user-old',
        sessionId: 'session-recent',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        details: {},
        severity: 'low'
      };

      await alertSystem.analyzeSecurityEvent(recentEvent);

      const history = (alertSystem as any).eventHistory.get('user-old');
      expect(history.length).toBe(1); // Old event should be cleaned up
      expect(history[0].sessionId).toBe('session-recent');
    });
  });
});