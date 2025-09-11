"use strict";
/**
 * Centralized Environment Variable Loader
 *
 * This utility ensures environment variables are consistently loaded
 * across all test files and development scripts.
 *
 * PERMANENT SOLUTION for recurring API key loading issues.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvironment = loadEnvironment;
exports.getEnv = getEnv;
exports.requireEnv = requireEnv;
exports.getEnvConfig = getEnvConfig;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Load environment variables from .env file
 * Searches up the directory tree to find the .env file
 */
function loadEnvironment() {
    // Try multiple possible locations for .env file
    const possiblePaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '../../.env'),
        path.resolve(__dirname, '../../../../../.env'),
        '/Users/alpinro/Code Prjects/codequal/.env'
    ];
    let envLoaded = false;
    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.log(`✅ Environment loaded from: ${envPath}`);
            envLoaded = true;
            break;
        }
    }
    if (!envLoaded) {
        console.warn('⚠️ No .env file found, using environment variables');
    }
    // Validate critical environment variables
    validateEnvironment();
}
/**
 * Validate that critical environment variables are set
 */
function validateEnvironment() {
    const required = [
        'OPENROUTER_API_KEY',
        'DEEPWIKI_API_URL',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
    ];
    const missing = [];
    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
        console.warn('Some features may not work properly');
    }
}
/**
 * Get environment variable with fallback
 */
function getEnv(key, fallback) {
    return process.env[key] || fallback || '';
}
/**
 * Get required environment variable (throws if not set)
 */
function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}
/**
 * Get environment configuration object
 */
function getEnvConfig() {
    return {
        openRouterApiKey: getEnv('OPENROUTER_API_KEY'),
        deepWikiApiUrl: getEnv('DEEPWIKI_API_URL', 'http://localhost:8001'),
        deepWikiApiKey: getEnv('DEEPWIKI_API_KEY', 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'),
        supabaseUrl: getEnv('SUPABASE_URL'),
        supabaseServiceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
        supabaseAnonKey: getEnv('SUPABASE_ANON_KEY'),
        redisUrl: getEnv('REDIS_URL'),
        redisUrlPublic: getEnv('REDIS_URL_PUBLIC'),
        nodeEnv: getEnv('NODE_ENV', 'development'),
        logLevel: getEnv('LOG_LEVEL', 'info')
    };
}
// Auto-load environment on import
loadEnvironment();
exports.default = {
    loadEnvironment,
    getEnv,
    requireEnv,
    getEnvConfig
};
