const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function verifyApiTierSetup() {
  console.log('🔍 Verifying API Tier Setup...\n');
  
  try {
    // 1. Check database constraint
    console.log('1️⃣  Checking database constraint...');
    const { data: testInsert, error: insertError } = await supabase
      .from('user_billing')
      .upsert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        subscription_tier: 'api',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (insertError && insertError.code === '23514') {
      console.log('❌ Database constraint not updated - "api" tier is not allowed');
      console.log('   Please run the SQL migration in Supabase');
    } else {
      console.log('✅ Database constraint allows "api" tier');
      // Clean up test record
      if (testInsert) {
        await supabase
          .from('user_billing')
          .delete()
          .eq('user_id', '00000000-0000-0000-0000-000000000000');
      }
    }
    
    // 2. Check tester4's current status
    console.log('\n2️⃣  Checking tester4 status...');
    const { data: tester4, error: tester4Error } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1')
      .single();
    
    if (tester4) {
      console.log('✅ Tester4 billing record:');
      console.log(`   - Tier: ${tester4.subscription_tier} ${tester4.subscription_tier === 'api' ? '✅' : '❌ (should be "api")'}`);
      console.log(`   - Status: ${tester4.subscription_status}`);
      console.log(`   - Stripe Customer: ${tester4.stripe_customer_id}`);
      console.log(`   - Stripe Subscription: ${tester4.stripe_subscription_id}`);
    } else {
      console.log('❌ Tester4 billing record not found');
    }
    
    // 3. Check Stripe subscription
    if (tester4?.stripe_customer_id) {
      console.log('\n3️⃣  Checking Stripe subscription...');
      const subscriptions = await stripe.subscriptions.list({
        customer: tester4.stripe_customer_id,
        limit: 1
      });
      
      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const priceId = sub.items.data[0]?.price.id;
        console.log('✅ Active Stripe subscription:');
        console.log(`   - ID: ${sub.id}`);
        console.log(`   - Status: ${sub.status}`);
        console.log(`   - Price ID: ${priceId}`);
        console.log(`   - Is API tier: ${priceId === process.env.STRIPE_API_PRICE_ID ? '✅' : '❌'}`);
      }
    }
    
    // 4. Check webhook configuration
    console.log('\n4️⃣  Checking webhook configuration...');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    const activeWebhooks = webhooks.data.filter(w => w.status === 'enabled');
    
    if (activeWebhooks.length > 0) {
      console.log(`✅ Found ${activeWebhooks.length} active webhook(s):`);
      activeWebhooks.forEach(w => {
        const hasSubEvents = w.enabled_events.some(e => e.includes('customer.subscription'));
        console.log(`   - ${w.url}`);
        console.log(`     Subscription events: ${hasSubEvents ? '✅' : '❌'}`);
      });
    } else {
      console.log('❌ No active webhooks found');
    }
    
    // 5. Summary
    console.log('\n📊 Summary:');
    console.log('─────────────────────────────────────');
    
    const checks = {
      'Database supports API tier': !insertError || insertError.code !== '23514',
      'Tester4 has API tier': tester4?.subscription_tier === 'api',
      'Webhook configured': activeWebhooks.length > 0
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });
    
    const allPassed = Object.values(checks).every(v => v);
    
    console.log('\n' + (allPassed ? '🎉 All checks passed! API tier is fully configured.' : '⚠️  Some checks failed. Please follow the setup guide.'));
    
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyApiTierSetup().then(() => process.exit(0));