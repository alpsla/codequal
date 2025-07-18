const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixUserBilling() {
  const userId = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56';
  const userEmail = 'tester3@grr.la';
  
  try {
    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.log(`User with ID ${userId} not found in users table`);
      
      // Try to find by email
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();
      
      if (userByEmail) {
        console.log(`Found user by email: ${userByEmail.id} (${userByEmail.email})`);
        return;
      } else {
        console.log(`User with email ${userEmail} not found either`);
        return;
      }
    }
    
    console.log(`Found user: ${user.email} (${user.id})`);
    
    // Check if user_billing exists
    const { data: existingBilling, error: billingCheckError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (billingCheckError && billingCheckError.code !== 'PGRST116') {
      console.error('Error checking user_billing:', billingCheckError);
      return;
    }
    
    if (existingBilling) {
      console.log('Existing billing record found:', existingBilling);
      console.log('- Subscription tier:', existingBilling.subscription_tier);
      console.log('- Subscription status:', existingBilling.subscription_status);
      console.log('- Stripe customer ID:', existingBilling.stripe_customer_id);
    } else {
      console.log('No billing record found, creating one...');
      
      // Create user_billing record
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
      
      console.log('Created user_billing record:', newBilling);
    }
    
    // Now run the sync script if user has a Stripe subscription
    console.log('\nChecking for Stripe subscription...');
    const { sync } = require('./sync-stripe-subscription.js');
    if (typeof sync === 'function') {
      await sync(userEmail);
    } else {
      console.log('Running sync-stripe-subscription.js directly...');
      require('child_process').execSync(`node scripts/sync-stripe-subscription.js ${userEmail}`, { stdio: 'inherit' });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserBilling().then(() => process.exit(0));