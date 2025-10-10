export type Tables = any;
/**
 * Get Supabase client instance.
 * Creates a new instance if one doesn't exist.
 *
 * @returns Untyped Supabase client (temporary - models need schema alignment)
 */
export declare function getSupabase(): any;
/**
 * Initialize Supabase client with specific URL and key.
 * Useful for testing or when environment variables are not available.
 *
 * @param url - Supabase project URL
 * @param key - Supabase service role key
 * @returns Untyped Supabase client (temporary - models need schema alignment)
 */
export declare function initSupabase(url: string, key: string): any;
//# sourceMappingURL=client.d.ts.map