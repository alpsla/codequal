import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkLanguages() {
  const { data } = await supabase
    .from('model_configurations')
    .select('language')
    .order('language');

  const uniqueLanguages = [...new Set(data?.map(d => d.language))].sort();
  console.log(`\n📊 All configured languages (${uniqueLanguages.length}):\n`);
  uniqueLanguages.forEach(lang => console.log(`   - ${lang}`));

  console.log('\n📋 Analysis role coverage:\n');
  const analysisRoles = ['security', 'performance', 'code_quality', 'architecture', 'dependency'];

  for (const role of analysisRoles) {
    const { data: roleData } = await supabase
      .from('model_configurations')
      .select('language, primary_model')
      .eq('role', role);

    const roleLangs = new Set(roleData?.map(d => d.language) || []);
    const minimaxCount = roleData?.filter(d => d.primary_model === 'minimax/minimax-m2:free').length || 0;
    const missingLangs = uniqueLanguages.filter(l => !roleLangs.has(l));

    console.log(`   ${role}:`);
    console.log(`      ✅ Configured: ${roleLangs.size}/${uniqueLanguages.length} languages`);
    console.log(`      🎯 Using minimax: ${minimaxCount}/${roleLangs.size}`);
    if (missingLangs.length > 0) {
      console.log(`      ❌ Missing: ${missingLangs.join(', ')}`);
    }
  }

  console.log('\n');
}

checkLanguages();
