export * from './types';
export { MultiAgentFactory } from './factory';
export * from './registry';
export * from './validator';
export * from './executor';

// Enhanced Multi-Agent Executor components
export { EnhancedMultiAgentExecutor } from './enhanced-executor';
export { ExecutionStrategyFactory } from './execution-strategies';
export { TimeoutManager, createTimeoutManager, withTimeout } from './timeout-manager';
export { ExecutionMonitor } from './execution-monitor';
export { EducationalAgent } from './educational-agent';
export { VectorContextService, createVectorContextService } from './vector-context-service';
export { VectorStorageService, createVectorStorageService } from './vector-storage-service';

// Authentication and Security
export { 
  MultiAgentAuthMiddleware, 
  createMultiAgentAuthMiddleware,
  createExpressAuthMiddleware 
} from './auth-middleware';
export { 
  MockAuthenticationServiceImpl,
  createMockAuthenticationService 
} from './mock-auth-service';
export {
  SupabaseAuthenticationService,
  createSupabaseAuthenticationService,
  SubscriptionTier,
  defaultSupabaseAuthConfig,
  productionSupabaseAuthConfig
} from './supabase-auth-service';
export {
  SecurityLoggingService,
  createSecurityLoggingService,
  defaultSecurityLoggingConfig,
  productionSecurityLoggingConfig
} from './security-logging-service';

// Legacy Support (Deprecated)
export { 
  LegacyMultiAgentExecutor,
  createLegacyMultiAgentExecutor,
  MigrationChecker,
  GradualMigrationHelper
} from './legacy-executor';

// Strategy implementations
export * from './execution-strategies';

// Monitoring and metrics
export * from './execution-monitor';

// Timeout management
export * from './timeout-manager';
