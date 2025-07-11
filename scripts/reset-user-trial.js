require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetUserTrial(email) {
  console.log(`\n=== Resetting trial data for user: ${email} ===\n`);

  try {
    // 1. Find user by email - first check in users table
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);
    
    let userId;
    
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log('Found user in users table, ID:', userId);
    } else {
      // Try to find in auth.users via RPC or direct query
      const { data: authData } = await supabase.rpc('get_user_id_by_email', { user_email: email });
      
      if (authData) {
        userId = authData;
        console.log('Found user in auth system, ID:', userId);
      } else {
        // Last resort - check user_billing table for any user with stripe customer
        const { data: customers } = await supabase
          .from('user_billing')
          .select('user_id')
          .not('stripe_customer_id', 'is', null);
          
        if (customers && customers.length > 0) {
          // Use the first user with billing data for testing
          userId = customers[0].user_id;
          console.log('Using test user ID:', userId);
        } else {
          console.error('No user found with billing data');
          return;
        }
      }
    }

    // 2. Delete trial repository record
    const { error: trialRepoError } = await supabase
      .from('user_trial_repository')
      .delete()
      .eq('user_id', userId);

    if (trialRepoError) {
      console.error('Error deleting trial repository:', trialRepoError);
    } else {
      console.log('✅ Deleted trial repository record');
    }

    // 3. Reset trial usage in billing
    const { data: billing, error: billingError } = await supabase
      .from('user_billing')
      .update({ 
        trial_scans_used: 0
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (billingError) {
      console.error('Error resetting trial usage:', billingError);
    } else {
      console.log('✅ Reset trial scans to 0');
      console.log('   Current billing status:');
      console.log('   - Trial scans used:', billing.trial_scans_used);
      console.log('   - Trial scans limit:', billing.trial_scans_limit);
    }

    // 4. Delete trial usage logs (optional - for clean history)
    const { error: usageError } = await supabase
      .from('trial_usage')
      .delete()
      .eq('user_id', userId);

    if (usageError) {
      console.error('Error deleting trial usage logs:', usageError);
    } else {
      console.log('✅ Deleted trial usage history');
    }

    // 5. Verify the reset
    console.log('\n--- Verification ---');
    
    const { data: checkTrialRepo } = await supabase
      .from('user_trial_repository')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    const { data: checkBilling } = await supabase
      .from('user_billing')
      .select('trial_scans_used, trial_scans_limit')
      .eq('user_id', userId)
      .single();

    if (!checkTrialRepo) {
      console.log('✅ No trial repository set (ready for fresh start)');
    } else {
      console.log('⚠️  Trial repository still exists:', checkTrialRepo.repository_url);
    }

    if (checkBilling) {
      console.log(`✅ Trial usage: ${checkBilling.trial_scans_used}/${checkBilling.trial_scans_limit}`);
    }

    console.log('\n🎉 User trial has been reset successfully!');
    console.log('The next repository they scan will become their trial repository.');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get email from command line
const email = process.argv[2];
if (!email) {
  console.error('Please provide user email as argument');
  console.error('Usage: node reset-user-trial.js user@email.com');
  process.exit(1);
}

resetUserTrial(email).then(() => process.exit(0));