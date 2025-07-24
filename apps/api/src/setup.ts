/**
 * Setup file - loads environment variables before any other imports
 * This ensures all configuration is available throughout the application
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config({ path: join(__dirname, '../../../.env') });

// Import createLogger after env vars are loaded
import { createLogger } from '@codequal/core/utils';
const logger = createLogger('api-setup');

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.warn('⚠️  Missing environment variables:', missingVars.join(', '));
  logger.warn('Some features may not work properly without these variables.');
}

// Log startup information
logger.info('🚀 CodeQual API starting...');
logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
logger.info(`🔗 Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);