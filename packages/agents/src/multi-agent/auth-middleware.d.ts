/**
 * Authentication Middleware for Multi-Agent System
 *
 * This middleware validates authentication tokens, checks permissions,
 * and provides request-level security for the Vector DB multi-agent system.
 */
import { AuthenticatedUser, AuthenticationService, RepositoryAccessResult, UserRole } from './types/auth';
/**
 * Multi-agent request context
 */
export interface MultiAgentRequest {
    /** Authorization header token */
    token?: string;
    /** Request headers */
    headers: {
        authorization?: string;
        'user-agent'?: string;
        'x-forwarded-for'?: string;
        [key: string]: string | undefined;
    };
    /** Client IP address */
    ip: string;
    /** Request body for multi-agent execution */
    body: {
        repositoryId?: string;
        config?: any;
        options?: any;
    };
    /** Request metadata */
    metadata: {
        requestId: string;
        timestamp: Date;
        userAgent: string;
    };
}
/**
 * Authenticated request with validated user context
 */
export interface AuthenticatedRequest extends MultiAgentRequest {
    /** Validated authenticated user */
    user: AuthenticatedUser;
    /** Repository access validation result */
    repositoryAccess?: RepositoryAccessResult;
}
/**
 * Authentication middleware configuration
 */
export interface AuthMiddlewareConfig {
    /** Required user roles for access */
    requiredRoles?: UserRole[];
    /** Skip authentication (for testing) */
    skipAuth?: boolean;
    /** Enable detailed audit logging */
    enableAuditLogging?: boolean;
    /** Rate limiting configuration */
    rateLimiting?: {
        enabled: boolean;
        requestsPerHour: number;
        burstLimit: number;
    };
    /** Session validation settings */
    sessionValidation?: {
        validateFingerprint: boolean;
        requireFreshSession: boolean;
        maxSessionAge: number;
    };
}
/**
 * Multi-Agent Authentication Middleware
 *
 * Provides comprehensive authentication and authorization for multi-agent operations
 */
export declare class MultiAgentAuthMiddleware {
    private readonly logger;
    private readonly authService;
    private readonly config;
    constructor(authService: AuthenticationService, config?: AuthMiddlewareConfig);
    /**
     * Validate and authenticate a multi-agent request
     *
     * @param request - The incoming request to validate
     * @returns Authenticated request with user context
     * @throws AuthenticationError if validation fails
     */
    validateRequest(request: MultiAgentRequest): Promise<AuthenticatedRequest>;
    /**
     * Authorize repository access for a specific operation
     */
    authorizeRepositoryAccess(user: AuthenticatedUser, repositoryId: string, permission: 'read' | 'write' | 'admin'): Promise<RepositoryAccessResult>;
    /**
     * Extract authentication token from request
     */
    private extractToken;
    /**
     * Perform comprehensive security validations
     */
    private performSecurityValidations;
    /**
     * Check rate limits for user
     */
    private checkRateLimit;
    /**
     * Generate session fingerprint for validation
     */
    private generateSessionFingerprint;
    /**
     * Handle authentication errors with proper logging
     */
    private handleAuthenticationError;
    /**
     * Log security events for audit purposes
     */
    private logSecurityEvent;
    /**
     * Create mock user for testing (when skipAuth is enabled)
     */
    private createMockUser;
}
/**
 * Factory function to create authentication middleware
 */
export declare function createMultiAgentAuthMiddleware(authService: AuthenticationService, config?: AuthMiddlewareConfig): MultiAgentAuthMiddleware;
/**
 * Express.js compatible middleware function
 */
export declare function createExpressAuthMiddleware(authService: AuthenticationService, config?: AuthMiddlewareConfig): (req: any, res: any, next: any) => Promise<void>;
