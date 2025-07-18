const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function linkStripeCustomer(userId, stripeCustomerEmail) {
  try {
    // Find user in database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User not found in database:', userId);
      return;
    }

    console.log('Found user:', user.email);

    // Find Stripe customer
    const customers = await stripe.customers.list({
      email: stripeCustomerEmail,
      limit: 1
    });

    if (customers.data.length === 0) {
      console.error('No Stripe customer found for email:', stripeCustomerEmail);
      return;
    }

    const customer = customers.data[0];
    console.log('Found Stripe customer:', customer.id);

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    let subscriptionData = {
      stripe_customer_id: customer.id,
      subscription_status: 'inactive',
      subscription_tier: 'free',
      updated_at: new Date().toISOString()
    };

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0]?.price.id;
      
      let tier = 'free';
      if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
        tier = 'individual';
      } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
        tier = 'team';
      } else if (priceId === process.env.STRIPE_API_PRICE_ID) {
        tier = 'api';
      }

      subscriptionData = {
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_tier: tier,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      console.log('Found active subscription:', subscription.id);
      console.log('Tier:', tier);
    }

    // Check if user_billing exists
    const { data: existingBilling } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingBilling) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_billing')
        .update(subscriptionData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user_billing:', updateError);
        return;
      }
      console.log('Updated user_billing record');
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('user_billing')
        .insert({
          user_id: userId,
          ...subscriptionData,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error creating user_billing:', insertError);
        return;
      }
      console.log('Created user_billing record');
    }

    // Verify the update
    const { data: updated } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('\nUpdated user_billing:');
    console.log('- Subscription tier:', updated.subscription_tier);
    console.log('- Subscription status:', updated.subscription_status);
    console.log('- Stripe customer:', updated.stripe_customer_id);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get arguments
const userId = process.argv[2];
const stripeEmail = process.argv[3];

if (!userId || !stripeEmail) {
  console.log('Usage: node manual-link-stripe-customer.js <user-id> <stripe-customer-email>');
  console.log('Example: node manual-link-stripe-customer.js 7dcd7c31-ccc1-4479-889a-ad52d69e5a56 tester3@grr.la');
  process.exit(1);
}

linkStripeCustomer(userId, stripeEmail).then(() => process.exit(0));