/**
 * Circuit Breaker Configuration
 * Manages automatic tool disabling based on failure thresholds
 */

export interface CircuitBreakerConfig {
  // Failure thresholds
  failureThreshold: number;          // Number of failures before opening circuit
  failureRateThreshold: number;      // Failure rate (0-1) before opening circuit
  timeWindow: number;                // Time window for failure calculation (ms)
  
  // Recovery settings
  recoveryTimeout: number;           // Time before attempting recovery (ms)
  halfOpenRequests: number;          // Number of test requests in half-open state
  
  // Escalation thresholds
  criticalFailureRate: number;       // Rate for permanent disable (0-1)
  degradedFailureRate: number;       // Rate for temporary disable (0-1)
  
  // Additional settings
  volumeThreshold?: number;          // Minimum requests before evaluating
  slowCallThreshold?: number;        // Response time to consider "slow" (ms)
  slowCallRateThreshold?: number;    // Rate of slow calls to trigger (0-1)
}

/**
 * Circuit states
 */
export enum CircuitState {
  CLOSED = 'closed',        // Normal operation
  OPEN = 'open',           // Tool disabled
  HALF_OPEN = 'half-open', // Testing recovery
  DISABLED = 'disabled'    // Permanently disabled
}

/**
 * Predefined circuit breaker profiles
 */
export const CIRCUIT_BREAKER_PROFILES: Record<string, CircuitBreakerConfig> = {
  /**
   * Strict profile - Low tolerance for failures
   * Use in production for critical tools
   */
  strict: {
    failureThreshold: 3,
    failureRateThreshold: 0.3,      // 30% failure rate
    timeWindow: 30000,              // 30 seconds
    recoveryTimeout: 600000,        // 10 minutes
    halfOpenRequests: 2,
    criticalFailureRate: 0.5,       // 50% = permanent disable
    degradedFailureRate: 0.2,       // 20% = temporary disable
    volumeThreshold: 10,
    slowCallThreshold: 5000,        // 5 seconds
    slowCallRateThreshold: 0.5      // 50% slow calls
  },
  
  /**
   * Balanced profile - Default balanced approach
   * Use in staging or less critical production tools
   */
  balanced: {
    failureThreshold: 5,
    failureRateThreshold: 0.5,      // 50% failure rate
    timeWindow: 60000,              // 1 minute
    recoveryTimeout: 300000,        // 5 minutes
    halfOpenRequests: 3,
    criticalFailureRate: 0.8,       // 80% = permanent disable
    degradedFailureRate: 0.3,       // 30% = temporary disable
    volumeThreshold: 5,
    slowCallThreshold: 10000,       // 10 seconds
    slowCallRateThreshold: 0.7      // 70% slow calls
  },
  
  /**
   * Tolerant profile - Higher tolerance for failures
   * Use in development or for less stable tools
   */
  tolerant: {
    failureThreshold: 10,
    failureRateThreshold: 0.7,      // 70% failure rate
    timeWindow: 120000,             // 2 minutes
    recoveryTimeout: 180000,        // 3 minutes
    halfOpenRequests: 5,
    criticalFailureRate: 0.9,       // 90% = permanent disable
    degradedFailureRate: 0.5,       // 50% = temporary disable
    volumeThreshold: 3,
    slowCallThreshold: 20000,       // 20 seconds
    slowCallRateThreshold: 0.9      // 90% slow calls
  },
  
  /**
   * Development profile - Very tolerant for testing
   * Use only in development environments
   */
  development: {
    failureThreshold: 20,
    failureRateThreshold: 0.9,      // 90% failure rate
    timeWindow: 300000,             // 5 minutes
    recoveryTimeout: 60000,         // 1 minute
    halfOpenRequests: 10,
    criticalFailureRate: 0.95,      // 95% = permanent disable
    degradedFailureRate: 0.8,       // 80% = temporary disable
    volumeThreshold: 1,
    slowCallThreshold: 30000,       // 30 seconds
    slowCallRateThreshold: 0.95     // 95% slow calls
  }
};

/**
 * Tool-specific circuit breaker overrides
 */
export const TOOL_CIRCUIT_OVERRIDES: Record<string, Partial<CircuitBreakerConfig>> = {
  // Security tools need stricter thresholds
  'mcp-scan': {
    failureThreshold: 2,
    failureRateThreshold: 0.2,
    criticalFailureRate: 0.4
  },
  
  'semgrep-mcp': {
    failureThreshold: 3,
    failureRateThreshold: 0.25,
    criticalFailureRate: 0.5
  },
  
  // Performance tools might be slower
  'perf-analyzer': {
    slowCallThreshold: 30000,  // 30 seconds
    slowCallRateThreshold: 0.8
  },
  
  // Git operations might have network delays
  'git-mcp': {
    failureRateThreshold: 0.6,
    slowCallThreshold: 15000,
    recoveryTimeout: 120000  // 2 minutes
  }
};

/**
 * Circuit breaker action types
 */
export interface CircuitAction {
  type: 'none' | 'open_circuit' | 'close_circuit' | 'disable_permanent' | 'increase_timeout';
  reason: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recoveryTime?: number;
  suggestedTimeout?: number;
}

/**
 * Circuit statistics
 */
export interface CircuitStats {
  totalExecutions: number;
  failures: number;
  failureRate: number;
  timeoutRate: number;
  avgExecutionTime: number;
  lastFailure?: {
    timestamp: number;
    error?: string;
  };
}

/**
 * Get circuit breaker configuration for a specific tool
 */
export function getToolCircuitConfig(
  toolId: string,
  baseProfile: keyof typeof CIRCUIT_BREAKER_PROFILES = 'balanced'
): CircuitBreakerConfig {
  const baseConfig = CIRCUIT_BREAKER_PROFILES[baseProfile];
  const overrides = TOOL_CIRCUIT_OVERRIDES[toolId] || {};
  
  return {
    ...baseConfig,
    ...overrides
  };
}

/**
 * Circuit breaker state transition rules
 */
export const CIRCUIT_STATE_TRANSITIONS = {
  [CircuitState.CLOSED]: {
    canTransitionTo: [CircuitState.OPEN, CircuitState.DISABLED],
    conditions: {
      [CircuitState.OPEN]: 'Failure threshold exceeded',
      [CircuitState.DISABLED]: 'Critical failure rate exceeded'
    }
  },
  [CircuitState.OPEN]: {
    canTransitionTo: [CircuitState.HALF_OPEN, CircuitState.DISABLED],
    conditions: {
      [CircuitState.HALF_OPEN]: 'Recovery timeout elapsed',
      [CircuitState.DISABLED]: 'Multiple recovery failures'
    }
  },
  [CircuitState.HALF_OPEN]: {
    canTransitionTo: [CircuitState.CLOSED, CircuitState.OPEN],
    conditions: {
      [CircuitState.CLOSED]: 'Recovery tests successful',
      [CircuitState.OPEN]: 'Recovery tests failed'
    }
  },
  [CircuitState.DISABLED]: {
    canTransitionTo: [CircuitState.CLOSED],
    conditions: {
      [CircuitState.CLOSED]: 'Manual intervention'
    }
  }
};
