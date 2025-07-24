import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('rate-limiter');

// Store for tracking rate limit violations
const violationStore = new Map<string, number>();

// Helper to get client identifier
const getClientIdentifier = (req: Request): string => {
  // Check for API key first
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `api-key:${apiKey.substring(0, 8)}...`;
  }
  
  // Check for authenticated user
  const user = (req as any).user;
  if (user?.id) {
    return `user:${user.id}`;
  }
  
  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'] as string;
  const ip = forwarded ? forwarded.split(',')[0] : req.ip;
  return `ip:${ip || 'unknown'}`;
};

// Global rate limiter - applies to all routes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each identifier to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: getClientIdentifier,
  skip: (req: Request) => {
    // Skip rate limiting for static assets and health checks
    const path = req.path.toLowerCase();
    return path.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i) !== null ||
           path === '/health' ||
           path === '/metrics' ||
           path.startsWith('/static/') ||
           path.startsWith('/assets/');
  },
  handler: (req: Request, res: Response) => {
    const identifier = getClientIdentifier(req);
    const violations = violationStore.get(identifier) || 0;
    violationStore.set(identifier, violations + 1);
    
    logger.warn(`Rate limit exceeded for ${identifier}`, {
      path: req.path,
      violations: violations + 1
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs (increased from 5)
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: getClientIdentifier
});

// API endpoint rate limiter - more permissive for authenticated users
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req: Request) => {
    // Different limits based on authentication
    const user = (req as any).user;
    if (user?.subscription?.tier === 'premium' || user?.subscription?.tier === 'team' || user?.subscription?.tier === 'enterprise') {
      return 300; // 300 requests per minute for premium/team/enterprise (increased from 60)
    } else if (user?.subscription?.tier === 'basic' || user?.subscription?.tier === 'individual') {
      return 120; // 120 requests per minute for basic/individual (increased from 30)
    } else if (req.headers['x-api-key']) {
      return 60; // 60 requests per minute for API key users (increased from 20)
    } else if (user) {
      return 60; // 60 requests per minute for authenticated free users
    }
    return 30; // 30 requests per minute for unauthenticated (increased from 10)
  },
  message: 'API rate limit exceeded. Please upgrade your plan for higher limits.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  skip: (req: Request) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  }
});

// Webhook rate limiter - for external services
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 webhooks per minute per source (increased from 100)
  message: 'Webhook rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by webhook source
    const signature = req.headers['x-webhook-signature'] || 
                     req.headers['stripe-signature'] ||
                     req.headers['x-github-signature'];
    if (signature && typeof signature === 'string') {
      return `webhook:${signature.substring(0, 10)}`;
    }
    return getClientIdentifier(req);
  }
});

// Report generation rate limiter - resource intensive operations
export const reportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    const user = (req as any).user;
    // Different limits based on subscription tier
    if (user?.subscription?.tier === 'premium' || user?.subscription?.tier === 'team' || user?.subscription?.tier === 'enterprise') {
      return 100; // 100 reports per hour for premium/team/enterprise
    } else if (user?.subscription?.tier === 'basic' || user?.subscription?.tier === 'individual') {
      return 30; // 30 reports per hour for basic/individual (increased from 10)
    } else if (req.headers['x-api-key']) {
      return 20; // 20 reports per hour for API key users
    }
    return 10; // 10 reports per hour for free users
  },
  message: 'Report generation rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  skip: (req: Request) => {
    // Skip rate limiting for GET requests (viewing reports)
    return req.method === 'GET';
  }
});

// Read-only operations rate limiter - more permissive for GET requests
export const readOnlyRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 GET requests per minute
  message: 'Read rate limit exceeded. Please slow down your requests.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  skip: (req: Request) => {
    // Only apply to GET requests
    return req.method !== 'GET';
  }
});

// Export a function to get violation count
export const getRateLimitViolations = (identifier: string): number => {
  return violationStore.get(identifier) || 0;
};

// Clean up old violations periodically
setInterval(() => {
  violationStore.clear();
}, 60 * 60 * 1000); // Clear every hour