/**
 * Mock Authentication Service for Testing
 * 
 * Provides a complete mock implementation of AuthenticationService
 * for development and testing purposes.
 */

import { createLogger } from '@codequal/core/utils';
import { 
  AuthenticationService,
  MockAuthenticationService,
  AuthenticatedUser,
  UserPermissions,
  UserRole,
  UserStatus,
  RepositoryAccessResult,
  SecurityEvent,
  AuthenticationError
} from './types/auth';

/**
 * Mock user database for testing
 */
interface MockUserDatabase {
  [userId: string]: {
    user: AuthenticatedUser;
    rateLimits: {
      [operation: string]: {
        count: number;
        resetTime: Date;
      };
    };
  };
}

/**
 * Mock Authentication Service Implementation
 * 
 * Provides full authentication functionality for testing and development
 */
export class MockAuthenticationServiceImpl implements MockAuthenticationService {
  private readonly logger = createLogger('MockAuthenticationService');
  private readonly mockUsers = new Map<string, { user: AuthenticatedUser; rateLimits: { [operation: string]: { count: number; resetTime: Date; }; }; }>();
  private readonly securityEvents: SecurityEvent[] = [];
  
  // Configuration for mock behavior
  private _simulateExpiredSession = false;
  private _simulateInvalidToken = false;
  private rateLimitStatuses: Map<string, boolean> = new Map();

  constructor() {
    // Create some default test users
    this.initializeTestUsers();
  }

  /**
   * Validate a session token and return user context
   */
  async validateSession(
    token: string,
    requestContext: { ipAddress: string; userAgent: string }
  ): Promise<AuthenticatedUser> {
    this.logger.debug('Validating session', { token: token.substring(0, 10) + '...', requestContext });

    // Simulate invalid token
    if (this._simulateInvalidToken || !token || token === 'invalid-token') {
      throw new Error(`${AuthenticationError.INVALID_TOKEN}: Invalid or missing token`);
    }

    // Simulate expired session
    if (this._simulateExpiredSession || token === 'expired-token') {
      throw new Error(`${AuthenticationError.EXPIRED_SESSION}: Session has expired`);
    }

    // Find user by token
    for (const [userId, userData] of this.mockUsers.entries()) {
      if (userData.user.session.token === token) {
        // Update session info with current request
        userData.user.session.ipAddress = requestContext.ipAddress;
        userData.user.session.userAgent = requestContext.userAgent;
        
        // Check if session is expired
        if (new Date() > userData.user.session.expiresAt) {
          throw new Error(`${AuthenticationError.EXPIRED_SESSION}: Session expired at ${userData.user.session.expiresAt}`);
        }

        this.logger.debug('Session validated successfully', { userId, email: userData.user.email });
        return { ...userData.user };
      }
    }

    throw new Error(`${AuthenticationError.INVALID_TOKEN}: Token not found`);
  }

  /**
   * Refresh an expired session using refresh token
   */
  async refreshSession(refreshToken: string): Promise<AuthenticatedUser> {
    this.logger.debug('Refreshing session', { refreshToken: refreshToken.substring(0, 10) + '...' });

    for (const [userId, userData] of this.mockUsers.entries()) {
      if (userData.user.session.refreshToken === refreshToken) {
        // Generate new tokens
        const newToken = `mock-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newRefreshToken = `mock-refresh-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        userData.user.session.token = newToken;
        userData.user.session.refreshToken = newRefreshToken;
        userData.user.session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        this.logger.debug('Session refreshed successfully', { userId });
        return { ...userData.user };
      }
    }

    throw new Error(`${AuthenticationError.SESSION_REFRESH_FAILED}: Invalid refresh token`);
  }

  /**
   * Validate repository access for a user
   */
  async validateRepositoryAccess(
    user: AuthenticatedUser,
    repositoryId: string,
    permission: 'read' | 'write' | 'admin'
  ): Promise<RepositoryAccessResult> {
    this.logger.debug('Validating repository access', { userId: user.id, repositoryId, permission });

    const repositoryPermissions = user.permissions.repositories[repositoryId];
    const granted = repositoryPermissions && repositoryPermissions[permission];

    const result: RepositoryAccessResult = {
      granted: !!granted,
      permissions: repositoryPermissions || { read: false, write: false, admin: false },
      reason: granted ? undefined : `User does not have ${permission} access to repository ${repositoryId}`,
      rateLimit: {
        remaining: user.permissions.quotas.requestsPerHour - 10, // Mock usage
        resetTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        limit: user.permissions.quotas.requestsPerHour
      }
    };

    this.logger.debug('Repository access result', { userId: user.id, repositoryId, granted: result.granted });
    return result;
  }

  /**
   * Log a security event for audit purposes
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.push(event);
    this.logger.info('Security event logged', {
      type: event.type,
      userId: event.userId,
      severity: event.severity,
      timestamp: event.timestamp
    });
  }

  /**
   * Check rate limits for a user
   */
  async checkRateLimit(userId: string, operation: string): Promise<{ allowed: boolean; resetTime: Date }> {
    const userData = this.mockUsers.get(userId);
    if (!userData) {
      return { allowed: false, resetTime: new Date() };
    }

    // Check if rate limit is artificially set
    const isExceeded = this.rateLimitStatuses.get(userId) === true;
    if (isExceeded) {
      return {
        allowed: false,
        resetTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      };
    }

    // Simulate rate limiting logic
    const rateLimitData = userData.rateLimits[operation];
    if (!rateLimitData) {
      userData.rateLimits[operation] = {
        count: 1,
        resetTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      };
      return { allowed: true, resetTime: userData.rateLimits[operation].resetTime };
    }

    // Reset if past reset time
    if (new Date() > rateLimitData.resetTime) {
      rateLimitData.count = 1;
      rateLimitData.resetTime = new Date(Date.now() + 60 * 60 * 1000);
      return { allowed: true, resetTime: rateLimitData.resetTime };
    }

    // Check against quota
    const quota = userData.user.permissions.quotas.requestsPerHour;
    if (rateLimitData.count >= quota) {
      return { allowed: false, resetTime: rateLimitData.resetTime };
    }

    rateLimitData.count++;
    return { allowed: true, resetTime: rateLimitData.resetTime };
  }

  /**
   * Invalidate a user session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    for (const [userId, userData] of this.mockUsers.entries()) {
      if (userData.user.session.fingerprint === sessionId) {
        userData.user.session.expiresAt = new Date(0); // Set to past date
        this.logger.debug('Session invalidated', { userId, sessionId });
        return;
      }
    }
    this.logger.warn('Session not found for invalidation', { sessionId });
  }

  /**
   * Create a test user with specified permissions
   */
  createTestUser(permissions?: Partial<UserPermissions>): AuthenticatedUser {
    const userId = `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const token = `mock-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const refreshToken = `mock-refresh-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const defaultPermissions: UserPermissions = {
      repositories: {
        'test-org/test-repo': { read: true, write: true, admin: false },
        'other-org/other-repo': { read: true, write: false, admin: false }
      },
      organizations: ['test-org'],
      globalPermissions: [],
      quotas: {
        requestsPerHour: 1000,
        maxConcurrentExecutions: 5,
        storageQuotaMB: 1000
      }
    };

    const user: AuthenticatedUser = {
      id: userId,
      email: `${userId}@test.example`,
      name: `Test User ${userId}`,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: { ...defaultPermissions, ...permissions },
      session: {
        token,
        refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        fingerprint: `fingerprint-${userId}`,
        ipAddress: '127.0.0.1',
        userAgent: 'MockAuthService/1.0'
      }
    };

    this.mockUsers.set(userId, {
      user,
      rateLimits: {}
    });

    this.logger.debug('Test user created', { userId, email: user.email });
    return user;
  }

  /**
   * Simulate an expired session for testing
   */
  simulateExpiredSession(): void {
    this._simulateExpiredSession = true;
    this.logger.debug('Expired session simulation enabled');
  }

  /**
   * Simulate an invalid token for testing
   */
  simulateInvalidToken(): void {
    this._simulateInvalidToken = true;
    this.logger.debug('Invalid token simulation enabled');
  }

  /**
   * Set rate limit status for testing
   */
  setRateLimitStatus(userId: string, exceeded: boolean): void {
    this.rateLimitStatuses.set(userId, exceeded);
    this.logger.debug('Rate limit status set', { userId, exceeded });
  }

  /**
   * Get all security events (for testing)
   */
  getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  /**
   * Clear all security events (for testing)
   */
  clearSecurityEvents(): void {
    this.securityEvents.length = 0;
    this.logger.debug('Security events cleared');
  }

  /**
   * Get mock user by ID (for testing)
   */
  getMockUser(userId: string): AuthenticatedUser | undefined {
    return this.mockUsers.get(userId)?.user;
  }

  /**
   * Reset all mock state (for testing)
   */
  reset(): void {
    this.mockUsers.clear();
    this.securityEvents.length = 0;
    this.rateLimitStatuses.clear();
    this._simulateExpiredSession = false;
    this._simulateInvalidToken = false;
    this.initializeTestUsers();
    this.logger.debug('Mock authentication service reset');
  }

  /**
   * Initialize default test users
   */
  private initializeTestUsers(): void {
    // Create admin user
    const adminUser: AuthenticatedUser = {
      id: 'admin-user-123',
      email: 'admin@test.example',
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: {
        repositories: {
          'test-org/test-repo': { read: true, write: true, admin: true },
          'other-org/other-repo': { read: true, write: true, admin: false }
        },
        organizations: ['test-org', 'other-org'],
        globalPermissions: ['admin'],
        quotas: {
          requestsPerHour: 10000,
          maxConcurrentExecutions: 20,
          storageQuotaMB: 10000
        }
      },
      session: {
        token: 'admin-token-123',
        refreshToken: 'admin-refresh-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        fingerprint: 'admin-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'MockAuthService/1.0'
      }
    };

    // Create regular user
    const regularUser: AuthenticatedUser = {
      id: 'user-123',
      email: 'user@test.example',
      name: 'Regular User',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      permissions: {
        repositories: {
          'test-org/test-repo': { read: true, write: false, admin: false }
        },
        organizations: ['test-org'],
        globalPermissions: [],
        quotas: {
          requestsPerHour: 100,
          maxConcurrentExecutions: 2,
          storageQuotaMB: 100
        }
      },
      session: {
        token: 'user-token-123',
        refreshToken: 'user-refresh-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        fingerprint: 'user-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'MockAuthService/1.0'
      }
    };

    this.mockUsers.set('admin-user-123', { user: adminUser, rateLimits: {} });
    this.mockUsers.set('user-123', { user: regularUser, rateLimits: {} });

    this.logger.debug('Default test users initialized', {
      adminUser: adminUser.id,
      regularUser: regularUser.id
    });
  }
}

/**
 * Factory function to create mock authentication service
 */
export function createMockAuthenticationService(): MockAuthenticationService {
  return new MockAuthenticationServiceImpl();
}