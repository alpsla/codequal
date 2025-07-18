const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function findUnlinkedSubscriptions() {
  console.log('🔍 Finding users with unlinked Stripe subscriptions...\n');
  
  try {
    // 1. Get all user_billing records with free tier
    const { data: freeUsers, error } = await supabase
      .from('user_billing')
      .select('user_id, stripe_customer_id, subscription_tier, created_at')
      .eq('subscription_tier', 'free');
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log(`Found ${freeUsers.length} users with free tier\n`);
    
    // 2. Check recent Stripe subscriptions
    console.log('Checking recent Stripe subscriptions...\n');
    const recentSubscriptions = await stripe.subscriptions.list({
      created: {
        gte: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // Last 24 hours
      },
      limit: 100
    });
    
    console.log(`Found ${recentSubscriptions.data.length} subscriptions created in last 24 hours\n`);
    
    // 3. Group by status
    const activeNotLinked = [];
    const allActive = recentSubscriptions.data.filter(s => s.status === 'active');
    
    for (const sub of allActive) {
      const customer = await stripe.customers.retrieve(sub.customer);
      
      // Check if this customer is linked to any user
      const { data: linkedUser } = await supabase
        .from('user_billing')
        .select('user_id, subscription_tier')
        .eq('stripe_customer_id', customer.id)
        .single();
      
      if (!linkedUser || linkedUser.subscription_tier === 'free') {
        activeNotLinked.push({
          customer_id: customer.id,
          customer_email: customer.email,
          subscription_id: sub.id,
          created: new Date(sub.created * 1000).toISOString(),
          price_id: sub.items.data[0]?.price.id,
          linked_user: linkedUser?.user_id || null,
          current_tier: linkedUser?.subscription_tier || 'not found'
        });
      }
    }
    
    // 4. Display results
    if (activeNotLinked.length > 0) {
      console.log('⚠️  Active subscriptions not properly linked:\n');
      activeNotLinked.forEach(item => {
        console.log(`Email: ${item.customer_email}`);
        console.log(`- Customer: ${item.customer_id}`);
        console.log(`- Subscription: ${item.subscription_id}`);
        console.log(`- Created: ${item.created}`);
        console.log(`- Status: ${item.linked_user ? `Linked but showing as ${item.current_tier}` : 'Not linked to any user'}`);
        console.log('');
      });
      
      console.log('\n📋 To fix these, run:');
      activeNotLinked.forEach(item => {
        if (item.customer_email) {
          console.log(`node scripts/sync-stripe-subscription.js ${item.customer_email}`);
        }
      });
    } else {
      console.log('✅ All recent active subscriptions are properly linked!');
    }
    
    // 5. Check webhook configuration
    console.log('\n📡 Webhook Configuration:');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    
    webhooks.data.forEach(webhook => {
      if (webhook.status === 'enabled') {
        const hasCheckoutEvent = webhook.enabled_events.includes('checkout.session.completed');
        console.log(`\nEndpoint: ${webhook.url}`);
        console.log(`- checkout.session.completed: ${hasCheckoutEvent ? '✅' : '❌ MISSING'}`);
        
        if (!hasCheckoutEvent) {
          console.log('  ⚠️  Add this event to automatically link customers!');
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findUnlinkedSubscriptions().then(() => process.exit(0));