import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('auth-workaround');

export interface AuthToken {
  access_token: string;
  expires_at: string;
  type: string;
}

export interface DecodedToken {
  sub: string;
  email?: string;
  aud?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function decodeTokenWithoutVerification(token: string): DecodedToken | null {
  try {
    // Manual JWT decode without library
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/_/g, '/').replace(/-/g, '+'), 'base64').toString()
    );
    
    return payload as DecodedToken;
  } catch (error) {
    logger.error('Error decoding token:', error as Error);
    return null;
  }
}

export function authMiddlewareWorkaround(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  
  const decoded = decodeTokenWithoutVerification(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Extend request with user property
  interface AuthRequestWithUser {
    user?: {
      id: string;
      email?: string;
      role: string;
    };
  }
  
  ((req as Request) as AuthRequestWithUser).user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role || 'authenticated'
  };
  
  next();
}

export async function useTokenDirectly(token: string, apiEndpoint: string, options: RequestInit = {}) {
  const response = await fetch(apiEndpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}