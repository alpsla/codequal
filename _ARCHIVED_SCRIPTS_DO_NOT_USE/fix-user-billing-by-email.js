const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixUserBilling(userId, userEmail) {
  console.log(`🔧 Fixing billing for ${userEmail} (${userId})...\n`);
  
  try {
    // 1. Check current database status
    console.log('1️⃣  Checking database status...');
    const { data: billing, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (billingError && billingError.code !== 'PGRST116') {
      console.error('Error fetching user_billing:', billingError);
      return;
    }
    
    if (!billing) {
      console.log('Creating user_billing record...');
      const { error: createError } = await supabase
        .from('user_billing')
        .insert({
          user_id: userId,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (createError) {
        console.error('Error creating user_billing:', createError);
        return;
      }
    } else {
      console.log('Current billing:', {
        tier: billing.subscription_tier,
        status: billing.subscription_status,
        stripe_customer: billing.stripe_customer_id || 'NOT SET'
      });
    }
    
    // 2. Find Stripe customer and subscription
    console.log('\n2️⃣  Finding Stripe customer...');
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10
    });
    
    if (customers.data.length === 0) {
      console.error('❌ No Stripe customer found for email:', userEmail);
      return;
    }
    
    // Find customer with active subscription
    let activeCustomer = null;
    let activeSubscription = null;
    
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10
      });
      
      if (subscriptions.data.length > 0) {
        activeCustomer = customer;
        activeSubscription = subscriptions.data[0];
        break;
      }
    }
    
    if (!activeCustomer || !activeSubscription) {
      console.error('❌ No active subscription found');
      return;
    }
    
    console.log('Found active subscription:');
    console.log('- Customer:', activeCustomer.id);
    console.log('- Subscription:', activeSubscription.id);
    console.log('- Status:', activeSubscription.status);
    
    // 3. Determine tier
    const priceId = activeSubscription.items.data[0]?.price.id;
    let tier = 'free';
    
    if (priceId === process.env.STRIPE_INDIVIDUAL_PRICE_ID) {
      tier = 'individual';
    } else if (priceId === process.env.STRIPE_TEAM_PRICE_ID) {
      tier = 'team';
    } else if (priceId === process.env.STRIPE_API_PRICE_ID) {
      tier = 'api';
    }
    
    console.log('- Tier:', tier);
    
    // 4. Update user_billing
    console.log('\n3️⃣  Updating user_billing...');
    const { data: updated, error: updateError } = await supabase
      .from('user_billing')
      .update({
        stripe_customer_id: activeCustomer.id,
        stripe_subscription_id: activeSubscription.id,
        subscription_status: activeSubscription.status,
        subscription_tier: tier,
        trial_ends_at: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating user_billing:', updateError);
      return;
    }
    
    console.log('\n✅ Successfully updated user_billing!');
    console.log('Before: tier=free, status=null, stripe_customer=NOT SET');
    console.log(`After: tier=${updated.subscription_tier}, status=${updated.subscription_status}, stripe_customer=${updated.stripe_customer_id}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get parameters from command line
const userId = process.argv[2];
const userEmail = process.argv[3];

if (!userId || !userEmail) {
  console.log('Usage: node fix-user-billing-by-email.js <user-id> <user-email>');
  console.log('Example: node fix-user-billing-by-email.js b0100ed1-3171-43bc-8960-947a84e809e9 tester6@grr.la');
  process.exit(1);
}

fixUserBilling(userId, userEmail).then(() => process.exit(0));