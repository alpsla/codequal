/**
 * Gradual Recovery Configuration
 * Manages how tools recover from failures and circuit breaker states
 */

export interface GradualRecoveryConfig {
  // Test configuration
  testRequests: number;          // How many test requests to allow
  testTimeout: number;           // Timeout for test requests (ms)
  testDataStrategy: 'simple' | 'sampled' | 'synthetic';
  
  // Success criteria
  successThreshold: number;      // Required success rate (0-1)
  minimumTests: number;          // Minimum tests before evaluation
  
  // Timeout progression
  timeoutMultiplier: number;     // How much to increase timeout on failure
  maxTimeout: number;            // Maximum timeout between attempts (ms)
  
  // Advanced options
  useRealRequests: boolean;      // Use actual user requests as tests
  priorityTesting: boolean;      // Test high-priority tools first
  concurrentRecovery: boolean;   // Allow multiple tools to recover simultaneously
}

/**
 * Predefined recovery profiles for different environments
 */
export const RECOVERY_PROFILES: Record<string, GradualRecoveryConfig> = {
  /**
   * Aggressive recovery - for development environments
   * Quick recovery attempts with minimal testing
   */
  aggressive: {
    testRequests: 1,
    testTimeout: 5000,
    testDataStrategy: 'simple',
    successThreshold: 1.0,
    minimumTests: 1,
    timeoutMultiplier: 1.5,
    maxTimeout: 300000, // 5 minutes max
    useRealRequests: false,
    priorityTesting: false,
    concurrentRecovery: true
  },
  
  /**
   * Balanced recovery - for staging environments
   * Moderate testing with reasonable timeouts
   */
  balanced: {
    testRequests: 3,
    testTimeout: 15000,
    testDataStrategy: 'sampled',
    successThreshold: 0.8,
    minimumTests: 2,
    timeoutMultiplier: 2,
    maxTimeout: 3600000, // 1 hour max
    useRealRequests: false,
    priorityTesting: true,
    concurrentRecovery: true
  },
  
  /**
   * Conservative recovery - for production environments
   * Thorough testing with extended timeouts
   */
  conservative: {
    testRequests: 5,
    testTimeout: 30000,
    testDataStrategy: 'sampled',
    successThreshold: 0.8,
    minimumTests: 3,
    timeoutMultiplier: 3,
    maxTimeout: 86400000, // 24 hours max
    useRealRequests: true,
    priorityTesting: true,
    concurrentRecovery: false
  },
  
  /**
   * Custom recovery - for specific tool requirements
   * Can be overridden per tool
   */
  custom: {
    testRequests: 3,
    testTimeout: 20000,
    testDataStrategy: 'synthetic',
    successThreshold: 0.9,
    minimumTests: 3,
    timeoutMultiplier: 2.5,
    maxTimeout: 43200000, // 12 hours max
    useRealRequests: false,
    priorityTesting: true,
    concurrentRecovery: true
  }
};

/**
 * Tool-specific recovery overrides
 * These override the default profile for specific tools
 */
export const TOOL_RECOVERY_OVERRIDES: Record<string, Partial<GradualRecoveryConfig>> = {
  // ESLint might have network issues, so be more tolerant
  'eslint-mcp': {
    testRequests: 5,
    successThreshold: 0.6,
    timeoutMultiplier: 1.5
  },
  
  // SonarQube is critical and expensive, be more conservative
  'sonarqube': {
    testRequests: 10,
    successThreshold: 0.9,
    timeoutMultiplier: 4,
    maxTimeout: 172800000 // 48 hours max
  },
  
  // Documentation service is less critical, recover quickly
  'mcp-docs-service': {
    testRequests: 2,
    successThreshold: 0.5,
    timeoutMultiplier: 1.2,
    maxTimeout: 600000 // 10 minutes max
  }
};

/**
 * Get recovery configuration for a specific tool
 */
export function getToolRecoveryConfig(
  toolId: string,
  baseProfile: keyof typeof RECOVERY_PROFILES = 'balanced'
): GradualRecoveryConfig {
  const baseConfig = RECOVERY_PROFILES[baseProfile];
  const overrides = TOOL_RECOVERY_OVERRIDES[toolId] || {};
  
  return {
    ...baseConfig,
    ...overrides
  };
}

/**
 * Timeout progression calculator
 */
export class TimeoutProgressionCalculator {
  private baseTimeouts = [
    5 * 60 * 1000,     // 1st recovery: 5 minutes
    15 * 60 * 1000,    // 2nd recovery: 15 minutes
    60 * 60 * 1000,    // 3rd recovery: 1 hour
    6 * 60 * 60 * 1000 // 4th+ recovery: 6 hours
  ];
  
  constructor(private config: GradualRecoveryConfig) {}
  
  /**
   * Calculate next timeout based on failure count
   */
  getNextTimeout(failureCount: number): number {
    const baseTimeout = this.baseTimeouts[
      Math.min(failureCount - 1, this.baseTimeouts.length - 1)
    ];
    
    // Apply multiplier for each failure
    const multipliedTimeout = baseTimeout * Math.pow(
      this.config.timeoutMultiplier,
      Math.max(0, failureCount - this.baseTimeouts.length)
    );
    
    // Cap at max timeout
    return Math.min(multipliedTimeout, this.config.maxTimeout);
  }
  
  /**
   * Get human-readable timeout string
   */
  formatTimeout(ms: number): string {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  }
}
