"use strict";
/**
 * Authentication types for Vector DB Multi-Agent System
 *
 * These types define the authentication and authorization model
 * for secure multi-tenant operations across the agent system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationError = exports.UserStatus = exports.UserRole = void 0;
/**
 * User roles for role-based access control
 */
var UserRole;
(function (UserRole) {
    /** Regular user with standard permissions */
    UserRole["USER"] = "user";
    /** Administrator with elevated permissions */
    UserRole["ADMIN"] = "admin";
    /** System administrator with full access */
    UserRole["SYSTEM_ADMIN"] = "system_admin";
    /** Organization owner with org-level admin rights */
    UserRole["ORG_OWNER"] = "org_owner";
    /** Organization member with team permissions */
    UserRole["ORG_MEMBER"] = "org_member";
    /** Service account for automated operations */
    UserRole["SERVICE_ACCOUNT"] = "service_account";
})(UserRole || (exports.UserRole = UserRole = {}));
/**
 * User account status
 */
var UserStatus;
(function (UserStatus) {
    /** Active account */
    UserStatus["ACTIVE"] = "active";
    /** Suspended account */
    UserStatus["SUSPENDED"] = "suspended";
    /** Pending email verification */
    UserStatus["PENDING_VERIFICATION"] = "pending_verification";
    /** Password reset required */
    UserStatus["PASSWORD_RESET_REQUIRED"] = "password_reset_required";
    /** Account locked due to security issues */
    UserStatus["LOCKED"] = "locked";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
/**
 * Authentication error types
 */
var AuthenticationError;
(function (AuthenticationError) {
    /** Invalid or malformed token */
    AuthenticationError["INVALID_TOKEN"] = "INVALID_TOKEN";
    /** Token has expired */
    AuthenticationError["EXPIRED_SESSION"] = "EXPIRED_SESSION";
    /** User lacks required permissions */
    AuthenticationError["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    /** Access to repository denied */
    AuthenticationError["REPOSITORY_ACCESS_DENIED"] = "REPOSITORY_ACCESS_DENIED";
    /** Rate limit exceeded */
    AuthenticationError["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    /** Failed to refresh session */
    AuthenticationError["SESSION_REFRESH_FAILED"] = "SESSION_REFRESH_FAILED";
    /** Account is suspended or locked */
    AuthenticationError["ACCOUNT_SUSPENDED"] = "ACCOUNT_SUSPENDED";
    /** Session fingerprint mismatch */
    AuthenticationError["SESSION_HIJACK_DETECTED"] = "SESSION_HIJACK_DETECTED";
})(AuthenticationError || (exports.AuthenticationError = AuthenticationError = {}));
