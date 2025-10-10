"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabase = getSupabase;
exports.initSupabase = initSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
// Singleton instance - using untyped client temporarily
let supabaseInstance = null;
/**
 * Get Supabase client instance.
 * Creates a new instance if one doesn't exist.
 *
 * @returns Untyped Supabase client (temporary - models need schema alignment)
 */
function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL and service role key must be provided in environment variables');
        }
        supabaseInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
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
function initSupabase(url, key) {
    supabaseInstance = (0, supabase_js_1.createClient)(url, key);
    return supabaseInstance;
}
//# sourceMappingURL=client.js.map