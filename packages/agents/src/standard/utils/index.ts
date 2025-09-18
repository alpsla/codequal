// Re-export utilities
export * from './env-loader';
export * from './owasp-mapper';
export * from './markdown-to-html-converter';
export * from './real-data-env-helper';
// Commented out missing files - need to be created or removed
// export { SessionState, SessionMetrics, SessionGoal, Session } from './session-state-manager';
export * from './v8-html-generator';
// export * from './bug-manager';
// export { Bug, BugStatus, BugPriority, BugSeverity, createBug, updateBugStatus, getBugsByStatus } from './bug-tracker-integration';

// Create a simple logger if not already available
export const createLogger = (name: string) => {
  return {
    debug: (message: string, ...args: any[]) => console.debug(`[${name}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.log(`[${name}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[${name}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[${name}] ${message}`, ...args),
  };
};