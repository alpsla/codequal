import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncUserSubscription(email: string) {
  console.log(`\nSyncing subscription data for: ${email}\n`);

  try {
    // Step 1: Get user from Supabase
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name')
      .eq('email', email)
      .single();

    if (userError || !users) {
      console.error('User not found:', userError);
      return;
    }

    const userId = users.user_id;
    console.log('User found:', { userId, email: users.email });

    // Step 2: Check current billing status in Supabase
    const { data: billing, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('\nCurrent billing in Supabase:');
    if (billing) {
      console.log({
        subscription_tier: billing.subscription_tier,
        subscription_status: billing.subscription_status,
        stripe_customer_id: billing.stripe_customer_id,
        stripe_subscription_id: billing.stripe_subscription_id,
      });
    } else {
      console.log('No billing record found');
    }

    // Step 3: Search for customer in Stripe by email
    console.log('\nSearching for customer in Stripe...');
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    });

    if (customers.data.length === 0) {
      console.log('No Stripe customer found with this email');
      return;
    }

    const customer = customers.data[0];
    console.log('Stripe customer found:', {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    });

    // Step 4: Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });

    console.log(`\nActive subscriptions: ${subscriptions.data.length}`);
    
    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0].price.id;
      
      // Determine tier based on price ID
      let tier = 'free';
      if (priceId.includes('individual') || priceId.includes('ind')) {
        tier = 'individual';
      } else if (priceId.includes('team')) {
        tier = 'team';
      }

      console.log('Active subscription details:');
      console.log({
        id: subscription.id,
        status: subscription.status,
        price_id: priceId,
        determined_tier: tier,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

      // Step 5: Update or create billing record in Supabase
      console.log('\nUpdating Supabase billing record...');
      
      const billingData = {
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status as any,
        subscription_tier: tier as any,
        updated_at: new Date().toISOString(),
      };

      if (billing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_billing')
          .update(billingData)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating billing:', updateError);
        } else {
          console.log('✅ Billing record updated successfully');
        }
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('user_billing')
          .insert({
            ...billingData,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating billing:', insertError);
        } else {
          console.log('✅ Billing record created successfully');
        }
      }

      // Step 6: Check for payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card',
      });

      console.log(`\nPayment methods found: ${paymentMethods.data.length}`);
      
      // Sync payment methods
      for (const pm of paymentMethods.data) {
        const { data: existingPM } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('stripe_payment_method_id', pm.id)
          .single();

        if (!existingPM) {
          await supabase
            .from('payment_methods')
            .insert({
              user_id: userId,
              stripe_payment_method_id: pm.id,
              brand: pm.card?.brand || 'unknown',
              last_four: pm.card?.last4 || '****',
              is_default: subscription.default_payment_method === pm.id,
            });
          console.log(`Added payment method ending in ${pm.card?.last4}`);
        }
      }

    } else {
      console.log('No active subscriptions found');
      
      // Check for canceled or past_due subscriptions
      const allSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });

      if (allSubscriptions.data.length > 0) {
        console.log('\nOther subscriptions found:');
        allSubscriptions.data.forEach(sub => {
          console.log({
            id: sub.id,
            status: sub.status,
            created: new Date(sub.created * 1000).toISOString(),
            canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          });
        });
      }
    }

    // Step 7: Final verification
    console.log('\n--- Final Status ---');
    const { data: finalBilling } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (finalBilling) {
      console.log('Updated billing status:', {
        subscription_tier: finalBilling.subscription_tier,
        subscription_status: finalBilling.subscription_status,
        stripe_customer_id: finalBilling.stripe_customer_id,
        stripe_subscription_id: finalBilling.stripe_subscription_id,
      });
    }

  } catch (error) {
    console.error('Error syncing subscription:', error);
  }
}

// Run the sync
const userEmail = process.argv[2] || 'rostislav.alpin@gmail.com';
syncUserSubscription(userEmail).catch(console.error);