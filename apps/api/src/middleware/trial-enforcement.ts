import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest, AuthenticatedUser } from './auth-middleware';
import { normalizeRepositoryUrl } from '../utils/repository-utils';
import Stripe from 'stripe';
import { createLogger } from '@codequal/core/utils/logger';

const logger = createLogger('trial-enforcement');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

interface TrialCheckRequest extends AuthenticatedRequest {
  body: {
    repository_url?: string;
    repositoryUrl?: string;
  };
}


export async function enforceTrialLimits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { user } = req as AuthenticatedRequest;
    const trialsReq = req as TrialCheckRequest;
    let repositoryUrl = trialsReq.body.repository_url || trialsReq.body.repositoryUrl;
    
    // Skip trial limits for test user
    if (user?.id === '00000000-0000-0000-0000-000000000000') {
      logger.info('Skipping for test user');
      return next();
    }
    
    // Check if this is an API key request with a valid subscription
    if ((user as AuthenticatedUser & { isApiKeyAuth?: boolean })?.isApiKeyAuth) {
      // Get user's billing to check subscription
      const { data: billing } = await getSupabase()
        .from('user_billing')
        .select('subscription_tier, subscription_status')
        .eq('user_id', user.id)
        .single();
        
      if (billing?.subscription_tier && 
          ['api', 'individual', 'team'].includes(billing.subscription_tier as string) &&
          billing.subscription_status === 'active') {
        // Valid API/Individual/Team subscription - skip trial limits
        logger.info('API key user with valid subscription - skipping trial limits');
        return next();
      }
    }

    if (!repositoryUrl) {
      return res.status(400).json({ 
        error: 'Repository URL is required',
        code: 'REPOSITORY_URL_REQUIRED'
      });
    }
    
    // Normalize the repository URL
    repositoryUrl = normalizeRepositoryUrl(repositoryUrl);
    
    // Check if user has a payment method - if yes, skip all trial restrictions
    const { data: paymentMethods } = await getSupabase()
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (paymentMethods && paymentMethods.length > 0) {
      // User has payment method - allow any repository
      logger.info('User has payment method - skipping trial restrictions');
      return next();
    }

    // Check if user can scan this repository
    const { data: canScan, error: checkError } = await getSupabase()
      .rpc('can_user_scan_repository', {
        p_user_id: user.id,
        p_repository_url: repositoryUrl
      });

    if (checkError) {
      logger.error('Error checking scan permissions:', checkError);
      return res.status(500).json({ 
        error: 'Failed to check scan permissions',
        code: 'SCAN_CHECK_FAILED'
      });
    }

    if (!canScan) {
      // Get user's trial repository to provide helpful error
      const { data: trialRepo } = await getSupabase()
        .from('user_trial_repository')
        .select('repository_url')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: billing } = await getSupabase()
        .from('user_billing')
        .select('trial_scans_used, trial_scans_limit')
        .eq('user_id', user.id)
        .single();

      // Check if user has payment method before enforcing repository limit
      const { data: hasPaymentMethod } = await getSupabase()
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (trialRepo && trialRepo.repository_url && (!hasPaymentMethod || hasPaymentMethod.length === 0)) {
        // Normalize both URLs for comparison
        const normalizedTrialUrl = normalizeRepositoryUrl(trialRepo.repository_url as string);
        const normalizedRequestUrl = normalizeRepositoryUrl(repositoryUrl);
        
        if (normalizedTrialUrl !== normalizedRequestUrl) {
          return res.status(403).json({
            error: 'Trial limited to one repository',
            code: 'TRIAL_REPOSITORY_LIMIT',
            details: {
              allowed_repository: trialRepo.repository_url,
              requested_repository: repositoryUrl
            }
          });
        }
      }

      interface BillingData {
        trial_scans_used?: number;
        trial_scans_limit?: number;
      }
      const billingData = billing as BillingData;
      if (billing && billingData.trial_scans_used && billingData.trial_scans_limit && billingData.trial_scans_used >= billingData.trial_scans_limit) {
        return res.status(403).json({
          error: 'Trial scan limit reached',
          code: 'TRIAL_LIMIT_REACHED',
          details: {
            scans_used: billingData.trial_scans_used,
            scans_limit: billingData.trial_scans_limit,
            upgrade_required: true
          }
        });
      }
    }

    // If this is their first scan and no trial repo set, set it now
    const { data: existingTrialRepo } = await getSupabase()
      .from('user_trial_repository')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingTrialRepo) {
      const normalizedUrl = normalizeRepositoryUrl(repositoryUrl);
      const { error: insertError } = await getSupabase()
        .from('user_trial_repository')
        .insert({
          user_id: user.id,
          repository_url: normalizedUrl
        });
      
      if (insertError) {
        logger.error('Error setting trial repository:', insertError);
      } else {
        logger.info(`Set trial repository for user ${user.id}: ${normalizedUrl}`);
      }
    }

    // Continue to next middleware
    next();
  } catch (error) {
    logger.error('Trial enforcement error:', { error });
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'TRIAL_CHECK_ERROR'
    });
  }
}

// Middleware to increment scan count after successful scan
export async function incrementScanCount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // This will be called after the scan is complete
  // We'll hook it into the response
  const originalSend = res.send;
  
  res.send = function(data: unknown): Response {
    if (res.statusCode === 200) {
      const { user } = req as AuthenticatedRequest;
      const trialsReq = req as TrialCheckRequest;
      const repositoryUrl = trialsReq.body.repository_url || trialsReq.body.repositoryUrl;

      // Handle billing asynchronously
      (async () => {
        try {
          // Check if user has payment method
          const { data: paymentMethods } = await getSupabase()
            .from('payment_methods')
            .select('stripe_payment_method_id')
            .eq('user_id', user.id)
            .limit(1);
          
          if (paymentMethods && paymentMethods.length > 0) {
            // User has payment method - charge them
            const { data: billing } = await getSupabase()
              .from('user_billing')
              .select('stripe_customer_id')
              .eq('user_id', user.id)
              .single();
            
            if (billing?.stripe_customer_id) {
              try {
                // Create payment intent for $0.50
                const paymentIntent = await stripe.paymentIntents.create({
                  amount: 50, // $0.50 in cents
                  currency: 'usd',
                  customer: billing.stripe_customer_id as string,
                  payment_method: paymentMethods[0].stripe_payment_method_id as string,
                  confirm: true,
                  off_session: true,
                  description: `Repository scan: ${repositoryUrl}`,
                  metadata: {
                    user_id: user.id,
                    repository_url: repositoryUrl || '',
                    type: 'pay_per_scan'
                  }
                });
                
                logger.info(`Charged $0.50 for scan: ${paymentIntent.id}`);
              } catch (chargeError) {
                logger.error('Error charging for scan:', { error: chargeError });
                // Don't fail the scan if payment fails - we already delivered the service
              }
            }
          } else {
            // No payment method - use trial
            const { data: currentBilling } = await getSupabase()
              .from('user_billing')
              .select('trial_scans_used')
              .eq('user_id', user.id)
              .single();

            const currentCount = (currentBilling as { trial_scans_used?: number })?.trial_scans_used || 0;

            await getSupabase()
              .from('user_billing')
              .update({ 
                trial_scans_used: currentCount + 1
              })
              .eq('user_id', user.id);
          }

          // Log the scan
          await getSupabase()
            .from('trial_usage')
            .insert({
              user_id: user.id,
              repository_url: repositoryUrl,
              scan_type: req.path.includes('pull-request') ? 'pull_request' : 'repository'
            });
        } catch (err) {
          logger.error('Error processing scan billing:', { error: err });
        }
      })();
    }
    
    return originalSend.call(this, data);
  };

  next();
}