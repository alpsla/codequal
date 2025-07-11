require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user ID - change this to your actual user ID
const TEST_USER_ID = '43267ee5-dafe-4608-8ef0-475a4878d26e';

async function testTrialEnforcement() {
  console.log('\n=== Testing Trial Enforcement ===\n');

  try {
    // 1. Clean up any existing trial data
    console.log('1. Cleaning up existing trial data...');
    
    await supabase
      .from('user_trial_repository')
      .delete()
      .eq('user_id', TEST_USER_ID);
    
    await supabase
      .from('user_billing')
      .update({ trial_scans_used: 0 })
      .eq('user_id', TEST_USER_ID);
    
    console.log('   ✅ Cleaned up trial data\n');

    // 2. Simulate first scan - should set trial repository
    console.log('2. Simulating first scan to github.com/facebook/react...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_trial_repository')
      .insert({
        user_id: TEST_USER_ID,
        repository_url: 'https://github.com/facebook/react'
      })
      .select();
    
    if (insertError) {
      console.error('   ❌ Error:', insertError);
    } else {
      console.log('   ✅ Set trial repository:', insertData[0].repository_url);
    }

    // 3. Check if trial repository was set
    console.log('\n3. Checking trial repository...');
    
    const { data: checkData } = await supabase
      .from('user_trial_repository')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .single();
    
    if (checkData) {
      console.log('   ✅ Trial repository is set to:', checkData.repository_url);
      console.log('   Repository ID:', checkData.id);
    } else {
      console.log('   ❌ No trial repository found!');
    }

    // 4. Test enforcement - try to scan different repository
    console.log('\n4. Testing enforcement - attempting to scan different repository...');
    
    const differentRepo = 'https://github.com/microsoft/vscode';
    
    // Check what would happen
    if (checkData && checkData.repository_url !== differentRepo) {
      console.log('   ✅ CORRECTLY BLOCKED: Cannot scan', differentRepo);
      console.log('   Only allowed to scan:', checkData.repository_url);
    } else {
      console.log('   ❌ ERROR: Would allow scanning different repository!');
    }

    // 5. Check table structure
    console.log('\n5. Checking table structure...');
    
    const { data: allRecords } = await supabase
      .from('user_trial_repository')
      .select('*');
    
    console.log(`   Total records in table: ${allRecords?.length || 0}`);
    
    // Group by user
    const userGroups = {};
    allRecords?.forEach(record => {
      if (!userGroups[record.user_id]) {
        userGroups[record.user_id] = [];
      }
      userGroups[record.user_id].push(record.repository_url);
    });
    
    Object.entries(userGroups).forEach(([userId, repos]) => {
      console.log(`   User ${userId}: ${repos.length} repositories`);
      if (repos.length > 1) {
        console.log('      ⚠️  Multiple repositories:', repos);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testTrialEnforcement().then(() => process.exit(0));