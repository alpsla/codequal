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
exports.createLogger = void 0;
// Re-export utilities
__exportStar(require("./env-loader"), exports);
__exportStar(require("./owasp-mapper"), exports);
__exportStar(require("./markdown-to-html-converter"), exports);
__exportStar(require("./real-data-env-helper"), exports);
// Commented out missing files - need to be created or removed
// export { SessionState, SessionMetrics, SessionGoal, Session } from './session-state-manager';
__exportStar(require("./v8-html-generator"), exports);
// export * from './bug-manager';
// export { Bug, BugStatus, BugPriority, BugSeverity, createBug, updateBugStatus, getBugsByStatus } from './bug-tracker-integration';
// Create a simple logger if not already available
const createLogger = (name) => {
    return {
        debug: (message, ...args) => console.debug(`[${name}] ${message}`, ...args),
        info: (message, ...args) => console.log(`[${name}] ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[${name}] ${message}`, ...args),
        error: (message, ...args) => console.error(`[${name}] ${message}`, ...args),
    };
};
exports.createLogger = createLogger;
