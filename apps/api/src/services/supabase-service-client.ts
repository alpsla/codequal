/**
 * Supabase Service Client
 * 
 * Creates a Supabase client with service role credentials to bypass RLS
 * This should only be used for backend operations that need full database access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('supabase-service-client');

let serviceClient: SupabaseClient | null = null;

/**
 * Get or create a Supabase client with service role credentials
 * This bypasses RLS and should only be used for trusted backend operations
 */
export function getServiceClient(): SupabaseClient | null {
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    logger.warn('Supabase service credentials not found in environment');
    return null;
  }

  try {
    serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.info('Supabase service client created successfully');
    return serviceClient;
  } catch (error) {
    logger.error('Failed to create Supabase service client:', error as Error);
    return null;
  }
}

/**
 * Test if service client can bypass RLS
 */
export async function testServiceAccess(): Promise<boolean> {
  const client = getServiceClient();
  if (!client) {
    logger.warn('No service client available');
    return false;
  }

  try {
    // Try to count rows in organization_memberships without RLS restrictions
    const { count, error } = await client
      .from('organization_memberships')
      .select('*', { count: 'exact', head: true });

    if (error) {
      logger.error('Service client query failed:', error);
      return false;
    }

    logger.info(`Service client can access organization_memberships (${count} rows)`);
    return true;
  } catch (error) {
    logger.error('Service client test failed:', error as Error);
    return false;
  }
}