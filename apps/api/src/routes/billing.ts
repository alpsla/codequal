import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth-middleware';
import { AppError } from '../middleware/error-handler';
import { ErrorCodes } from '../utils/error-logger';
import { createLogger } from '@codequal/core/utils';
import Stripe from 'stripe';

const router = Router();
const logger = createLogger('billing-routes');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Stripe error interface
interface StripeError extends Error {
  raw?: {
    message?: string;
    code?: string;
    type?: string;
  };
}

// Get billing status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { user } = (req as AuthenticatedRequest);

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        code: ErrorCodes.AUTH_REQUIRED 
      });
    }

    logger.info('Fetching billing status', { userId: user.id, email: user.email });
    
    // Get billing information
    const { data: billing, error: billingError } = await getSupabase()
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (billingError && billingError.code !== 'PGRST116') {
      throw new AppError('Failed to fetch billing data', 500, ErrorCodes.INTERNAL_ERROR);
    }

    // Get trial repository if exists
    const { data: trialRepo } = await getSupabase()
      .from('user_trial_repository')
      .select('repository_url')
      .eq('user_id', user.id)
      .single();

    // Create default billing if doesn't exist
    let billingData = billing || {
      subscription_status: null,
      subscription_tier: 'free',
      trial_scans_used: 0,
      trial_scans_limit: 10,
      trial_ends_at: null,
      stripe_customer_id: null
    };
    
    // If no billing record exists, create one
    if (!billing) {
      logger.info('No billing record found, creating one', { userId: user.id });
      const { data: newBilling, error: createError } = await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: user.id,
          subscription_tier: 'free',
          trial_scans_used: 0,
          trial_scans_limit: 10
        })
        .select()
        .single();
      
      if (createError) {
        logger.error('Error creating billing record', createError);
      }
      
      if (newBilling) {
        billingData = newBilling;
        logger.info('Created billing record', billingData);
      }
    }

    // Check if user has payment methods
    let hasPaymentMethod = false;
    
    // First check local database
    const { data: paymentMethodsData } = await getSupabase()
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (paymentMethodsData && paymentMethodsData.length > 0) {
      hasPaymentMethod = true;
    } else if (billingData.stripe_customer_id) {
      // If not in local DB, check Stripe directly
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: billingData.stripe_customer_id as string,
          type: 'card'
        });
        hasPaymentMethod = paymentMethods.data.length > 0;
        
        // If found in Stripe but not in local DB, sync it
        if (hasPaymentMethod && paymentMethods.data.length > 0) {
          const pm = paymentMethods.data[0];
          await getSupabase()
            .from('payment_methods')
            .insert({
              user_id: user.id,
              stripe_payment_method_id: pm.id,
              last_four: pm.card?.last4,
              brand: pm.card?.brand,
              is_default: true
            })
            .single();
        }
      } catch (error) {
        logger.error('Error checking payment methods', error instanceof Error ? error : { error: String(error) });
      }
    }

    // Calculate web scan usage for Individual plan
    let webScanUsage = null;
    if (billingData.subscription_tier === 'individual') {
      // Get the current billing period start date
      const now = new Date();
      const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
      
      // Count web scans for this billing period
      const { data: scanCount } = await getSupabase()
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', billingPeriodStart.toISOString());
      
      webScanUsage = {
        scansUsed: scanCount || 0,
        scansLimit: 50
      };
    }

    res.json({
      subscription: {
        status: billingData.subscription_status,
        tier: billingData.subscription_tier,
        trialEndsAt: billingData.trial_ends_at
      },
      trialUsage: {
        scansUsed: billingData.trial_scans_used,
        scansLimit: billingData.trial_scans_limit,
        trialRepository: trialRepo?.repository_url || null
      },
      webScanUsage,
      hasPaymentMethod
    });
  } catch (error) {
    logger.error('Error fetching billing status', error instanceof Error ? error : { error: String(error) });
    res.status(500).json({ 
      error: 'Failed to fetch billing status',
      code: ErrorCodes.INTERNAL_ERROR
    });
  }
});

// Create checkout session
router.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const { user } = (req as AuthenticatedRequest);

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        code: ErrorCodes.AUTH_REQUIRED 
      });
    }
    const { priceId } = req.body;

    if (!priceId) {
      throw new AppError('Price ID is required', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Get or create Stripe customer
    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId: string | undefined = billing?.stripe_customer_id as string | undefined;

    if (!customerId) {
      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;

      // Save customer ID
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          subscription_tier: 'free',
          trial_scans_used: 0,
          trial_scans_limit: 10
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/subscribe?canceled=true`,
      metadata: {
        user_id: user.id
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    logger.error('Error creating checkout session', error instanceof Error ? error : { error: String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && (error as StripeError).raw ? (error as StripeError).raw : null;
    logger.error('Error details', { message: errorMessage, details: errorDetails });
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      code: ErrorCodes.INTERNAL_ERROR,
      details: errorMessage
    });
  }
});

// Create setup intent for pay-per-scan
router.post('/create-setup-intent', async (req: Request, res: Response) => {
  try {
    const { user } = (req as AuthenticatedRequest);

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        code: ErrorCodes.AUTH_REQUIRED 
      });
    }

    // Get or create Stripe customer
    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId: string | undefined = billing?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;

      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          subscription_tier: 'free'
        });
    }

    // Create setup intent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        user_id: user.id
      }
    });

    res.json({ 
      clientSecret: setupIntent.client_secret,
      customerId 
    });
  } catch (error) {
    logger.error('Error creating setup intent', error instanceof Error ? error : { error: String(error) });
    res.status(500).json({ 
      error: 'Failed to create setup intent',
      code: ErrorCodes.INTERNAL_ERROR
    });
  }
});

// Confirm payment method was added (for local dev without webhooks)
router.post('/confirm-payment-method', async (req: Request, res: Response) => {
  try {
    const { user } = (req as AuthenticatedRequest);

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        code: ErrorCodes.AUTH_REQUIRED 
      });
    }
    const { setupIntentId } = req.body;

    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!billing?.stripe_customer_id) {
      throw new AppError('No customer found', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Check if customer has payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: billing.stripe_customer_id as string,
      type: 'card'
    });

    if (paymentMethods.data.length > 0) {
      // Store payment method in local database
      for (const pm of paymentMethods.data) {
        // Check if already exists
        const { data: existing } = await getSupabase()
          .from('payment_methods')
          .select('id')
          .eq('stripe_payment_method_id', pm.id)
          .single();
        
        if (!existing) {
          await getSupabase()
            .from('payment_methods')
            .insert({
              user_id: user.id,
              stripe_payment_method_id: pm.id,
              last_four: pm.card?.last4,
              brand: pm.card?.brand,
              is_default: true
            });
        }
      }
    }

    res.json({ 
      success: true,
      hasPaymentMethod: paymentMethods.data.length > 0,
      paymentMethodCount: paymentMethods.data.length
    });
  } catch (error) {
    logger.error('Error confirming payment method', error instanceof Error ? error : { error: String(error) });
    res.status(500).json({ 
      error: 'Failed to confirm payment method',
      code: ErrorCodes.INTERNAL_ERROR
    });
  }
});

// Charge for a single scan
router.post('/charge-scan', async (req: Request, res: Response) => {
  try {
    const { user } = (req as AuthenticatedRequest);

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        code: ErrorCodes.AUTH_REQUIRED 
      });
    }
    const { paymentMethodId } = req.body;

    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!billing?.stripe_customer_id) {
      throw new AppError('No payment method on file', 400, ErrorCodes.PAYMENT_FAILED);
    }

    // Create payment intent for $0.50
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 50, // $0.50 in cents
      currency: 'usd',
      customer: billing.stripe_customer_id as string,
      payment_method: paymentMethodId,
      confirm: true,
      description: 'Single repository scan',
      metadata: {
        user_id: user.id,
        type: 'pay_per_scan'
      }
    });

    res.json({ 
      success: paymentIntent.status === 'succeeded',
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    logger.error('Error charging for scan', error instanceof Error ? error : { error: String(error) });
    res.status(500).json({ 
      error: 'Failed to process payment',
      code: ErrorCodes.PAYMENT_FAILED
    });
  }
});

export default router;