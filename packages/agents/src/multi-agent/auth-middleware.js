"use strict";
/**
 * Authentication Middleware for Multi-Agent System
 *
 * This middleware validates authentication tokens, checks permissions,
 * and provides request-level security for the Vector DB multi-agent system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentAuthMiddleware = void 0;
exports.createMultiAgentAuthMiddleware = createMultiAgentAuthMiddleware;
exports.createExpressAuthMiddleware = createExpressAuthMiddleware;
const utils_1 = require("@codequal/core/utils");
const auth_1 = require("./types/auth");
/**
 * Multi-Agent Authentication Middleware
 *
 * Provides comprehensive authentication and authorization for multi-agent operations
 */
class MultiAgentAuthMiddleware {
    constructor(authService, config = {}) {
        this.logger = (0, utils_1.createLogger)('MultiAgentAuthMiddleware');
        this.authService = authService;
        this.config = {
            requiredRoles: config.requiredRoles || [auth_1.UserRole.USER],
            skipAuth: config.skipAuth || false,
            enableAuditLogging: config.enableAuditLogging || true,
            rateLimiting: {
                enabled: config.rateLimiting?.enabled || true,
                requestsPerHour: config.rateLimiting?.requestsPerHour || 1000,
                burstLimit: config.rateLimiting?.burstLimit || 100
            },
            sessionValidation: {
                validateFingerprint: config.sessionValidation?.validateFingerprint || true,
                requireFreshSession: config.sessionValidation?.requireFreshSession || false,
                maxSessionAge: config.sessionValidation?.maxSessionAge || 24
            }
        };
    }
    /**
     * Validate and authenticate a multi-agent request
     *
     * @param request - The incoming request to validate
     * @returns Authenticated request with user context
     * @throws AuthenticationError if validation fails
     */
    async validateRequest(request) {
        // Skip authentication if configured (testing only)
        if (this.config.skipAuth) {
            this.logger.warn('Authentication skipped (testing mode)');
            return {
                ...request,
                user: this.createMockUser()
            };
        }
        try {
            // Extract and validate token
            const token = this.extractToken(request);
            if (!token) {
                throw new Error(auth_1.AuthenticationError.INVALID_TOKEN);
            }
            // Validate session and get user context
            const user = await this.authService.validateSession(token, {
                ipAddress: request.ip,
                userAgent: request.metadata.userAgent
            });
            // Perform security validations
            await this.performSecurityValidations(user, request);
            // Check rate limits
            if (this.config.rateLimiting.enabled) {
                await this.checkRateLimit(user, request);
            }
            // Validate repository access if specified
            let repositoryAccess;
            if (request.body.repositoryId) {
                repositoryAccess = await this.authService.validateRepositoryAccess(user, request.body.repositoryId, 'read');
                if (!repositoryAccess.granted) {
                    throw new Error(`${auth_1.AuthenticationError.REPOSITORY_ACCESS_DENIED}: ${repositoryAccess.reason}`);
                }
            }
            // Log successful authentication
            if (this.config.enableAuditLogging) {
                await this.logSecurityEvent({
                    type: 'AUTH_SUCCESS',
                    userId: user.id,
                    sessionId: user.session.fingerprint,
                    repositoryId: request.body.repositoryId,
                    ipAddress: request.ip,
                    userAgent: request.metadata.userAgent,
                    timestamp: new Date(),
                    details: {
                        requestId: request.metadata.requestId,
                        hasRepositoryAccess: !!repositoryAccess?.granted
                    },
                    severity: 'low'
                });
            }
            return {
                ...request,
                user,
                repositoryAccess
            };
        }
        catch (error) {
            await this.handleAuthenticationError(error, request);
            throw error;
        }
    }
    /**
     * Authorize repository access for a specific operation
     */
    async authorizeRepositoryAccess(user, repositoryId, permission) {
        try {
            const result = await this.authService.validateRepositoryAccess(user, repositoryId, permission);
            if (!result.granted && this.config.enableAuditLogging) {
                await this.logSecurityEvent({
                    type: 'ACCESS_DENIED',
                    userId: user.id,
                    sessionId: user.session.fingerprint,
                    repositoryId,
                    ipAddress: user.session.ipAddress,
                    userAgent: user.session.userAgent,
                    timestamp: new Date(),
                    details: {
                        requiredPermission: permission,
                        reason: result.reason || 'Permission denied'
                    },
                    severity: 'medium'
                });
            }
            return result;
        }
        catch (error) {
            this.logger.error('Repository authorization failed', {
                userId: user.id,
                repositoryId,
                permission,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Extract authentication token from request
     */
    extractToken(request) {
        // Check explicit token field
        if (request.token) {
            return request.token;
        }
        // Check Authorization header
        const authHeader = request.headers.authorization;
        if (authHeader) {
            // Support "Bearer <token>" format
            const match = authHeader.match(/^Bearer\s+(.+)$/i);
            if (match) {
                return match[1];
            }
            // Support direct token
            return authHeader;
        }
        return null;
    }
    /**
     * Perform comprehensive security validations
     */
    async performSecurityValidations(user, request) {
        // Check user status
        if (user.status !== auth_1.UserStatus.ACTIVE) {
            throw new Error(`${auth_1.AuthenticationError.ACCOUNT_SUSPENDED}: Account status is ${user.status}`);
        }
        // Check required roles
        if (!this.config.requiredRoles.includes(user.role)) {
            throw new Error(`${auth_1.AuthenticationError.INSUFFICIENT_PERMISSIONS}: Required roles: ${this.config.requiredRoles.join(', ')}`);
        }
        // Validate session freshness
        if (this.config.sessionValidation.requireFreshSession) {
            const sessionAge = Date.now() - new Date(user.session.expiresAt).getTime() + (user.session.expiresAt.getTime() - Date.now());
            const maxAge = this.config.sessionValidation.maxSessionAge * 60 * 60 * 1000; // Convert hours to ms
            if (sessionAge > maxAge) {
                throw new Error(`${auth_1.AuthenticationError.EXPIRED_SESSION}: Session too old`);
            }
        }
        // Validate session fingerprint
        if (this.config.sessionValidation.validateFingerprint) {
            const expectedFingerprint = this.generateSessionFingerprint(request);
            if (user.session.fingerprint !== expectedFingerprint) {
                throw new Error(`${auth_1.AuthenticationError.SESSION_HIJACK_DETECTED}: Session fingerprint mismatch`);
            }
        }
        this.logger.debug('Security validations passed', {
            userId: user.id,
            userRole: user.role,
            sessionAge: Date.now() - new Date(user.session.expiresAt).getTime()
        });
    }
    /**
     * Check rate limits for user
     */
    async checkRateLimit(user, request) {
        const rateLimitResult = await this.authService.checkRateLimit(user.id, 'multi-agent-execution');
        if (!rateLimitResult.allowed) {
            if (this.config.enableAuditLogging) {
                await this.logSecurityEvent({
                    type: 'RATE_LIMIT_HIT',
                    userId: user.id,
                    sessionId: user.session.fingerprint,
                    ipAddress: request.ip,
                    userAgent: request.metadata.userAgent,
                    timestamp: new Date(),
                    details: {
                        operation: 'multi-agent-execution',
                        resetTime: rateLimitResult.resetTime
                    },
                    severity: 'medium'
                });
            }
            throw new Error(`${auth_1.AuthenticationError.RATE_LIMIT_EXCEEDED}: Rate limit exceeded. Resets at ${rateLimitResult.resetTime}`);
        }
    }
    /**
     * Generate session fingerprint for validation
     */
    generateSessionFingerprint(request) {
        // In production, this would be more sophisticated
        const components = [
            request.ip,
            request.metadata.userAgent,
            // Add more fingerprinting components as needed
        ];
        return Buffer.from(components.join('|')).toString('base64');
    }
    /**
     * Handle authentication errors with proper logging
     */
    async handleAuthenticationError(error, request) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('Authentication failed', {
            error: errorMessage,
            ip: request.ip,
            userAgent: request.metadata.userAgent,
            requestId: request.metadata.requestId
        });
        if (this.config.enableAuditLogging) {
            await this.logSecurityEvent({
                type: 'AUTH_FAILURE',
                sessionId: request.metadata.requestId,
                repositoryId: request.body.repositoryId,
                ipAddress: request.ip,
                userAgent: request.metadata.userAgent,
                timestamp: new Date(),
                details: {
                    error: errorMessage,
                    requestId: request.metadata.requestId
                },
                severity: 'high'
            });
        }
    }
    /**
     * Log security events for audit purposes
     */
    async logSecurityEvent(event) {
        try {
            await this.authService.logSecurityEvent(event);
        }
        catch (error) {
            this.logger.error('Failed to log security event', {
                eventType: event.type,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Create mock user for testing (when skipAuth is enabled)
     */
    createMockUser() {
        return {
            id: 'mock-user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: auth_1.UserRole.USER,
            status: auth_1.UserStatus.ACTIVE,
            permissions: {
                repositories: {
                    'test-org/test-repo': {
                        read: true,
                        write: true,
                        admin: false
                    }
                },
                organizations: ['test-org'],
                globalPermissions: [],
                quotas: {
                    requestsPerHour: 1000,
                    maxConcurrentExecutions: 5,
                    storageQuotaMB: 1000
                }
            },
            session: {
                token: 'mock-token',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                fingerprint: 'mock-fingerprint',
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent'
            }
        };
    }
}
exports.MultiAgentAuthMiddleware = MultiAgentAuthMiddleware;
/**
 * Factory function to create authentication middleware
 */
function createMultiAgentAuthMiddleware(authService, config) {
    return new MultiAgentAuthMiddleware(authService, config);
}
/**
 * Express.js compatible middleware function
 */
function createExpressAuthMiddleware(authService, config) {
    const middleware = createMultiAgentAuthMiddleware(authService, config);
    return async (req, res, next) => {
        try {
            const request = {
                headers: req.headers,
                ip: req.ip || req.connection.remoteAddress,
                body: req.body,
                metadata: {
                    requestId: req.id || Math.random().toString(36),
                    timestamp: new Date(),
                    userAgent: req.headers['user-agent'] || 'unknown'
                }
            };
            const authenticatedRequest = await middleware.validateRequest(request);
            req.user = authenticatedRequest.user;
            req.repositoryAccess = authenticatedRequest.repositoryAccess;
            next();
        }
        catch (error) {
            const statusCode = error instanceof Error && error.message.includes('INVALID_TOKEN') ? 401 :
                error instanceof Error && error.message.includes('ACCESS_DENIED') ? 403 :
                    error instanceof Error && error.message.includes('RATE_LIMIT') ? 429 : 500;
            res.status(statusCode).json({
                error: 'Authentication failed',
                message: error instanceof Error ? error.message : 'Unknown error',
                code: statusCode
            });
        }
    };
}
