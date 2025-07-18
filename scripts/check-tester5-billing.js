const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkTester5Billing() {
  const userId = '49c5ae94-c466-458f-80fb-b66270882469';
  const userEmail = 'tester5@grr.la';
  
  console.log('🔍 Checking tester5 billing status...\n');
  
  try {
    // 1. Check current database status
    console.log('1️⃣  Database Status:');
    const { data: billing, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (billingError && billingError.code !== 'PGRST116') {
      console.error('Error fetching user_billing:', billingError);
      return;
    }
    
    if (billing) {
      console.log('Found user_billing record:');
      console.log(`- User ID: ${billing.user_id}`);
      console.log(`- Stripe Customer: ${billing.stripe_customer_id || 'NOT SET ❌'}`);
      console.log(`- Stripe Subscription: ${billing.stripe_subscription_id || 'NOT SET ❌'}`);
      console.log(`- Tier: ${billing.subscription_tier} ${billing.subscription_tier === 'free' ? '❌' : '✅'}`);
      console.log(`- Status: ${billing.subscription_status || 'null'}`);
      console.log(`- Updated: ${billing.updated_at}`);
    } else {
      console.log('❌ No user_billing record found!');
      console.log('Creating user_billing record...');
      
      const { data: newBilling, error: createError } = await supabase
        .from('user_billing')
        .insert({
          user_id: userId,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user_billing:', createError);
        return;
      }
      
      console.log('✅ Created user_billing record');
    }
    
    // 2. Search for Stripe customer
    console.log('\n2️⃣  Searching for Stripe customer...');
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10
    });
    
    if (customers.data.length === 0) {
      console.log('❌ No Stripe customer found for email:', userEmail);
      return;
    }
    
    console.log(`Found ${customers.data.length} customer(s):`);
    
    for (const customer of customers.data) {
      console.log(`\nCustomer: ${customer.id}`);
      console.log(`- Email: ${customer.email}`);
      console.log(`- Created: ${new Date(customer.created * 1000).toISOString()}`);
      
      // Get subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });
      
      if (subscriptions.data.length > 0) {
        console.log(`- Subscriptions: ${subscriptions.data.length}`);
        
        for (const sub of subscriptions.data) {
          const priceId = sub.items.data[0]?.price.id;
          let tier = 'free';
          
          if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
            tier = 'individual';
          } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
            tier = 'team';
          } else if (priceId === process.env.STRIPE_API_PRICE_ID) {
            tier = 'api';
          }
          
          console.log(`  * ${sub.id}: ${sub.status} (${tier} tier)`);
          console.log(`    Created: ${new Date(sub.created * 1000).toISOString()}`);
        }
        
        // If this customer has active subscriptions and our user doesn't have a stripe_customer_id
        if (!billing?.stripe_customer_id || billing.stripe_customer_id !== customer.id) {
          console.log(`\n⚠️  This customer (${customer.id}) is NOT linked to the user!`);
        }
      }
    }
    
    // 3. Sync recommendation
    console.log('\n3️⃣  Sync Recommendation:');
    if (customers.data.length > 0 && customers.data[0].id !== billing?.stripe_customer_id) {
      console.log('Run this command to sync:');
      console.log(`node scripts/sync-stripe-subscription.js ${userEmail}`);
      
      console.log('\nOr manually link with:');
      console.log(`node scripts/manual-link-stripe-customer.js ${userId} ${userEmail}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTester5Billing().then(() => process.exit(0));