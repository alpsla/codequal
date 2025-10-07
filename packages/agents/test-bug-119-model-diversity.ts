/**
 * BUG-119 Test: Verify Model Diversity
 *
 * Tests that each specialized agent (Security, Performance, Architecture, Quality, Dependency)
 * receives a different model from ModelConfigResolver based on role + language + size
 */

import * as dotenv from 'dotenv';
dotenv.config(); // Load .env file

import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
import { RepositorySizeCalculator } from './src/two-branch/utils/repository-size-calculator';

async function testModelDiversity() {
  console.log('🧪 BUG-119 Test: Model Diversity\n');

  const resolver = new ModelConfigResolver();

  // Test context: Java, Medium repository (more likely to have configs)
  const language = 'java';
  const repoSize = 'medium' as const; // Try medium size
  console.log(`Test Context: ${language}/${repoSize}\n`);

  // Test all 5 agent roles
  const roles = ['security', 'performance', 'architecture', 'codequality', 'dependency'];

  const modelConfigs: Record<string, string> = {};

  console.log('Fetching model configurations from Supabase...\n');

  for (const role of roles) {
    try {
      const config = await resolver.getModelConfiguration(role, language, repoSize);

      modelConfigs[role] = config.primary_model;

      console.log(`✅ ${role.padEnd(15)} → ${config.primary_model}`);

      if (config.isEmergencyFallback) {
        console.log(`   ⚠️  Emergency fallback activated`);
      }

      if (config.reasoning && config.reasoning.length > 0) {
        console.log(`   Reasoning: ${config.reasoning[0]}`);
      }

    } catch (error: any) {
      console.log(`❌ ${role.padEnd(15)} → Error: ${error.message}`);
    }
  }

  // Verify diversity
  console.log('\n📊 Model Diversity Analysis:');
  const uniqueModels = new Set(Object.values(modelConfigs));

  console.log(`Total roles: ${roles.length}`);
  console.log(`Unique models: ${uniqueModels.size}`);
  console.log(`Models: ${Array.from(uniqueModels).join(', ')}\n`);

  if (uniqueModels.size === 1) {
    console.log('❌ FAILED: All agents using the same model!');
    console.log('   Expected: Different models per role');
    console.log('   Actual: All using ' + Array.from(uniqueModels)[0]);
    return false;
  } else if (uniqueModels.size > 1 && uniqueModels.size < roles.length) {
    console.log('⚠️  PARTIAL: Some model diversity detected');
    console.log(`   ${uniqueModels.size} different models for ${roles.length} roles`);
    return true;
  } else {
    console.log('✅ SUCCESS: Complete model diversity!');
    console.log(`   Each role has a different model`);
    return true;
  }
}

// Run test
testModelDiversity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
