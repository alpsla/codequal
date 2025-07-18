const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixTester5Billing() {
  const userId = '49c5ae94-c466-458f-80fb-b66270882469';
  const stripeCustomerId = 'cus_ShcyNc44MhK6Fn';
  const stripeSubscriptionId = 'sub_1RmDihH9VfPdHERjA6t3M9pN';
  
  console.log('Fixing tester5 billing...\n');
  
  try {
    // Update the user_billing record
    const { data: updated, error: updateError } = await supabase
      .from('user_billing')
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        subscription_status: 'active',
        subscription_tier: 'team',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating user_billing:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated user_billing:');
    console.log('- User ID:', updated.user_id);
    console.log('- Stripe Customer ID:', updated.stripe_customer_id);
    console.log('- Subscription ID:', updated.stripe_subscription_id);
    console.log('- Subscription tier:', updated.subscription_tier);
    console.log('- Subscription status:', updated.subscription_status);
    
    // Verify the update
    console.log('\n📊 Final verification:');
    const { data: final } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (final) {
      console.log('✅ User now has:');
      console.log(`- Tier: ${final.subscription_tier} (was: free)`);
      console.log(`- Status: ${final.subscription_status} (was: null)`);
      console.log(`- Stripe linked: ${final.stripe_customer_id ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixTester5Billing().then(() => process.exit(0));