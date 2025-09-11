/**
 * Authentication types for Vector DB Multi-Agent System
 * 
 * These types define the authentication and authorization model
 * for secure multi-tenant operations across the agent system.
 */

/**
 * User permissions for repository and organization access
 */
export interface UserPermissions {
  /** Repository-specific permissions */
  repositories: {
    [repositoryId: string]: {
      read: boolean;
      write: boolean;
      admin: boolean;
    };
  };
  
  /** Organization memberships */
  organizations: string[];
  
  /** Global permissions for system-wide operations */
  globalPermissions: string[];
  
  /** Rate limiting quotas */
  quotas: {
    /** Max requests per hour */
    requestsPerHour: number;
    /** Max concurrent executions */
    maxConcurrentExecutions: number;
    /** Max storage per month (MB) */
    storageQuotaMB: number;
  };
}

/**
 * User session information
 */
export interface UserSession {
  /** JWT access token */
  token: string;
  
  /** Token expiration timestamp */
  expiresAt: Date;
  
  /** Refresh token for session renewal */
  refreshToken?: string;
  
  /** Session fingerprint for security validation */
  fingerprint: string;
  
  /** IP address for session binding */
  ipAddress: string;
  
  /** User agent for session tracking */
  userAgent: string;
}

/**
 * Authenticated user context with full security information
 */
export interface AuthenticatedUser {
  /** Unique user identifier */
  id: string;
  
  /** User email address */
  email: string;
  
  /** Display name */
  name?: string;
  
  /** Primary organization ID */
  organizationId?: string;
  
  /** User permissions and access rights */
  permissions: UserPermissions;
  
  /** Active session information */
  session: UserSession;
  
  /** User role for role-based access control */
  role: UserRole;
  
  /** Account status */
  status: UserStatus;
  
  /** Metadata for extended user information */
  metadata?: Record<string, any>;
}

/**
 * User roles for role-based access control
 */
export enum UserRole {
  /** Regular user with standard permissions */
  USER = 'user',
  
  /** Administrator with elevated permissions */
  ADMIN = 'admin',
  
  /** System administrator with full access */
  SYSTEM_ADMIN = 'system_admin',
  
  /** Organization owner with org-level admin rights */
  ORG_OWNER = 'org_owner',
  
  /** Organization member with team permissions */
  ORG_MEMBER = 'org_member',
  
  /** Service account for automated operations */
  SERVICE_ACCOUNT = 'service_account'
}

/**
 * User account status
 */
export enum UserStatus {
  /** Active account */
  ACTIVE = 'active',
  
  /** Suspended account */
  SUSPENDED = 'suspended',
  
  /** Pending email verification */
  PENDING_VERIFICATION = 'pending_verification',
  
  /** Password reset required */
  PASSWORD_RESET_REQUIRED = 'password_reset_required',
  
  /** Account locked due to security issues */
  LOCKED = 'locked'
}

/**
 * Authentication error types
 */
export enum AuthenticationError {
  /** Invalid or malformed token */
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  /** Token has expired */
  EXPIRED_SESSION = 'EXPIRED_SESSION',
  
  /** User lacks required permissions */
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  /** Access to repository denied */
  REPOSITORY_ACCESS_DENIED = 'REPOSITORY_ACCESS_DENIED',
  
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  /** Failed to refresh session */
  SESSION_REFRESH_FAILED = 'SESSION_REFRESH_FAILED',
  
  /** Account is suspended or locked */
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  
  /** Session fingerprint mismatch */
  SESSION_HIJACK_DETECTED = 'SESSION_HIJACK_DETECTED'
}

/**
 * Permission types for repository operations
 */
export type RepositoryPermission = 'read' | 'write' | 'admin';

/**
 * Security event types for audit logging
 */
export interface SecurityEvent {
  /** Event type for categorization */
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'ACCESS_DENIED' | 'PERMISSION_ESCALATION' | 'SESSION_EXPIRED' | 'RATE_LIMIT_HIT';
  
  /** User ID if available */
  userId?: string;
  
  /** Session identifier */
  sessionId: string;
  
  /** Repository being accessed */
  repositoryId?: string;
  
  /** Agent role involved */
  agentRole?: string;
  
  /** Client IP address */
  ipAddress: string;
  
  /** User agent string */
  userAgent: string;
  
  /** Event timestamp */
  timestamp: Date;
  
  /** Additional event details */
  details: Record<string, any>;
  
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Authentication context for service operations
 */
export interface AuthenticationContext {
  /** Authenticated user */
  user: AuthenticatedUser;
  
  /** Request metadata */
  request: {
    /** Request ID for tracing */
    requestId: string;
    
    /** IP address */
    ipAddress: string;
    
    /** User agent */
    userAgent: string;
    
    /** Request timestamp */
    timestamp: Date;
  };
  
  /** Security validation results */
  validation: {
    /** Token is valid */
    tokenValid: boolean;
    
    /** Session is active */
    sessionActive: boolean;
    
    /** Permissions loaded */
    permissionsLoaded: boolean;
    
    /** Rate limit status */
    withinRateLimit: boolean;
  };
}

/**
 * Repository access validation result
 */
export interface RepositoryAccessResult {
  /** Access is granted */
  granted: boolean;
  
  /** Specific permissions available */
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
  
  /** Reason for denial if access not granted */
  reason?: string;
  
  /** Rate limiting information */
  rateLimit: {
    /** Requests remaining in current window */
    remaining: number;
    
    /** Rate limit reset time */
    resetTime: Date;
    
    /** Current limit per hour */
    limit: number;
  };
}

/**
 * Authentication service interface
 */
export interface AuthenticationService {
  /**
   * Validate a session token and return user context
   */
  validateSession(token: string, requestContext: { ipAddress: string; userAgent: string }): Promise<AuthenticatedUser>;
  
  /**
   * Refresh an expired session using refresh token
   */
  refreshSession(refreshToken: string): Promise<AuthenticatedUser>;
  
  /**
   * Validate repository access for a user
   */
  validateRepositoryAccess(
    user: AuthenticatedUser, 
    repositoryId: string, 
    permission: RepositoryPermission
  ): Promise<RepositoryAccessResult>;
  
  /**
   * Log a security event for audit purposes
   */
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  
  /**
   * Check rate limits for a user
   */
  checkRateLimit(userId: string, operation: string): Promise<{ allowed: boolean; resetTime: Date }>;
  
  /**
   * Invalidate a user session
   */
  invalidateSession(sessionId: string): Promise<void>;
}

/**
 * Mock authentication service for testing
 */
export interface MockAuthenticationService extends AuthenticationService {
  /**
   * Create a test user with specified permissions
   */
  createTestUser(permissions?: Partial<UserPermissions>): AuthenticatedUser;
  
  /**
   * Simulate an expired session for testing
   */
  simulateExpiredSession(): void;
  
  /**
   * Simulate an invalid token for testing
   */
  simulateInvalidToken(): void;
  
  /**
   * Set rate limit status for testing
   */
  setRateLimitStatus(userId: string, exceeded: boolean): void;
}