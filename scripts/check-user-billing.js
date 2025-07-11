require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserBilling(email) {
  console.log(`\nChecking billing for user: ${email}\n`);

  // Get user
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (userError || !users || users.length === 0) {
    console.error('User not found');
    return;
  }

  const user = users[0];
  console.log('User ID:', user.id);

  // Check billing
  const { data: billing } = await supabase
    .from('user_billing')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('\nBilling data:');
  console.log('- Subscription tier:', billing?.subscription_tier || 'None');
  console.log('- Trial scans used:', billing?.trial_scans_used || 0);
  console.log('- Trial scans limit:', billing?.trial_scans_limit || 10);
  console.log('- Stripe customer ID:', billing?.stripe_customer_id || 'None');

  // Check payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', user.id);

  console.log('\nPayment methods:', paymentMethods?.length || 0);
  if (paymentMethods && paymentMethods.length > 0) {
    paymentMethods.forEach((pm, index) => {
      console.log(`\nPayment Method ${index + 1}:`);
      console.log('- Brand:', pm.brand);
      console.log('- Last 4:', pm.last_four);
      console.log('- Stripe ID:', pm.stripe_payment_method_id);
      console.log('- Is default:', pm.is_default);
    });
  }

  // Check trial repository
  const { data: trialRepo } = await supabase
    .from('user_trial_repository')
    .select('*')
    .eq('user_id', user.id)
    .single();

  console.log('\nTrial repository:', trialRepo?.repository_url || 'None set');
}

const email = process.argv[2];
if (!email) {
  console.error('Please provide user email as argument');
  process.exit(1);
}

checkUserBilling(email).then(() => process.exit(0));