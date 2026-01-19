"use strict";
/**
 * Local logger implementation to replace @codequal/core/utils
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(name) {
    return {
        debug: (message, context) => {
            console.log(`[${name}] [DEBUG] ${message}`, context || '');
        },
        info: (message, context) => {
            console.log(`[${name}] [INFO] ${message}`, context || '');
        },
        warn: (message, context) => {
            console.warn(`[${name}] [WARN] ${message}`, context || '');
        },
        error: (message, context) => {
            console.error(`[${name}] [ERROR] ${message}`, context || '');
        }
    };
}
// Re-export for compatibility
exports.default = createLogger;
