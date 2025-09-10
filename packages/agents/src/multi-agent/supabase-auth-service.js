"use strict";
/**
 * Supabase Authentication Service
 *
 * Complete authentication integration with Supabase Auth for user account management,
 * subscription tiers, and company-level repository access controls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionSupabaseAuthConfig = exports.defaultSupabaseAuthConfig = exports.SupabaseAuthenticationService = exports.SubscriptionTier = void 0;
exports.createSupabaseAuthenticationService = createSupabaseAuthenticationService;
const supabase_js_1 = require("@supabase/supabase-js");
const utils_1 = require("@codequal/core/utils");
const auth_1 = require("./types/auth");
/**
 * Subscription tier definitions
 */
var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["FREE"] = "free";
    SubscriptionTier["PRO"] = "pro";
    SubscriptionTier["ENTERPRISE"] = "enterprise";
})(SubscriptionTier || (exports.SubscriptionTier = SubscriptionTier = {}));
/**
 * Supabase Authentication Service Implementation
 */
class SupabaseAuthenticationService {
    constructor(config) {
        this.logger = (0, utils_1.createLogger)('SupabaseAuthenticationService');
        this.rateLimitCache = new Map();
        this.sessionCache = new Map();
        this.config = config;
        this.supabase = (0, supabase_js_1.createClient)(config.supabaseUrl, config.supabaseAnonKey);
        this.logger.info('Supabase authentication service initialized', {
            url: config.supabaseUrl.replace(/\/\/(.+?)@/, '//***@'), // Hide credentials
            sessionMaxAge: config.session.maxAge,
            fingerprintingEnabled: config.session.fingerprinting
        });
    }
    /**
     * Validate session token and return authenticated user
     */
    async validateSession(token, requestContext) {
        try {
            // Check session cache first
            if (this.sessionCache.has(token)) {
                const cachedUser = this.sessionCache.get(token);
                if (cachedUser.session.expiresAt > new Date()) {
                    return cachedUser;
                }
                else {
                    this.sessionCache.delete(token);
                }
            }
            // Verify JWT token with Supabase
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            if (error || !user) {
                throw new Error(auth_1.AuthenticationError.INVALID_TOKEN);
            }
            // Get user profile with subscription information
            const userProfile = await this.getUserProfile(user.id);
            if (!userProfile) {
                throw new Error(auth_1.AuthenticationError.INVALID_TOKEN);
            }
            // Check account status
            if (userProfile.status !== auth_1.UserStatus.ACTIVE) {
                throw new Error(`ACCOUNT_SUSPENDED: ${userProfile.status}`);
            }
            // Get user permissions based on organizations and subscriptions
            const permissions = await this.getUserPermissions(userProfile);
            // Create session with fingerprinting
            const session = await this.createUserSession(token, requestContext, userProfile);
            // Build authenticated user
            const authenticatedUser = {
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
        }
        catch (error) {
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
    async refreshSession(refreshToken) {
        try {
            const { data, error } = await this.supabase.auth.refreshSession({
                refresh_token: refreshToken
            });
            if (error || !data.session || !data.user) {
                throw new Error(auth_1.AuthenticationError.SESSION_REFRESH_FAILED);
            }
            // Clear old session from cache
            this.sessionCache.forEach((user, token) => {
                if (user.id === data.user.id) {
                    this.sessionCache.delete(token);
                }
            });
            // Create new authenticated user with refreshed session
            return this.validateSession(data.session.access_token, {
                ipAddress: '0.0.0.0', // Will be updated on next request
                userAgent: 'refresh-token'
            });
        }
        catch (error) {
            this.logger.error('Session refresh failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Validate repository access for user
     */
    async validateRepositoryAccess(user, repositoryId, permission) {
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
        }
        catch (error) {
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
    async logSecurityEvent(event) {
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
        }
        catch (error) {
            this.logger.error('Security event logging error', {
                eventType: event.type,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Check rate limits for user
     */
    async checkRateLimit(userId, operation) {
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
    async invalidateSession(sessionId) {
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
        }
        catch (error) {
            this.logger.error('Session invalidation failed', {
                sessionId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Create user account with subscription tier
     */
    async createUser(email, password, subscriptionTier = SubscriptionTier.FREE, organizationName) {
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
            const userProfile = {
                id: authData.user.id,
                email,
                subscriptionTier,
                organizations: [],
                status: auth_1.UserStatus.PENDING_VERIFICATION,
                role: auth_1.UserRole.USER,
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
            let organization;
            if (organizationName) {
                organization = await this.createOrganization(organizationName, subscriptionTier, authData.user.id);
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
            const authenticatedUser = {
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
                role: auth_1.UserRole.USER,
                status: auth_1.UserStatus.PENDING_VERIFICATION,
                metadata: { subscriptionTier }
            };
            return { user: authenticatedUser, organization };
        }
        catch (error) {
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
    async grantRepositoryAccess(organizationId, repositoryId, accessLevel, grantedBy) {
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
        }
        catch (error) {
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
    async getUserProfile(userId) {
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
    async getOrganization(organizationId) {
        if (!organizationId)
            return null;
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
    async getUserPermissions(userProfile) {
        const repositories = {};
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
    async createUserSession(token, requestContext, userProfile) {
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
    generateSessionFingerprint(requestContext, userId) {
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
    getGlobalPermissions(role) {
        switch (role) {
            case auth_1.UserRole.SYSTEM_ADMIN:
                return ['*'];
            case auth_1.UserRole.ADMIN:
                return ['user_management', 'organization_management'];
            case auth_1.UserRole.ORG_OWNER:
                return ['organization_management'];
            default:
                return [];
        }
    }
    /**
     * Get default permissions for subscription tier
     */
    async getDefaultPermissions(tier) {
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
    async createOrganization(name, subscriptionTier, ownerId) {
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
    async updateLastLogin(userId) {
        await this.supabase
            .from('user_profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', userId);
    }
    /**
     * Get rate limit info for user
     */
    async getRateLimitInfo(userId) {
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
    clearOrganizationCache(organizationId) {
        this.sessionCache.forEach((user, token) => {
            if (user.organizationId === organizationId) {
                this.sessionCache.delete(token);
            }
        });
    }
}
exports.SupabaseAuthenticationService = SupabaseAuthenticationService;
/**
 * Factory function to create Supabase authentication service
 */
function createSupabaseAuthenticationService(config) {
    return new SupabaseAuthenticationService(config);
}
/**
 * Default configuration for development
 */
exports.defaultSupabaseAuthConfig = {
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
exports.productionSupabaseAuthConfig = {
    jwt: {
        secret: process.env.SUPABASE_JWT_SECRET,
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
