import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('auth-middleware');

// Extended Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

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
  isApiKeyAuth?: boolean;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip auth for health check
    if (req.path === '/health') {
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: session, error } = await getSupabase().auth.getSession();
    
    if (error || !session.session) {
      // Try to get user from token directly
      const { data: userData, error: userError } = await getSupabase().auth.getUser(token);
      
      if (userError || !userData.user) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // Validate email is present
      if (!userData.user.email) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // Create authenticated user object
      const authenticatedUser: AuthenticatedUser = {
        id: userData.user.id,
        email: userData.user.email,
        organizationId: userData.user.user_metadata?.organization_id,
        permissions: userData.user.user_metadata?.permissions || [],
        role: userData.user.user_metadata?.role || 'user',
        status: 'active',
        session: {
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      };

      (req as AuthenticatedRequest).user = authenticatedUser;
      return next();
    }

    // Validate email is present
    if (!session.session.user.email) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Create authenticated user from session
    const authenticatedUser: AuthenticatedUser = {
      id: session.session.user.id,
      email: session.session.user.email,
      organizationId: session.session.user.user_metadata?.organization_id,
      permissions: session.session.user.user_metadata?.permissions || [],
      role: session.session.user.user_metadata?.role || 'user',
      status: 'active',
      session: {
        token: session.session.access_token,
        expiresAt: new Date((session.session.expires_at || 0) * 1000)
      }
    };

    (req as AuthenticatedRequest).user = authenticatedUser;
    next();

  } catch (error) {
    logger.error('Authentication middleware error:', { error });
    res.status(500).json({ error: 'Authentication service error' });
  }
};

export const checkRepositoryAccess = async (
  user: AuthenticatedUser,
  repositoryUrl: string
): Promise<boolean> => {
  try {
    // Allow test user to access any repository
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      logger.info('Allowing test user access to all repositories');
      return true;
    }
    
    // Check if user has a payment method - if yes, allow access to any repository
    const { data: paymentMethods } = await getSupabase()
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (paymentMethods && paymentMethods.length > 0) {
      // User has payment method - allow access to any repository
      logger.info('User has payment method - granting repository access');
      return true;
    }

    // For users without payment methods, check if they have explicit access
    const { data: repositories, error } = await getSupabase()
      .from('user_repositories')
      .select('repository_url')
      .eq('user_id', user.id)
      .eq('repository_url', repositoryUrl);

    if (error) {
      logger.error('Repository access check error:', error);
      return false;
    }

    // If no explicit access, check if it's their trial repository
    if (!repositories || repositories.length === 0) {
      const { data: trialRepo } = await getSupabase()
        .from('user_trial_repository')
        .select('repository_url')
        .eq('user_id', user.id)
        .single();
      
      if (trialRepo && trialRepo.repository_url === repositoryUrl) {
        return true;
      }
    }

    return repositories && repositories.length > 0;
  } catch (error) {
    logger.error('Repository access check error:', error as Error);
    return false;
  }
};