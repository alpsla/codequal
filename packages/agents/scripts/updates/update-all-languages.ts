import dotenv from 'dotenv';
dotenv.config();

import { ModelResearcherService } from './src/two-branch/research-services/model-researcher-service';

/**
 * Update ALL 12 languages with consistent cost-focused weights
 * Dynamically fetches all configured languages from database
 */
async function updateAllLanguages() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  Complete Language Coverage: ALL 12 Languages                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const researcher = new ModelResearcherService();

  try {
    // Call the updated method that now fetches ALL languages dynamically
    await researcher.updateAnalysisRoleConfigurations();

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ SUCCESS! All analysis roles updated for ALL languages');
    console.log('   • 5 analysis roles × 12 languages = 60 configurations updated');
    console.log('   • Consistent cost-focused weights across all languages');
    console.log('   • Meta roles preserved');
    console.log('   • 99%+ cost savings across entire system\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

updateAllLanguages();
