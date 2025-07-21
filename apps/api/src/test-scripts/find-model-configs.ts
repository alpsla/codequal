/**
 * Find actual model configurations in Vector DB
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

async function findModelConfigs() {
  console.log('🔍 SEARCHING FOR MODEL CONFIGURATIONS...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  try {
    // Search for chunks containing model configuration data
    console.log('1️⃣ Searching for researcher_agent_configurations...');
    const { data: researcherConfigs, error: err1 } = await supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .eq('metadata->content_type', 'researcher_agent_configurations')
      .limit(10);
    
    if (researcherConfigs && researcherConfigs.length > 0) {
      console.log(`Found ${researcherConfigs.length} researcher configurations\n`);
      
      researcherConfigs.forEach((chunk, idx) => {
        console.log(`Configuration ${idx + 1}:`);
        console.log(`Created: ${new Date(chunk.created_at).toLocaleString()}`);
        
        // Try to parse the content
        try {
          const content = JSON.parse(chunk.content);
          console.log(`Total configs in chunk: ${Object.keys(content).length}`);
          
          // Show first few configs
          const configs = Object.entries(content).slice(0, 3);
          configs.forEach(([key, value]: [string, any]) => {
            console.log(`\n  ${key}:`);
            console.log(`    Provider: ${value.provider}`);
            console.log(`    Model: ${value.modelName}`);
            console.log(`    Cost: $${value.costPerMillion}/M`);
            console.log(`    Performance: ${value.performanceScore}/10`);
          });
          
          // Count by provider
          const providerCounts: Record<string, number> = {};
          Object.values(content).forEach((config: any) => {
            providerCounts[config.provider] = (providerCounts[config.provider] || 0) + 1;
          });
          
          console.log('\nProvider distribution in this chunk:');
          Object.entries(providerCounts).forEach(([provider, count]) => {
            console.log(`  ${provider}: ${count}`);
          });
          
        } catch (e) {
          console.log('Unable to parse content:', e);
        }
        
        console.log('\n' + '-'.repeat(80) + '\n');
      });
    } else {
      console.log('No researcher_agent_configurations found\n');
    }
    
    // Search for other potential model config patterns
    console.log('2️⃣ Searching for chunks with model-related content...');
    const { data: modelChunks, error: err2 } = await supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .or('content.ilike.%modelName%,content.ilike.%costPerMillion%')
      .limit(10);
    
    if (modelChunks && modelChunks.length > 0) {
      console.log(`Found ${modelChunks.length} chunks with model data\n`);
      
      modelChunks.forEach((chunk, idx) => {
        console.log(`Chunk ${idx + 1}:`);
        console.log(`Type: ${chunk.metadata?.content_type || 'unknown'}`);
        console.log(`Created: ${new Date(chunk.created_at).toLocaleString()}`);
        
        // Show snippet of content
        const snippet = chunk.content.substring(0, 200);
        console.log(`Content snippet: ${snippet}...`);
        console.log('\n');
      });
    }
    
    // Get summary statistics
    console.log('3️⃣ Summary statistics:');
    const { data: stats, error: err3 } = await supabase
      .from('analysis_chunks')
      .select('metadata->content_type')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID);
    
    if (stats) {
      const typeCounts: Record<string, number> = {};
      stats.forEach(row => {
        const type = row['metadata->content_type'] || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
      
      console.log('\nAll content types:');
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findModelConfigs().catch(console.error);