const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function batchFixUnlinkedSubscriptions() {
  console.log('🔧 Batch fixing unlinked subscriptions...\n');
  
  try {
    // Get all active Stripe subscriptions
    console.log('Fetching all active Stripe subscriptions...');
    const allSubscriptions = [];
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = {
        status: 'active',
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter })
      };
      
      const batch = await stripe.subscriptions.list(params);
      allSubscriptions.push(...batch.data);
      hasMore = batch.has_more;
      if (hasMore && batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }
    
    console.log(`Found ${allSubscriptions.length} active subscriptions\n`);
    
    // Group by customer email
    const customerMap = new Map();
    
    for (const sub of allSubscriptions) {
      const customer = await stripe.customers.retrieve(sub.customer);
      if (customer.email) {
        customerMap.set(customer.email, {
          customer_id: customer.id,
          subscription_id: sub.id,
          price_id: sub.items.data[0]?.price.id,
          status: sub.status
        });
      }
    }
    
    console.log(`Processing ${customerMap.size} unique customers with subscriptions\n`);
    
    // Check each customer
    let fixed = 0;
    let alreadyLinked = 0;
    let noUserFound = 0;
    
    for (const [email, stripeData] of customerMap) {
      // Check if this customer is properly linked
      const { data: billing } = await supabase
        .from('user_billing')
        .select('*')
        .eq('stripe_customer_id', stripeData.customer_id)
        .single();
      
      if (billing && billing.subscription_tier !== 'free') {
        alreadyLinked++;
        continue;
      }
      
      // Try to find user by email pattern (assuming auth email matches)
      // This is a workaround since we can't query auth.users directly
      console.log(`\n🔍 Processing ${email}...`);
      
      // Determine tier
      let tier = 'free';
      if (stripeData.price_id === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
        tier = 'individual';
      } else if (stripeData.price_id === process.env.STRIPE_TEAM_PRICE_ID) {
        tier = 'team';
      } else if (stripeData.price_id === process.env.STRIPE_API_PRICE_ID) {
        tier = 'api';
      }
      
      // If we found a billing record with this customer ID, update it
      if (billing) {
        const { error } = await supabase
          .from('user_billing')
          .update({
            stripe_subscription_id: stripeData.subscription_id,
            subscription_status: stripeData.status,
            subscription_tier: tier,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', stripeData.customer_id);
        
        if (!error) {
          console.log(`✅ Updated existing billing record to ${tier} tier`);
          fixed++;
        } else {
          console.log(`❌ Error updating: ${error.message}`);
        }
      } else {
        console.log(`⚠️  No user_billing found with customer ID ${stripeData.customer_id}`);
        console.log(`   Email: ${email}`);
        console.log(`   Tier: ${tier}`);
        noUserFound++;
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log('─────────────────────────────');
    console.log(`✅ Fixed: ${fixed} users`);
    console.log(`✅ Already linked: ${alreadyLinked} users`);
    console.log(`⚠️  No user found: ${noUserFound} customers`);
    console.log(`📊 Total processed: ${customerMap.size} customers`);
    
    if (noUserFound > 0) {
      console.log('\n💡 For unlinked customers:');
      console.log('1. These might be test customers without user accounts');
      console.log('2. Or users created outside your app flow');
      console.log('3. Run find-unlinked-subscriptions.js for details');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

batchFixUnlinkedSubscriptions().then(() => process.exit(0));