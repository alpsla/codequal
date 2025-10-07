/**
 * BUG-119 Complete Test: All 9 Roles Model Diversity
 *
 * Tests model diversity for ALL agent roles:
 *
 * SPECIALIZED AGENTS (language + size dependent):
 * 1. security
 * 2. performance
 * 3. architecture
 * 4. codequality
 * 5. dependency
 *
 * ORCHESTRATION AGENTS (language dependent, size=medium):
 * 6. orchestrator
 * 7. comparator
 *
 * UNIVERSAL AGENTS (language='universal', size='medium'):
 * 8. educator
 * 9. researcher
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';

async function testAllRoles() {
  console.log('🧪 BUG-119 Complete Test: All 9 Roles Model Diversity\n');

  const resolver = new ModelConfigResolver();

  // Test context: Java, Medium repository
  const language = 'java';
  const repoSize = 'medium' as const;

  const results: Record<string, { model: string; category: string }> = {};

  // 1-5: Specialized Agents (language + size dependent)
  console.log('═══════════════════════════════════════════════════════');
  console.log('SPECIALIZED AGENTS (language + size dependent)');
  console.log('═══════════════════════════════════════════════════════\n');

  const specializedRoles = ['security', 'performance', 'architecture', 'codequality', 'dependency'];

  for (const role of specializedRoles) {
    try {
      const config = await resolver.getModelConfiguration(role, language, repoSize);
      results[role] = {
        model: config.primary_model,
        category: 'specialized'
      };
      console.log(`✅ ${role.padEnd(15)} (${language}/${repoSize}) → ${config.primary_model}`);
    } catch (error: any) {
      console.log(`❌ ${role.padEnd(15)} → Error: ${error.message}`);
    }
  }

  // 6-7: Orchestration Agents (language dependent, size=medium)
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('ORCHESTRATION AGENTS (language dependent, size=medium)');
  console.log('═══════════════════════════════════════════════════════\n');

  const orchestrationRoles = ['orchestrator', 'comparator'];

  for (const role of orchestrationRoles) {
    try {
      const config = await resolver.getModelConfiguration(role, language, 'medium');
      results[role] = {
        model: config.primary_model,
        category: 'orchestration'
      };
      console.log(`✅ ${role.padEnd(15)} (${language}/medium) → ${config.primary_model}`);
    } catch (error: any) {
      console.log(`❌ ${role.padEnd(15)} → Error: ${error.message}`);
    }
  }

  // 8-9: Universal Agents (language='universal', size='medium')
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('UNIVERSAL AGENTS (language=universal, size=medium)');
  console.log('═══════════════════════════════════════════════════════\n');

  const universalRoles = ['educator', 'researcher'];

  for (const role of universalRoles) {
    try {
      const config = await resolver.getModelConfiguration(role, 'universal', 'medium');
      results[role] = {
        model: config.primary_model,
        category: 'universal'
      };
      console.log(`✅ ${role.padEnd(15)} (universal/medium) → ${config.primary_model}`);
    } catch (error: any) {
      console.log(`❌ ${role.padEnd(15)} → Error: ${error.message}`);
    }
  }

  // Analyze diversity
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('MODEL DIVERSITY ANALYSIS');
  console.log('═══════════════════════════════════════════════════════\n');

  const totalRoles = Object.keys(results).length;
  const uniqueModels = new Set(Object.values(results).map(r => r.model));

  console.log(`Total roles tested: ${totalRoles}/9`);
  console.log(`Unique models: ${uniqueModels.size}`);
  console.log(`\nModels in use:`);

  const modelCounts = new Map<string, number>();
  Object.values(results).forEach(r => {
    modelCounts.set(r.model, (modelCounts.get(r.model) || 0) + 1);
  });

  Array.from(modelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      const roles = Object.entries(results)
        .filter(([_, r]) => r.model === model)
        .map(([role, _]) => role)
        .join(', ');
      console.log(`  • ${model} (${count} role${count > 1 ? 's' : ''}): ${roles}`);
    });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('RESULT');
  console.log('═══════════════════════════════════════════════════════\n');

  if (totalRoles < 9) {
    console.log(`⚠️  INCOMPLETE: Only ${totalRoles}/9 roles tested`);
    console.log(`   Missing configs or errors occurred`);
    return false;
  } else if (uniqueModels.size === 1) {
    console.log('❌ FAILED: All agents using the same model!');
    console.log(`   Expected: Different models per role`);
    console.log(`   Actual: All using ${Array.from(uniqueModels)[0]}`);
    return false;
  } else if (uniqueModels.size < totalRoles * 0.5) {
    console.log(`⚠️  PARTIAL: Limited diversity (${uniqueModels.size} models for ${totalRoles} roles)`);
    console.log(`   Expected: At least ${Math.ceil(totalRoles * 0.5)} different models`);
    return true;
  } else {
    console.log(`✅ SUCCESS: Strong model diversity!`);
    console.log(`   ${uniqueModels.size} different models for ${totalRoles} roles`);
    console.log(`   Diversity ratio: ${((uniqueModels.size / totalRoles) * 100).toFixed(0)}%`);
    return true;
  }
}

// Run test
testAllRoles()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
