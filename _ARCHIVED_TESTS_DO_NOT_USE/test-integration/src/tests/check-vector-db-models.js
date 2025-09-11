#!/usr/bin/env node
/**
 * Check Vector DB Model Configurations
 * Shows what model configurations and costs are stored in the database
 */

const chalk = require('chalk');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function checkVectorDBModels() {
  console.log(chalk.bold.blue('\n🔍 Checking Vector DB Model Configurations\n'));

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check model_configurations table
    console.log(chalk.yellow('📊 Model Configurations:'));
    const { data: configs, error: configError } = await supabase
      .from('model_configurations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (configError) {
      console.log(chalk.red('Error fetching model configurations:'), configError);
    } else if (configs && configs.length > 0) {
      console.log(chalk.green(`\nFound ${configs.length} model configurations:\n`));
      
      configs.forEach(config => {
        console.log(chalk.blue(`${config.language}/${config.size_category}:`));
        console.log(chalk.gray(`  Model: ${config.model}`));
        console.log(chalk.gray(`  Provider: ${config.provider}`));
        
        if (config.test_results?.pricing) {
          const pricing = config.test_results.pricing;
          console.log(chalk.gray(`  Cost: $${pricing.input}/1M input, $${pricing.output}/1M output`));
          const avgCost = (pricing.input + pricing.output) / 2;
          console.log(chalk.gray(`  Average: $${avgCost}/1M tokens`));
        } else {
          console.log(chalk.yellow(`  Cost: Not available`));
        }
        
        console.log(chalk.gray(`  Last tested: ${config.test_results?.lastTested || 'Never'}`));
        console.log();
      });
    } else {
      console.log(chalk.yellow('\nNo model configurations found in Vector DB'));
      console.log(chalk.gray('The Researcher agent needs to run to populate the database'));
    }

    // Check calibration_results table
    console.log(chalk.yellow('\n📊 Calibration Results:'));
    const { data: calibrations, error: calError } = await supabase
      .from('calibration_results')
      .select('*')
      .limit(5);

    if (calError) {
      console.log(chalk.red('Error fetching calibration results:'), calError);
    } else if (calibrations && calibrations.length > 0) {
      console.log(chalk.green(`\nFound ${calibrations.length} calibration results`));
    } else {
      console.log(chalk.yellow('\nNo calibration results found'));
    }

    // Check if we have any actual API models configured
    console.log(chalk.yellow('\n📊 Available OpenRouter Models:'));
    const { data: apiModels } = await supabase
      .from('model_configurations')
      .select('model, provider')
      .like('provider', '%openrouter%')
      .limit(5);

    if (apiModels && apiModels.length > 0) {
      console.log(chalk.green('\nOpenRouter models configured:'));
      apiModels.forEach(model => {
        console.log(chalk.gray(`  - ${model.model}`));
      });
    } else {
      console.log(chalk.yellow('\nNo OpenRouter models configured yet'));
    }

  } catch (error) {
    console.log(chalk.red('Error accessing Vector DB:'), error.message);
  }
}

// Run the check
checkVectorDBModels()
  .then(() => {
    console.log(chalk.blue('\n✅ Vector DB check completed'));
  })
  .catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });