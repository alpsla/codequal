import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyModels() {
  console.log('🔍 Verifying Model Configurations After Weight Changes\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const roles = ['security', 'performance', 'code_quality', 'codequality', 'dependency', 'architecture'];
  
  for (const role of roles) {
    const { data, error } = await supabase
      .from('model_configurations')
      .select('role, language, size_category, primary_model, fallback_model, weights')
      .eq('role', role)
      .eq('language', 'java')
      .eq('size_category', 'medium')
      .single();
    
    if (data) {
      console.log(`�� ${role.toUpperCase()}`);
      console.log(`   Primary: ${data.primary_model}`);
      console.log(`   Fallback: ${data.fallback_model}`);
      console.log(`   Weights: ${JSON.stringify(data.weights)}`);
      console.log();
    }
  }
}

verifyModels().catch(console.error);
