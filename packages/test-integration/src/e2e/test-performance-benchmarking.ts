/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('PerformanceBenchmarkTest');

// Test scenarios for performance benchmarking
const BENCHMARK_SCENARIOS = [
  // Different repository sizes
  {
    name: 'Small TypeScript Microservice',
    context: { 
      language: 'typescript', 
      sizeCategory: RepositorySizeCategory.SMALL,
      tags: ['api', 'express']
    },
    expectedCharacteristics: 'Fast, cost-effective'
  },
  {
    name: 'Medium Python Data Science Project',
    context: { 
      language: 'python', 
      sizeCategory: RepositorySizeCategory.MEDIUM,
      tags: ['data-science', 'machine-learning']
    },
    expectedCharacteristics: 'Balanced speed and quality'
  },
  {
    name: 'Large Java Enterprise Application',
    context: { 
      language: 'java', 
      sizeCategory: RepositorySizeCategory.LARGE,
      tags: ['enterprise', 'spring-boot']
    },
    expectedCharacteristics: 'High quality, large context'
  },
  // Agent-specific scenarios
  {
    name: 'Security Analysis Agent',
    context: { 
      language: 'security_agent', 
      sizeCategory: RepositorySizeCategory.SMALL,
      tags: ['security', 'vulnerability-scanning']
    },
    expectedCharacteristics: 'High quality, thorough analysis'
  },
  {
    name: 'Performance Analysis Agent',
    context: { 
      language: 'performance_agent', 
      sizeCategory: RepositorySizeCategory.SMALL,
      tags: ['performance', 'optimization']
    },
    expectedCharacteristics: 'Fast, efficient'
  },
  {
    name: 'Educational Content Agent',
    context: { 
      language: 'educational_agent', 
      sizeCategory: RepositorySizeCategory.SMALL,
      tags: ['education', 'documentation']
    },
    expectedCharacteristics: 'Clear, detailed explanations'
  }
];

async function main() {
  console.log(chalk.cyan('\n⚡ Performance Benchmarking Test\n'));

  const modelVersionSync = new ModelVersionSync(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(chalk.yellow('Testing model selection for different scenarios:\n'));

  const selectedModels = new Map<string, number>();
  const costAnalysis: { scenario: string; model: string; cost: number }[] = [];

  for (const scenario of BENCHMARK_SCENARIOS) {
    console.log(chalk.blue(`\n${scenario.name}:`));
    console.log(chalk.gray(`  Expected: ${scenario.expectedCharacteristics}`));
    
    // Get primary and fallback models
    const selected = await modelVersionSync.findOptimalModel(scenario.context, undefined, true);
    
    if (selected) {
      const models = Array.isArray(selected) ? selected : [selected];
      
      models.forEach((model, index) => {
        const modelKey = `${model.provider}/${model.model}`;
        selectedModels.set(modelKey, (selectedModels.get(modelKey) || 0) + 1);
        
        const pricing = model.pricing || { input: 0, output: 0 };
        const avgCost = (pricing.input + pricing.output) / 2;
        
        const role = index === 0 ? 'Primary' : 'Fallback';
        console.log(chalk.green(`  ${role}: ${modelKey}`));
        console.log(`    Cost: $${avgCost.toFixed(4)}/1M tokens`);
        console.log(`    Context: ${model.capabilities?.contextWindow || 'N/A'} tokens`);
        
        if (index === 0) {
          costAnalysis.push({
            scenario: scenario.name,
            model: modelKey,
            cost: avgCost
          });
        }
      });
    } else {
      console.log(chalk.red('  No model selected'));
    }
  }

  // Performance Analysis
  console.log(chalk.cyan('\n\n📊 Performance Analysis:\n'));

  // Model diversity
  console.log(chalk.yellow('1. Model Diversity:'));
  console.log(`   Unique models used: ${selectedModels.size}`);
  
  if (selectedModels.size === 1) {
    console.log(chalk.red('   ⚠️  WARNING: Only one model is being selected for all scenarios!'));
    console.log(chalk.red('   This indicates a problem with model scoring or availability.'));
  } else {
    console.log(chalk.green('   ✓ Good model diversity across scenarios'));
  }
  
  console.log(chalk.yellow('\n   Model usage frequency:'));
  Array.from(selectedModels.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      console.log(`   - ${model}: ${count} times`);
    });

  // Cost analysis
  console.log(chalk.yellow('\n2. Cost Analysis:'));
  const avgCost = costAnalysis.reduce((sum, item) => sum + item.cost, 0) / costAnalysis.length;
  const minCost = Math.min(...costAnalysis.map(item => item.cost));
  const maxCost = Math.max(...costAnalysis.map(item => item.cost));
  
  console.log(`   Average cost: $${avgCost.toFixed(4)}/1M tokens`);
  console.log(`   Min cost: $${minCost.toFixed(4)}/1M tokens`);
  console.log(`   Max cost: $${maxCost.toFixed(4)}/1M tokens`);
  console.log(`   Cost range: ${((maxCost - minCost) / avgCost * 100).toFixed(1)}% variation`);

  // Provider diversity
  console.log(chalk.yellow('\n3. Provider Distribution:'));
  const providers = new Map<string, number>();
  selectedModels.forEach((count, model) => {
    const provider = model.split('/')[0];
    providers.set(provider, (providers.get(provider) || 0) + count);
  });
  
  providers.forEach((count, provider) => {
    const percentage = (count / Array.from(selectedModels.values()).reduce((a, b) => a + b, 0) * 100).toFixed(1);
    console.log(`   ${provider}: ${percentage}%`);
  });

  // Recommendations
  console.log(chalk.cyan('\n\n🎯 Recommendations:\n'));
  
  if (selectedModels.size < 3) {
    console.log(chalk.red('❌ Low model diversity detected. Recommendations:'));
    console.log('   1. Check if model pricing is stored correctly');
    console.log('   2. Verify that different models have different characteristics');
    console.log('   3. Review scoring weights for different repository sizes');
  } else {
    console.log(chalk.green('✅ Good model diversity achieved'));
  }

  if (maxCost / minCost < 2) {
    console.log(chalk.yellow('⚠️  Low cost variation. Consider:'));
    console.log('   1. Including more budget models for small projects');
    console.log('   2. Including premium models for complex tasks');
  }

  console.log(chalk.green('\n✅ Performance benchmarking test completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});