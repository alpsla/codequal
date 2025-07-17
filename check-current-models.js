#!/usr/bin/env node
/**
 * Check Current Model Configurations for Orchestrator and Researcher Agents
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkCurrentModels() {
  console.log('\n🔍 Checking Current Model Configurations for Orchestrator and Researcher Agents\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check model_configurations table for all configurations
    console.log('📊 Fetching all model configurations from database...\n');
    const { data: configs, error: configError } = await supabase
      .from('model_configurations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (configError) {
      console.log('Error fetching model configurations:', configError);
      return;
    }

    if (!configs || configs.length === 0) {
      console.log('No model configurations found in database.\n');
      console.log('The system would use emergency fallback: openai/gpt-4o\n');
      return;
    }

    console.log(`Found ${configs.length} model configurations in database.\n`);

    // Group configurations by language and size
    const configMap = {};
    configs.forEach(config => {
      const key = `${config.language}/${config.size_category}`;
      configMap[key] = {
        model: `${config.provider}/${config.model}`,
        lastTested: config.test_results?.lastTested || 'Never',
        qualityScore: config.test_results?.qualityScore || 'N/A',
        pricing: config.test_results?.pricing || null
      };
    });

    console.log('Current Model Configurations by Language/Size:\n');
    Object.entries(configMap).forEach(([key, value]) => {
      console.log(`  ${key}:`);
      console.log(`    Model: ${value.model}`);
      if (value.pricing) {
        console.log(`    Cost: $${value.pricing.input}/1M input, $${value.pricing.output}/1M output`);
      }
      console.log(`    Quality Score: ${value.qualityScore}`);
      console.log(`    Last Tested: ${value.lastTested}`);
      console.log('');
    });

    // Check what would be used for specific agent roles
    console.log('\n🤖 Models that would be selected for agent roles:\n');
    
    // For orchestrator role - typically uses medium-sized repos as baseline
    const orchestratorConfigs = configs.filter(c => 
      c.size_category === 'medium' || c.size_category === 'large'
    );
    
    if (orchestratorConfigs.length > 0) {
      console.log('ORCHESTRATOR Agent would use:');
      // Group by language to show variety
      const orchByLang = {};
      orchestratorConfigs.forEach(c => {
        orchByLang[c.language] = `${c.provider}/${c.model}`;
      });
      Object.entries(orchByLang).forEach(([lang, model]) => {
        console.log(`  - ${lang}: ${model}`);
      });
    }

    console.log('\nRESEARCHER Agent would use:');
    // Researcher might prefer different models based on context
    const researcherConfigs = configs.filter(c => 
      c.size_category === 'small' || c.size_category === 'medium'
    );
    
    if (researcherConfigs.length > 0) {
      const resByLang = {};
      researcherConfigs.forEach(c => {
        if (!resByLang[c.language]) {
          resByLang[c.language] = `${c.provider}/${c.model}`;
        }
      });
      Object.entries(resByLang).forEach(([lang, model]) => {
        console.log(`  - ${lang}: ${model}`);
      });
    }

    // Show unique models being used
    console.log('\n📋 Unique Models in Use:');
    const uniqueModels = new Set();
    configs.forEach(c => {
      uniqueModels.add(`${c.provider}/${c.model}`);
    });
    Array.from(uniqueModels).sort().forEach(model => {
      console.log(`  - ${model}`);
    });

    // Check if we have any OpenRouter models
    const openRouterModels = configs.filter(c => c.provider === 'openrouter');
    if (openRouterModels.length > 0) {
      console.log(`\n🌐 OpenRouter Models Configured: ${openRouterModels.length}`);
      const uniqueOpenRouterModels = new Set();
      openRouterModels.forEach(c => {
        uniqueOpenRouterModels.add(c.model);
      });
      Array.from(uniqueOpenRouterModels).forEach(model => {
        console.log(`  - ${model}`);
      });
    }

  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Run the check
checkCurrentModels()
  .then(() => {
    console.log('\n✅ Model configuration check completed\n');
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });