import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanDuplicateModels() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env');
    process.exit(1);
  }

  console.log('🔍 Connecting to Supabase...\n');
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Find and delete old 'codequality' rows (without underscore)
  console.log('📋 Step 1: Checking for old "codequality" rows (should be "code_quality")...\n');
  
  const { data: oldRows, error: selectError } = await supabase
    .from('model_configurations')
    .select('*')
    .eq('role', 'codequality')
    .eq('language', 'java');

  if (selectError) {
    console.error('❌ Error querying:', selectError);
    process.exit(1);
  }

  if (!oldRows || oldRows.length === 0) {
    console.log('✅ No old "codequality" rows found - database is clean!\n');
  } else {
    console.log(`⚠️  Found ${oldRows.length} old "codequality" rows to delete:`);
    oldRows.forEach(row => {
      console.log(`   - ${row.role} / ${row.language} / ${row.size_category} → ${row.primary_model}`);
    });
    
    console.log('\n🗑️  Deleting old rows...');
    const { error: deleteError } = await supabase
      .from('model_configurations')
      .delete()
      .eq('role', 'codequality')
      .eq('language', 'java');

    if (deleteError) {
      console.error('❌ Error deleting:', deleteError);
      process.exit(1);
    }
    
    console.log(`✅ Deleted ${oldRows.length} old "codequality" rows\n`);
  }

  // Step 2: Verify all agent roles use qwen-2.5-coder
  console.log('📋 Step 2: Verifying all agent roles use qwen-2.5-coder...\n');
  
  const agentRoles = ['security', 'code_quality', 'performance', 'dependency', 'architecture'];
  
  for (const role of agentRoles) {
    const { data, error } = await supabase
      .from('model_configurations')
      .select('primary_model, size_category')
      .eq('role', role)
      .eq('language', 'java')
      .maybeSingle();

    if (error) {
      console.error(`❌ Error checking ${role}:`, error);
      continue;
    }

    if (!data) {
      console.log(`⚠️  ${role}: NO CONFIGURATION FOUND`);
    } else if (data.primary_model?.includes('qwen-2.5-coder')) {
      console.log(`✅ ${role}: qwen-2.5-coder (size: ${data.size_category || 'any'})`);
    } else {
      console.log(`❌ ${role}: ${data.primary_model} (NOT qwen-2.5-coder!)`);
    }
  }

  console.log('\n✅ Cleanup complete!\n');
}

cleanDuplicateModels().catch(console.error);





