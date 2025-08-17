/**
 * Centralized Environment Variable Loader
 * 
 * This utility ensures environment variables are consistently loaded
 * across all test files and development scripts.
 * 
 * PERMANENT SOLUTION for recurring API key loading issues.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Load environment variables from .env file
 * Searches up the directory tree to find the .env file
 */
export function loadEnvironment(): void {
  // Try multiple possible locations for .env file
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../../../../.env'),
    '/Users/alpinro/Code Prjects/codequal/.env'
  ];

  let envLoaded = false;
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`✅ Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  }

  if (!envLoaded) {
    console.warn('⚠️ No .env file found, using environment variables');
  }

  // Validate critical environment variables
  validateEnvironment();
}

/**
 * Validate that critical environment variables are set
 */
function validateEnvironment(): void {
  const required = [
    'OPENROUTER_API_KEY',
    'DEEPWIKI_API_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work properly');
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  return process.env[key] || fallback || '';
}

/**
 * Get required environment variable (throws if not set)
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get environment configuration object
 */
export function getEnvConfig() {
  return {
    openRouterApiKey: getEnv('OPENROUTER_API_KEY'),
    deepWikiApiUrl: getEnv('DEEPWIKI_API_URL', 'http://localhost:8001'),
    deepWikiApiKey: getEnv('DEEPWIKI_API_KEY', 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'),
    supabaseUrl: getEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseAnonKey: getEnv('SUPABASE_ANON_KEY'),
    redisUrl: getEnv('REDIS_URL'),
    useDeepWikiMock: getEnv('USE_DEEPWIKI_MOCK', 'false') === 'true',
    nodeEnv: getEnv('NODE_ENV', 'development'),
    logLevel: getEnv('LOG_LEVEL', 'info')
  };
}

// Auto-load environment on import
loadEnvironment();

export default {
  loadEnvironment,
  getEnv,
  requireEnv,
  getEnvConfig
};