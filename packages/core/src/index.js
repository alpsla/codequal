"use strict";
/**
 * Core Module
 *
 * Export all core modules for use in other packages
 */
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRole = exports.AgentProvider = exports.ModelVersionSync = exports.createLogger = exports.logging = void 0;
// Logging
exports.logging = __importStar(require("./utils/logger"));
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
// Utils - export for backward compatibility
__exportStar(require("./utils"), exports);
__exportStar(require("./types/evaluation"), exports);
// Export regular exports from ModelVersionSync
var ModelVersionSync_1 = require("./services/model-selection/ModelVersionSync");
Object.defineProperty(exports, "ModelVersionSync", { enumerable: true, get: function () { return ModelVersionSync_1.ModelVersionSync; } });
// Export model version constants
__exportStar(require("./config/models/model-versions"), exports);
// Export model selection services
__exportStar(require("./services/model-selection/RepositoryModelSelectionService"), exports);
__exportStar(require("./services/model-selection/RepositoryCalibrationService"), exports);
__exportStar(require("./services/model-selection/ModelConfigStore"), exports);
// Export agent registry types (single export to avoid duplicates)
var agent_registry_1 = require("./config/agent-registry");
Object.defineProperty(exports, "AgentProvider", { enumerable: true, get: function () { return agent_registry_1.AgentProvider; } });
Object.defineProperty(exports, "AgentRole", { enumerable: true, get: function () { return agent_registry_1.AgentRole; } });
// Services
__exportStar(require("./services/pr-review-service"), exports);
// Monitoring
__exportStar(require("./monitoring/production-monitoring"), exports);
__exportStar(require("./monitoring/enhanced-monitoring-service"), exports);
__exportStar(require("./monitoring/supabase-alert-storage"), exports);
// Authentication
__exportStar(require("./auth/system-auth"), exports);
// Other core modules will be exported here as they are added
//# sourceMappingURL=index.js.map