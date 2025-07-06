/**
 * Central configuration module that handles environment-specific settings
 */

import { isOAuthProviderEnabled, getEnabledOAuthProviders } from './oauth';

export interface AppConfig {
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  api: {
    port: number;
    url: string;
  };
  app: {
    url: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  oauth: {
    enabledProviders: string[];
  };
  features: {
    emailAuth: boolean;
    githubAuth: boolean;
    gitlabAuth: boolean;
  };
  database: {
    url: string;
  };
  redis?: {
    url: string;
  };
  monitoring: {
    sentryDsn?: string;
    logLevel: string;
  };
}

/**
 * Get complete application configuration
 */
export function getConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';
  
  return {
    env,
    isDevelopment,
    isProduction,
    api: {
      port: parseInt(process.env.PORT || '3001', 10),
      url: process.env.API_URL || 'http://localhost:3001',
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    supabase: {
      url: process.env.SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    oauth: {
      enabledProviders: getEnabledOAuthProviders(),
    },
    features: {
      emailAuth: process.env.ENABLE_EMAIL_AUTH !== 'false',
      githubAuth: isOAuthProviderEnabled('github'),
      gitlabAuth: isOAuthProviderEnabled('gitlab'),
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
    redis: process.env.REDIS_URL ? {
      url: process.env.REDIS_URL,
    } : undefined,
    monitoring: {
      sentryDsn: process.env.SENTRY_DSN,
      logLevel: process.env.LOG_LEVEL || 'info',
    },
  };
}

// Export OAuth utilities
export { isOAuthProviderEnabled, getEnabledOAuthProviders };