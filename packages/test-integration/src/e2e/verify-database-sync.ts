/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelConfigStore } from '../../../../packages/core/src/services/model-selection/ModelConfigStore';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { RepositorySizeCategory } from '../../../../packages/core/src/config/models/repository-model-config';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('DatabaseSyncTest');

async function main() {
  console.log(chalk.cyan('\n🔍 Verifying Database Model Sync\n'));

  // Check if we have database credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(chalk.yellow('⚠️  Missing Supabase credentials'));
    console.log(chalk.gray('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'));
    return;
  }

  const modelConfigStore = new ModelConfigStore(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Initialize the store
    await modelConfigStore.init();
    console.log(chalk.green('✓ Connected to Supabase'));

    // Get all stored configurations
    console.log(chalk.yellow('\nFetching stored model configurations from database...\n'));
    const dbConfigs = await modelConfigStore.getAllModelConfigs();

    if (Object.keys(dbConfigs).length === 0) {
      console.log(chalk.red('❌ No model configurations found in database!'));
      console.log(chalk.gray('\nThis explains why the system uses hardcoded models.'));
      console.log(chalk.gray('The Researcher agent should have stored discovered models here.'));
    } else {
      console.log(chalk.green(`✓ Found configurations for ${Object.keys(dbConfigs).length} languages`));
      
      // Show what's in the database
      for (const [language, sizeConfigs] of Object.entries(dbConfigs)) {
        console.log(chalk.blue(`\n${language}:`));
        for (const [size, config] of Object.entries(sizeConfigs)) {
          const modelConfig = config as { provider: string; model: string; testResults?: { lastTested?: string } };
          console.log(chalk.gray(`  ${size}: ${modelConfig.provider}/${modelConfig.model}`));
          if (modelConfig.testResults?.lastTested) {
            console.log(chalk.gray(`    Last tested: ${modelConfig.testResults.lastTested}`));
          }
        }
      }
    }

    // Check calibration results
    console.log(chalk.yellow('\n\nChecking calibration results...\n'));
    const pythonCalibration = await modelConfigStore.getCalibrationResults('python', RepositorySizeCategory.MEDIUM);
    
    if (pythonCalibration) {
      console.log(chalk.green('✓ Found calibration results for Python/Medium'));
      console.log(chalk.gray(`  Models tested: ${Object.keys(pythonCalibration).length}`));
    } else {
      console.log(chalk.yellow('⚠️  No calibration results found for Python/Medium'));
    }

  } catch (error) {
    console.log(chalk.red('❌ Error accessing database:'), error);
    console.log(chalk.gray('\nThis might explain why the system falls back to hardcoded models.'));
  }

  console.log(chalk.cyan('\n\n📊 Analysis:\n'));
  console.log('The system architecture:');
  console.log('1. Researcher discovers models → Stores in Supabase');
  console.log('2. ModelConfigStore.syncConfigurations() → Loads from database');
  console.log('3. But ModelVersionSync uses hardcoded CANONICAL_MODEL_VERSIONS');
  console.log('\nThe issue: ModelVersionSync should load from database, not use hardcoded values');
  console.log('\nQuarterly updates should refresh the database, not the code!');

  console.log(chalk.green('\n✅ Database sync verification completed!\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});