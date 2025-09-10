/**
 * Supabase Authentication Service
 *
 * Complete authentication integration with Supabase Auth for user account management,
 * subscription tiers, and company-level repository access controls.
 */
import { AuthenticatedUser, AuthenticationService, RepositoryPermission, RepositoryAccessResult, SecurityEvent } from './types/auth';
/**
 * Subscription tier definitions
 */
export declare enum SubscriptionTier {
    FREE = "free",
    PRO = "pro",
    ENTERPRISE = "enterprise"
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
        expiresIn: string;
    };
    /** Session settings */
    session: {
        maxAge: number;
        refreshThreshold: number;
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
 * Supabase Authentication Service Implementation
 */
export declare class SupabaseAuthenticationService implements AuthenticationService {
    private readonly logger;
    private readonly supabase;
    private readonly config;
    private readonly rateLimitCache;
    private readonly sessionCache;
    constructor(config: SupabaseAuthConfig);
    /**
     * Validate session token and return authenticated user
     */
    validateSession(token: string, requestContext: {
        ipAddress: string;
        userAgent: string;
    }): Promise<AuthenticatedUser>;
    /**
     * Refresh expired session using refresh token
     */
    refreshSession(refreshToken: string): Promise<AuthenticatedUser>;
    /**
     * Validate repository access for user
     */
    validateRepositoryAccess(user: AuthenticatedUser, repositoryId: string, permission: RepositoryPermission): Promise<RepositoryAccessResult>;
    /**
     * Log security event to Supabase
     */
    logSecurityEvent(event: SecurityEvent): Promise<void>;
    /**
     * Check rate limits for user
     */
    checkRateLimit(userId: string, operation: string): Promise<{
        allowed: boolean;
        resetTime: Date;
    }>;
    /**
     * Invalidate user session
     */
    invalidateSession(sessionId: string): Promise<void>;
    /**
     * Create user account with subscription tier
     */
    createUser(email: string, password: string, subscriptionTier?: SubscriptionTier, organizationName?: string): Promise<{
        user: AuthenticatedUser;
        organization?: Organization;
    }>;
    /**
     * Grant repository access to organization
     */
    grantRepositoryAccess(organizationId: string, repositoryId: string, accessLevel: 'read' | 'write' | 'admin', grantedBy: string): Promise<void>;
    /**
     * Get user profile from Supabase
     */
    private getUserProfile;
    /**
     * Get organization details
     */
    private getOrganization;
    /**
     * Get user permissions based on organizations and subscriptions
     */
    private getUserPermissions;
    /**
     * Create user session with security features
     */
    private createUserSession;
    /**
     * Generate session fingerprint for security
     */
    private generateSessionFingerprint;
    /**
     * Get global permissions based on user role
     */
    private getGlobalPermissions;
    /**
     * Get default permissions for subscription tier
     */
    private getDefaultPermissions;
    /**
     * Create organization with subscription tier
     */
    private createOrganization;
    /**
     * Update user last login timestamp
     */
    private updateLastLogin;
    /**
     * Get rate limit info for user
     */
    private getRateLimitInfo;
    /**
     * Clear cached sessions for organization members
     */
    private clearOrganizationCache;
}
/**
 * Factory function to create Supabase authentication service
 */
export declare function createSupabaseAuthenticationService(config: SupabaseAuthConfig): SupabaseAuthenticationService;
/**
 * Default configuration for development
 */
export declare const defaultSupabaseAuthConfig: Partial<SupabaseAuthConfig>;
/**
 * Production configuration template
 */
export declare const productionSupabaseAuthConfig: Partial<SupabaseAuthConfig>;
