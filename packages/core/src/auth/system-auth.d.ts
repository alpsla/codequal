/**
 * System Authentication for Automated Processes
 *
 * Provides authentication for system-level operations like:
 * - Scheduled research runs
 * - Automated maintenance tasks
 * - Background jobs
 */
import { AuthenticatedUser } from '../types';
/**
 * System user for automated operations
 */
export declare const SYSTEM_USER: AuthenticatedUser & {
    isSystemUser: boolean;
};
/**
 * System authentication service
 */
export declare class SystemAuthService {
    private static instance;
    private systemApiKey;
    private constructor();
    static getInstance(): SystemAuthService;
    /**
     * Validate system API key
     */
    validateSystemKey(apiKey: string): boolean;
    /**
     * Get system user for automated operations
     */
    getSystemUser(): AuthenticatedUser & {
        isSystemUser: boolean;
    };
    /**
     * Generate secure system key
     */
    private generateSystemKey;
    /**
     * Create system authorization header
     */
    getSystemAuthHeader(): {
        Authorization: string;
    };
    /**
     * Check if a user is the system user
     */
    isSystemUser(user: AuthenticatedUser): boolean;
}
