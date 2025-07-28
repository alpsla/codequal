const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDeepWikiModels() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check all model configurations
    console.log('🔍 Checking all model configurations...\n');
    
    const { data: models, error } = await supabase
      .from('model_configurations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error:', error);
      return;
    }

    console.log(`Total models: ${models?.length || 0}\n`);

    // Group by provider and model
    const modelsByProvider = {};
    models?.forEach(model => {
      const key = `${model.provider}/${model.model}`;
      if (!modelsByProvider[key]) {
        modelsByProvider[key] = [];
      }
      modelsByProvider[key].push(model);
    });

    console.log('Models in database:');
    Object.entries(modelsByProvider).forEach(([key, configs]) => {
      console.log(`\n📦 ${key}`);
      configs.forEach(config => {
        console.log(`   - Language: ${config.language}, Size: ${config.size_category}`);
        if (config.notes) {
          console.log(`     Notes: ${config.notes}`);
        }
      });
    });

    // Check for Claude models
    const claudeModels = models?.filter(m => 
      m.provider === 'anthropic' || 
      m.model?.includes('claude')
    );

    console.log(`\n\n🤖 Claude models found: ${claudeModels?.length || 0}`);
    claudeModels?.forEach(m => {
      console.log(`   - ${m.provider}/${m.model} (${m.language}, ${m.size_category})`);
    });

    // Check what model would be selected for TypeScript/Medium
    console.log('\n\n🎯 What model would be selected for TypeScript/Medium?');
    const tsModels = models?.filter(m => 
      m.language === 'typescript' && 
      m.size_category === 'medium'
    );
    
    if (tsModels?.length > 0) {
      console.log('Found models:');
      tsModels.forEach(m => {
        console.log(`   - ${m.provider}/${m.model}`);
        if (m.test_results) {
          const results = typeof m.test_results === 'string' ? 
            JSON.parse(m.test_results) : m.test_results;
          console.log(`     Score: ${results.score || 'N/A'}`);
        }
      });
    } else {
      console.log('❌ No models found for TypeScript/Medium!');
      console.log('This would trigger the researcher to find a suitable model.');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkDeepWikiModels();