import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('service-auth-middleware');

export interface ServiceUser {
  role: string;
  email?: string;
}

export interface ServiceAuthRequest extends Request {
  serviceUser?: ServiceUser;
}

/**
 * Simple service token authentication middleware
 * Validates JWT tokens for service-to-service communication
 */
export const serviceAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
      logger.error('No JWT secret configured');
      res.status(500).json({ error: 'Authentication not configured' });
      return;
    }

    try {
      const decoded = verify(token, secret) as any;
      
      // Accept service_role tokens or regular user tokens
      if (decoded.role === 'service_role' || decoded.iss === 'supabase') {
        (req as ServiceAuthRequest).serviceUser = {
          role: decoded.role || 'service',
          email: decoded.email || 'service@codequal.dev'
        };
        return next();
      }

      res.status(401).json({ error: 'Invalid token role' });
    } catch (err) {
      logger.error('Token verification failed:', err as Error);
      res.status(401).json({ error: 'Invalid or expired token' });
    }

  } catch (err) {
    logger.error('Service auth middleware error:', err as Error);
    res.status(500).json({ error: 'Authentication service error' });
  }
};