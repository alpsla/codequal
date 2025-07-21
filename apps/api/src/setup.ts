/**
 * Setup file - loads environment variables before any other imports
 * This ensures all configuration is available throughout the application
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config({ path: join(__dirname, '../../../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
  console.warn('Some features may not work properly without these variables.');
}

// Log startup information
console.log('🚀 CodeQual API starting...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
console.log(`🔗 Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);