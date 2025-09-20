/**
 * Authentication types for backward compatibility
 * These are stub types to maintain compatibility after multi-agent removal
 */

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  // Security fields - optional but critical for production
  permissions?: {
    repositories?: Record<string, string[]>;
    organizations?: string[];
    globalPermissions?: string[];
    quotas?: {
      requestsPerHour: number;
      maxConcurrentExecutions: number;
      storageQuotaMB: number;
    };
  };
  session?: {
    token: string;
    expiresAt: Date;
    refreshToken?: string;
    fingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  status?: 'active' | 'suspended' | 'pending';
}

export interface AuthContext {
  user: AuthenticatedUser;
  token?: string;
  permissions?: string[];
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

export interface UserPermissions {
  repositories?: Record<string, string[]>;
  organizations?: string[];
  globalPermissions?: string[];
  quotas?: {
    requestsPerHour: number;
    maxConcurrentExecutions: number;
    storageQuotaMB: number;
  };
}