/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('CostOptimizationTest');

async function main() {
  console.log(chalk.cyan('\n💰 Cost Optimization Test\n'));

  const modelVersionSync = new ModelVersionSync(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get all available models to see pricing
  const models = await (modelVersionSync as any).getAvailableModels();
  
  console.log(chalk.yellow('📊 Available Models with Pricing:\n'));
  
  // Group models by cost
  const modelsByPrice: { model: string; pricing: any; avgCost: number }[] = [];
  
  for (const [key, model] of Object.entries(models)) {
    const m = model as any;
    if (m.pricing && (m.pricing.input > 0 || m.pricing.output > 0)) {
      const avgCost = (m.pricing.input + m.pricing.output) / 2;
      modelsByPrice.push({
        model: key,
        pricing: m.pricing,
        avgCost
      });
    }
  }
  
  // Sort by average cost
  modelsByPrice.sort((a, b) => a.avgCost - b.avgCost);
  
  console.log(chalk.blue('Cheapest Models:'));
  modelsByPrice.slice(0, 5).forEach(m => {
    // Convert from per-token to per-million-tokens for display
    const displayCost = m.avgCost * 1000000;
    console.log(`  ${m.model}: $${displayCost.toFixed(2)}/1M tokens`);
  });
  
  console.log(chalk.blue('\nMost Expensive Models:'));
  modelsByPrice.slice(-5).reverse().forEach(m => {
    // Convert from per-token to per-million-tokens for display
    const displayCost = m.avgCost * 1000000;
    console.log(`  ${m.model}: $${displayCost.toFixed(2)}/1M tokens`);
  });

  // Test cost-based selection for different repository sizes
  console.log(chalk.yellow('\n\n🔍 Testing Cost-Based Selection:\n'));
  
  const testScenarios = [
    {
      name: 'Small Repository (Cost Priority)',
      context: { 
        language: 'javascript', 
        sizeCategory: RepositorySizeCategory.SMALL 
      }
    },
    {
      name: 'Large Repository (Quality Priority)',
      context: { 
        language: 'javascript', 
        sizeCategory: RepositorySizeCategory.LARGE 
      }
    }
  ];

  for (const scenario of testScenarios) {
    console.log(chalk.blue(`\n${scenario.name}:`));
    
    const selected = await modelVersionSync.findOptimalModel(scenario.context);
    
    if (selected) {
      const model = Array.isArray(selected) ? selected[0] : selected;
      const pricing = (model as any).pricing || { input: 0, output: 0 };
      const avgCost = (pricing.input + pricing.output) / 2;
      const displayCost = avgCost * 1000000; // Convert to per-million-tokens
      
      console.log(`  Selected: ${model.provider}/${model.model}`);
      console.log(`  Cost: $${displayCost.toFixed(2)}/1M tokens`);
      
      // Calculate the model's score
      const score = (modelVersionSync as any).calculateModelScore(model, scenario.context);
      console.log(`  Score: ${score.toFixed(2)}`);
    }
  }

  // Analyze scoring weights
  console.log(chalk.yellow('\n\n📈 Scoring Weight Analysis:\n'));
  console.log('Repository Size Cost Weights:');
  console.log('  Small: 40% cost, 60% capabilities');
  console.log('  Medium: 25% cost, 75% capabilities');
  console.log('  Large: 15% cost, 85% capabilities');
  console.log('  Extra Large: 10% cost, 90% capabilities');

  // Test if different sizes select different models
  console.log(chalk.yellow('\n\n🎯 Model Selection by Size:\n'));
  
  const sizes = [
    RepositorySizeCategory.SMALL,
    RepositorySizeCategory.MEDIUM,
    RepositorySizeCategory.LARGE
  ];
  
  const selections = new Map<string, Set<string>>();
  
  for (const size of sizes) {
    const model = await modelVersionSync.findOptimalModel({
      language: 'typescript',
      sizeCategory: size
    });
    
    if (model) {
      const m = Array.isArray(model) ? model[0] : model;
      const key = `${m.provider}/${m.model}`;
      
      if (!selections.has(key)) {
        selections.set(key, new Set());
      }
      selections.get(key)!.add(size);
      
      const pricing = (m as any).pricing || { input: 0, output: 0 };
      const displayCost = ((pricing.input + pricing.output) / 2) * 1000000;
      
      console.log(`${size}: ${key} ($${displayCost.toFixed(2)}/1M)`);
    }
  }

  console.log(chalk.cyan('\n\n📊 Cost Optimization Summary:\n'));
  
  if (selections.size === 1) {
    console.log(chalk.red('❌ Same model selected for all sizes - cost optimization not working!'));
    console.log(chalk.yellow('\nPossible issues:'));
    console.log('  1. All models have similar scores');
    console.log('  2. Pricing differences are too small');
    console.log('  3. Capability scores dominate cost scores');
  } else {
    console.log(chalk.green('✅ Different models selected based on repository size'));
    console.log(chalk.green('✅ Cost optimization is working correctly'));
  }
  
  console.log(chalk.green('\n✅ Cost optimization test completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});