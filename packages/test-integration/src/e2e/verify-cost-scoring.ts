/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { DEFAULT_MODEL_CONFIGS } from '../../../../packages/core/src/config/models/repository-model-config';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('VerifyCostScoring');

async function main() {
  console.log(chalk.cyan('\n🔍 Verifying Cost-Based Model Scoring\n'));

  const modelVersionSync = new ModelVersionSync(logger);

  // Show cost preferences from config
  console.log(chalk.yellow('Repository Size Cost Preferences:\n'));
  for (const [size, config] of Object.entries(DEFAULT_MODEL_CONFIGS)) {
    console.log(`${size}: cost_preference = ${config.cost_preference}`);
  }

  // Show model costs
  console.log(chalk.yellow('\n\nModel Costs (per 1M tokens):\n'));
  console.log(chalk.gray('(Model costs would be shown here if canonical versions were available)'))

  // Test scenarios
  console.log(chalk.yellow('\n\nTesting Cost-Aware Selection:\n'));

  const scenarios = [
    {
      name: 'Small Repository (should prefer low cost)',
      context: { language: 'python', sizeCategory: RepositorySizeCategory.SMALL },
      costPreference: 'low',
      expectedBehavior: 'Should select cheaper models like DeepSeek or Gemini Flash'
    },
    {
      name: 'Large Repository (medium cost acceptable)',
      context: { language: 'python', sizeCategory: RepositorySizeCategory.LARGE },
      costPreference: 'medium',
      expectedBehavior: 'Could select mid-range models like Gemini Pro or GPT-4o'
    }
  ];

  for (const scenario of scenarios) {
    console.log(chalk.blue(`\n${scenario.name}:`));
    console.log(chalk.gray(`Cost preference: ${scenario.costPreference}`));
    console.log(chalk.gray(`Expected: ${scenario.expectedBehavior}`));
    
    const selected = await modelVersionSync.findOptimalModel(scenario.context);
    const model = Array.isArray(selected) ? selected[0] : selected;
    
    if (model) {
      const avgCost = model.pricing ? (model.pricing.input + model.pricing.output) / 2 : 0;
      console.log(chalk.yellow(`\nActual selection: ${model.provider}/${model.model}`));
      console.log(chalk.yellow(`Average cost: $${avgCost.toFixed(2)}/1M tokens`));
      
      // Check if selection respects cost preference
      if (scenario.costPreference === 'low' && avgCost > 10) {
        console.log(chalk.red('❌ Selected expensive model despite low cost preference'));
      } else if (scenario.costPreference === 'low' && avgCost <= 1) {
        console.log(chalk.green('✓ Correctly selected low-cost model'));
      } else {
        console.log(chalk.yellow('⚠️  Cost preference not clearly reflected in selection'));
      }
    }
  }

  console.log(chalk.cyan('\n\n📊 Analysis:\n'));
  console.log(chalk.red('❌ Current Issue:'));
  console.log('- The calculateModelScore() function does NOT include cost/pricing');
  console.log('- cost_preference from config is defined but NOT used');
  console.log('- Selection is based only on capabilities (quality, speed, reasoning)');
  
  console.log(chalk.green('\n✓ Existing Implementation:'));
  console.log('- Researcher agent HAS cost-based scoring (35% weight on price)');
  console.log('- Uses formula: quality * 0.5 + price * 0.35 + speed * 0.15');
  
  console.log(chalk.yellow('\n💡 Recommendation:'));
  console.log('- Apply similar cost-aware scoring to general model selection');
  console.log('- Use cost_preference to adjust price weight dynamically');
  console.log('- Example: low=50% price weight, medium=30%, high=10%');

  console.log(chalk.green('\n✅ Verification completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});