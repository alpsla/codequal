"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradualMigrationHelper = exports.MigrationChecker = exports.createLegacyMultiAgentExecutor = exports.LegacyMultiAgentExecutor = exports.productionSecurityLoggingConfig = exports.defaultSecurityLoggingConfig = exports.createSecurityLoggingService = exports.SecurityLoggingService = exports.productionSupabaseAuthConfig = exports.defaultSupabaseAuthConfig = exports.SubscriptionTier = exports.createSupabaseAuthenticationService = exports.SupabaseAuthenticationService = exports.createExpressAuthMiddleware = exports.createMultiAgentAuthMiddleware = exports.MultiAgentAuthMiddleware = exports.createVectorStorageService = exports.VectorStorageService = exports.createVectorContextService = exports.VectorContextService = exports.ReporterAgent = exports.EducationalAgent = exports.ExecutionMonitor = exports.withTimeout = exports.createTimeoutManager = exports.TimeoutManager = exports.ExecutionStrategyFactory = exports.EnhancedMultiAgentExecutor = exports.MultiAgentFactory = void 0;
__exportStar(require("./types"), exports);
var factory_1 = require("./factory");
Object.defineProperty(exports, "MultiAgentFactory", { enumerable: true, get: function () { return factory_1.MultiAgentFactory; } });
__exportStar(require("./registry"), exports);
__exportStar(require("./validator"), exports);
__exportStar(require("./executor"), exports);
// Enhanced Multi-Agent Executor components
var enhanced_executor_1 = require("./enhanced-executor");
Object.defineProperty(exports, "EnhancedMultiAgentExecutor", { enumerable: true, get: function () { return enhanced_executor_1.EnhancedMultiAgentExecutor; } });
var execution_strategies_1 = require("./execution-strategies");
Object.defineProperty(exports, "ExecutionStrategyFactory", { enumerable: true, get: function () { return execution_strategies_1.ExecutionStrategyFactory; } });
var timeout_manager_1 = require("./timeout-manager");
Object.defineProperty(exports, "TimeoutManager", { enumerable: true, get: function () { return timeout_manager_1.TimeoutManager; } });
Object.defineProperty(exports, "createTimeoutManager", { enumerable: true, get: function () { return timeout_manager_1.createTimeoutManager; } });
Object.defineProperty(exports, "withTimeout", { enumerable: true, get: function () { return timeout_manager_1.withTimeout; } });
var execution_monitor_1 = require("./execution-monitor");
Object.defineProperty(exports, "ExecutionMonitor", { enumerable: true, get: function () { return execution_monitor_1.ExecutionMonitor; } });
var educational_agent_1 = require("./educational-agent");
Object.defineProperty(exports, "EducationalAgent", { enumerable: true, get: function () { return educational_agent_1.EducationalAgent; } });
var reporter_agent_1 = require("./reporter-agent");
Object.defineProperty(exports, "ReporterAgent", { enumerable: true, get: function () { return reporter_agent_1.ReporterAgent; } });
var vector_context_service_1 = require("./vector-context-service");
Object.defineProperty(exports, "VectorContextService", { enumerable: true, get: function () { return vector_context_service_1.VectorContextService; } });
Object.defineProperty(exports, "createVectorContextService", { enumerable: true, get: function () { return vector_context_service_1.createVectorContextService; } });
var vector_storage_service_1 = require("./vector-storage-service");
Object.defineProperty(exports, "VectorStorageService", { enumerable: true, get: function () { return vector_storage_service_1.VectorStorageService; } });
Object.defineProperty(exports, "createVectorStorageService", { enumerable: true, get: function () { return vector_storage_service_1.createVectorStorageService; } });
// Authentication and Security
var auth_middleware_1 = require("./auth-middleware");
Object.defineProperty(exports, "MultiAgentAuthMiddleware", { enumerable: true, get: function () { return auth_middleware_1.MultiAgentAuthMiddleware; } });
Object.defineProperty(exports, "createMultiAgentAuthMiddleware", { enumerable: true, get: function () { return auth_middleware_1.createMultiAgentAuthMiddleware; } });
Object.defineProperty(exports, "createExpressAuthMiddleware", { enumerable: true, get: function () { return auth_middleware_1.createExpressAuthMiddleware; } });
// Mock authentication service has been removed - use real implementations
var supabase_auth_service_1 = require("./supabase-auth-service");
Object.defineProperty(exports, "SupabaseAuthenticationService", { enumerable: true, get: function () { return supabase_auth_service_1.SupabaseAuthenticationService; } });
Object.defineProperty(exports, "createSupabaseAuthenticationService", { enumerable: true, get: function () { return supabase_auth_service_1.createSupabaseAuthenticationService; } });
Object.defineProperty(exports, "SubscriptionTier", { enumerable: true, get: function () { return supabase_auth_service_1.SubscriptionTier; } });
Object.defineProperty(exports, "defaultSupabaseAuthConfig", { enumerable: true, get: function () { return supabase_auth_service_1.defaultSupabaseAuthConfig; } });
Object.defineProperty(exports, "productionSupabaseAuthConfig", { enumerable: true, get: function () { return supabase_auth_service_1.productionSupabaseAuthConfig; } });
var security_logging_service_1 = require("./security-logging-service");
Object.defineProperty(exports, "SecurityLoggingService", { enumerable: true, get: function () { return security_logging_service_1.SecurityLoggingService; } });
Object.defineProperty(exports, "createSecurityLoggingService", { enumerable: true, get: function () { return security_logging_service_1.createSecurityLoggingService; } });
Object.defineProperty(exports, "defaultSecurityLoggingConfig", { enumerable: true, get: function () { return security_logging_service_1.defaultSecurityLoggingConfig; } });
Object.defineProperty(exports, "productionSecurityLoggingConfig", { enumerable: true, get: function () { return security_logging_service_1.productionSecurityLoggingConfig; } });
// Legacy Support (Deprecated)
var legacy_executor_1 = require("./legacy-executor");
Object.defineProperty(exports, "LegacyMultiAgentExecutor", { enumerable: true, get: function () { return legacy_executor_1.LegacyMultiAgentExecutor; } });
Object.defineProperty(exports, "createLegacyMultiAgentExecutor", { enumerable: true, get: function () { return legacy_executor_1.createLegacyMultiAgentExecutor; } });
Object.defineProperty(exports, "MigrationChecker", { enumerable: true, get: function () { return legacy_executor_1.MigrationChecker; } });
Object.defineProperty(exports, "GradualMigrationHelper", { enumerable: true, get: function () { return legacy_executor_1.GradualMigrationHelper; } });
// Strategy implementations
__exportStar(require("./execution-strategies"), exports);
// Monitoring and metrics
__exportStar(require("./execution-monitor"), exports);
// Timeout management
__exportStar(require("./timeout-manager"), exports);
