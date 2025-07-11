#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

// Initialize Supabase
const supabaseUrl = 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripe = new Stripe('sk_test_51RiLenH9VfPdHERjw6vRQ9IqaG4g2opDmmGBLHYpmGNKGxoYGo7jnWJS7QlMya6OVh8MLNWe5lhTSC7OhnIYSl3G00tf2ryUnu', {
  apiVersion: '2023-10-16',
});

async function fixPaymentMethod(userEmail) {
  try {
    console.log(`\nFixing payment method for user: ${userEmail}`);
    
    // Get user from Supabase
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', userEmail)
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('User not found:', userEmail);
      return;
    }
    
    const user = users[0];
    console.log('Found user:', user.id);
    
    // Get user billing info
    const { data: billing } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (!billing) {
      console.log('No billing record found. Creating one...');
      await supabase
        .from('user_billing')
        .insert({
          user_id: user.id,
          subscription_tier: 'free',
          trial_scans_used: 10,
          trial_scans_limit: 10
        });
    }
    
    // Check for Stripe customer
    let customerId = billing?.stripe_customer_id;
    
    if (!customerId) {
      console.log('No Stripe customer found. Searching by email...');
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('Found existing Stripe customer:', customerId);
        
        // Update billing record
        await supabase
          .from('user_billing')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);
      }
    }
    
    if (customerId) {
      // Check for payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      
      console.log(`Found ${paymentMethods.data.length} payment methods`);
      
      // Store payment methods in database
      for (const pm of paymentMethods.data) {
        console.log(`Adding payment method: ${pm.card.brand} ****${pm.card.last4}`);
        
        // Check if already exists
        const { data: existing } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('stripe_payment_method_id', pm.id)
          .single();
        
        if (!existing) {
          await supabase
            .from('payment_methods')
            .insert({
              user_id: user.id,
              stripe_payment_method_id: pm.id,
              last_four: pm.card.last4,
              brand: pm.card.brand,
              is_default: true
            });
          console.log('✅ Payment method added to database');
        } else {
          console.log('Payment method already in database');
        }
      }
    }
    
    console.log('\n✅ Payment method fix completed!');
    console.log('You can now refresh the scan page and should be able to scan.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node fix-payment-method.js <user-email>');
  process.exit(1);
}

fixPaymentMethod(email);