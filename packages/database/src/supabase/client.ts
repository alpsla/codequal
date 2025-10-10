import { createClient, SupabaseClient } from '@supabase/supabase-js';

// TODO: Re-enable typed client after fixing model layer to match actual database schema
// The generated types are available in ./database.types.ts but models need to be updated first
// See: Schema mismatch discovered on 2025-10-09
// - repositories: 'provider' → 'platform', 'private' → 'is_private', missing 'github_id'
// - skill_history: Different field structure entirely
// import type { Database } from './database.types';

// Export placeholder Tables type for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tables = any;

// Singleton instance - using untyped client temporarily
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get Supabase client instance.
 * Creates a new instance if one doesn't exist.
 * 
 * @returns Untyped Supabase client (temporary - models need schema alignment)
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and service role key must be provided in environment variables');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseInstance;
}

/**
 * Initialize Supabase client with specific URL and key.
 * Useful for testing or when environment variables are not available.
 * 
 * @param url - Supabase project URL
 * @param key - Supabase service role key
 * @returns Untyped Supabase client (temporary - models need schema alignment)
 */
export function initSupabase(url: string, key: string): SupabaseClient {
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}
