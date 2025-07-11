const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  'https://ftjhmbbcuqjqmmbaymqb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s'
);

const stripe = new Stripe('sk_test_51RiLenH9VfPdHERjw6vRQ9IqaG4g2opDmmGBLHYpmGNKGxoYGo7jnWJS7QlMya6OVh8MLNWe5lhTSC7OhnIYSl3G00tf2ryUnu');

async function syncSubscription(sessionId) {
  try {
    console.log(`\nSyncing subscription from session ${sessionId}...`);
    
    // Get the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session.subscription) {
      console.error('No subscription found in session');
      return;
    }
    
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('\nSubscription found:', {
      id: subscription.id,
      customer: subscription.customer,
      status: subscription.status,
      price_id: subscription.items.data[0].price.id
    });
    
    // Get customer email
    const customer = await stripe.customers.retrieve(subscription.customer);
    console.log('Customer email:', customer.email);
    
    // Find user in Supabase
    const { data: authData } = await supabase.auth.admin.listUsers();
    const user = authData.users.find(u => u.email === customer.email);
    
    if (!user) {
      console.error('User not found in Supabase');
      return;
    }
    
    console.log('User ID:', user.id);
    
    // Determine tier based on price
    let tier = 'free';
    const priceId = subscription.items.data[0].price.id;
    if (priceId === 'price_1RjLIsH9VfPdHERjZ8JwAHSV') {
      tier = 'api';
    } else if (priceId === 'price_1RjLIsH9VfPdHERjgmSu4gLT') {
      tier = 'individual';
    } else if (priceId === 'price_1RjLIsH9VfPdHERjC6ud2Esb') {
      tier = 'team';
    }
    
    console.log('Subscription tier:', tier);
    
    // Update or create billing record
    const { data: existing } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('user_billing')
        .update({
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id
        })
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error updating billing:', error);
      } else {
        console.log('✅ Billing record updated successfully!');
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('user_billing')
        .insert({
          user_id: user.id,
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          trial_scans_used: 0,
          trial_scans_limit: 10
        });
        
      if (error) {
        console.error('Error creating billing:', error);
      } else {
        console.log('✅ Billing record created successfully!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Use the most recent completed session ID
syncSubscription('cs_test_a1sBysiKyaP9nfJXfTQZ7FzaoH7tWXeQqa3waw0kz7aWbnyzGs5mcvA53O');