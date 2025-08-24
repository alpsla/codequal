"use strict";
/**
 * System Authentication for Automated Processes
 *
 * Provides authentication for system-level operations like:
 * - Scheduled research runs
 * - Automated maintenance tasks
 * - Background jobs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemAuthService = exports.SYSTEM_USER = void 0;
const utils_1 = require("../utils");
const logger = (0, utils_1.createLogger)('SystemAuth');
/**
 * System user for automated operations
 */
exports.SYSTEM_USER = {
    id: 'system-researcher-001',
    email: 'system@codequal.com',
    isSystemUser: true
};
/**
 * System authentication service
 */
class SystemAuthService {
    constructor() {
        // Use environment variable or generate a secure key
        this.systemApiKey = process.env.SYSTEM_API_KEY || this.generateSystemKey();
        logger.info('System authentication service initialized');
    }
    static getInstance() {
        if (!SystemAuthService.instance) {
            SystemAuthService.instance = new SystemAuthService();
        }
        return SystemAuthService.instance;
    }
    /**
     * Validate system API key
     */
    validateSystemKey(apiKey) {
        return apiKey === this.systemApiKey;
    }
    /**
     * Get system user for automated operations
     */
    getSystemUser() {
        return exports.SYSTEM_USER;
    }
    /**
     * Generate secure system key
     */
    generateSystemKey() {
        // In production, this should be a secure random key stored in environment
        const key = `sys_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        logger.warn('Generated temporary system key. Set SYSTEM_API_KEY in environment for production');
        return key;
    }
    /**
     * Create system authorization header
     */
    getSystemAuthHeader() {
        return {
            Authorization: `System ${this.systemApiKey}`
        };
    }
    /**
     * Check if a user is the system user
     */
    isSystemUser(user) {
        return user.id === exports.SYSTEM_USER.id && 'isSystemUser' in user && user.isSystemUser === true;
    }
}
exports.SystemAuthService = SystemAuthService;
