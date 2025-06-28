/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('ModelScoringTest');

async function main() {
  console.log(chalk.cyan('\n🔍 Testing Model Scoring Logic\n'));

  // Initialize ModelVersionSync with database credentials
  const modelVersionSync = new ModelVersionSync(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Wait for database initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get all available models
  const models = await (modelVersionSync as any).getAvailableModels();
  
  console.log(chalk.yellow('Available Models:\n'));
  
  for (const [key, model] of Object.entries(models)) {
    const modelInfo = model as any;
    const avgCost = modelInfo.pricing ? (modelInfo.pricing.input + modelInfo.pricing.output) / 2 : 0;
    console.log(chalk.blue(`${key}:`));
    console.log(`  Average cost: $${avgCost.toFixed(2)}/1M tokens`);
    console.log(`  Preferred for: ${modelInfo.preferredFor?.join(', ') || 'none'}`);
  }

  console.log(chalk.yellow('\n\nScoring Test Cases:\n'));

  const testCases = [
    {
      name: 'Small JavaScript Project',
      context: { language: 'javascript', sizeCategory: RepositorySizeCategory.SMALL }
    },
    {
      name: 'Large TypeScript Project',
      context: { language: 'typescript', sizeCategory: RepositorySizeCategory.LARGE }
    },
    {
      name: 'Security Agent',
      context: { language: 'security_agent', sizeCategory: RepositorySizeCategory.SMALL }
    }
  ];

  for (const test of testCases) {
    console.log(chalk.blue(`\n${test.name}:`));
    
    // Get all models and calculate their scores
    const scores: Array<{model: string, score: number, capabilities: any, pricing: any}> = [];
    
    for (const [key, model] of Object.entries(models)) {
      const modelInfo = model as any;
      const score = (modelVersionSync as any).calculateModelScore(modelInfo, test.context);
      scores.push({
        model: key,
        score,
        capabilities: modelInfo.capabilities,
        pricing: modelInfo.pricing
      });
    }
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    // Show top 3
    console.log(chalk.green('\nTop 3 models by score:'));
    for (let i = 0; i < Math.min(3, scores.length); i++) {
      const item = scores[i];
      const avgCost = item.pricing ? (item.pricing.input + item.pricing.output) / 2 : 0;
      console.log(`  ${i + 1}. ${item.model}`);
      console.log(`     Score: ${item.score.toFixed(2)}`);
      console.log(`     Cost: $${avgCost.toFixed(2)}/1M tokens`);
    }
  }

  console.log(chalk.cyan('\n\n📊 Analysis:\n'));
  console.log('The scoring system considers:');
  console.log('- Small repos: 40% cost weight, 30% quality, 40% speed');
  console.log('- Large repos: 15% cost weight, 30% quality, 10% speed');
  console.log('- Cost-based scoring makes cheap models dominate');
  
  console.log(chalk.green('\n✅ Model scoring analysis completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});