/**
 * Maintenance Configuration Module
 * Central export for all maintenance-related configurations
 */

export * from './circuit-breaker.config';
export * from './recovery.config';
export * from './thresholds.config';
export * from './monitoring.config';

// Re-export commonly used functions
export { getToolCircuitConfig } from './circuit-breaker.config';
export { getToolRecoveryConfig } from './recovery.config';
export { getCurrentThresholdProfile, detectEnvironment } from './thresholds.config';

// Export a convenience function to get all configs for a tool
import { CircuitBreakerConfig } from './circuit-breaker.config';
import { GradualRecoveryConfig } from './recovery.config';
import { MonitoringConfig } from './monitoring.config';
import { getCurrentThresholdProfile } from './thresholds.config';

export interface ToolMaintenanceConfig {
  toolId: string;
  circuitBreaker: CircuitBreakerConfig;
  recovery: GradualRecoveryConfig;
  monitoring: MonitoringConfig;
}

/**
 * Get complete maintenance configuration for a tool
 */
export function getToolMaintenanceConfig(toolId: string): ToolMaintenanceConfig {
  const profile = getCurrentThresholdProfile();
  
  return {
    toolId,
    circuitBreaker: profile.circuitBreaker,
    recovery: profile.recovery,
    monitoring: profile.environment === 'production' 
      ? MONITORING_PROFILES.production 
      : MONITORING_PROFILES.development
  };
}

// Import for the function above
import { MONITORING_PROFILES } from './monitoring.config';
