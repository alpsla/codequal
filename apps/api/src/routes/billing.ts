import { Router, Request, Response } from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { authMiddlewareWorkaround } from '../middleware/auth-middleware-workaround';
import { AppError, ErrorCodes } from '../middleware/error-handler';
import Stripe from 'stripe';

const router = Router();
router.use(authMiddlewareWorkaround);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Get billing status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;

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
    const billingData = billing || {
      subscription_status: null,
      subscription_tier: 'free',
      trial_scans_used: 0,
      trial_scans_limit: 10,
      trial_ends_at: null
    };

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
      }
    });
  } catch (error) {
    console.error('Error fetching billing status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch billing status',
      code: ErrorCodes.INTERNAL_ERROR
    });
  }
});

// Create checkout session
router.post('/create-checkout', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
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

    let customerId = billing?.stripe_customer_id;

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
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      code: ErrorCodes.INTERNAL_ERROR
    });
  }
});

// Create setup intent for pay-per-scan
router.post('/create-setup-intent', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;

    // Get or create Stripe customer
    const { data: billing } = await getSupabase()
      .from('user_billing')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = billing?.stripe_customer_id;

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
    console.error('Error creating setup intent:', error);
    res.status(500).json({ 
      error: 'Failed to create setup intent',
      code: ErrorCodes.INTERNAL_ERROR
    });
  }
});

// Charge for a single scan
router.post('/charge-scan', async (req: Request, res: Response) => {
  try {
    const { user } = req as AuthenticatedRequest;
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
      customer: billing.stripe_customer_id,
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
    console.error('Error charging for scan:', error);
    res.status(500).json({ 
      error: 'Failed to process payment',
      code: ErrorCodes.PAYMENT_FAILED
    });
  }
});

export default router;