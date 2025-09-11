const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateTester4Billing() {
  const userId = '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1';
  const stripeCustomerId = 'cus_ShcOUvx15fvIjz';
  const stripeSubscriptionId = 'sub_1RmDA8H9VfPdHERjJgOH32ti';
  
  try {
    console.log(`Updating user_billing for tester4 (${userId})...`);
    
    // Update the user_billing record
    const { data: updated, error: updateError } = await supabase
      .from('user_billing')
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: 'active',
        subscription_tier: 'team', // Temporarily use 'team' until schema is updated
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

updateTester4Billing().then(() => process.exit(0));