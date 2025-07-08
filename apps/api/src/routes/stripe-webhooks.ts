import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getSupabase } from '@codequal/database/supabase/client';

const router = Router();

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
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log the event
    await logBillingEvent(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Get user ID from customer ID
  const { data: userBilling } = await getSupabase()
    .from('user_billing')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!userBilling) {
    console.error('No user found for customer:', customerId);
    return;
  }

  // Update subscription data
  await getSupabase()
    .from('user_billing')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_tier: determineSubscriptionTier(subscription),
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customerId);
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
  console.log('Payment succeeded for invoice:', invoice.id);
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
  if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
    return 'individual';
  } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
    return 'team';
  }
  
  return 'free';
}

async function logBillingEvent(event: Stripe.Event) {
  const customerId = (event.data.object as any).customer;
  
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

export default router;