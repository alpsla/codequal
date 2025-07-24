import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils';

const router = Router();
const logger = createLogger('stripe-webhooks');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// Webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Webhook signature verification failed', { error: errorMessage });
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        logger.info('Unhandled event type', { eventType: event.type });
    }

    // Log the event
    await logBillingEvent(event);

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook', error instanceof Error ? error : { error: String(error) });
    res.status(500).send('Webhook processing failed');
  }
});

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Get user ID from customer ID
  let { data: userBilling } = await getSupabase()
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!userBilling) {
    logger.info('No user found by customer ID, trying to find by checkout session');
    
    // Try to find user through checkout session
    try {
      // Get customer email
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if ('email' in customer && customer.email) {
        logger.info('Looking for recent checkout sessions', { email: customer.email });
        
        // Find recent checkout sessions for this customer
        const sessions = await stripe.checkout.sessions.list({
          customer: customerId,
          limit: 10
        });
        
        // Find session with user_id metadata
        const sessionWithUserId = sessions.data.find(s => s.metadata?.user_id);
        
        if (sessionWithUserId && sessionWithUserId.metadata?.user_id) {
          const userId = sessionWithUserId.metadata.user_id;
          logger.info('Found user_id from checkout session', { userId });
          
          // Update user_billing with customer ID
          const { error: linkError } = await getSupabase()
            .from('user_billing')
            .update({
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
          
          if (!linkError) {
            logger.info('Successfully linked customer to user via checkout session');
            // Re-fetch the user billing
            const { data: updatedBilling } = await getSupabase()
              .from('user_billing')
              .select('user_id')
              .eq('stripe_customer_id', customerId)
              .single();
            userBilling = updatedBilling;
          }
        }
      }
    } catch (error) {
      logger.error('Error finding user through checkout session', error instanceof Error ? error : { error: String(error) });
    }
    
    if (!userBilling) {
      logger.error('Still no user found for customer', { customerId });
      return;
    }
  }

  // Update subscription data
  const tier = determineSubscriptionTier(subscription);
  logger.info('Updating subscription for customer', { customerId,
    subscription_id: subscription.id,
    status: subscription.status,
    tier: tier
  });

  const { error } = await getSupabase()
    .from('user_billing')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_tier: tier,
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    logger.error('Error updating user_billing', error);
  } else {
    logger.info('Successfully updated user_billing for customer', { customerId });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  await getSupabase()
    .from('user_billing')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Log successful payment
  logger.info('Payment succeeded for invoice', { invoiceId: invoice.id });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Update subscription status
  await getSupabase()
    .from('user_billing')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  if (!paymentMethod.customer) return;

  const customerId = paymentMethod.customer as string;

  // Get user ID from customer ID
  const { data: userBilling } = await getSupabase()
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!userBilling) return;

  // Store payment method reference
  await getSupabase()
    .from('payment_methods')
    .insert({
      user_id: userBilling.user_id,
      stripe_payment_method_id: paymentMethod.id,
      last_four: paymentMethod.card?.last4,
      brand: paymentMethod.card?.brand,
      is_default: true // Set as default if it's the first one
    });
}

async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  // Remove payment method reference
  await getSupabase()
    .from('payment_methods')
    .delete()
    .eq('stripe_payment_method_id', paymentMethod.id);
}

function determineSubscriptionTier(subscription: Stripe.Subscription): string {
  // Determine tier based on price ID or metadata
  const priceId = subscription.items.data[0]?.price.id;
  
  // Map your Stripe price IDs to tiers
  if (priceId === process.env.STRIPE_API_PRICE_ID) {
    return 'api';
  } else if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
    return 'individual';
  } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
    return 'team';
  }
  
  return 'free';
}

async function logBillingEvent(event: Stripe.Event) {
  const eventObject = event.data.object as Record<string, unknown>;
  const customerId = eventObject.customer as string | undefined;
  
  if (customerId) {
    const { data: userBilling } = await getSupabase()
      .from('user_billing')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userBilling) {
      await getSupabase()
        .from('billing_events')
        .insert({
          user_id: userBilling.user_id,
          event_type: event.type,
          stripe_event_id: event.id,
          data: event.data.object
        });
    }
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  logger.info('Processing checkout.session.completed', { sessionId: session.id });
  
  const customerId = session.customer as string;
  const userIdFromMetadata = session.metadata?.user_id;
  
  if (!customerId || !userIdFromMetadata) {
    logger.error('Missing customer ID or user ID in checkout session');
    return;
  }
  
  logger.info('Linking user to Stripe customer', { userId: userIdFromMetadata, customerId });
  
  // Update user_billing with the Stripe customer ID
  const { error } = await getSupabase()
    .from('user_billing')
    .update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userIdFromMetadata);
  
  if (error) {
    logger.error('Error linking Stripe customer to user', error);
  } else {
    logger.info('Successfully linked Stripe customer to user');
    
    // If there's a subscription, it will be handled by the subscription.created event
  }
}

export default router;