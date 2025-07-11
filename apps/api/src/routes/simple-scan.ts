import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { getSupabase } from '@codequal/database/supabase/client';
import { normalizeRepositoryUrl } from '../utils/repository-utils';
import Stripe from 'stripe';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Simple scan endpoint for testing
router.post('/simple-scan', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { repositoryUrl } = req.body;

    if (!repositoryUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    
    // Normalize the repository URL for consistent comparison
    const normalizedUrl = normalizeRepositoryUrl(repositoryUrl);

    // Check if user has payment method
    const { data: paymentMethods } = await getSupabase()
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', user.id)
      .limit(1);
    
    const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;

    // Check billing status
    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const subscriptionTier = billing?.subscription_tier || 'free';
    const isSubscribed = subscriptionTier !== 'free';
    
    // Check if API plan user is trying to use web scan
    if (subscriptionTier === 'api') {
      return res.status(403).json({
        error: 'Web scanning not available on API plan',
        code: 'PLAN_RESTRICTION',
        details: {
          message: 'Please upgrade to Individual or Team plan for web scanning access'
        }
      });
    }
    
    // Check Individual plan web scan limits
    if (subscriptionTier === 'individual') {
      const now = new Date();
      const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { count: scanCount } = await getSupabase()
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', billingPeriodStart.toISOString());
      
      const webScansUsed = scanCount || 0;
      const webScansLimit = 50;
      
      if (webScansUsed >= webScansLimit && !hasPaymentMethod) {
        return res.status(403).json({
          error: 'Monthly web scan limit reached',
          code: 'WEB_SCAN_LIMIT_REACHED',
          details: {
            scans_used: webScansUsed,
            scans_limit: webScansLimit,
            message: 'Add a payment method for pay-as-you-go ($0.50/scan) or upgrade to Team plan'
          }
        });
      }
    }

    // Check trial limits for free users
    if (!isSubscribed) {
      const trialScansUsed = (billing?.trial_scans_used as number) || 0;
      const trialScansLimit = (billing?.trial_scans_limit as number) || 10;
      const canUseTrial = trialScansUsed < trialScansLimit;

      if (!hasPaymentMethod && !canUseTrial) {
        return res.status(403).json({
          error: 'Trial limit reached',
          code: 'TRIAL_LIMIT_REACHED',
          details: {
            scans_used: trialScansUsed,
            scans_limit: trialScansLimit
          }
        });
      }
    }

    // Check trial repository restriction (only for free users without payment)
    if (!hasPaymentMethod && !isSubscribed) {
      const { data: trialRepo, error: trialRepoError } = await getSupabase()
        .from('user_trial_repository')
        .select('repository_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (trialRepo && trialRepo.repository_url) {
        // User already has a trial repository set
        // Normalize the stored URL for comparison
        const normalizedTrialUrl = normalizeRepositoryUrl(trialRepo.repository_url as string);
        
        if (normalizedTrialUrl !== normalizedUrl) {
          return res.status(403).json({
            error: 'Trial limited to one repository',
            code: 'TRIAL_REPOSITORY_LIMIT',
            details: {
              allowed_repository: trialRepo.repository_url,
              requested_repository: repositoryUrl
            }
          });
        }
      } else {
        // First scan - set this as the trial repository
        const { error: insertError } = await getSupabase()
          .from('user_trial_repository')
          .insert({
            user_id: user.id,
            repository_url: normalizedUrl
          });
        
        if (insertError) {
          console.error('Error setting trial repository:', insertError);
          // Continue anyway - don't block the scan
        } else {
          console.log(`Set trial repository for user ${user.id}: ${normalizedUrl}`);
        }
      }
    }

    // Generate a mock analysis result
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate web scans for Individual plan
    let webScansUsed = 0;
    if (subscriptionTier === 'individual') {
      const now = new Date();
      const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { count: scanCount } = await getSupabase()
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', billingPeriodStart.toISOString());
      
      webScansUsed = scanCount || 0;
    }
    
    // Determine if trial scans are being used
    const trialScansUsed = (billing?.trial_scans_used as number) || 0;
    const trialScansLimit = (billing?.trial_scans_limit as number) || 10;
    const canUseTrial = !isSubscribed && trialScansUsed < trialScansLimit;
    
    // Handle billing based on subscription tier
    const shouldCharge = (subscriptionTier === 'individual' && webScansUsed >= 50) || 
                        (!isSubscribed && !canUseTrial);
    
    if (shouldCharge && hasPaymentMethod && billing?.stripe_customer_id) {
      try {
        // Charge $0.50
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
            repository_url: repositoryUrl,
            analysis_id: analysisId
          }
        });
        
        console.log(`Charged $0.50 for scan: ${paymentIntent.id}`);
      } catch (error) {
        console.error('Payment failed:', error);
        // Continue anyway - we can handle payment issues separately
      }
    } else if (!isSubscribed) {
      // Update trial usage for free users
      await getSupabase()
        .from('user_billing')
        .update({ 
          trial_scans_used: trialScansUsed + 1
        })
        .eq('user_id', user.id);
    }
    
    // Record the scan in the database (for tracking web scan usage)
    try {
      await getSupabase()
        .from('scans')
        .insert({
          user_id: user.id,
          repository_url: normalizedUrl,
          analysis_id: analysisId,
          scan_type: 'web',
          subscription_tier: subscriptionTier,
          charged: shouldCharge && hasPaymentMethod
        });
    } catch (scanError) {
      console.error('Error recording scan:', scanError);
      // Continue anyway - don't block the response
    }

    // Return mock successful result
    res.json({
      analysisId,
      status: 'complete',
      repositoryUrl,
      reportUrl: `https://codequal.com/reports/${analysisId}`,
      summary: {
        score: 85,
        issues: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 8
        },
        recommendations: [
          'Consider adding more comprehensive error handling',
          'Update dependencies to latest versions',
          'Add more unit test coverage'
        ]
      },
      message: subscriptionTier === 'team' 
        ? 'Analysis complete. (Team Plan - Unlimited)'
        : subscriptionTier === 'individual' && webScansUsed < 50
        ? `Analysis complete. You have ${Math.max(0, 50 - webScansUsed - 1)} web scans remaining this month.`
        : shouldCharge && hasPaymentMethod
        ? 'Analysis complete. $0.50 has been charged to your payment method.'
        : !isSubscribed
        ? `Analysis complete. You have ${Math.max(0, trialScansLimit - trialScansUsed - 1)} trial scans remaining.`
        : 'Analysis complete.'
    });

  } catch (error) {
    console.error('Simple scan error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;