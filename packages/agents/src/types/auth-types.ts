/**
 * Authentication types for skill tracking integration
 * 
 * Note: These are copies of types from apps/api to avoid cross-package dependencies
 * during build. The actual AuthenticatedUser should be passed from the API layer.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId?: string;
  permissions: string[];
  role: string;
  status: string;
  session: {
    token: string;
    expiresAt: Date;
  };
}