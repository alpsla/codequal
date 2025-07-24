import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils/logger';
import { AuthenticatedUser } from './auth-middleware';

const logger = createLogger('api-usage-tracking');

// Use the Express augmented Request type which already has apiKey and user
interface ApiRequest extends Request {
  apiUsage?: {
    userId: string;
    subscriptionTier: string;
    usage: number;
    limit: number | null;
  };
}

interface ApiUsageData {
  user_id: string;
  subscription_tier: string;
  api_calls_this_month: number;
  api_calls_limit: number | null;
  last_reset_date: string;
}

/**
 * Middleware to track API usage based on subscription tier
 */
export async function trackApiUsage(
  req: ApiRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get user from API key data or authenticated request
    const userId = req.apiKey?.user_id || req.user?.id;
    
    if (!userId) {
      return next(); // No user context, skip tracking
    }
    
    // Skip tracking for test key
    if (req.apiKey?.id === 'test_key_id') {
      logger.info('Skipping tracking for test key');
      return next();
    }

    // Get user's billing information
    const { data: billing, error: billingError } = await getSupabase()
      .from('user_billing')
      .select('subscription_tier, subscription_status')
      .eq('user_id', userId)
      .single();

    logger.debug('trackApiUsage', { userId, billing });
    
    if (!billing || billingError) {
      logger.warn('No billing record found:', billingError?.message);
      return next(); // No billing record, skip tracking
    }

    // Get or create API usage record for this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: usage, error: usageError } = await getSupabase()
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('month_start', monthStart)
      .single();

    let currentUsage: ApiUsageData;
    
    if (!usage) {
      // Create new usage record for this month
      const { data: newUsage, error: createError } = await getSupabase()
        .from('api_usage')
        .insert({
          user_id: userId,
          month_start: monthStart,
          api_calls_count: 0,
          subscription_tier: billing.subscription_tier
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create API usage record:', createError);
        return next();
      }

      currentUsage = {
        user_id: userId,
        subscription_tier: billing.subscription_tier as string,
        api_calls_this_month: 0,
        api_calls_limit: getApiLimit(billing.subscription_tier as string),
        last_reset_date: monthStart
      };
    } else {
      currentUsage = {
        user_id: userId,
        subscription_tier: billing.subscription_tier as string,
        api_calls_this_month: usage.api_calls_count as number,
        api_calls_limit: getApiLimit(billing.subscription_tier as string),
        last_reset_date: usage.month_start as string
      };
    }

    // Check limits based on subscription tier
    const limit = currentUsage.api_calls_limit;
    
    // Log for testing
    if (limit === null) {
      logger.info(`No limit enforced for user ${userId} (tier: ${currentUsage.subscription_tier})`);
    }
    
    if (limit !== null && currentUsage.api_calls_this_month >= limit) {
      return res.status(429).json({
        error: 'API usage limit exceeded',
        code: 'API_LIMIT_EXCEEDED',
        details: {
          used: currentUsage.api_calls_this_month,
          limit: limit,
          tier: currentUsage.subscription_tier,
          reset_date: getMonthEndDate()
        },
        message: `You have reached your monthly API limit of ${limit} calls. Upgrade your plan or wait until ${getMonthEndDate()} for the limit to reset.`
      });
    }

    // Track the API call
    const { error: updateError } = await getSupabase()
      .from('api_usage')
      .update({ 
        api_calls_count: currentUsage.api_calls_this_month + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .gte('month_start', monthStart);

    if (updateError) {
      logger.error('Failed to update API usage:', updateError);
    }

    // Add usage info to request for logging
    req.apiUsage = {
      userId,
      subscriptionTier: currentUsage.subscription_tier,
      usage: currentUsage.api_calls_this_month + 1,
      limit: currentUsage.api_calls_limit
    };

    // Add remaining calls to response headers
    if (limit !== null) {
      res.setHeader('X-API-Calls-Remaining', Math.max(0, limit - currentUsage.api_calls_this_month - 1));
      res.setHeader('X-API-Calls-Limit', limit);
      res.setHeader('X-API-Calls-Reset', getMonthEndDate());
    }

    next();
  } catch (error) {
    logger.error('Error in API usage tracking:', { error });
    // Don't block the request on tracking errors
    next();
  }
}

/**
 * Get API call limit based on subscription tier
 */
function getApiLimit(tier: string): number | null {
  // TEMPORARILY DISABLED FOR TESTING - All tiers have unlimited API calls
  return null;
  
  /* Original limits (commented out for testing):
  switch (tier) {
    case 'free':
      return null; // Pay-per-scan users (free tier with payment method) have no hard limit
    case 'api':
      return 200; // 200 API calls per month
    case 'individual':
      return 200; // 200 API calls per month + unlimited web
    case 'team':
      return null; // Unlimited everything
    default:
      return 0;
  }
  */
}

/**
 * Get the end date of current month
 */
function getMonthEndDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Middleware to ensure API access is allowed for the user's tier
 */
export function requireApiAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Get tier from apiUsage (set by trackApiUsage) or from the user's apiKey
  const tier = (req as ApiRequest).apiUsage?.subscriptionTier;
  const userId = (req as ApiRequest).apiKey?.user_id || (req as ApiRequest).user?.id;
  
  // Log for debugging
  logger.debug('requireApiAccess', { tier, userId });
  
  // If no tier from apiUsage, check the API key directly
  if (!tier && userId) {
    // This shouldn't happen if trackApiUsage ran successfully
    logger.warn('apiUsage not set, falling back to checking user');
    return next(); // Let it through, the actual limits will be enforced in trackApiUsage
  }
  
  // Skip the free tier check - pay-per-scan users (free tier with payment) can use API
  // The actual payment enforcement happens in trial-enforcement.ts
  if (!tier) {
    return res.status(403).json({
      error: 'API access not available',
      code: 'NO_API_ACCESS',
      message: 'API access requires an API, Individual, or Team subscription. Visit /subscribe to upgrade.'
    });
  }
  
  next();
}