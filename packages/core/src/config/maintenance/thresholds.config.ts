/**
 * Threshold Configuration Profiles
 * Manages different threshold configurations for various environments
 */

import { CircuitBreakerConfig } from './circuit-breaker.config';
import { GradualRecoveryConfig } from './recovery.config';

/**
 * Complete threshold profile including all maintenance configs
 */
export interface ThresholdProfile {
  name: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  circuitBreaker: CircuitBreakerConfig;
  recovery: GradualRecoveryConfig;
  monitoring: MonitoringThresholds;
}

/**
 * Monitoring thresholds
 */
export interface MonitoringThresholds {
  // Health score thresholds
  healthScoreWarning: number;      // Score below this triggers warning
  healthScoreCritical: number;     // Score below this triggers critical alert
  
  // Performance thresholds
  avgExecutionTimeWarning: number; // ms - triggers warning
  avgExecutionTimeCritical: number; // ms - triggers critical
  
  // Volume thresholds
  minExecutionsForHealth: number;   // Minimum executions to calculate health
  
  // Alert settings
  alertCooldown: number;           // ms - prevent alert spam
  maxAlertsPerHour: number;        // Rate limiting for alerts
}

/**
 * Complete threshold profiles for different environments
 */
export const THRESHOLD_PROFILES: Record<string, ThresholdProfile> = {
  /**
   * Production profile - Strict thresholds with conservative recovery
   */
  production: {
    name: 'Production',
    description: 'Strict thresholds for production environment',
    environment: 'production',
    circuitBreaker: {
      failureThreshold: 3,
      failureRateThreshold: 0.3,
      timeWindow: 30000,
      recoveryTimeout: 600000,
      halfOpenRequests: 2,
      criticalFailureRate: 0.5,
      degradedFailureRate: 0.2,
      volumeThreshold: 10,
      slowCallThreshold: 5000,
      slowCallRateThreshold: 0.5
    },
    recovery: {
      testRequests: 5,
      testTimeout: 30000,
      testDataStrategy: 'sampled',
      successThreshold: 0.8,
      minimumTests: 3,
      timeoutMultiplier: 3,
      maxTimeout: 86400000,
      useRealRequests: true,
      priorityTesting: true,
      concurrentRecovery: false
    },
    monitoring: {
      healthScoreWarning: 70,
      healthScoreCritical: 50,
      avgExecutionTimeWarning: 10000,
      avgExecutionTimeCritical: 20000,
      minExecutionsForHealth: 10,
      alertCooldown: 3600000, // 1 hour
      maxAlertsPerHour: 5
    }
  },
  
  /**
   * Staging profile - Balanced thresholds for testing
   */
  staging: {
    name: 'Staging',
    description: 'Balanced thresholds for staging environment',
    environment: 'staging',
    circuitBreaker: {
      failureThreshold: 5,
      failureRateThreshold: 0.5,
      timeWindow: 60000,
      recoveryTimeout: 300000,
      halfOpenRequests: 3,
      criticalFailureRate: 0.8,
      degradedFailureRate: 0.3,
      volumeThreshold: 5,
      slowCallThreshold: 10000,
      slowCallRateThreshold: 0.7
    },
    recovery: {
      testRequests: 3,
      testTimeout: 15000,
      testDataStrategy: 'sampled',
      successThreshold: 0.8,
      minimumTests: 2,
      timeoutMultiplier: 2,
      maxTimeout: 3600000,
      useRealRequests: false,
      priorityTesting: true,
      concurrentRecovery: true
    },
    monitoring: {
      healthScoreWarning: 60,
      healthScoreCritical: 40,
      avgExecutionTimeWarning: 15000,
      avgExecutionTimeCritical: 30000,
      minExecutionsForHealth: 5,
      alertCooldown: 1800000, // 30 minutes
      maxAlertsPerHour: 10
    }
  },
  
  /**
   * Development profile - Tolerant thresholds for development
   */
  development: {
    name: 'Development',
    description: 'Tolerant thresholds for development environment',
    environment: 'development',
    circuitBreaker: {
      failureThreshold: 20,
      failureRateThreshold: 0.9,
      timeWindow: 300000,
      recoveryTimeout: 60000,
      halfOpenRequests: 10,
      criticalFailureRate: 0.95,
      degradedFailureRate: 0.8,
      volumeThreshold: 1,
      slowCallThreshold: 30000,
      slowCallRateThreshold: 0.95
    },
    recovery: {
      testRequests: 1,
      testTimeout: 5000,
      testDataStrategy: 'simple',
      successThreshold: 1.0,
      minimumTests: 1,
      timeoutMultiplier: 1.5,
      maxTimeout: 300000,
      useRealRequests: false,
      priorityTesting: false,
      concurrentRecovery: true
    },
    monitoring: {
      healthScoreWarning: 40,
      healthScoreCritical: 20,
      avgExecutionTimeWarning: 30000,
      avgExecutionTimeCritical: 60000,
      minExecutionsForHealth: 1,
      alertCooldown: 300000, // 5 minutes
      maxAlertsPerHour: 100
    }
  }
};

/**
 * Environment detection helper
 */
export function detectEnvironment(): keyof typeof THRESHOLD_PROFILES {
  const env = process.env.NODE_ENV || process.env.ENVIRONMENT || 'development';
  
  switch (env.toLowerCase()) {
    case 'production':
    case 'prod':
      return 'production';
    
    case 'staging':
    case 'stage':
    case 'test':
      return 'staging';
    
    default:
      return 'development';
  }
}

/**
 * Get threshold profile for current environment
 */
export function getCurrentThresholdProfile(): ThresholdProfile {
  const environment = detectEnvironment();
  return THRESHOLD_PROFILES[environment];
}

/**
 * Threshold validation
 */
export function validateThresholds(profile: ThresholdProfile): string[] {
  const errors: string[] = [];
  
  // Circuit breaker validations
  if (profile.circuitBreaker.failureRateThreshold > profile.circuitBreaker.criticalFailureRate) {
    errors.push('failureRateThreshold cannot be greater than criticalFailureRate');
  }
  
  if (profile.circuitBreaker.degradedFailureRate > profile.circuitBreaker.failureRateThreshold) {
    errors.push('degradedFailureRate cannot be greater than failureRateThreshold');
  }
  
  // Recovery validations
  if (profile.recovery.minimumTests > profile.recovery.testRequests) {
    errors.push('minimumTests cannot be greater than testRequests');
  }
  
  if (profile.recovery.successThreshold < 0 || profile.recovery.successThreshold > 1) {
    errors.push('successThreshold must be between 0 and 1');
  }
  
  // Monitoring validations
  if (profile.monitoring.healthScoreCritical > profile.monitoring.healthScoreWarning) {
    errors.push('healthScoreCritical cannot be greater than healthScoreWarning');
  }
  
  return errors;
}
