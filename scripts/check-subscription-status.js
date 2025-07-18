const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkSubscriptionStatus(userId, email) {
  console.log(`🔍 Checking subscription status for ${email} (${userId})\n`);
  
  try {
    // 1. Check Supabase billing record
    const { data: billing, error } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching billing:', error);
      return;
    }
    
    console.log('📊 Supabase Billing Record:');
    console.log(`- Status: ${billing.subscription_status}`);
    console.log(`- Tier: ${billing.subscription_tier}`);
    console.log(`- Stripe Customer: ${billing.stripe_customer_id}`);
    console.log(`- Stripe Subscription: ${billing.stripe_subscription_id}`);
    
    // 2. Check Stripe subscription
    if (billing.stripe_subscription_id) {
      console.log('\n📊 Stripe Subscription:');
      try {
        const subscription = await stripe.subscriptions.retrieve(billing.stripe_subscription_id);
        console.log(`- Status: ${subscription.status}`);
        console.log(`- Created: ${new Date(subscription.created * 1000).toISOString()}`);
        console.log(`- Current Period End: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        
        // Check why it might be incomplete
        if (subscription.status === 'incomplete') {
          console.log('\n⚠️  Subscription is INCOMPLETE. Common reasons:');
          console.log('1. Payment method failed during checkout');
          console.log('2. 3D Secure authentication required');
          console.log('3. Card was declined');
          console.log('4. Customer hasn\'t completed payment');
          
          // Check latest invoice
          if (subscription.latest_invoice) {
            const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
            console.log(`\n💳 Latest Invoice:`);
            console.log(`- Status: ${invoice.status}`);
            console.log(`- Amount: $${(invoice.amount_due / 100).toFixed(2)}`);
            
            if (invoice.payment_intent) {
              const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
              console.log(`\n💰 Payment Intent:`);
              console.log(`- Status: ${paymentIntent.status}`);
              if (paymentIntent.last_payment_error) {
                console.log(`- Error: ${paymentIntent.last_payment_error.message}`);
              }
            }
          }
        }
        
        // If Stripe status differs from Supabase, update it
        if (subscription.status !== billing.subscription_status) {
          console.log(`\n🔄 Updating Supabase to match Stripe status: ${subscription.status}`);
          await supabase
            .from('user_billing')
            .update({
              subscription_status: subscription.status,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        }
        
      } catch (stripeError) {
        console.error('Error fetching from Stripe:', stripeError.message);
      }
    }
    
    console.log('\n💡 What to do:');
    if (billing.subscription_status === 'incomplete') {
      console.log('1. Customer needs to complete payment');
      console.log('2. Check if they received an email from Stripe');
      console.log('3. They may need to authenticate with their bank (3D Secure)');
      console.log('4. Or provide a different payment method');
    } else {
      console.log('✅ Subscription is active and working!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check test1@grr.la
checkSubscriptionStatus('3c1f1438-f5bd-41d2-a9ef-bf4268b77ff7', 'test1@grr.la')
  .then(() => process.exit(0));