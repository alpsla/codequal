/**
 * Supabase Authentication Service
 * 
 * Complete authentication integration with Supabase Auth for user account management,
 * subscription tiers, and company-level repository access controls.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import { 
  AuthenticatedUser, 
  AuthenticationService, 
  UserPermissions, 
  UserRole, 
  UserStatus,
  UserSession,
  RepositoryPermission,
  RepositoryAccessResult,
  SecurityEvent,
  AuthenticationError
} from './types/auth';

/**
 * Subscription tier definitions
 */
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro', 
  ENTERPRISE = 'enterprise'
}

/**
 * Company/Organization structure
 */
export interface Organization {
  id: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  memberCount: number;
  repositoryAccess: {
    [repositoryId: string]: {
      accessLevel: 'read' | 'write' | 'admin';
      grantedAt: Date;
      grantedBy: string;
    };
  };
  quotas: {
    maxMembers: number;
    maxRepositories: number;
    requestsPerHour: number;
    storageQuotaGB: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Supabase authentication configuration
 */
export interface SupabaseAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey?: string;
  
  /** JWT settings */
  jwt: {
    secret: string;
    expiresIn: string; // e.g., '24h'
  };
  
  /** Session settings */
  session: {
    maxAge: number; // hours
    refreshThreshold: number; // hours before expiry to auto-refresh
    fingerprinting: boolean;
  };
  
  /** Subscription tier limits */
  tierLimits: {
    [SubscriptionTier.FREE]: {
      maxOrganizations: number;
      maxRepositories: number;
      requestsPerHour: number;
      storageQuotaGB: number;
      maxMembers: number;
    };
    [SubscriptionTier.PRO]: {
      maxOrganizations: number;
      maxRepositories: number;
      requestsPerHour: number;
      storageQuotaGB: number;
      maxMembers: number;
    };
    [SubscriptionTier.ENTERPRISE]: {
      maxOrganizations: number;
      maxRepositories: number;
      requestsPerHour: number;
      storageQuotaGB: number;
      maxMembers: number;
    };
  };
}

/**
 * User profile with subscription information
 */
interface UserProfile {
  id: string;
  email: string;
  name?: string;
  subscriptionTier: SubscriptionTier;
  organizations: string[];
  primaryOrganizationId?: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
  metadata: Record<string, any>;
}

/**
 * Rate limiting state
 */
interface RateLimitState {
  userId: string;
  operation: string;
  count: number;
  resetTime: Date;
  lastRequest: Date;
}

/**
 * Supabase Authentication Service Implementation
 */
export class SupabaseAuthenticationService implements AuthenticationService {
  private readonly logger = createLogger('SupabaseAuthenticationService');
  private readonly supabase: SupabaseClient;
  private readonly config: SupabaseAuthConfig;
  private readonly rateLimitCache = new Map<string, RateLimitState>();
  private readonly sessionCache = new Map<string, AuthenticatedUser>();

  constructor(config: SupabaseAuthConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    
    this.logger.info('Supabase authentication service initialized', {
      url: config.supabaseUrl.replace(/\/\/(.+?)@/, '//***@'), // Hide credentials
      sessionMaxAge: config.session.maxAge,
      fingerprintingEnabled: config.session.fingerprinting
    });
  }

  /**
   * Validate session token and return authenticated user
   */
  async validateSession(
    token: string, 
    requestContext: { ipAddress: string; userAgent: string }
  ): Promise<AuthenticatedUser> {
    try {
      // Check session cache first
      if (this.sessionCache.has(token)) {
        const cachedUser = this.sessionCache.get(token)!;
        if (cachedUser.session.expiresAt > new Date()) {
          return cachedUser;
        } else {
          this.sessionCache.delete(token);
        }
      }

      // Verify JWT token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new Error(AuthenticationError.INVALID_TOKEN);
      }

      // Get user profile with subscription information
      const userProfile = await this.getUserProfile(user.id);
      if (!userProfile) {
        throw new Error(AuthenticationError.INVALID_TOKEN);
      }

      // Check account status
      if (userProfile.status !== UserStatus.ACTIVE) {
        throw new Error(`ACCOUNT_SUSPENDED: ${userProfile.status}`);
      }

      // Get user permissions based on organizations and subscriptions
      const permissions = await this.getUserPermissions(userProfile);

      // Create session with fingerprinting
      const session = await this.createUserSession(token, requestContext, userProfile);

      // Build authenticated user
      const authenticatedUser: AuthenticatedUser = {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        organizationId: userProfile.primaryOrganizationId,
        permissions,
        session,
        role: userProfile.role,
        status: userProfile.status,
        metadata: {
          ...userProfile.metadata,
          subscriptionTier: userProfile.subscriptionTier,
          lastLoginAt: userProfile.lastLoginAt
        }
      };

      // Cache the session
      this.sessionCache.set(token, authenticatedUser);

      // Update last login time
      await this.updateLastLogin(userProfile.id);

      this.logger.info('Session validated successfully', {
        userId: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        tier: userProfile.subscriptionTier
      });

      return authenticatedUser;

    } catch (error) {
      this.logger.warn('Session validation failed', {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: requestContext.ipAddress
      });
      throw error;
    }
  }

  /**
   * Refresh expired session using refresh token
   */
  async refreshSession(refreshToken: string): Promise<AuthenticatedUser> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session || !data.user) {
        throw new Error(AuthenticationError.SESSION_REFRESH_FAILED);
      }

      // Clear old session from cache
      this.sessionCache.forEach((user, token) => {
        if (user.id === data.user!.id) {
          this.sessionCache.delete(token);
        }
      });

      // Create new authenticated user with refreshed session
      return this.validateSession(data.session.access_token, {
        ipAddress: '0.0.0.0', // Will be updated on next request
        userAgent: 'refresh-token'
      });

    } catch (error) {
      this.logger.error('Session refresh failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate repository access for user
   */
  async validateRepositoryAccess(
    user: AuthenticatedUser,
    repositoryId: string,
    permission: RepositoryPermission
  ): Promise<RepositoryAccessResult> {
    try {
      // Check direct repository permissions
      const repositoryPermissions = user.permissions.repositories[repositoryId];
      
      if (!repositoryPermissions) {
        return {
          granted: false,
          permissions: { read: false, write: false, admin: false },
          reason: 'No access to repository',
          rateLimit: await this.getRateLimitInfo(user.id)
        };
      }

      // Check specific permission
      const hasPermission = repositoryPermissions[permission];
      
      if (!hasPermission) {
        return {
          granted: false,
          permissions: repositoryPermissions,
          reason: `Insufficient permissions: ${permission} access required`,
          rateLimit: await this.getRateLimitInfo(user.id)
        };
      }

      // Check subscription limits for the organization
      const organization = await this.getOrganization(user.organizationId);
      if (organization) {
        const tierLimits = this.config.tierLimits[organization.subscriptionTier];
        const repositoryCount = Object.keys(organization.repositoryAccess).length;
        
        if (repositoryCount >= tierLimits.maxRepositories) {
          return {
            granted: false,
            permissions: repositoryPermissions,
            reason: `Organization repository limit exceeded (${tierLimits.maxRepositories})`,
            rateLimit: await this.getRateLimitInfo(user.id)
          };
        }
      }

      return {
        granted: true,
        permissions: repositoryPermissions,
        rateLimit: await this.getRateLimitInfo(user.id)
      };

    } catch (error) {
      this.logger.error('Repository access validation failed', {
        userId: user.id,
        repositoryId,
        permission,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        granted: false,
        permissions: { read: false, write: false, admin: false },
        reason: 'Access validation error',
        rateLimit: await this.getRateLimitInfo(user.id)
      };
    }
  }

  /**
   * Log security event to Supabase
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('security_events')
        .insert({
          type: event.type,
          user_id: event.userId,
          session_id: event.sessionId,
          repository_id: event.repositoryId,
          agent_role: event.agentRole,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          timestamp: event.timestamp.toISOString(),
          details: event.details,
          severity: event.severity
        });

      if (error) {
        this.logger.error('Failed to log security event', { error });
      }

    } catch (error) {
      this.logger.error('Security event logging error', {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check rate limits for user
   */
  async checkRateLimit(
    userId: string, 
    operation: string
  ): Promise<{ allowed: boolean; resetTime: Date }> {
    const now = new Date();
    const rateLimitKey = `${userId}:${operation}`;
    
    // Get user's tier limits
    const user = await this.getUserProfile(userId);
    if (!user) {
      return { allowed: false, resetTime: new Date(now.getTime() + 60 * 60 * 1000) };
    }

    const organization = await this.getOrganization(user.primaryOrganizationId);
    const tierLimits = organization 
      ? this.config.tierLimits[organization.subscriptionTier]
      : this.config.tierLimits[SubscriptionTier.FREE];

    // Check current rate limit state
    let rateLimitState = this.rateLimitCache.get(rateLimitKey);
    
    if (!rateLimitState || rateLimitState.resetTime <= now) {
      // Create new rate limit window
      rateLimitState = {
        userId,
        operation,
        count: 0,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
        lastRequest: now
      };
    }

    // Check if within limits
    if (rateLimitState.count >= tierLimits.requestsPerHour) {
      return { allowed: false, resetTime: rateLimitState.resetTime };
    }

    // Increment counter
    rateLimitState.count++;
    rateLimitState.lastRequest = now;
    this.rateLimitCache.set(rateLimitKey, rateLimitState);

    return { allowed: true, resetTime: rateLimitState.resetTime };
  }

  /**
   * Invalidate user session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      // Remove from cache
      this.sessionCache.forEach((user, token) => {
        if (user.session.fingerprint === sessionId) {
          this.sessionCache.delete(token);
        }
      });

      // Sign out from Supabase
      await this.supabase.auth.signOut();

      this.logger.info('Session invalidated', { sessionId });

    } catch (error) {
      this.logger.error('Session invalidation failed', {
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create user account with subscription tier
   */
  async createUser(
    email: string,
    password: string,
    subscriptionTier: SubscriptionTier = SubscriptionTier.FREE,
    organizationName?: string
  ): Promise<{ user: AuthenticatedUser; organization?: Organization }> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (authError || !authData.user) {
        throw new Error(`User creation failed: ${authError?.message}`);
      }

      // Create user profile
      const userProfile: Partial<UserProfile> = {
        id: authData.user.id,
        email,
        subscriptionTier,
        organizations: [],
        status: UserStatus.PENDING_VERIFICATION,
        role: UserRole.USER,
        createdAt: new Date(),
        metadata: {}
      };

      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert(userProfile);

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // Create organization if specified
      let organization: Organization | undefined;
      if (organizationName) {
        organization = await this.createOrganization(
          organizationName,
          subscriptionTier,
          authData.user.id
        );
        
        // Update user profile with organization
        await this.supabase
          .from('user_profiles')
          .update({
            organizations: [organization.id],
            primaryOrganizationId: organization.id
          })
          .eq('id', authData.user.id);
      }

      this.logger.info('User created successfully', {
        userId: authData.user.id,
        email,
        tier: subscriptionTier,
        organizationId: organization?.id
      });

      // Return authenticated user (session will be created on first login)
      const authenticatedUser: AuthenticatedUser = {
        id: authData.user.id,
        email,
        organizationId: organization?.id,
        permissions: await this.getDefaultPermissions(subscriptionTier),
        session: {
          token: 'pending',
          expiresAt: new Date(),
          fingerprint: 'pending',
          ipAddress: '0.0.0.0',
          userAgent: 'registration'
        },
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        metadata: { subscriptionTier }
      };

      return { user: authenticatedUser, organization };

    } catch (error) {
      this.logger.error('User creation failed', {
        email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Grant repository access to organization
   */
  async grantRepositoryAccess(
    organizationId: string,
    repositoryId: string,
    accessLevel: 'read' | 'write' | 'admin',
    grantedBy: string
  ): Promise<void> {
    try {
      const organization = await this.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check subscription limits
      const tierLimits = this.config.tierLimits[organization.subscriptionTier];
      const currentRepoCount = Object.keys(organization.repositoryAccess).length;
      
      if (currentRepoCount >= tierLimits.maxRepositories) {
        throw new Error(`Repository limit exceeded (${tierLimits.maxRepositories})`);
      }

      // Update organization repository access
      const updatedRepositoryAccess = {
        ...organization.repositoryAccess,
        [repositoryId]: {
          accessLevel,
          grantedAt: new Date(),
          grantedBy
        }
      };

      const { error } = await this.supabase
        .from('organizations')
        .update({
          repository_access: updatedRepositoryAccess,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId);

      if (error) {
        throw new Error(`Failed to grant repository access: ${error.message}`);
      }

      // Clear cached sessions for organization members
      this.clearOrganizationCache(organizationId);

      this.logger.info('Repository access granted', {
        organizationId,
        repositoryId,
        accessLevel,
        grantedBy
      });

    } catch (error) {
      this.logger.error('Failed to grant repository access', {
        organizationId,
        repositoryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user profile from Supabase
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      subscriptionTier: data.subscription_tier,
      organizations: data.organizations || [],
      primaryOrganizationId: data.primary_organization_id,
      status: data.status,
      role: data.role,
      createdAt: new Date(data.created_at),
      lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
      metadata: data.metadata || {}
    };
  }

  /**
   * Get organization details
   */
  private async getOrganization(organizationId?: string): Promise<Organization | null> {
    if (!organizationId) return null;

    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      subscriptionTier: data.subscription_tier,
      memberCount: data.member_count,
      repositoryAccess: data.repository_access || {},
      quotas: data.quotas,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Get user permissions based on organizations and subscriptions
   */
  private async getUserPermissions(userProfile: UserProfile): Promise<UserPermissions> {
    const repositories: UserPermissions['repositories'] = {};
    
    // Get permissions from all user organizations
    for (const orgId of userProfile.organizations) {
      const organization = await this.getOrganization(orgId);
      if (organization) {
        // Add repository permissions from organization
        Object.entries(organization.repositoryAccess).forEach(([repoId, access]) => {
          repositories[repoId] = {
            read: ['read', 'write', 'admin'].includes(access.accessLevel),
            write: ['write', 'admin'].includes(access.accessLevel),
            admin: access.accessLevel === 'admin'
          };
        });
      }
    }

    // Get tier-based quotas
    const organization = await this.getOrganization(userProfile.primaryOrganizationId);
    const tierLimits = organization 
      ? this.config.tierLimits[organization.subscriptionTier]
      : this.config.tierLimits[userProfile.subscriptionTier];

    return {
      repositories,
      organizations: userProfile.organizations,
      globalPermissions: this.getGlobalPermissions(userProfile.role),
      quotas: {
        requestsPerHour: tierLimits.requestsPerHour,
        maxConcurrentExecutions: Math.ceil(tierLimits.requestsPerHour / 100),
        storageQuotaMB: tierLimits.storageQuotaGB * 1024
      }
    };
  }

  /**
   * Create user session with security features
   */
  private async createUserSession(
    token: string,
    requestContext: { ipAddress: string; userAgent: string },
    userProfile: UserProfile
  ): Promise<UserSession> {
    const expiresAt = new Date(Date.now() + this.config.session.maxAge * 60 * 60 * 1000);
    
    // Create session fingerprint
    const fingerprint = this.config.session.fingerprinting
      ? this.generateSessionFingerprint(requestContext, userProfile.id)
      : `session-${Date.now()}`;

    return {
      token,
      expiresAt,
      fingerprint,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent
    };
  }

  /**
   * Generate session fingerprint for security
   */
  private generateSessionFingerprint(
    requestContext: { ipAddress: string; userAgent: string },
    userId: string
  ): string {
    const components = [
      userId,
      requestContext.ipAddress,
      requestContext.userAgent,
      Date.now().toString()
    ];
    
    return Buffer.from(components.join('|')).toString('base64').substring(0, 32);
  }

  /**
   * Get global permissions based on user role
   */
  private getGlobalPermissions(role: UserRole): string[] {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return ['*'];
      case UserRole.ADMIN:
        return ['user_management', 'organization_management'];
      case UserRole.ORG_OWNER:
        return ['organization_management'];
      default:
        return [];
    }
  }

  /**
   * Get default permissions for subscription tier
   */
  private async getDefaultPermissions(tier: SubscriptionTier): Promise<UserPermissions> {
    const tierLimits = this.config.tierLimits[tier];
    
    return {
      repositories: {},
      organizations: [],
      globalPermissions: [],
      quotas: {
        requestsPerHour: tierLimits.requestsPerHour,
        maxConcurrentExecutions: Math.ceil(tierLimits.requestsPerHour / 100),
        storageQuotaMB: tierLimits.storageQuotaGB * 1024
      }
    };
  }

  /**
   * Create organization with subscription tier
   */
  private async createOrganization(
    name: string,
    subscriptionTier: SubscriptionTier,
    ownerId: string
  ): Promise<Organization> {
    const tierLimits = this.config.tierLimits[subscriptionTier];
    
    const organizationData = {
      name,
      subscription_tier: subscriptionTier,
      member_count: 1,
      repository_access: {},
      quotas: {
        maxMembers: tierLimits.maxMembers,
        maxRepositories: tierLimits.maxRepositories,
        requestsPerHour: tierLimits.requestsPerHour,
        storageQuotaGB: tierLimits.storageQuotaGB
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_id: ownerId
    };

    const { data, error } = await this.supabase
      .from('organizations')
      .insert(organizationData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Organization creation failed: ${error?.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      subscriptionTier: data.subscription_tier,
      memberCount: data.member_count,
      repositoryAccess: data.repository_access || {},
      quotas: data.quotas,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Update user last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);
  }

  /**
   * Get rate limit info for user
   */
  private async getRateLimitInfo(userId: string): Promise<{
    remaining: number;
    resetTime: Date;
    limit: number;
  }> {
    const rateLimitKey = `${userId}:multi-agent-execution`;
    const rateLimitState = this.rateLimitCache.get(rateLimitKey);
    
    const user = await this.getUserProfile(userId);
    const organization = await this.getOrganization(user?.primaryOrganizationId);
    const tierLimits = organization 
      ? this.config.tierLimits[organization.subscriptionTier]
      : this.config.tierLimits[SubscriptionTier.FREE];

    if (!rateLimitState) {
      return {
        remaining: tierLimits.requestsPerHour,
        resetTime: new Date(Date.now() + 60 * 60 * 1000),
        limit: tierLimits.requestsPerHour
      };
    }

    return {
      remaining: Math.max(0, tierLimits.requestsPerHour - rateLimitState.count),
      resetTime: rateLimitState.resetTime,
      limit: tierLimits.requestsPerHour
    };
  }

  /**
   * Clear cached sessions for organization members
   */
  private clearOrganizationCache(organizationId: string): void {
    this.sessionCache.forEach((user, token) => {
      if (user.organizationId === organizationId) {
        this.sessionCache.delete(token);
      }
    });
  }
}

/**
 * Factory function to create Supabase authentication service
 */
export function createSupabaseAuthenticationService(
  config: SupabaseAuthConfig
): SupabaseAuthenticationService {
  return new SupabaseAuthenticationService(config);
}

/**
 * Default configuration for development
 */
export const defaultSupabaseAuthConfig: Partial<SupabaseAuthConfig> = {
  jwt: {
    secret: process.env.SUPABASE_JWT_SECRET || 'development-secret',
    expiresIn: '24h'
  },
  session: {
    maxAge: 24, // 24 hours
    refreshThreshold: 2, // refresh 2 hours before expiry
    fingerprinting: true
  },
  tierLimits: {
    [SubscriptionTier.FREE]: {
      maxOrganizations: 1,
      maxRepositories: 3,
      requestsPerHour: 100,
      storageQuotaGB: 1,
      maxMembers: 3
    },
    [SubscriptionTier.PRO]: {
      maxOrganizations: 5,
      maxRepositories: 50,
      requestsPerHour: 1000,
      storageQuotaGB: 50,
      maxMembers: 25
    },
    [SubscriptionTier.ENTERPRISE]: {
      maxOrganizations: -1, // unlimited
      maxRepositories: -1, // unlimited
      requestsPerHour: 10000,
      storageQuotaGB: 500,
      maxMembers: -1 // unlimited
    }
  }
};

/**
 * Production configuration template
 */
export const productionSupabaseAuthConfig: Partial<SupabaseAuthConfig> = {
  jwt: {
    secret: process.env.SUPABASE_JWT_SECRET!,
    expiresIn: '8h'
  },
  session: {
    maxAge: 8, // 8 hours for production
    refreshThreshold: 1, // refresh 1 hour before expiry
    fingerprinting: true
  },
  tierLimits: {
    [SubscriptionTier.FREE]: {
      maxOrganizations: 1,
      maxRepositories: 2,
      requestsPerHour: 50,
      storageQuotaGB: 0.5,
      maxMembers: 2
    },
    [SubscriptionTier.PRO]: {
      maxOrganizations: 3,
      maxRepositories: 25,
      requestsPerHour: 500,
      storageQuotaGB: 25,
      maxMembers: 15
    },
    [SubscriptionTier.ENTERPRISE]: {
      maxOrganizations: -1,
      maxRepositories: -1,
      requestsPerHour: 5000,
      storageQuotaGB: 250,
      maxMembers: -1
    }
  }
};