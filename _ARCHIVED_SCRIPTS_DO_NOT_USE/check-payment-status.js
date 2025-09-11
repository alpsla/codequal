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

async function checkPaymentStatus() {
  console.log('\n=== Checking Payment Status for All Users ===\n');

  try {
    // Get all users with billing data
    const { data: billingData } = await supabase
      .from('user_billing')
      .select('*')
      .order('created_at', { ascending: false });

    for (const billing of billingData || []) {
      console.log(`\nUser ID: ${billing.user_id}`);
      console.log(`Stripe Customer: ${billing.stripe_customer_id || 'None'}`);
      
      // Check payment methods in database
      const { data: dbPaymentMethods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', billing.user_id);
      
      console.log(`Payment methods in DB: ${dbPaymentMethods?.length || 0}`);
      
      if (dbPaymentMethods && dbPaymentMethods.length > 0) {
        dbPaymentMethods.forEach((pm, idx) => {
          console.log(`  ${idx + 1}. ${pm.brand} ****${pm.last_four} (${pm.stripe_payment_method_id})`);
        });
      }
      
      // Check Stripe directly
      if (billing.stripe_customer_id) {
        try {
          const stripePMs = await stripe.paymentMethods.list({
            customer: billing.stripe_customer_id,
            type: 'card'
          });
          
          console.log(`Payment methods in Stripe: ${stripePMs.data.length}`);
          
          if (stripePMs.data.length > 0) {
            stripePMs.data.forEach((pm, idx) => {
              console.log(`  ${idx + 1}. ${pm.card.brand} ****${pm.card.last4} (${pm.id})`);
            });
          }
          
          // Check for mismatch
          if (stripePMs.data.length > 0 && (!dbPaymentMethods || dbPaymentMethods.length === 0)) {
            console.log('⚠️  WARNING: Stripe has payment methods but database does not!');
          }
        } catch (stripeError) {
          console.log('Error checking Stripe:', stripeError.message);
        }
      }
      
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPaymentStatus().then(() => process.exit(0));