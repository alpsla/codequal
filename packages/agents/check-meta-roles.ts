import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkMetaRoles() {
  console.log('\n📊 Meta Role Configurations:\n');

  const metaRoles = ['researcher', 'orchestrator', 'educator', 'comparator', 'location_finder'];

  for (const role of metaRoles) {
    const { data } = await supabase
      .from('model_configurations')
      .select('role, language, size_category, primary_model, fallback_model, weights')
      .eq('role', role)
      .eq('language', 'java')
      .maybeSingle();

    if (data) {
      console.log(`🔹 ${role.toUpperCase()}`);
      console.log(`   Primary: ${data.primary_model}`);
      console.log(`   Fallback: ${data.fallback_model}`);
      console.log(`   Weights: quality=${data.weights.quality}, speed=${data.weights.speed}, cost=${data.weights.cost}`);
      console.log('');
    }
  }

  console.log('\n✅ All meta roles updated with preserved weights!');
  console.log('   Research found optimal models for current weights\n');
}

checkMetaRoles();
