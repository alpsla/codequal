/**
 * Centralized Environment Variable Loader
 *
 * This utility ensures environment variables are consistently loaded
 * across all test files and development scripts.
 *
 * PERMANENT SOLUTION for recurring API key loading issues.
 */
/**
 * Load environment variables from .env file
 * Searches up the directory tree to find the .env file
 */
export declare function loadEnvironment(): void;
/**
 * Get environment variable with fallback
 */
export declare function getEnv(key: string, fallback?: string): string;
/**
 * Get required environment variable (throws if not set)
 */
export declare function requireEnv(key: string): string;
/**
 * Get environment configuration object
 */
export declare function getEnvConfig(): {
    openRouterApiKey: string;
    deepWikiApiUrl: string;
    deepWikiApiKey: string;
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
    supabaseAnonKey: string;
    redisUrl: string;
    redisUrlPublic: string;
    nodeEnv: string;
    logLevel: string;
};
declare const _default: {
    loadEnvironment: typeof loadEnvironment;
    getEnv: typeof getEnv;
    requireEnv: typeof requireEnv;
    getEnvConfig: typeof getEnvConfig;
};
export default _default;
