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

async function addPaymentToUser(userId) {
  console.log(`\n=== Adding Payment Method to User ${userId} ===\n`);

  try {
    // 1. Check if user exists
    const { data: billing } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!billing) {
      console.error('User billing record not found');
      return;
    }

    console.log('Current billing status:');
    console.log('- Stripe Customer:', billing.stripe_customer_id || 'None');
    console.log('- Trial scans used:', billing.trial_scans_used);

    // 2. Create Stripe customer if needed
    let customerId = billing.stripe_customer_id;
    
    if (!customerId) {
      console.log('\nCreating Stripe customer...');
      const customer = await stripe.customers.create({
        metadata: {
          user_id: userId
        }
      });
      
      customerId = customer.id;
      
      // Update billing record
      await supabase
        .from('user_billing')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
      
      console.log('✅ Created Stripe customer:', customerId);
    }

    // 3. Create a setup intent for testing
    console.log('\nCreating test payment method...');
    
    // Create a test payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa' // Test token for Visa card
      }
    });

    // Attach to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId
    });

    // Set as default
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id
      }
    });

    console.log('✅ Created payment method:', paymentMethod.id);

    // 4. Save to database
    await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        stripe_payment_method_id: paymentMethod.id,
        last_four: '4242',
        brand: 'visa',
        is_default: true
      });

    console.log('✅ Saved payment method to database');

    // 5. Verify
    const { data: verify } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId);

    console.log('\n✅ Success! User now has', verify?.length || 0, 'payment method(s)');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get user ID from command line or use the test user
const userId = process.argv[2] || '43267ee5-dafe-4608-8ef0-475a4878d26e';
addPaymentToUser(userId).then(() => process.exit(0));