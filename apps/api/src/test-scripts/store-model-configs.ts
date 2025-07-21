/**
 * Store model configurations in Vector DB with proper error handling
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '../../../../.env') });

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

async function storeModelConfigurations() {
  console.log('💾 Storing model configurations...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  // Sample configurations based on our research
  const configurations = [
    {
      context: 'typescript/medium/researcher',
      isPrimary: true,
      provider: 'google',
      model: 'gemini-2.0-flash-lite-001',
      costPerMillion: 0.1875,
      quality: 8.5,
      contextWindow: 1048576,
      status: 'stable',
      reasoning: 'Best stable model for typescript/medium/researcher - balanced cost and quality'
    },
    {
      context: 'typescript/medium/researcher',
      isPrimary: false,
      provider: 'deepseek',
      model: 'deepseek-r1-0528-qwen3-8b',
      costPerMillion: 0.015,
      quality: 8.3,
      contextWindow: 32000,
      status: 'stable',
      reasoning: 'Fallback for typescript/medium/researcher - very cost effective'
    },
    {
      context: 'python/large/security',
      isPrimary: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      costPerMillion: 0.375,
      quality: 9.3,
      contextWindow: 128000,
      status: 'stable',
      reasoning: 'High quality for security analysis with good context window'
    },
    {
      context: 'javascript/small/documentation',
      isPrimary: true,
      provider: 'deepseek',
      model: 'deepseek-r1-0528-qwen3-8b',
      costPerMillion: 0.015,
      quality: 8.3,
      contextWindow: 32000,
      status: 'stable',
      reasoning: 'Cost-effective for high-volume documentation tasks'
    }
  ];
  
  // Check if we need to insert the file_path column
  const { data: testChunk, error: testError } = await supabase
    .from('analysis_chunks')
    .select('id')
    .limit(1);
    
  console.log('Test query result:', { hasData: !!testChunk, error: testError });
  
  // Insert configurations
  for (const config of configurations) {
    const chunkData = {
      repository_id: RESEARCHER_CONFIG_REPO_ID,
      content: JSON.stringify({
        provider: config.provider,
        modelName: config.model,
        costPerMillion: config.costPerMillion,
        performanceScore: config.quality,
        contextLength: config.contextWindow,
        isPrimary: config.isPrimary,
        reasoning: config.reasoning
      }, null, 2),
      metadata: {
        content_type: 'model_configuration',
        source: 'unified_researcher_v2',
        context: config.context,
        provider: config.provider,
        model: config.model,
        is_primary: config.isPrimary,
        status: config.status,
        timestamp: new Date().toISOString()
      }
    };
    
    // Try to add file_path if needed
    const chunkWithPath = {
      ...chunkData,
      file_path: `configs/${config.context}/${config.isPrimary ? 'primary' : 'fallback'}.json`
    };
    
    console.log(`\nStoring ${config.context} (${config.isPrimary ? 'primary' : 'fallback'})...`);
    
    // Try with file_path first
    let { error } = await supabase
      .from('analysis_chunks')
      .insert(chunkWithPath);
      
    if (error && error.message.includes('file_path')) {
      // Try without file_path
      console.log('Retrying without file_path...');
      const result = await supabase
        .from('analysis_chunks')
        .insert(chunkData);
      error = result.error;
    }
    
    if (error) {
      console.error(`❌ Error storing ${config.context}:`, error.message);
    } else {
      console.log(`✅ Stored successfully`);
    }
  }
  
  // Verify storage
  console.log('\n\n📊 Verifying storage...');
  const { data: stored, count } = await supabase
    .from('analysis_chunks')
    .select('*', { count: 'exact' })
    .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
    .limit(10);
    
  console.log(`\nTotal chunks stored: ${count || 0}`);
  
  if (stored && stored.length > 0) {
    console.log('\nSample stored configs:');
    stored.forEach(chunk => {
      const meta = chunk.metadata as any;
      console.log(`- ${meta.context}: ${meta.provider}/${meta.model}`);
    });
  }
}

storeModelConfigurations().catch(console.error);