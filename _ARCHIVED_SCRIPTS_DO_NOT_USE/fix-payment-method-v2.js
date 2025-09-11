#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize Supabase
const supabaseUrl = 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize Stripe
const stripe = new Stripe('sk_test_51RiLenH9VfPdHERjw6vRQ9IqaG4g2opDmmGBLHYpmGNKGxoYGo7jnWJS7QlMya6OVh8MLNWe5lhTSC7OhnIYSl3G00tf2ryUnu', {
  apiVersion: '2023-10-16',
});

async function fixPaymentMethod(userEmail) {
  try {
    console.log(`\nFixing payment method for user: ${userEmail}`);
    
    // First, let's list all Stripe customers to find the one with this email
    console.log('\nSearching for Stripe customer...');
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10
    });
    
    if (customers.data.length === 0) {
      console.log('No Stripe customer found with this email.');
      console.log('\nSearching ALL Stripe customers (this may take a moment)...');
      
      let hasMore = true;
      let startingAfter = null;
      
      while (hasMore) {
        const batch = await stripe.customers.list({
          limit: 100,
          starting_after: startingAfter
        });
        
        const found = batch.data.find(c => c.email === userEmail);
        if (found) {
          customers.data = [found];
          break;
        }
        
        hasMore = batch.has_more;
        if (batch.data.length > 0) {
          startingAfter = batch.data[batch.data.length - 1].id;
        }
      }
    }
    
    if (customers.data.length === 0) {
      console.log('❌ No Stripe customer found. Please ensure you added a payment method.');
      return;
    }
    
    const customer = customers.data[0];
    console.log(`✅ Found Stripe customer: ${customer.id}`);
    
    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card'
    });
    
    console.log(`\n✅ Found ${paymentMethods.data.length} payment methods:`);
    paymentMethods.data.forEach(pm => {
      console.log(`   - ${pm.card.brand} ****${pm.card.last4}`);
    });
    
    if (paymentMethods.data.length === 0) {
      console.log('\n❌ No payment methods found. Please add a payment method first.');
      return;
    }
    
    // Try to find the user by different methods
    console.log('\nSearching for user in database...');
    
    // Method 1: Try direct auth.users query
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    let userId = null;
    
    if (!authError && authUser && authUser.users) {
      const user = authUser.users.find(u => u.email === userEmail);
      if (user) {
        userId = user.id;
        console.log('✅ Found user via auth.admin:', userId);
      }
    }
    
    // Method 2: Try finding by stripe_customer_id
    if (!userId) {
      const { data: billingRecord } = await supabase
        .from('user_billing')
        .select('user_id')
        .eq('stripe_customer_id', customer.id)
        .single();
      
      if (billingRecord) {
        userId = billingRecord.user_id;
        console.log('✅ Found user via billing record:', userId);
      }
    }
    
    if (!userId) {
      console.log('\n⚠️  Could not find user ID. Creating a temporary fix...');
      console.log('\nPlease try the following:');
      console.log('1. Log out and log back in');
      console.log('2. Your payment method is registered in Stripe');
      console.log('3. The system should recognize it on next login');
      return;
    }
    
    // Update or create billing record
    console.log('\nUpdating billing record...');
    const { error: upsertError } = await supabase
      .from('user_billing')
      .upsert({
        user_id: userId,
        stripe_customer_id: customer.id,
        subscription_tier: 'free',
        trial_scans_used: 10,
        trial_scans_limit: 10
      }, {
        onConflict: 'user_id'
      });
    
    if (upsertError) {
      console.error('Error updating billing:', upsertError);
    } else {
      console.log('✅ Billing record updated');
    }
    
    // Store payment methods
    console.log('\nStoring payment methods...');
    for (const pm of paymentMethods.data) {
      const { error: pmError } = await supabase
        .from('payment_methods')
        .upsert({
          user_id: userId,
          stripe_payment_method_id: pm.id,
          last_four: pm.card.last4,
          brand: pm.card.brand,
          is_default: true
        }, {
          onConflict: 'stripe_payment_method_id'
        });
      
      if (pmError) {
        console.error('Error storing payment method:', pmError);
      } else {
        console.log(`✅ Stored ${pm.card.brand} ****${pm.card.last4}`);
      }
    }
    
    console.log('\n🎉 Payment method fix completed!');
    console.log('\nNext steps:');
    console.log('1. Go to the scan page');
    console.log('2. Click "Refresh Status"');
    console.log('3. You should now see "Pay-as-you-go enabled"');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node fix-payment-method-v2.js <user-email>');
  process.exit(1);
}

fixPaymentMethod(email);