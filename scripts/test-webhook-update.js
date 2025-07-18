const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testWebhookUpdate() {
  const userId = '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1';
  const userEmail = 'tester4@grr.la';
  
  try {
    console.log('Testing webhook update for user:', userEmail);
    console.log('User ID:', userId);
    console.log('\n1. Checking current user_billing status...');
    
    // Get current status
    const { data: currentBilling, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (billingError) {
      console.error('Error fetching user_billing:', billingError);
      return;
    }
    
    console.log('Current user_billing:', {
      stripe_customer_id: currentBilling.stripe_customer_id,
      stripe_subscription_id: currentBilling.stripe_subscription_id,
      subscription_tier: currentBilling.subscription_tier,
      subscription_status: currentBilling.subscription_status
    });
    
    if (!currentBilling.stripe_customer_id) {
      console.error('No Stripe customer ID found for user');
      return;
    }
    
    console.log('\n2. Fetching current Stripe subscription...');
    
    // Get current subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: currentBilling.stripe_customer_id,
      limit: 10
    });
    
    if (subscriptions.data.length === 0) {
      console.log('No subscriptions found in Stripe');
      return;
    }
    
    const activeSubscription = subscriptions.data.find(s => s.status === 'active') || subscriptions.data[0];
    const priceId = activeSubscription.items.data[0]?.price.id;
    
    console.log('Active subscription:', {
      id: activeSubscription.id,
      status: activeSubscription.status,
      price_id: priceId,
      created: new Date(activeSubscription.created * 1000).toISOString()
    });
    
    // Determine expected tier
    let expectedTier = 'free';
    if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
      expectedTier = 'individual';
    } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
      expectedTier = 'team';
    } else if (priceId === process.env.STRIPE_API_PRICE_ID) {
      expectedTier = 'api';
    }
    
    console.log('Expected tier based on price:', expectedTier);
    
    console.log('\n3. Checking webhook endpoint configuration...');
    
    // List webhook endpoints
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    console.log(`Found ${webhookEndpoints.data.length} webhook endpoint(s):`);
    webhookEndpoints.data.forEach(endpoint => {
      console.log(`- ${endpoint.url}`);
      console.log(`  Status: ${endpoint.status}`);
      console.log(`  Events: ${endpoint.enabled_events.join(', ')}`);
    });
    
    console.log('\n4. Manual update simulation...');
    
    if (currentBilling.subscription_tier !== expectedTier || 
        currentBilling.stripe_subscription_id !== activeSubscription.id) {
      console.log('Updating user_billing to match Stripe...');
      
      const { data: updated, error: updateError } = await supabase
        .from('user_billing')
        .update({
          stripe_subscription_id: activeSubscription.id,
          subscription_status: activeSubscription.status,
          subscription_tier: expectedTier === 'api' ? 'team' : expectedTier, // Use 'team' until API tier is added
          trial_ends_at: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating user_billing:', updateError);
      } else {
        console.log('Successfully updated user_billing!');
        console.log('New state:', {
          subscription_tier: updated.subscription_tier,
          subscription_status: updated.subscription_status
        });
      }
    } else {
      console.log('User billing is already up to date');
    }
    
    console.log('\n5. Webhook troubleshooting tips:');
    console.log('- Make sure your webhook endpoint is accessible from the internet');
    console.log('- Check that STRIPE_WEBHOOK_SECRET environment variable is set correctly');
    console.log('- Verify that the webhook endpoint includes these events:');
    console.log('  * customer.subscription.created');
    console.log('  * customer.subscription.updated');
    console.log('  * customer.subscription.deleted');
    console.log('- Check API logs for webhook errors');
    console.log(`- Your webhook endpoint should be: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/stripe/webhook`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebhookUpdate().then(() => process.exit(0));