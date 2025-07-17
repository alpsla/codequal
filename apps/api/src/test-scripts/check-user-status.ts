#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkUserStatus() {
  console.log(chalk.cyan('\n🔍 Checking User Status\n'));
  
  const testUsers = [
    { email: 'slavataichi@gmail.com', name: 'Pay-per-scan User' },
    { email: 'rostislav.alpin@gmail.com', name: 'Individual Subscription User' }
  ];
  
  for (const testUser of testUsers) {
    console.log(chalk.yellow(`\n${testUser.name} (${testUser.email}):`));
    console.log('─'.repeat(60));
    
    // Get user from auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
      
    const user = users?.find(u => u.email === testUser.email);
    
    if (!user) {
      console.log(chalk.red('❌ User not found'));
      continue;
    }
    console.log(`✓ User ID: ${user.id}`);
    
    // Check profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    console.log(`✓ Profile: ${profile ? 'Exists' : 'Missing'}`);
    
    // Check billing
    const { data: billing } = await supabase
      .from('user_billing')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (billing) {
      console.log(`✓ Billing:`);
      console.log(`  - Subscription: ${billing.subscription_tier}`);
      console.log(`  - Status: ${billing.subscription_status || 'N/A'}`);
      console.log(`  - Trial Scans: ${billing.trial_scans_used}/${billing.trial_scans_limit}`);
      console.log(`  - Stripe Customer: ${billing.stripe_customer_id ? 'Yes' : 'No'}`);
    } else {
      console.log(chalk.red('❌ No billing record'));
    }
    
    // Check payment methods
    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id);
      
    console.log(`✓ Payment Methods: ${paymentMethods?.length || 0}`);
    if (paymentMethods && paymentMethods.length > 0) {
      paymentMethods.forEach(pm => {
        console.log(`  - ${pm.brand} ****${pm.last4} (${pm.is_default ? 'default' : 'backup'})`);
      });
    }
    
    // Check API keys
    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('name, active, usage_count, usage_limit, created_at')
      .eq('user_id', user.id)
      .eq('active', true);
      
    console.log(`✓ Active API Keys: ${apiKeys?.length || 0}`);
    if (apiKeys && apiKeys.length > 0) {
      apiKeys.forEach(key => {
        console.log(`  - ${key.name}: ${key.usage_count}/${key.usage_limit} uses`);
      });
    }
    
    // Check recent analyses
    const { data: analyses } = await supabase
      .from('analysis_results')
      .select('analysis_id, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);
      
    console.log(`✓ Recent Analyses: ${analyses?.length || 0}`);
    if (analyses && analyses.length > 0) {
      analyses.forEach(a => {
        console.log(`  - ${a.analysis_id}: ${a.status} (${new Date(a.created_at).toLocaleString()})`);
      });
    }
  }
  
  console.log(chalk.cyan('\n\n📊 System Status:'));
  console.log('─'.repeat(60));
  
  // Check if analysis_reports table exists
  const { error: reportsTableError } = await supabase
    .from('analysis_reports')
    .select('count')
    .limit(1);
    
  if (reportsTableError) {
    console.log(chalk.red('❌ analysis_reports table: Missing or inaccessible'));
    console.log(`   Error: ${reportsTableError.message}`);
  } else {
    console.log(chalk.green('✓ analysis_reports table: Exists'));
  }
  
  // Check repository access
  console.log(chalk.cyan('\n🔐 Repository Access:'));
  console.log('─'.repeat(60));
  console.log(chalk.yellow('⚠️  The system is checking repository access permissions'));
  console.log('   This might be causing issues with public repositories');
  console.log('   Consider using repositories the user has explicit access to');
}

checkUserStatus().catch(console.error);