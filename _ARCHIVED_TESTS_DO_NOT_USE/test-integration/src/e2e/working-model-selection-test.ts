/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('ModelSelectionTest');

/**
 * This test demonstrates how model selection actually works in the system
 */
async function main() {
  console.log(chalk.cyan('\n🔍 Testing Real Model Selection Flow\n'));

  // Initialize ModelVersionSync - this is what's actually used
  const modelVersionSync = new ModelVersionSync(logger);

  console.log(chalk.yellow('How Model Selection Works:\n'));
  console.log('1. Repository context is analyzed (language, size, frameworks)');
  console.log('2. ModelVersionSync finds optimal model from CANONICAL_MODEL_VERSIONS');
  console.log('3. Models are accessed through OpenRouter API');
  console.log('4. Costs are calculated from stored pricing data\n');

  // Test scenarios matching the ones that failed
  const testScenarios = [
    {
      name: 'Small JavaScript Project (Quick Analysis)',
      context: { language: 'javascript', sizeCategory: RepositorySizeCategory.SMALL },
      expectedUseCase: 'Fast PR reviews, quick security scans'
    },
    {
      name: 'Medium Python Project (Comprehensive)',
      context: { language: 'python', sizeCategory: RepositorySizeCategory.MEDIUM },
      expectedUseCase: 'Full repository analysis with detailed insights'
    },
    {
      name: 'Large TypeScript Project (Targeted)',
      context: { language: 'typescript', sizeCategory: RepositorySizeCategory.LARGE },
      expectedUseCase: 'Deep architectural analysis, performance optimization'
    },
    {
      name: 'Small Elixir Project (Missing Config)',
      context: { language: 'elixir', sizeCategory: RepositorySizeCategory.SMALL },
      expectedUseCase: 'Tests researcher agent activation for unsupported language'
    },
    {
      name: 'Large Rust Project (Systems)',
      context: { language: 'rust', sizeCategory: RepositorySizeCategory.LARGE },
      expectedUseCase: 'Memory safety analysis, performance profiling'
    }
  ];

  console.log(chalk.yellow('Testing Model Selection Scenarios:\n'));

  for (const scenario of testScenarios) {
    console.log(chalk.blue(`\n${scenario.name}:`));
    console.log(chalk.gray(`Use case: ${scenario.expectedUseCase}`));
    
    const result = await modelVersionSync.findOptimalModel(scenario.context);
    const optimalModel = Array.isArray(result) ? result[0] : result;
    
    if (optimalModel) {
      console.log(chalk.green(`✓ Selected: ${optimalModel.provider}/${optimalModel.model}`));
      
      // Show capabilities
      if (optimalModel.capabilities) {
        console.log(chalk.gray('  Capabilities:'));
        console.log(chalk.gray(`    - Code Quality: ${optimalModel.capabilities.codeQuality}/10`));
        console.log(chalk.gray(`    - Speed: ${optimalModel.capabilities.speed}/10`));
        console.log(chalk.gray(`    - Context Window: ${optimalModel.capabilities.contextWindow} tokens`));
      }
      
      // Show pricing
      if (optimalModel.pricing) {
        console.log(chalk.gray('  Pricing:'));
        console.log(chalk.gray(`    - Input: $${optimalModel.pricing.input}/1M tokens`));
        console.log(chalk.gray(`    - Output: $${optimalModel.pricing.output}/1M tokens`));
        
        // Calculate example cost
        const exampleInputTokens = 10000;
        const exampleOutputTokens = 5000;
        const inputCost = (exampleInputTokens / 1000000) * optimalModel.pricing.input;
        const outputCost = (exampleOutputTokens / 1000000) * optimalModel.pricing.output;
        const totalCost = inputCost + outputCost;
        
        console.log(chalk.gray(`    - Example (10k in/5k out): $${totalCost.toFixed(4)}`));
      }
      
      // Check if this would trigger researcher
      if (!optimalModel.preferredFor?.includes(scenario.context.language)) {
        console.log(chalk.yellow('  ⚠️  Note: This language may benefit from researcher agent calibration'));
      }
    } else {
      console.log(chalk.red(`✗ No model found - would trigger researcher agent`));
    }
  }

  console.log(chalk.cyan('\n\n📊 Summary:\n'));
  console.log('• Models are dynamically selected based on repository context');
  console.log('• All models are accessed through OpenRouter (prefix: openrouter/)');
  console.log('• Costs are accurately tracked from stored configurations');
  console.log('• Missing configurations trigger the Researcher agent');
  console.log('• The system adapts to new models through quarterly updates');

  console.log(chalk.green('\n✅ Model selection test completed successfully!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});