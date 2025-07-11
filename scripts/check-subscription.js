const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  'https://ftjhmbbcuqjqmmbaymqb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODg1OTczNCwiZXhwIjoyMDU0NDM1NzM0fQ.ldT_p0Xn64S3OM5AR27-Iht27nUkbR9kGDyaJftPt-s'
);

const stripe = new Stripe('sk_test_51RiLenH9VfPdHERjw6vRQ9IqaG4g2opDmmGBLHYpmGNKGxoYGo7jnWJS7QlMya6OVh8MLNWe5lhTSC7OhnIYSl3G00tf2ryUnu');

async function checkSubscription(email) {
  try {
    console.log(`\nChecking subscription for ${email}...`);
    
    // Get user from Supabase auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing users:', authError);
      return;
    }
    
    const userData = authData.users.find(u => u.email === email);
    
    if (!userData) {
      console.error('User not found');
      return;
    }
    
    console.log('\nUser found:', {
      id: userData.id,
      email: userData.email
    });
    
    // Get billing info
    const { data: billingData, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userData.id)
      .single();
      
    if (billingData) {
      console.log('\nCurrent billing data:', {
        subscription_tier: billingData.subscription_tier,
        subscription_status: billingData.subscription_status,
        stripe_customer_id: billingData.stripe_customer_id,
        stripe_subscription_id: billingData.stripe_subscription_id
      });
      
      // Check Stripe for active subscriptions
      if (billingData.stripe_customer_id) {
        console.log('\nChecking Stripe subscriptions...');
        const subscriptions = await stripe.subscriptions.list({
          customer: billingData.stripe_customer_id,
          status: 'active'
        });
        
        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          console.log('\nActive Stripe subscription found:', {
            id: sub.id,
            status: sub.status,
            price_id: sub.items.data[0].price.id,
            product_id: sub.items.data[0].price.product
          });
          
          // Determine tier based on price
          let tier = 'free';
          const priceId = sub.items.data[0].price.id;
          if (priceId === 'price_1RjLIsH9VfPdHERjZ8JwAHSV') {
            tier = 'api';
          } else if (priceId === 'price_1RjLIsH9VfPdHERjgmSu4gLT') {
            tier = 'individual';
          } else if (priceId === 'price_1RjLIsH9VfPdHERjC6ud2Esb') {
            tier = 'team';
          }
          
          // Update billing data if needed
          if (billingData.subscription_tier !== tier || billingData.subscription_status !== 'active') {
            console.log(`\nUpdating subscription to ${tier} tier...`);
            
            const { error: updateError } = await supabase
              .from('user_billing')
              .update({
                subscription_tier: tier,
                subscription_status: 'active',
                stripe_subscription_id: sub.id
              })
              .eq('user_id', userData.id);
              
            if (updateError) {
              console.error('Error updating billing:', updateError);
            } else {
              console.log('✅ Subscription updated successfully!');
            }
          } else {
            console.log('✅ Subscription is already up to date');
          }
        } else {
          console.log('❌ No active Stripe subscriptions found');
        }
      }
    } else {
      console.log('❌ No billing record found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.log('Usage: node check-subscription.js <email>');
  process.exit(1);
}

checkSubscription(email);