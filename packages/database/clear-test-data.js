const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function clearTestData() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_SERVICE_KEY || 
                     process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🧹 Clearing test data...\n');

  try {
    // Clear test repository data
    const testRepoId = '550e8400-e29b-41d4-a716-446655440000';
    
    const { data, error } = await supabase
      .from('analysis_chunks')
      .delete()
      .eq('repository_id', testRepoId);
    
    if (error) {
      console.error('❌ Failed to clear data:', error.message);
    } else {
      console.log('✅ Test data cleared');
    }

    // Check remaining data
    const { data: remaining, error: countError } = await supabase
      .from('analysis_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('repository_id', testRepoId);
    
    if (!countError) {
      console.log(`Remaining chunks for test repository: ${remaining?.length || 0}`);
    }

    // Check table columns
    const { data: sample, error: sampleError } = await supabase
      .from('analysis_chunks')
      .select('*')
      .limit(1);
    
    if (!sampleError && sample && sample.length > 0) {
      console.log('\nTable columns:', Object.keys(sample[0]).join(', '));
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

clearTestData();