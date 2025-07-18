const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function manualUpdateUserBilling() {
  const userId = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56';
  const userEmail = 'tester3@grr.la';
  const stripeCustomerId = 'cus_Shc8Z5vb3ZqCLD';
  
  try {
    console.log(`Manually updating user_billing for user ${userId}...`);
    
    // Get the Stripe subscription details
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 10
    });
    
    if (subscriptions.data.length === 0) {
      console.error('No subscription found for customer');
      return;
    }
    
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
    
    // Update the user_billing record
    const { data: updated, error: updateError } = await supabase
      .from('user_billing')
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        subscription_tier: tier,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user_billing:', updateError);
      return;
    }
    
    console.log('\nSuccessfully updated user_billing:');
    console.log('- User ID:', updated.user_id);
    console.log('- Stripe Customer ID:', updated.stripe_customer_id);
    console.log('- Subscription ID:', updated.stripe_subscription_id);
    console.log('- Subscription tier:', updated.subscription_tier);
    console.log('- Subscription status:', updated.subscription_status);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

manualUpdateUserBilling().then(() => process.exit(0));