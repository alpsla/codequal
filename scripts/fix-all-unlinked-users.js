const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixAllUnlinkedUsers() {
  console.log('🔧 Fixing all unlinked users...\n');
  
  try {
    // Get recent checkout sessions
    const recentSessions = await stripe.checkout.sessions.list({
      created: {
        gte: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
      },
      limit: 100,
      expand: ['data.customer']
    });
    
    console.log(`Found ${recentSessions.data.length} checkout sessions\n`);
    
    let fixed = 0;
    let alreadyLinked = 0;
    let noUserBilling = 0;
    
    for (const session of recentSessions.data) {
      if (session.status !== 'complete' || !session.metadata?.user_id) {
        continue;
      }
      
      const userId = session.metadata.user_id;
      const customer = session.customer;
      const customerId = typeof customer === 'string' ? customer : customer?.id;
      const customerEmail = typeof customer === 'string' ? null : customer?.email;
      
      if (!customerId) continue;
      
      // Check if user_billing exists and needs update
      const { data: billing, error } = await supabase
        .from('user_billing')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching billing for user ${userId}:`, error.message);
        continue;
      }
      
      if (!billing) {
        console.log(`❌ No user_billing record for user ${userId} (${customerEmail})`);
        noUserBilling++;
        continue;
      }
      
      if (billing.stripe_customer_id === customerId && billing.subscription_tier !== 'free') {
        alreadyLinked++;
        continue;
      }
      
      // Get active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });
      
      if (subscriptions.data.length === 0) {
        continue;
      }
      
      const subscription = subscriptions.data[0];
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
      
      // Update user_billing
      console.log(`Fixing user ${userId} (${customerEmail})...`);
      console.log(`  Before: tier=${billing.subscription_tier}, customer=${billing.stripe_customer_id || 'NOT SET'}`);
      
      const { error: updateError } = await supabase
        .from('user_billing')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_tier: tier,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error(`  ❌ Error: ${updateError.message}`);
      } else {
        console.log(`  ✅ Fixed: tier=${tier}, customer=${customerId}`);
        fixed++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('─────────────────────────────');
    console.log(`✅ Fixed: ${fixed} users`);
    console.log(`✅ Already linked: ${alreadyLinked} users`);
    console.log(`❌ No user_billing: ${noUserBilling} users`);
    console.log(`📊 Total processed: ${recentSessions.data.length} sessions`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAllUnlinkedUsers().then(() => process.exit(0));