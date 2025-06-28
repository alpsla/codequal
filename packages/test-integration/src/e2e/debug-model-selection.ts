/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { ModelConfigStore } from '../../../../packages/core/src/services/model-selection/ModelConfigStore';
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('DebugModelSelection');

async function main() {
  console.log(chalk.cyan('\n🔍 Debugging Model Selection\n'));

  // Check database directly
  const modelConfigStore = new ModelConfigStore(
    logger,
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await modelConfigStore.init();
  
  console.log(chalk.yellow('1. Checking database directly:\n'));
  
  // Get all configs
  const allConfigs = await modelConfigStore.getAllModelConfigs();
  
  for (const [language, sizeConfigs] of Object.entries(allConfigs)) {
    console.log(chalk.blue(`Language: ${language}`));
    for (const [size, config] of Object.entries(sizeConfigs)) {
      const modelConfig = config as any;
      console.log(`  ${size}: ${modelConfig.provider}/${modelConfig.model}`);
      if (modelConfig.testResults?.pricing) {
        console.log(`    Pricing: input=$${modelConfig.testResults.pricing.input}, output=$${modelConfig.testResults.pricing.output}`);
      }
    }
  }

  // Now test ModelVersionSync
  console.log(chalk.yellow('\n2. Testing ModelVersionSync:\n'));
  
  const modelVersionSync = new ModelVersionSync(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check available models
  const models = await (modelVersionSync as any).getAvailableModels();
  console.log(`Total models in cache: ${Object.keys(models).length}`);
  
  // List first 5 models
  console.log(chalk.blue('\nFirst 5 models in cache:'));
  Object.entries(models).slice(0, 5).forEach(([key, model]) => {
    const m = model as any;
    console.log(`  ${key}:`);
    console.log(`    Provider: ${m.provider}`);
    console.log(`    Model: ${m.model}`);
    console.log(`    Pricing: ${JSON.stringify(m.pricing)}`);
    console.log(`    PreferredFor: ${m.preferredFor?.join(', ')}`);
  });

  // Test specific selection
  console.log(chalk.yellow('\n3. Testing specific selections:\n'));
  
  // Test orchestrator agent
  const orchestratorContext = {
    provider: 'openai' as any,
    model: 'gpt-4',
    language: 'orchestrator_agent',
    sizeCategory: 'universal' as any
  };
  
  console.log('Trying orchestrator_agent/universal:');
  const result1 = await modelVersionSync.getCanonicalVersion(orchestratorContext.provider, orchestratorContext.model);
  console.log(`  Result: ${result1 ? `${result1.provider}/${result1.model}` : 'NULL'}`);
  
  // Test javascript/small
  const jsContext = {
    provider: 'openai' as any,
    model: 'gpt-4',
    language: 'javascript',
    sizeCategory: RepositorySizeCategory.SMALL
  };
  
  console.log('\nTrying javascript/small:');
  const result2 = await modelVersionSync.getCanonicalVersion(jsContext.provider, jsContext.model);
  console.log(`  Result: ${result2 ? `${result2.provider}/${result2.model}` : 'NULL'}`);

  // Check the selection logic
  console.log(chalk.yellow('\n4. Checking model selection logic:\n'));
  
  // Get models that match orchestrator
  const orchestratorModels = Object.entries(models).filter(([_, model]) => {
    const m = model as any;
    return m.preferredFor?.includes('orchestrator_agent') || 
           m.preferredFor?.includes('universal_repositories');
  });
  
  console.log(`Models suitable for orchestrator: ${orchestratorModels.length}`);
  orchestratorModels.slice(0, 3).forEach(([key, model]) => {
    const m = model as any;
    console.log(`  ${key}: preferredFor=${m.preferredFor?.join(', ')}`);
  });
}

main().catch(error => {
  console.error(chalk.red('\n❌ Error:'), error);
  process.exit(1);
});