const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../apps/api/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addApiTierSupport() {
  try {
    console.log('Adding API tier support to database...\n');
    
    // Step 1: Drop the existing constraint
    console.log('1. Dropping existing constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE user_billing DROP CONSTRAINT IF EXISTS user_billing_subscription_tier_check;`
    });
    
    if (dropError) {
      console.log('Note: Could not drop constraint via RPC, may need manual execution');
    }
    
    // Step 2: Add the new constraint with 'api' included
    console.log('2. Adding new constraint with api tier...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE user_billing ADD CONSTRAINT user_billing_subscription_tier_check CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));`
    });
    
    if (addError) {
      console.log('Note: Could not add constraint via RPC, may need manual execution');
    }
    
    // If RPC doesn't work, provide the SQL for manual execution
    console.log('\nIf the above failed, please run this SQL manually in Supabase SQL Editor:');
    console.log('```sql');
    console.log("ALTER TABLE user_billing DROP CONSTRAINT IF EXISTS user_billing_subscription_tier_check;");
    console.log("ALTER TABLE user_billing ADD CONSTRAINT user_billing_subscription_tier_check CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));");
    console.log('```');
    
    // Step 3: Check current constraint
    console.log('\n3. Checking current constraints...');
    const { data: constraints, error: checkError } = await supabase
      .rpc('get_table_constraints', { 
        table_name: 'user_billing',
        constraint_type: 'CHECK'
      })
      .catch(() => ({ data: null, error: 'Function not available' }));
    
    if (constraints) {
      console.log('Current constraints:', constraints);
    }
    
    // Step 4: Update tester4 to use api tier
    console.log('\n4. Updating tester4 to use api tier...');
    const { data: updated, error: updateError } = await supabase
      .from('user_billing')
      .update({ subscription_tier: 'api' })
      .eq('user_id', '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1')
      .select()
      .single();
    
    if (updateError) {
      console.log('Could not update tester4 yet - constraint may need manual update first');
      console.log('Error:', updateError.message);
    } else {
      console.log('Successfully updated tester4 to api tier:', updated);
    }
    
    // Step 5: Verify all users with API subscriptions
    console.log('\n5. Checking for other users who might need api tier...');
    const { data: users } = await supabase
      .from('user_billing')
      .select('user_id, stripe_subscription_id, subscription_tier')
      .not('stripe_subscription_id', 'is', null);
    
    if (users) {
      console.log(`Found ${users.length} users with subscriptions`);
      users.forEach(u => {
        if (u.subscription_tier === 'team' && u.stripe_subscription_id) {
          console.log(`- User ${u.user_id} has tier '${u.subscription_tier}' - may need checking`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addApiTierSupport().then(() => process.exit(0));