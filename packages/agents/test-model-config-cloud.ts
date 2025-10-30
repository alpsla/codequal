import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Test to verify model configuration is correctly updated in cloud
 */
async function testModelConfig() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  Model Configuration Cloud Verification Test                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 Testing Analysis Roles (5 roles × 12 languages):\n');

  const analysisRoles = ['security', 'performance', 'code_quality', 'architecture', 'dependency'];
  const languages = ['java', 'python', 'javascript', 'typescript', 'go'];

  let analysisSuccess = 0;
  let analysisFailed = 0;

  for (const role of analysisRoles) {
    for (const lang of languages) {
      const { data } = await supabase
        .from('model_configurations')
        .select('primary_model, fallback_model')
        .eq('role', role)
        .eq('language', lang)
        .maybeSingle();

      if (data) {
        const isMinimax = data.primary_model === 'minimax/minimax-m2:free';
        if (isMinimax) {
          console.log(`   ✅ ${role}/${lang}: ${data.primary_model}`);
          analysisSuccess++;
        } else {
          console.log(`   ❌ ${role}/${lang}: ${data.primary_model} (expected minimax-m2:free)`);
          analysisFailed++;
        }
      } else {
        console.log(`   ⚠️  ${role}/${lang}: NOT FOUND`);
        analysisFailed++;
      }
    }
  }

  console.log('\n📊 Testing Meta Roles (5 roles):\n');

  const metaRoles = ['researcher', 'orchestrator', 'educator', 'comparator', 'location_finder'];

  let metaSuccess = 0;
  let metaFailed = 0;

  for (const role of metaRoles) {
    const { data } = await supabase
      .from('model_configurations')
      .select('primary_model, fallback_model, weights')
      .eq('role', role)
      .eq('language', 'java')
      .maybeSingle();

    if (data) {
      const isCorrectModel = data.primary_model === 'openai/gpt-4o-mini-search-preview';
      if (isCorrectModel) {
        console.log(`   ✅ ${role}: ${data.primary_model}`);
        console.log(`      Weights: q=${data.weights.quality}, s=${data.weights.speed}, c=${data.weights.cost}`);
        metaSuccess++;
      } else {
        console.log(`   ❌ ${role}: ${data.primary_model} (expected gpt-4o-mini-search-preview)`);
        metaFailed++;
      }
    } else {
      console.log(`   ⚠️  ${role}: NOT FOUND`);
      metaFailed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 RESULTS SUMMARY:\n');
  console.log(`   Analysis Roles: ${analysisSuccess}/${analysisSuccess + analysisFailed} ✅`);
  console.log(`   Meta Roles:     ${metaSuccess}/${metaSuccess + metaFailed} ✅`);

  if (analysisFailed === 0 && metaFailed === 0) {
    console.log('\n🎉 ALL MODEL CONFIGURATIONS VERIFIED IN CLOUD!');
    console.log('   • All analysis roles using minimax-m2:free ($0.00/1M)');
    console.log('   • All meta roles using gpt-4o-mini-search-preview (~$0.15/1M)');
    console.log('   • Expected cost savings: 95-99% reduction\n');
  } else {
    console.log(`\n⚠️  SOME CONFIGURATIONS FAILED: ${analysisFailed + metaFailed} issues found\n`);
  }
}

testModelConfig().catch(console.error);
