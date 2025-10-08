/**
 * Test to verify BUG-119 fix: Model diversity for all 5 agent roles
 */

import * as dotenv from 'dotenv';
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';

dotenv.config();

async function testModelDiversity() {
  console.log('🧪 Testing BUG-119 Fix: Model Diversity\n');

  const resolver = new ModelConfigResolver();
  resolver.clearCache();

  const roles = ['security', 'performance', 'architecture', 'codequality', 'dependency'];
  const language = 'java';
  const size = 'large';

  console.log(`Testing: ${language}/${size}\n`);

  const models = new Map<string, string>();

  for (const role of roles) {
    try {
      console.log(`Fetching model for ${role}...`);
      const config = await resolver.getModelConfiguration(role, language, size);
      models.set(role, config.primary_model);
      console.log(`   ✅ ${role}: ${config.primary_model}\n`);
    } catch (error: any) {
      console.log(`   ❌ ${role}: ERROR - ${error.message}\n`);
      models.set(role, 'ERROR');
    }
  }

  console.log('📊 Summary:\n');

  const modelList = Array.from(models.values());
  const uniqueModels = new Set(modelList);

  console.log('Models assigned:');
  for (const [role, model] of models.entries()) {
    console.log(`   ${role}: ${model}`);
  }

  console.log(`\n🎯 Result: ${uniqueModels.size} unique models out of ${roles.length} roles`);

  if (uniqueModels.size === roles.length) {
    console.log('   ✅ SUCCESS! All agents use different models (BUG-119 FIXED!)');
  } else if (uniqueModels.size === 1) {
    console.log('   ❌ FAILURE! All agents using the same model (BUG-119 NOT FIXED)');
    console.log('   This means Supabase lookup is still failing');
  } else {
    console.log(`   ⚠️  PARTIAL! Some models are duplicated`);
    console.log('   Check if specific roles are missing from Supabase');
  }

  // Show which models are duplicated
  if (uniqueModels.size < roles.length) {
    console.log('\n🔍 Duplicate analysis:');
    const modelCount = new Map<string, string[]>();
    for (const [role, model] of models.entries()) {
      if (!modelCount.has(model)) {
        modelCount.set(model, []);
      }
      modelCount.get(model)!.push(role);
    }

    for (const [model, rolesList] of modelCount.entries()) {
      if (rolesList.length > 1) {
        console.log(`   ${model}: used by ${rolesList.join(', ')}`);
      }
    }
  }

  return uniqueModels.size === roles.length;
}

testModelDiversity()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
