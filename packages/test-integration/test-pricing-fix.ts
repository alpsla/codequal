/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelConfigStore } from '../core/src/services/model-selection/ModelConfigStore';
import { createLogger } from '../core/src/utils/logger';
import { RepositorySizeCategory } from '../core/src/config/models/repository-model-config';

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

const logger = createLogger('PricingTest');

async function main() {
  console.log(chalk.cyan('\n🔍 Testing Pricing Data Retrieval\n'));

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Supabase credentials not found'));
    return;
  }

  const modelConfigStore = new ModelConfigStore(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    await modelConfigStore.init();
    console.log(chalk.green('✓ Connected to Supabase'));

    // Test specific configurations
    const testCases = [
      { language: 'orchestrator_agent', size: 'universal' as any },
      { language: 'javascript', size: RepositorySizeCategory.SMALL },
      { language: 'python', size: RepositorySizeCategory.MEDIUM }
    ];

    console.log(chalk.yellow('\n📋 Testing pricing retrieval:\n'));

    for (const test of testCases) {
      const config = await modelConfigStore.getModelConfig(test.language, test.size);
      
      if (config) {
        console.log(chalk.blue(`\n${test.language}/${test.size}:`));
        console.log(chalk.green(`✓ Model: ${config.provider}/${config.model}`));
        
        if (config.testResults?.pricing) {
          console.log(chalk.green(`✓ Pricing found:`));
          console.log(chalk.gray(`  Input: $${config.testResults.pricing.input}/1M tokens`));
          console.log(chalk.gray(`  Output: $${config.testResults.pricing.output}/1M tokens`));
        } else {
          console.log(chalk.red(`✗ Pricing is missing!`));
          console.log(chalk.gray(`  testResults: ${JSON.stringify(config.testResults, null, 2)}`));
        }
      } else {
        console.log(chalk.red(`✗ No configuration found for ${test.language}/${test.size}`));
      }
    }

    console.log(chalk.cyan('\n\n✅ Testing completed!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});