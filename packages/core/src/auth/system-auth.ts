/**
 * System Authentication for Automated Processes
 * 
 * Provides authentication for system-level operations like:
 * - Scheduled research runs
 * - Automated maintenance tasks
 * - Background jobs
 */

import { AuthenticatedUser } from '../types';
import { createLogger } from '../utils';

const logger = createLogger('SystemAuth');

/**
 * System user for automated operations
 */
export const SYSTEM_USER: AuthenticatedUser & { isSystemUser: boolean } = {
  id: 'system-researcher-001',
  email: 'system@codequal.com',
  isSystemUser: true
};

/**
 * System authentication service
 */
export class SystemAuthService {
  private static instance: SystemAuthService;
  private systemApiKey: string;
  
  private constructor() {
    // Use environment variable or generate a secure key
    this.systemApiKey = process.env.SYSTEM_API_KEY || this.generateSystemKey();
    logger.info('System authentication service initialized');
  }
  
  static getInstance(): SystemAuthService {
    if (!SystemAuthService.instance) {
      SystemAuthService.instance = new SystemAuthService();
    }
    return SystemAuthService.instance;
  }
  
  /**
   * Validate system API key
   */
  validateSystemKey(apiKey: string): boolean {
    return apiKey === this.systemApiKey;
  }
  
  /**
   * Get system user for automated operations
   */
  getSystemUser(): AuthenticatedUser & { isSystemUser: boolean } {
    return SYSTEM_USER;
  }
  
  /**
   * Generate secure system key
   */
  private generateSystemKey(): string {
    // In production, this should be a secure random key stored in environment
    const key = `sys_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    logger.warn('Generated temporary system key. Set SYSTEM_API_KEY in environment for production');
    return key;
  }
  
  /**
   * Create system authorization header
   */
  getSystemAuthHeader(): { Authorization: string } {
    return {
      Authorization: `System ${this.systemApiKey}`
    };
  }
  
  /**
   * Check if a user is the system user
   */
  isSystemUser(user: AuthenticatedUser): boolean {
    return user.id === SYSTEM_USER.id && 'isSystemUser' in user && (user as { isSystemUser: boolean }).isSystemUser === true;
  }
}