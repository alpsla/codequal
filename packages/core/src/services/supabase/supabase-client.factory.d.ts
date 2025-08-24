import { SupabaseClient } from '@supabase/supabase-js';
/**
 * Get or create a Supabase client instance
 */
export declare function getSupabaseClient(): SupabaseClient;
/**
 * Create a new Supabase client with specific options
 */
export declare function createSupabaseClient(options?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    schema?: 'public';
}): SupabaseClient;
/**
 * Reset the singleton client (useful for testing)
 */
export declare function resetSupabaseClient(): void;
