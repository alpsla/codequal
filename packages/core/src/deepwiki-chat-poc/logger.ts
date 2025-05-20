/**
 * Simple logger for the DeepWiki chat POC
 * This is only used in the POC and will be replaced with a proper logger in production
 */

export const logger = {
  // eslint-disable-next-line no-console
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  // eslint-disable-next-line no-console
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  // eslint-disable-next-line no-console
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  // eslint-disable-next-line no-console
  debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args),
};