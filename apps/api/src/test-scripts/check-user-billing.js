const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserBilling(email) {
  console.log(`\nChecking billing for user: ${email}`);
  
  // Get user from auth schema
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User found:', user.id);
  
  // Check billing record
  const { data: billing, error: billingError } = await supabase
    .from('user_billing')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  if (billingError && billingError.code !== 'PGRST116') {
    console.error('Error fetching billing:', billingError);
  }
  
  console.log('\nBilling record:', billing || 'No billing record found');
  
  // Check payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', user.id);
    
  console.log('\nPayment methods:', paymentMethods?.length || 0);
  
  // Check trial repository
  const { data: trialRepo } = await supabase
    .from('user_trial_repository')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  console.log('\nTrial repository:', trialRepo || 'No trial repository set');
  
  // Check trial usage
  const { data: trialUsage } = await supabase
    .from('trial_usage')
    .select('*')
    .eq('user_id', user.id)
    .order('scanned_at', { ascending: false });
    
  console.log('\nTrial usage count:', trialUsage?.length || 0);
  
  // Test can_user_scan_repository function
  const { data: canScan, error: canScanError } = await supabase
    .rpc('can_user_scan_repository', {
      p_user_id: user.id,
      p_repository_url: 'https://github.com/test/repo'
    });
    
  console.log('\nCan scan test repository:', canScan);
  if (canScanError) {
    console.error('Error checking scan permission:', canScanError);
  }
}

// Run the check
checkUserBilling('alpsla@gmail.com').catch(console.error);