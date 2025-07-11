require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function verifyUserCharges(email) {
  console.log(`\n=== Verifying charges for user: ${email} ===\n`);

  try {
    // 1. Get user from database
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (userError || !users || users.length === 0) {
      console.error('User not found in database');
      return;
    }

    const user = users[0];
    console.log('User ID:', user.id);

    // 2. Check billing data
    const { data: billing } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!billing) {
      console.error('No billing record found for user');
      return;
    }

    console.log('\n--- Billing Information ---');
    console.log('Stripe Customer ID:', billing.stripe_customer_id || 'None');
    console.log('Subscription tier:', billing.subscription_tier);
    console.log('Trial scans used:', billing.trial_scans_used);
    console.log('Trial scans limit:', billing.trial_scans_limit);

    // 3. Check payment methods
    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id);

    console.log('\n--- Payment Methods ---');
    console.log('Number of payment methods:', paymentMethods?.length || 0);
    
    if (paymentMethods && paymentMethods.length > 0) {
      paymentMethods.forEach((pm, index) => {
        console.log(`\nPayment Method ${index + 1}:`);
        console.log('  Brand:', pm.brand);
        console.log('  Last 4:', pm.last_four);
        console.log('  Stripe PM ID:', pm.stripe_payment_method_id);
      });
    }

    // 4. Check Stripe for recent charges
    if (billing.stripe_customer_id) {
      console.log('\n--- Recent Stripe Charges ---');
      
      try {
        // Get payment intents for this customer
        const paymentIntents = await stripe.paymentIntents.list({
          customer: billing.stripe_customer_id,
          limit: 10,
        });

        console.log(`\nFound ${paymentIntents.data.length} payment intents:\n`);

        paymentIntents.data.forEach((intent, index) => {
          console.log(`Payment Intent ${index + 1}:`);
          console.log('  ID:', intent.id);
          console.log('  Amount:', `$${(intent.amount / 100).toFixed(2)}`);
          console.log('  Status:', intent.status);
          console.log('  Description:', intent.description);
          console.log('  Created:', new Date(intent.created * 1000).toLocaleString());
          
          if (intent.metadata) {
            console.log('  Metadata:');
            Object.entries(intent.metadata).forEach(([key, value]) => {
              console.log(`    ${key}:`, value);
            });
          }
          console.log('');
        });

        // Also check for charges
        const charges = await stripe.charges.list({
          customer: billing.stripe_customer_id,
          limit: 10,
        });

        if (charges.data.length > 0) {
          console.log(`\nFound ${charges.data.length} charges:\n`);
          
          charges.data.forEach((charge, index) => {
            console.log(`Charge ${index + 1}:`);
            console.log('  ID:', charge.id);
            console.log('  Amount:', `$${(charge.amount / 100).toFixed(2)}`);
            console.log('  Status:', charge.status);
            console.log('  Description:', charge.description);
            console.log('  Created:', new Date(charge.created * 1000).toLocaleString());
            console.log('');
          });
        }

      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError.message);
      }
    }

    // 5. Check trial usage logs
    const { data: trialUsage } = await supabase
      .from('trial_usage')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (trialUsage && trialUsage.length > 0) {
      console.log('\n--- Recent Trial Usage ---');
      console.log(`Found ${trialUsage.length} usage records:\n`);
      
      trialUsage.forEach((usage, index) => {
        console.log(`Usage ${index + 1}:`);
        console.log('  Repository:', usage.repository_url);
        console.log('  Scan type:', usage.scan_type);
        console.log('  Created:', new Date(usage.created_at).toLocaleString());
      });
    }

    // 6. Summary
    console.log('\n--- SUMMARY ---');
    if (paymentMethods && paymentMethods.length > 0) {
      console.log('✅ User has payment method on file');
      console.log('✅ Should be charged $0.50 per scan');
      
      const recentCharges = paymentIntents.data.filter(pi => 
        pi.amount === 50 && 
        pi.status === 'succeeded' &&
        pi.description && pi.description.includes('scan')
      );
      
      if (recentCharges.length > 0) {
        console.log(`✅ Found ${recentCharges.length} successful $0.50 scan charges`);
      } else {
        console.log('⚠️  No $0.50 scan charges found in Stripe');
      }
    } else {
      console.log('❌ User has no payment method');
      console.log('❌ Using trial scans instead of being charged');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.error('Please provide user email as argument');
  console.error('Usage: node verify-user-charges.js user@email.com');
  process.exit(1);
}

verifyUserCharges(email).then(() => process.exit(0));