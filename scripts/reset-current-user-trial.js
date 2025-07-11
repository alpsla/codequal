require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetAllUserTrials() {
  console.log('\n=== Resetting ALL User Trials ===\n');

  try {
    // 1. Get all users with billing data
    const { data: allBilling } = await supabase
      .from('user_billing')
      .select('user_id');

    if (!allBilling || allBilling.length === 0) {
      console.log('No users found');
      return;
    }

    console.log(`Found ${allBilling.length} users to reset\n`);

    for (const billing of allBilling) {
      const userId = billing.user_id;
      console.log(`Resetting user: ${userId}`);

      // Reset trial scans to 0
      const { error: resetError } = await supabase
        .from('user_billing')
        .update({ trial_scans_used: 0 })
        .eq('user_id', userId);

      if (resetError) {
        console.error(`  ❌ Error resetting billing:`, resetError.message);
      } else {
        console.log(`  ✅ Reset trial scans to 0`);
      }

      // Delete trial repository
      const { error: trialError } = await supabase
        .from('user_trial_repository')
        .delete()
        .eq('user_id', userId);

      if (trialError && trialError.code !== 'PGRST116') { // Ignore "no rows" error
        console.error(`  ❌ Error deleting trial repo:`, trialError.message);
      } else {
        console.log(`  ✅ Cleared trial repository`);
      }

      // Delete usage logs
      const { error: usageError } = await supabase
        .from('trial_usage')
        .delete()
        .eq('user_id', userId);

      if (usageError && usageError.code !== 'PGRST116') { // Ignore "no rows" error
        console.error(`  ❌ Error deleting usage logs:`, usageError.message);
      } else {
        console.log(`  ✅ Cleared usage history`);
      }

      console.log('');
    }

    // Verify the reset
    console.log('\n--- Final Status ---');
    const { data: finalCheck } = await supabase
      .from('user_billing')
      .select('user_id, trial_scans_used, trial_scans_limit');

    finalCheck.forEach(user => {
      console.log(`User ${user.user_id}: ${user.trial_scans_used}/${user.trial_scans_limit} scans used`);
    });

    console.log('\n🎉 All user trials have been reset!');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Reset all users
resetAllUserTrials().then(() => process.exit(0));