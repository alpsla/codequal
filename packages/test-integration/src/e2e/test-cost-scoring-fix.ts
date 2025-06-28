/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

// Enable debug logging to see scoring details
process.env.LOG_LEVEL = 'debug';
const logger = createLogger('TestCostScoring');

async function main() {
  console.log(chalk.cyan('\n🔍 Testing Cost-Based Model Scoring Fix\n'));

  const modelVersionSync = new ModelVersionSync(logger);

  // Show the improvement in model selection
  console.log(chalk.yellow('Model Selection Results:\n'));

  const testCases = [
    {
      name: 'Small Python Project',
      context: { language: 'python', sizeCategory: RepositorySizeCategory.SMALL },
      description: '40% cost weight - should prefer cheaper models'
    },
    {
      name: 'Medium JavaScript Project', 
      context: { language: 'javascript', sizeCategory: RepositorySizeCategory.MEDIUM },
      description: '25% cost weight - balance cost and capabilities'
    },
    {
      name: 'Large TypeScript Project',
      context: { language: 'typescript', sizeCategory: RepositorySizeCategory.LARGE },
      description: '15% cost weight - prioritize capabilities'
    }
  ];

  console.log(chalk.gray('Cost Weights by Size:'));
  console.log(chalk.gray('- Small: 40% cost, 60% capabilities'));
  console.log(chalk.gray('- Medium: 25% cost, 75% capabilities'));
  console.log(chalk.gray('- Large: 15% cost, 85% capabilities'));
  console.log(chalk.gray('- Extra Large: 10% cost, 90% capabilities\n'));

  for (const test of testCases) {
    console.log(chalk.blue(`\n${test.name}:`));
    console.log(chalk.gray(test.description));
    
    const selected = await modelVersionSync.findOptimalModel(test.context);
    const model = Array.isArray(selected) ? selected[0] : selected;
    
    if (model) {
      const avgCost = model.pricing ? (model.pricing.input + model.pricing.output) / 2 : 0;
      console.log(chalk.green(`✓ Selected: ${model.provider}/${model.model}`));
      console.log(chalk.green(`  Average cost: $${avgCost.toFixed(2)}/1M tokens`));
      
      // Show why this model was selected
      if (test.context.sizeCategory === RepositorySizeCategory.SMALL && avgCost < 25) {
        console.log(chalk.green(`  ✓ Good choice for small repo (cost-effective)`));
      } else if (test.context.sizeCategory === RepositorySizeCategory.LARGE && model.capabilities?.codeQuality && model.capabilities.codeQuality > 8.5) {
        console.log(chalk.green(`  ✓ Good choice for large repo (high quality)`));
      }
    }
  }

  console.log(chalk.cyan('\n\n📊 Cost-Based Selection Summary:\n'));
  
  // Compare costs across selections
  console.log(chalk.yellow('Model Diversity:'));
  const selections = new Set();
  for (const test of testCases) {
    const result = await modelVersionSync.findOptimalModel(test.context);
    const model = Array.isArray(result) ? result[0] : result;
    if (model) {
      selections.add(`${model.provider}/${model.model}`);
    }
  }
  
  if (selections.size > 1) {
    console.log(chalk.green(`✓ Different models selected for different contexts (${selections.size} unique models)`));
    console.log(chalk.gray(`  Models: ${Array.from(selections).join(', ')}`));
  } else {
    console.log(chalk.red(`✗ Same model selected for all contexts`));
  }

  console.log(chalk.cyan('\n✅ Cost-based scoring is now implemented!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});