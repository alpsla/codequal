import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function testDeepWikiInit() {
  console.log('🧪 Testing DeepWiki Initialization\n');
  
  try {
    // Import DeepWiki model initializer
    console.log('Importing DeepWiki model initializer...');
    const { initializeDeepWikiModels } = await import('@codequal/agents/deepwiki/deepwiki-model-initializer');
    console.log('✅ Import successful');
    
    // Import required dependencies
    const { ModelVersionSync } = await import('@codequal/core');
    const { initSupabase, getSupabase } = await import('@codequal/database');
    const { createLogger } = await import('@codequal/core/utils');
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    const logger = createLogger('DeepWikiInit');
    const modelVersionSync = new ModelVersionSync(supabase as any, 'deepwiki-init');
    
    // Initialize DeepWiki models
    console.log('\nInitializing DeepWiki models...');
    const config = await initializeDeepWikiModels(modelVersionSync);
    
    console.log('✅ DeepWiki models initialized successfully!');
    console.log('\nConfiguration:');
    console.log('- Primary model:', config.primary.provider + '/' + config.primary.model);
    console.log('- Fallback model:', config.fallback.provider + '/' + config.fallback.model);
    console.log('- Primary context:', config.primary.capabilities?.contextWindow || 'N/A');
    console.log('- Fallback context:', config.fallback.capabilities?.contextWindow || 'N/A');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

// Run the test
testDeepWikiInit().catch(console.error);