/**
 * MCP Tool Execution Configuration
 * Settings for how tools are executed and managed
 */

export interface ExecutionConfig {
  // Global execution settings
  global: GlobalExecutionConfig;
  
  // Per-tool execution overrides
  toolOverrides: Record<string, Partial<ToolExecutionConfig>>;
  
  // Workspace configuration
  workspace: WorkspaceConfig;
  
  // Resource management
  resources: ResourceConfig;
}

/**
 * Global execution configuration
 */
export interface GlobalExecutionConfig {
  // Execution modes
  defaultMode: 'persistent' | 'on-demand';
  enableParallelExecution: boolean;
  maxParallelTools: number;
  
  // Timeouts
  defaultTimeout: number;        // ms
  maxTimeout: number;           // ms
  timeoutGracePeriod: number;   // ms - additional time for cleanup
  
  // Retries
  enableRetries: boolean;
  maxRetries: number;
  retryDelay: number;           // ms
  retryBackoffMultiplier: number;
  
  // Error handling
  continueOnError: boolean;
  fallbackToLLM: boolean;
  
  // Security
  enableSandbox: boolean;
  sandboxProvider: 'docker' | 'firecracker' | 'gvisor';
}

/**
 * Tool-specific execution configuration
 */
export interface ToolExecutionConfig {
  mode: 'persistent' | 'on-demand';
  timeout: number;
  retries: number;
  priority: number;              // 0-100, higher = more priority
  
  // Resource limits
  maxMemory: number;            // MB
  maxCpu: number;               // percentage
  maxDiskSpace: number;         // MB
  
  // Execution strategy
  batchSize?: number;           // For batched execution
  parallelism?: number;         // Max parallel operations within tool
  
  // Special flags
  requiresNetwork: boolean;
  requiresFileSystem: boolean;
  requiresDocker: boolean;
}

/**
 * Workspace configuration
 */
export interface WorkspaceConfig {
  // Base paths
  basePath: string;
  tempPath: string;
  cachePath: string;
  
  // Workspace management
  cleanupStrategy: 'immediate' | 'delayed' | 'scheduled';
  cleanupDelay: number;         // ms - for delayed cleanup
  maxWorkspaces: number;        // Maximum concurrent workspaces
  workspacePrefix: string;      // Prefix for workspace directories
  
  // File handling
  maxFileSize: number;          // bytes
  allowedFileTypes: string[];   // File extensions
  excludePatterns: string[];    // Glob patterns to exclude
  
  // Repository cloning
  cloneStrategy: 'full' | 'shallow' | 'sparse';
  cloneDepth?: number;          // For shallow clones
  sparseCheckoutPaths?: string[]; // For sparse clones
}

/**
 * Resource configuration
 */
export interface ResourceConfig {
  // Global limits
  maxTotalMemory: number;       // MB - across all tools
  maxTotalCpu: number;          // percentage - across all tools
  maxTotalDiskSpace: number;    // MB - for all workspaces
  
  // Per-user limits
  perUserLimits: {
    maxConcurrentAnalyses: number;
    maxToolsPerAnalysis: number;
    maxExecutionTime: number;   // ms - total time for all tools
    dailyExecutionLimit?: number; // Max executions per day
  };
  
  // Resource allocation strategy
  allocationStrategy: 'fair' | 'priority' | 'adaptive';
  
  // Monitoring
  monitoringInterval: number;   // ms - how often to check resources
  killOnExcess: boolean;        // Kill tools exceeding limits
}

/**
 * Default execution configurations
 */
export const EXECUTION_PROFILES: Record<string, ExecutionConfig> = {
  production: {
    global: {
      defaultMode: 'on-demand',
      enableParallelExecution: true,
      maxParallelTools: 3,
      defaultTimeout: 60000,
      maxTimeout: 300000,
      timeoutGracePeriod: 5000,
      enableRetries: true,
      maxRetries: 2,
      retryDelay: 5000,
      retryBackoffMultiplier: 2,
      continueOnError: true,
      fallbackToLLM: true,
      enableSandbox: true,
      sandboxProvider: 'docker'
    },
    toolOverrides: {
      'sonarqube': {
        mode: 'persistent',
        timeout: 180000,
        maxMemory: 3072,
        requiresNetwork: true
      },
      'perf-analyzer': {
        timeout: 240000,
        maxCpu: 95,
        parallelism: 1
      }
    },
    workspace: {
      basePath: '/var/lib/codequal/workspaces',
      tempPath: '/tmp/codequal',
      cachePath: '/var/cache/codequal',
      cleanupStrategy: 'delayed',
      cleanupDelay: 300000, // 5 minutes
      maxWorkspaces: 20,
      workspacePrefix: 'cq-',
      maxFileSize: 104857600, // 100MB
      allowedFileTypes: ['*'],
      excludePatterns: ['node_modules/**', '.git/objects/**', '*.log'],
      cloneStrategy: 'shallow',
      cloneDepth: 1
    },
    resources: {
      maxTotalMemory: 16384,
      maxTotalCpu: 400,
      maxTotalDiskSpace: 51200,
      perUserLimits: {
        maxConcurrentAnalyses: 2,
        maxToolsPerAnalysis: 5,
        maxExecutionTime: 600000,
        dailyExecutionLimit: 100
      },
      allocationStrategy: 'priority',
      monitoringInterval: 5000,
      killOnExcess: true
    }
  },
  
  development: {
    global: {
      defaultMode: 'on-demand',
      enableParallelExecution: true,
      maxParallelTools: 5,
      defaultTimeout: 120000,
      maxTimeout: 600000,
      timeoutGracePeriod: 10000,
      enableRetries: true,
      maxRetries: 3,
      retryDelay: 2000,
      retryBackoffMultiplier: 1.5,
      continueOnError: true,
      fallbackToLLM: false,
      enableSandbox: false,
      sandboxProvider: 'docker'
    },
    toolOverrides: {},
    workspace: {
      basePath: './workspaces',
      tempPath: './temp',
      cachePath: './cache',
      cleanupStrategy: 'immediate',
      cleanupDelay: 0,
      maxWorkspaces: 50,
      workspacePrefix: 'dev-',
      maxFileSize: 524288000, // 500MB
      allowedFileTypes: ['*'],
      excludePatterns: ['node_modules/**', '.git/objects/**'],
      cloneStrategy: 'full'
    },
    resources: {
      maxTotalMemory: 32768,
      maxTotalCpu: 800,
      maxTotalDiskSpace: 102400,
      perUserLimits: {
        maxConcurrentAnalyses: 10,
        maxToolsPerAnalysis: 10,
        maxExecutionTime: 3600000
      },
      allocationStrategy: 'fair',
      monitoringInterval: 10000,
      killOnExcess: false
    }
  }
};

/**
 * Get execution configuration for current environment
 */
export function getExecutionConfig(
  environment: 'production' | 'development' = 'production'
): ExecutionConfig {
  return EXECUTION_PROFILES[environment];
}

/**
 * Merge tool-specific overrides with global config
 */
export function getToolExecutionConfig(
  toolId: string,
  baseConfig: ExecutionConfig
): ToolExecutionConfig {
  const global = baseConfig.global;
  const override = baseConfig.toolOverrides[toolId] || {};
  
  return {
    mode: override.mode || global.defaultMode,
    timeout: override.timeout || global.defaultTimeout,
    retries: override.retries || global.maxRetries,
    priority: override.priority || 50,
    maxMemory: override.maxMemory || 1024,
    maxCpu: override.maxCpu || 70,
    maxDiskSpace: override.maxDiskSpace || 1024,
    batchSize: override.batchSize,
    parallelism: override.parallelism,
    requiresNetwork: override.requiresNetwork || false,
    requiresFileSystem: override.requiresFileSystem || true,
    requiresDocker: override.requiresDocker || false
  };
}
