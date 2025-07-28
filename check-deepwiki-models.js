const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDeepWikiModels() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check models with deepwiki tag
    console.log('🔍 Checking models with deepwiki tag...\n');
    
    const { data: deepwikiModels, error } = await supabase
      .from('model_configurations')
      .select('*')
      .contains('tags', ['deepwiki'])
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error:', error);
      return;
    }

    console.log(`Found ${deepwikiModels?.length || 0} models with deepwiki tag:\n`);

    deepwikiModels?.forEach(model => {
      console.log(`📦 Model: ${model.model_id}`);
      console.log(`   Provider: ${model.provider}`);
      console.log(`   Tags: ${JSON.stringify(model.tags)}`);
      console.log(`   Languages: ${JSON.stringify(model.language_support)}`);
      console.log(`   Size Categories: ${JSON.stringify(model.size_categories)}`);
      console.log(`   Created: ${model.created_at}`);
      console.log(`   Active: ${model.is_active}`);
      console.log('');
    });

    // Check if any have Claude 3
    const claude3Models = deepwikiModels?.filter(m => 
      m.model_id.includes('claude-3') || 
      m.model_id.includes('haiku')
    );

    if (claude3Models?.length > 0) {
      console.log('⚠️  Found outdated Claude 3 models:');
      claude3Models.forEach(m => console.log(`   - ${m.model_id}`));
      console.log('\nThese should be replaced with Claude 4 models!');
    }

    // Check for Claude 4 models
    const { data: claude4Models } = await supabase
      .from('model_configurations')
      .select('*')
      .like('model_id', '%claude-4%')
      .contains('tags', ['deepwiki']);

    console.log(`\n✅ Found ${claude4Models?.length || 0} Claude 4 models with deepwiki tag`);

  } catch (err) {
    console.error('Error:', err);
  }
}

checkDeepWikiModels();