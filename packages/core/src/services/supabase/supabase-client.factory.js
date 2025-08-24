"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.createSupabaseClient = createSupabaseClient;
exports.resetSupabaseClient = resetSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('SupabaseClientFactory');
let supabaseClient = null;
/**
 * Get or create a Supabase client instance
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
        }
        supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
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
function createSupabaseClient(options) {
    const url = options?.supabaseUrl || process.env.SUPABASE_URL;
    const key = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Supabase URL and key are required');
    }
    return (0, supabase_js_1.createClient)(url, key, {
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
function resetSupabaseClient() {
    supabaseClient = null;
    logger.debug('Supabase client reset');
}
