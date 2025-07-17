#!/usr/bin/env node
/**
 * Check ACTUAL Current Model Configurations from Database
 * This shows exactly what models are being used right now
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkActualModelConfigs() {
  console.log('\n🔍 ACTUAL Current Model Configurations in Database\n');
  console.log('==========================================\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Fetch ALL model configurations from database
    console.log('📊 1. ALL Model Configurations in model_configurations table:\n');
    const { data: configs, error: configError } = await supabase
      .from('model_configurations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (configError) {
      console.log('❌ Error fetching model configurations:', configError);
      return;
    }

    if (!configs || configs.length === 0) {
      console.log('⚠️  NO MODEL CONFIGURATIONS FOUND IN DATABASE!');
      console.log('   The system will use EMERGENCY FALLBACK: openai/gpt-4o\n');
      return;
    }

    console.log(`✅ Found ${configs.length} model configurations\n`);

    // 2. Show configurations by language/size
    const configsByLangSize = {};
    configs.forEach(config => {
      const key = `${config.language}/${config.size_category}`;
      configsByLangSize[key] = config;
    });

    console.log('📋 2. Current Model Assignments by Language/Size:\n');
    const languages = ['javascript', 'typescript', 'python', 'java', 'ruby', 'go', 'rust'];
    const sizes = ['small', 'medium', 'large'];
    
    languages.forEach(lang => {
      console.log(`\n${lang.toUpperCase()}:`);
      sizes.forEach(size => {
        const key = `${lang}/${size}`;
        const config = configsByLangSize[key];
        if (config) {
          const model = `${config.provider}/${config.model}`;
          const pricing = config.test_results?.pricing;
          const lastTested = config.test_results?.lastTested || 'Never';
          console.log(`  ${size}: ${model} ${pricing ? `($${pricing.input}/1M in, $${pricing.output}/1M out)` : ''} - Last tested: ${new Date(lastTested).toLocaleDateString()}`);
        } else {
          console.log(`  ${size}: ❌ NOT CONFIGURED (will use fallback logic)`);
        }
      });
    });

    // 3. Show unique models in use
    console.log('\n\n📊 3. Unique Models Currently Configured:\n');
    const uniqueModels = new Map();
    configs.forEach(config => {
      const modelKey = `${config.provider}/${config.model}`;
      if (!uniqueModels.has(modelKey)) {
        uniqueModels.set(modelKey, {
          model: modelKey,
          pricing: config.test_results?.pricing,
          usageCount: 0,
          contexts: []
        });
      }
      const modelInfo = uniqueModels.get(modelKey);
      modelInfo.usageCount++;
      modelInfo.contexts.push(`${config.language}/${config.size_category}`);
    });

    Array.from(uniqueModels.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .forEach(modelInfo => {
        console.log(`\n${modelInfo.model}:`);
        console.log(`  Usage count: ${modelInfo.usageCount} configurations`);
        if (modelInfo.pricing) {
          console.log(`  Pricing: $${modelInfo.pricing.input}/1M input, $${modelInfo.pricing.output}/1M output`);
        }
        console.log(`  Used for: ${modelInfo.contexts.slice(0, 5).join(', ')}${modelInfo.contexts.length > 5 ? '...' : ''}`);
      });

    // 4. Emergency fallback info
    console.log('\n\n⚠️  4. Emergency Fallback Configuration:\n');
    console.log('If database is unavailable or no configuration found:');
    console.log('  Primary Fallback: openai/gpt-4o');
    console.log('  Hardcoded in: ModelVersionSync.ts as EMERGENCY_FALLBACK_MODELS');

    // 5. Model selection flow
    console.log('\n\n🔄 5. Model Selection Flow:\n');
    console.log('1. ResultOrchestrator calls ModelVersionSync.findOptimalModel()');
    console.log('2. ModelVersionSync checks cached models from database');
    console.log('3. If no match found, uses scoring algorithm based on:');
    console.log('   - Language preferences');
    console.log('   - Size category');
    console.log('   - Cost vs capability weights');
    console.log('4. If database unavailable, uses EMERGENCY_FALLBACK_MODELS');
    console.log('5. Agents receive model config with provider/model details');

    // 6. Recent updates
    console.log('\n\n📅 6. Recently Updated Configurations:\n');
    const recentConfigs = configs
      .filter(c => c.updated_at)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
    
    recentConfigs.forEach(config => {
      const model = `${config.provider}/${config.model}`;
      const context = `${config.language}/${config.size_category}`;
      console.log(`  ${new Date(config.updated_at).toLocaleString()}: ${context} → ${model}`);
    });

  } catch (error) {
    console.log('❌ Fatal error:', error.message);
  }
}

// Run the check
checkActualModelConfigs()
  .then(() => {
    console.log('\n\n✅ Model configuration check completed\n');
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });