"use strict";
/**
 * Logger utility for CodeQual
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
/**
 * Create a logger instance
 * @param name Logger name
 * @returns Logger instance
 */
function createLogger(name) {
    return {
        debug(message, data) {
            if (process.env.DEBUG === 'true') {
                // eslint-disable-next-line no-console
                console.log(`[DEBUG] [${name}]`, message, data !== undefined ? data : '');
            }
        },
        info(message, data) {
            // eslint-disable-next-line no-console
            console.log(`[INFO] [${name}]`, message, data !== undefined ? data : '');
        },
        warn(message, data) {
            console.warn(`[WARN] [${name}]`, message, data !== undefined ? data : '');
        },
        error(message, data) {
            console.error(`[ERROR] [${name}]`, message, data !== undefined ? data : '');
        },
    };
}
