const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBillingTrigger() {
  const newUserId = '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1';
  const newUserEmail = 'tester4@grr.la';
  
  try {
    // Check if trigger exists
    console.log('Checking if billing trigger exists...');
    const { data: triggers, error: triggerError } = await supabase
      .rpc('get_triggers', { schema_name: 'auth', table_name: 'users' });
    
    if (triggerError) {
      console.log('Could not check triggers (function may not exist)');
    } else if (triggers) {
      console.log('Triggers on auth.users:', triggers);
    }
    
    // Check if user_billing record exists
    console.log(`\nChecking user_billing for user ${newUserId}...`);
    const { data: billing, error: billingError } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', newUserId)
      .single();
    
    if (billingError && billingError.code !== 'PGRST116') {
      console.error('Error checking user_billing:', billingError);
    } else if (billing) {
      console.log('User billing exists:', billing);
    } else {
      console.log('No user_billing record found for this user');
      
      // Create the record
      console.log('\nCreating user_billing record...');
      const { data: newBilling, error: createError } = await supabase
        .from('user_billing')
        .insert({
          user_id: newUserId,
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user_billing:', createError);
      } else {
        console.log('Successfully created user_billing:', newBilling);
      }
    }
    
    // Check if user exists in auth.users
    console.log(`\nChecking if user exists in auth.users...`);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', newUserId);
    
    if (users && users.length > 0) {
      console.log('User found in public.users:', users[0]);
    } else {
      console.log('User not found in public.users table');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBillingTrigger().then(() => process.exit(0));