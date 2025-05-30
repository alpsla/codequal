import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SupabaseClientFactory');

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create a Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });

    logger.info('Supabase client initialized', {
      url: supabaseUrl.replace(/https?:\/\/([^.]+).*/, 'https://$1...'),
    });
  }

  return supabaseClient;
}

/**
 * Create a new Supabase client with specific options
 */
export function createSupabaseClient(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
  schema?: string;
}): SupabaseClient {
  const url = options?.supabaseUrl || process.env.SUPABASE_URL;
  const key = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and key are required');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: options?.schema || 'public',
    },
  });
}

/**
 * Reset the singleton client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
  logger.debug('Supabase client reset');
}