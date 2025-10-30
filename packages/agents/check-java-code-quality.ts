import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkJavaCodeQuality() {
  console.log('\n🔍 Checking code_quality/java configuration:\n');

  const { data } = await supabase
    .from('model_configurations')
    .select('role, language, size_category, primary_model, fallback_model')
    .eq('role', 'code_quality')
    .eq('language', 'java');

  if (data && data.length > 0) {
    console.log(`Found ${data.length} configuration(s) for code_quality/java:\n`);
    data.forEach(config => {
      console.log(`   Size: ${config.size_category}`);
      console.log(`   Primary: ${config.primary_model}`);
      console.log(`   Fallback: ${config.fallback_model}\n`);
    });
  } else {
    console.log('   ❌ No configurations found!\n');
  }
}

checkJavaCodeQuality();
