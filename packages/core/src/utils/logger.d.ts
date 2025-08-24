/**
 * Logger utility for CodeQual
 */
/**
 * Data that can be logged
 */
export type LoggableData = Error | Record<string, unknown> | string | number | boolean | null | undefined;
/**
 * Logger interface
 */
export interface Logger {
    debug(message: string, data?: LoggableData): void;
    info(message: string, data?: LoggableData): void;
    warn(message: string, data?: LoggableData): void;
    error(message: string, data?: LoggableData): void;
}
/**
 * Create a logger instance
 * @param name Logger name
 * @returns Logger instance
 */
export declare function createLogger(name: string): Logger;
