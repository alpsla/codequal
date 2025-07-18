const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
// Load both .env files - root for price IDs, api for database credentials
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncSubscription(customerEmail) {
  try {
    // Find customer in Stripe
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.error('No Stripe customer found for email:', customerEmail);
      return;
    }

    const customer = customers.data[0];
    console.log('Found Stripe customer:', customer.id);

    // Get all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      console.error('No subscription found');
      return;
    }

    console.log('Found subscriptions:', subscriptions.data.length);
    subscriptions.data.forEach(sub => {
      console.log(`- ${sub.id}: ${sub.status} (created: ${new Date(sub.created * 1000).toISOString()})`);
    });

    // Get the most recent active subscription, or the most recent one
    const subscription = subscriptions.data.find(s => s.status === 'active') || subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;
    
    // Determine tier
    let tier = 'free';
    if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
      tier = 'individual';
    } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
      tier = 'team';
    } else if (priceId === process.env.STRIPE_API_PRICE_ID) {
      tier = 'api';
    }

    console.log('Subscription details:');
    console.log('- ID:', subscription.id);
    console.log('- Status:', subscription.status);
    console.log('- Price ID:', priceId);
    console.log('- Tier:', tier);
    
    console.log('\nEnvironment Price IDs:');
    console.log('- STRIPE_INDIVIDUAL_PRICE_ID:', process.env.STRIPE_INDIVIDUAL_PRICE_ID);
    console.log('- STRIPE_TEAM_PRICE_ID:', process.env.STRIPE_TEAM_PRICE_ID);
    console.log('- STRIPE_API_PRICE_ID:', process.env.STRIPE_API_PRICE_ID);

    // Update user_billing in Supabase
    const { data: userBilling, error: fetchError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('stripe_customer_id', customer.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user_billing:', fetchError);
      return;
    }

    if (!userBilling) {
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (userError || !user) {
        console.error('User not found in database');
        return;
      }

      // Create user_billing record
      const { error: insertError } = await supabase
        .from('user_billing')
        .insert({
          user_id: user.id,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_tier: tier,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating user_billing:', insertError);
        return;
      }

      console.log('Created user_billing record');
    } else {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_billing')
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_tier: tier,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customer.id);

      if (updateError) {
        console.error('Error updating user_billing:', updateError);
        return;
      }

      console.log('Updated user_billing record');
    }

    // Verify the update
    const { data: updated, error: verifyError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('stripe_customer_id', customer.id)
      .single();

    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }

    console.log('\nUpdated user_billing:');
    console.log('- User ID:', updated.user_id);
    console.log('- Subscription tier:', updated.subscription_tier);
    console.log('- Subscription status:', updated.subscription_status);

  } catch (error) {
    console.error('Error syncing subscription:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node sync-stripe-subscription.js <customer-email>');
  process.exit(1);
}

syncSubscription(email).then(() => process.exit(0));