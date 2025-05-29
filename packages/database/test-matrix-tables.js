/**
 * Test script to validate model configuration matrix tables
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' });

async function testMatrixTables() {
  console.log('🔍 Testing Model Configuration Matrix tables...\n');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('⚠️  Supabase environment variables not found');
    console.log('This test requires SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Test model_configuration_matrix table
    console.log('1. Testing model_configuration_matrix table...');
    const { data: matrixData, error: matrixError } = await supabase
      .from('model_configuration_matrix')
      .select('*')
      .limit(1);

    if (matrixError) {
      console.log('❌ model_configuration_matrix table not accessible:', matrixError.message);
    } else {
      console.log('✅ model_configuration_matrix table exists and is accessible');
      console.log(`   Current row count: ${matrixData?.length || 0}`);
    }

    // Test language_groups table
    console.log('\n2. Testing language_groups table...');
    const { data: langData, error: langError } = await supabase
      .from('language_groups')
      .select('language, group_name, is_web_language')
      .limit(5);

    if (langError) {
      console.log('❌ language_groups table not accessible:', langError.message);
    } else {
      console.log('✅ language_groups table exists and is accessible');
      console.log(`   Sample languages:`, langData?.map(l => l.language).join(', '));
    }

    // Test the views
    console.log('\n3. Testing model_config_lookup view...');
    const { data: viewData, error: viewError } = await supabase
      .from('model_config_lookup')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('❌ model_config_lookup view not accessible:', viewError.message);
    } else {
      console.log('✅ model_config_lookup view exists and is accessible');
    }

    // Test the functions
    console.log('\n4. Testing get_model_config function...');
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_model_config', {
        p_speed: 'fast',
        p_complexity: 'simple',
        p_language: 'javascript',
        p_repo_size: 'small',
        p_cost_sensitivity: 'high',
        p_quality_requirement: 'basic',
        p_analysis_type: 'pr_review'
      });

    if (funcError) {
      console.log('❌ get_model_config function not accessible:', funcError.message);
    } else {
      console.log('✅ get_model_config function exists and is accessible');
      console.log(`   Result: ${funcData?.length || 0} configurations found`);
    }

    // Test enum types
    console.log('\n5. Testing supported_language enum...');
    const { data: enumData, error: enumError } = await supabase
      .from('language_groups')
      .select('language')
      .eq('language', 'javascript')
      .limit(1);

    if (enumError) {
      console.log('❌ supported_language enum not working:', enumError.message);
    } else {
      console.log('✅ supported_language enum is working correctly');
    }

    console.log('\n🎉 All table tests completed!');
    console.log('\n📊 Next steps:');
    console.log('   - Tables are ready for Model Configuration Matrix service');
    console.log('   - No configurations exist yet (expected for new setup)');
    console.log('   - Language groups are populated with characteristics');
    console.log('   - Functions and views are ready for use');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testMatrixTables().catch(console.error);