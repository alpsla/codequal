import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSupabaseModels() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in .env');
    process.exit(1);
  }

  console.log('🔍 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n📊 Querying model_configurations table...\n');

  // Query all Java configurations
  const { data, error } = await supabase
    .from('model_configurations')
    .select('role, language, size_category, primary_model, primary_provider, weights')
    .eq('language', 'java')
    .order('role');

  if (error) {
    console.error('❌ Error querying Supabase:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No Java model configurations found in Supabase');
    process.exit(0);
  }

  console.log(`✅ Found ${data.length} Java model configurations:\n`);

  // Group by role
  const byRole: Record<string, any[]> = {};
  data.forEach(config => {
    if (!byRole[config.role]) {
      byRole[config.role] = [];
    }
    byRole[config.role].push(config);
  });

  // Display by role
  for (const [role, configs] of Object.entries(byRole)) {
    console.log(`\n🎯 Role: ${role}`);
    configs.forEach(config => {
      console.log(`   Language: ${config.language}`);
      console.log(`   Size: ${config.size_category || 'any'}`);
      console.log(`   Model: ${config.primary_provider}/${config.primary_model}`);
      if (config.weights) {
        console.log(`   Weights:`, JSON.stringify(config.weights, null, 2).replace(/\n/g, '\n           '));
      }
      console.log('');
    });
  }

  // Check if qwen-2.5-coder is configured
  const qwenConfigs = data.filter(c => c.primary_model?.includes('qwen-2.5-coder'));
  console.log(`\n🔍 Qwen-2.5-coder configurations: ${qwenConfigs.length}/${data.length}`);
  
  if (qwenConfigs.length === 0) {
    console.log('⚠️  WARNING: No qwen-2.5-coder configurations found!');
    console.log('   Expected: All 5 agents should use qwen-2.5-coder');
  } else if (qwenConfigs.length < 5) {
    console.log('⚠️  WARNING: Only partial qwen-2.5-coder coverage');
    console.log(`   Found: ${qwenConfigs.length}/5 agents`);
    qwenConfigs.forEach(c => console.log(`      - ${c.role}`));
  } else {
    console.log('✅ All agents configured with qwen-2.5-coder');
  }

  // Check for expensive models
  const expensiveModels = data.filter(c => 
    c.primary_model?.includes('claude-sonnet-4') || 
    c.primary_model?.includes('claude-opus') ||
    c.primary_model?.includes('gpt-4')
  );
  
  if (expensiveModels.length > 0) {
    console.log(`\n⚠️  WARNING: Found ${expensiveModels.length} expensive model configurations:`);
    expensiveModels.forEach(c => {
      console.log(`   - ${c.role}: ${c.primary_provider}/${c.primary_model}`);
    });
  }

  console.log('\n✅ Check complete\n');
}

checkSupabaseModels().catch(console.error);





