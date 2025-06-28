/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('SimpleModelTest');

async function main() {
  console.log(chalk.cyan('\n🔍 Testing Model Selection from Canonical Versions\n'));

  // Initialize ModelVersionSync
  const modelVersionSync = new ModelVersionSync(logger);

  // Show available models info
  console.log(chalk.yellow('Model Selection Test\n'));
  console.log(chalk.gray('Models are now dynamically loaded from the system'));

  // Test finding optimal models for different contexts
  console.log(chalk.yellow('\nTesting Optimal Model Selection:\n'));

  const testContexts = [
    { language: 'javascript', sizeCategory: RepositorySizeCategory.SMALL },
    { language: 'python', sizeCategory: RepositorySizeCategory.MEDIUM },
    { language: 'typescript', sizeCategory: RepositorySizeCategory.LARGE },
    { language: 'elixir', sizeCategory: RepositorySizeCategory.SMALL },
    { language: 'rust', sizeCategory: RepositorySizeCategory.LARGE }
  ];

  for (const context of testContexts) {
    const result = await modelVersionSync.findOptimalModel(context);
    const optimalModel = Array.isArray(result) ? result[0] : result;
    
    if (optimalModel) {
      console.log(chalk.green(`✓ ${context.language}/${context.sizeCategory}: ${optimalModel.provider}/${optimalModel.model}`));
      if (optimalModel.pricing) {
        console.log(chalk.gray(`  Cost: $${optimalModel.pricing.input}/1M input, $${optimalModel.pricing.output}/1M output`));
      }
    } else {
      console.log(chalk.red(`✗ ${context.language}/${context.sizeCategory}: No model found`));
    }
  }

  console.log(chalk.cyan('\n✅ Simple model test completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});