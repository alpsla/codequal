require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = '43267ee5-dafe-4608-8ef0-475a4878d26e';

async function testSingleQuery() {
  console.log('\n=== Testing .single() Query Behavior ===\n');

  try {
    // Test 1: Query when record exists
    console.log('1. Testing query when record EXISTS...');
    const { data: exists, error: existsError } = await supabase
      .from('user_trial_repository')
      .select('repository_url')
      .eq('user_id', TEST_USER_ID)
      .single();
    
    console.log('   Result:', exists);
    console.log('   Error:', existsError);
    
    // Test 2: Query when record doesn't exist
    console.log('\n2. Testing query when record DOES NOT exist...');
    const { data: notExists, error: notExistsError } = await supabase
      .from('user_trial_repository')
      .select('repository_url')
      .eq('user_id', 'non-existent-user-id')
      .single();
    
    console.log('   Result:', notExists);
    console.log('   Error:', notExistsError);
    console.log('   Error code:', notExistsError?.code);
    
    // Test 3: Better approach - use maybeSingle or handle error
    console.log('\n3. Testing better approach...');
    const { data: betterApproach, error: betterError } = await supabase
      .from('user_trial_repository')
      .select('repository_url')
      .eq('user_id', 'non-existent-user-id')
      .maybeSingle();
    
    console.log('   Result:', betterApproach);
    console.log('   Error:', betterError);
    
    console.log('\n💡 Insight: .single() throws error when no rows found!');
    console.log('   We should use .maybeSingle() instead');

  } catch (error) {
    console.error('Error:', error);
  }
}

testSingleQuery().then(() => process.exit(0));