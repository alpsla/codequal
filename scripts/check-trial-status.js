require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTrialStatus() {
  console.log('\n=== Checking Trial Status for All Users ===\n');

  try {
    // Get all users with billing data
    const { data: billingData, error } = await supabase
      .from('user_billing')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching billing data:', error);
      return;
    }

    if (!billingData || billingData.length === 0) {
      console.log('No billing records found');
      return;
    }

    for (const billing of billingData) {
      console.log(`\nUser ID: ${billing.user_id}`);
      console.log(`Trial scans used: ${billing.trial_scans_used}`);
      console.log(`Trial scans limit: ${billing.trial_scans_limit}`);
      console.log(`Stripe customer: ${billing.stripe_customer_id || 'None'}`);
      
      // Check trial repository
      const { data: trialRepo } = await supabase
        .from('user_trial_repository')
        .select('repository_url')
        .eq('user_id', billing.user_id)
        .single();
        
      if (trialRepo) {
        console.log(`Trial repository: ${trialRepo.repository_url}`);
      } else {
        console.log('Trial repository: Not set');
      }
      
      // Check recent usage
      const { data: recentUsage } = await supabase
        .from('trial_usage')
        .select('repository_url, created_at')
        .eq('user_id', billing.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (recentUsage && recentUsage.length > 0) {
        console.log('Recent scans:');
        recentUsage.forEach((usage, idx) => {
          console.log(`  ${idx + 1}. ${usage.repository_url} - ${new Date(usage.created_at).toLocaleString()}`);
        });
      }
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTrialStatus().then(() => process.exit(0));