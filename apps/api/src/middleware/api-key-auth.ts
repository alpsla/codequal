import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { createHash, randomBytes } from 'crypto';

// ApiKeyData interface is defined in types/express.d.ts
interface ApiKeyDataDB {
  id: string;
  user_id: string;
  organization_id?: string;
  name: string;
  key_hash: string;
  key_prefix?: string;
  permissions: any;
  usage_limit: number;
  usage_count: number;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  metadata: any;
}

// Type augmentation is handled in types/express.d.ts

export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY',
      message: 'Please provide an API key in the X-API-Key header or api_key query parameter'
    });
  }

  // Track request start time for response time calculation
  req.requestStartTime = Date.now();

  try {
    // Hash the API key for secure comparison
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    
    // Look up API key in database
    const { data: keyData, error } = await getSupabase()
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('active', true)
      .single() as { data: ApiKeyDataDB | null; error: any };

    if (error || !keyData) {
      // Log failed attempt
      await logFailedAuth(req, 'INVALID_KEY');
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
        message: 'The provided API key is invalid or has been revoked'
      });
    }

    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at as string) < new Date()) {
      await logFailedAuth(req, 'EXPIRED_KEY', keyData.id as string);
      return res.status(401).json({
        error: 'API key expired',
        code: 'EXPIRED_API_KEY',
        message: 'This API key has expired. Please generate a new one.'
      });
    }

    // Check endpoint permissions
    const permissions = keyData.permissions as any;
    const endpoints = permissions?.endpoints;
    
    // Skip permission check if endpoints is '*' or permissions is empty/null
    if (endpoints && endpoints !== '*' && Array.isArray(endpoints)) {
      const currentEndpoint = req.path;
      
      if (!endpoints.some((ep: string) => currentEndpoint.startsWith(ep))) {
        return res.status(403).json({
          error: 'Endpoint not allowed',
          code: 'FORBIDDEN_ENDPOINT',
          message: 'This API key does not have permission to access this endpoint'
        });
      }
    }

    // Check rate limits using database function
    // TODO: Implement check_rate_limit function in database
    /*
    const { data: rateLimitOk } = await getSupabase().rpc('check_rate_limit', {
      p_key_hash: keyHash,
      p_limit_per_minute: keyData.rate_limit_per_minute,
      p_limit_per_hour: keyData.rate_limit_per_hour || 1000
    });

    if (!rateLimitOk) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please retry after some time.',
        retry_after: 60 // seconds
      });
    }
    */

    // Check usage limits
    if (keyData.usage_count >= keyData.usage_limit) {
      return res.status(429).json({
        error: 'Usage limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        message: 'Monthly usage limit reached. Please upgrade your plan.',
        usage: {
          current: keyData.usage_count,
          limit: keyData.usage_limit,
          percentage: Math.round((keyData.usage_count / keyData.usage_limit) * 100)
        }
      });
    }

    // Start usage log entry
    const usageLogEntry = {
      api_key_id: keyData.id,
      endpoint: req.path,
      method: req.method,
      request_params: req.query,
      request_headers: {
        'user-agent': req.headers['user-agent'],
        'accept-language': req.headers['accept-language'],
        'x-forwarded-for': req.headers['x-forwarded-for']
      },
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    // Store usage log (will be updated with response details later)
    const { data: logData } = await getSupabase()
      .from('api_usage_logs')
      .insert(usageLogEntry)
      .select()
      .single() as { data: any; error: any };

    // Attach data to request - convert to express ApiKeyData type
    req.apiKey = {
      id: keyData.id,
      name: keyData.name,
      key_hash: keyData.key_hash,
      user_id: keyData.user_id,
      organization_id: keyData.organization_id || '',
      permissions: keyData.permissions ? (Array.isArray(keyData.permissions) ? keyData.permissions : []) : null,
      rate_limit_per_hour: keyData.rate_limit_per_hour || 1000,
      usage_count: keyData.usage_count,
      expires_at: keyData.expires_at,
      created_at: keyData.created_at,
      last_used_at: keyData.last_used_at,
      metadata: keyData.metadata
    };
    req.customerId = keyData.user_id as string;
    
    // Also set req.user for compatibility with other middleware
    (req as any).user = {
      id: keyData.user_id,
      email: 'api-user@codequal.com', // Placeholder for API users
      role: 'user',
      status: 'active',
      organizationId: keyData.organization_id || null,
      permissions: [],
      session: {
        token: 'api-key-auth',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      isApiKeyAuth: true
    };
    
    // Add response interceptor to update usage log
    const originalSend = res.send;
    res.send = function(data) {
      // Update usage log with response details
      if (logData) {
        const responseTime = Date.now() - req.requestStartTime!;
        (async () => {
          try {
            await getSupabase()
              .from('api_usage_logs')
              .update({
                status_code: res.statusCode,
                response_time_ms: responseTime,
                tokens_used: res.locals.tokensUsed || 0,
                cost_usd: res.locals.costUsd || 0
              })
              .eq('id', logData.id as string);
              
            // Update usage count using database function
            await getSupabase().rpc('increment_api_usage', {
              p_api_key_id: keyData.id,
              p_tokens_used: res.locals.tokensUsed || 0,
              p_cost_usd: res.locals.costUsd || 0
            });
          } catch (err) {
            console.error('Failed to update usage:', err);
          }
        })();
      }
      
      return originalSend.call(this, data);
    };

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
      message: 'An error occurred during authentication. Please try again.'
    });
  }
}

// Helper to log failed authentication attempts
async function logFailedAuth(req: Request, reason: string, apiKeyId?: string) {
  try {
    await getSupabase()
      .from('api_usage_logs')
      .insert({
        api_key_id: apiKeyId || null,
        endpoint: req.path,
        method: req.method,
        status_code: 401,
        error_message: reason,
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
  } catch (err) {
    console.error('Failed to log authentication failure:', err);
  }
}

// Helper to generate new API keys
export function generateApiKey(prefix = 'ck'): string {
  // Generate 32 random bytes and convert to hex (64 characters)
  const randomPart = randomBytes(32).toString('hex');
  
  // Take first 32 characters for a reasonable key length
  return `${prefix}_${randomPart.substring(0, 32)}`;
}

// Helper to hash API keys for storage
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

// Middleware to track API costs (use after AI operations)
export function trackApiCost(tokensUsed: number, model: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Calculate cost based on model
    const costPerToken = {
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000002,
      'claude-3': 0.00002,
      // Add more models as needed
    };
    
    const cost = tokensUsed * (costPerToken[model as keyof typeof costPerToken] || 0.000002);
    
    // Store in response locals for the auth middleware to pick up
    res.locals.tokensUsed = (res.locals.tokensUsed || 0) + tokensUsed;
    res.locals.costUsd = (res.locals.costUsd || 0) + cost;
    
    next();
  };
}