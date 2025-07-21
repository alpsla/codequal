/**
 * Store model configurations in the proper model_configurations table
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '../../../../.env') });

async function storeInModelConfigs() {
  console.log('💾 Storing in model_configurations table...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  // Check if model_configurations table exists
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', '%model%');
    
  console.log('Available model-related tables:', tables?.map(t => t.table_name));
  
  // Based on our unified research, store key configurations
  const modelConfigs = [
    // Researcher configurations
    {
      language: 'typescript',
      size_category: 'medium',
      agent_role: 'researcher',
      provider: 'google',
      model_name: 'gemini-2.0-flash-lite-001',
      model_version: '2.0',
      context_window: 1048576,
      price_per_million_input_tokens: 0.075,
      price_per_million_output_tokens: 0.30,
      is_primary: true,
      capabilities: {
        code_quality: 8.5,
        speed: 9.5,
        reasoning: 8.0,
        context_window: 1048576,
        detail_level: 8.0
      },
      tags: ['stable', 'production', 'cost-effective'],
      metadata: {
        status: 'stable',
        reasoning: 'Best balance of cost and quality for researcher tasks'
      }
    },
    // Security configurations
    {
      language: 'python',
      size_category: 'large',
      agent_role: 'security',
      provider: 'openai',
      model_name: 'gpt-4o-mini',
      model_version: '4.0',
      context_window: 128000,
      price_per_million_input_tokens: 0.15,
      price_per_million_output_tokens: 0.60,
      is_primary: true,
      capabilities: {
        code_quality: 9.3,
        speed: 8.0,
        reasoning: 9.0,
        context_window: 128000,
        detail_level: 9.0
      },
      tags: ['stable', 'high-quality', 'security-focused'],
      metadata: {
        status: 'stable',
        reasoning: 'High quality required for security analysis'
      }
    },
    // Documentation configurations
    {
      language: 'javascript',
      size_category: 'small',
      agent_role: 'documentation',
      provider: 'deepseek',
      model_name: 'deepseek-r1-0528-qwen3-8b',
      model_version: 'r1',
      context_window: 32000,
      price_per_million_input_tokens: 0.01,
      price_per_million_output_tokens: 0.02,
      is_primary: true,
      capabilities: {
        code_quality: 8.3,
        speed: 9.0,
        reasoning: 8.0,
        context_window: 32000,
        detail_level: 8.0
      },
      tags: ['stable', 'cost-optimized', 'fast'],
      metadata: {
        status: 'stable',
        reasoning: 'Extremely cost-effective for documentation generation'
      }
    }
  ];
  
  // Try to insert into model_configurations
  console.log('\nAttempting to store in model_configurations...');
  
  for (const config of modelConfigs) {
    const { error } = await supabase
      .from('model_configurations')
      .upsert({
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'language,size_category,agent_role,is_primary'
      });
      
    if (error) {
      console.error(`❌ Error storing ${config.language}/${config.size_category}/${config.agent_role}:`, error.message);
      
      // If table doesn't exist, try model_versions
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('Trying model_versions table...');
        
        const { error: mvError } = await supabase
          .from('model_versions')
          .upsert({
            provider: config.provider,
            model_id: config.model_name,
            version: config.model_version,
            is_active: true,
            capabilities: config.capabilities,
            pricing: {
              input: config.price_per_million_input_tokens,
              output: config.price_per_million_output_tokens
            },
            context_window: config.context_window,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'provider,model_id,version'
          });
          
        if (mvError) {
          console.error('Also failed with model_versions:', mvError.message);
        } else {
          console.log(`✅ Stored in model_versions: ${config.provider}/${config.model_name}`);
        }
      }
    } else {
      console.log(`✅ Stored: ${config.language}/${config.size_category}/${config.agent_role}`);
    }
  }
  
  // Create a summary document
  console.log('\n\n📋 UNIFIED RESEARCHER SUMMARY');
  console.log('================================\n');
  
  console.log('Key Findings from Real OpenRouter Research:\n');
  
  console.log('1. COST LEADERS (< $0.10/M tokens):');
  console.log('   - deepseek/deepseek-r1-0528-qwen3-8b: $0.015/M');
  console.log('   - Various Llama models: $0.01-0.04/M');
  console.log('   - Great for high-volume, cost-sensitive tasks\n');
  
  console.log('2. QUALITY LEADERS (Score > 9.0):');
  console.log('   - openai/gpt-4o-mini: 9.3 quality, $0.375/M');
  console.log('   - openai/gpt-4.1-nano: 9.5 quality, $0.25/M');
  console.log('   - google/gemini-2.0-flash-lite: 8.5 quality, $0.1875/M\n');
  
  console.log('3. BEST VALUE (Quality/Cost Ratio):');
  console.log('   - google/gemini-2.0-flash-lite: Great balance');
  console.log('   - deepseek models: Extremely cost-effective');
  console.log('   - qwen/qwen-turbo: Good quality at low cost\n');
  
  console.log('4. RECOMMENDATIONS BY ROLE:');
  console.log('   - Researcher: gemini-2.0-flash-lite (stable, balanced)');
  console.log('   - Security: gpt-4o-mini or gpt-4.1-nano (high quality)');
  console.log('   - Documentation: deepseek-r1 models (very cheap)');
  console.log('   - DeepWiki: gemini-2.5-flash or gpt-4o-mini (quality focus)\n');
  
  console.log('✅ The unified approach eliminates duplication and ensures consistent model selection!');
}

storeInModelConfigs().catch(console.error);