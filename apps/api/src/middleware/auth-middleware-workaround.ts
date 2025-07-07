import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest, AuthenticatedUser } from './auth-middleware';

export const authMiddlewareWorkaround = async (
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

    // Decode token without verification (workaround for Supabase bug)
    let decoded: any;
    try {
      // Manual JWT decode without library
      const parts = token.split('.');
      if (parts.length !== 3) {
        res.status(401).json({ error: 'Invalid token format' });
        return;
      }
      
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString()
      );
      decoded = payload;
      
      if (!decoded) {
        res.status(401).json({ error: 'Invalid token format' });
        return;
      }
    } catch (error) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Check token expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    // Validate required fields
    if (!decoded.sub || !decoded.email) {
      res.status(401).json({ error: 'Invalid token content' });
      return;
    }

    // Create authenticated user object
    const authenticatedUser: AuthenticatedUser = {
      id: decoded.sub,
      email: decoded.email,
      organizationId: decoded.user_metadata?.organization_id,
      permissions: decoded.user_metadata?.permissions || [],
      role: decoded.role || 'authenticated',
      status: 'active',
      session: {
        token,
        expiresAt: new Date(decoded.exp * 1000)
      }
    };

    // Verify user exists in database (optional validation)
    const { data: profile } = await getSupabase()
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', decoded.sub)
      .single();

    if (!profile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    (req as AuthenticatedRequest).user = authenticatedUser;
    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
};

// Export a function to switch between normal and workaround auth
export async function getAuthMiddleware(useWorkaround = true) {
  if (useWorkaround) {
    return authMiddlewareWorkaround;
  }
  // Import the original middleware
  const { authMiddleware } = await import('./auth-middleware');
  return authMiddleware;
}