import dotenv from 'dotenv';
dotenv.config();

import { ModelResearcherService } from './src/two-branch/research-services/model-researcher-service';

/**
 * Complete model configuration update for ALL 10 roles
 *
 * ANALYSIS ROLES (5): Cost-focused weights for all languages
 * - security, performance, code_quality, architecture, dependency
 * - New weights: quality=0.30-0.35, speed=0.30-0.35, cost=0.35
 * - Expected: Free or very cheap models (minimax-m2:free)
 *
 * META ROLES (5): Preserve existing weights, check for better models
 * - researcher, orchestrator, educator, comparator, location_finder
 * - Keep current quality-focused weights
 * - Research if newer, more efficient models available
 */
async function updateAllRoles() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  Complete Model Configuration Update: ALL 10 ROLES                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const researcher = new ModelResearcherService();

  try {
    // STEP 1: Update analysis roles with cost-focused weights
    console.log('\n📍 STEP 1: Updating 5 Analysis Roles');
    console.log('   → Cost-focused weights across ALL 12 languages\n');

    await researcher.updateAnalysisRoleConfigurations();

    // STEP 2: Update meta roles with preserved weights
    console.log('\n\n📍 STEP 2: Updating 5 Meta Roles');
    console.log('   → Preserving existing quality-focused weights');
    console.log('   → Checking for newer, more efficient models\n');

    await researcher.updateMetaRoleConfigurations();

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 SUCCESS! Complete model configuration update finished!');
    console.log('\n📊 Summary:');
    console.log('   • 5 analysis roles updated with cost-focused weights');
    console.log('   • 5 meta roles updated with preserved weights');
    console.log('   • All 12 languages covered for analysis roles');
    console.log('   • Quarterly research refresh complete');
    console.log('   • Expected cost savings: 95-99% reduction\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

updateAllRoles();
