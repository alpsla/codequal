/**
 * Check existing model configurations in Vector DB
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '../../../../.env') });

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

async function checkConfigurations() {
  console.log('🔍 Checking Vector DB configurations...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  // First check if repository exists
  const { data: repo, error: repoError } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', RESEARCHER_CONFIG_REPO_ID)
    .single();
    
  if (repo) {
    console.log('✅ Repository found:');
    console.log(`  Name: ${repo.name}`);
    console.log(`  Created: ${new Date(repo.created_at).toLocaleDateString()}`);
    console.log(`  Metadata:`, repo.metadata);
  } else {
    console.log('❌ Repository not found');
    if (repoError) console.log('Error:', repoError.message);
  }
  
  // Get all chunks for this repository
  console.log('\n📊 Fetching analysis chunks...');
  const { data: chunks, error: chunksError, count } = await supabase
    .from('analysis_chunks')
    .select('*', { count: 'exact' })
    .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
    .limit(5);
    
  if (chunksError) {
    console.error('Error fetching chunks:', chunksError);
    return;
  }
  
  console.log(`\nTotal chunks: ${count || 0}`);
  
  if (chunks && chunks.length > 0) {
    console.log('\nSample chunks:');
    chunks.forEach((chunk, idx) => {
      console.log(`\n${idx + 1}. Created: ${new Date(chunk.created_at).toLocaleString()}`);
      console.log(`   Metadata type: ${chunk.metadata?.content_type || 'unknown'}`);
      
      // Try to parse content
      try {
        const content = JSON.parse(chunk.content);
        console.log(`   Provider: ${content.provider}`);
        console.log(`   Model: ${content.modelName || content.model}`);
        console.log(`   Cost: $${content.costPerMillion || content.costs?.averageCostPerMillion}/M`);
      } catch (e) {
        console.log('   [Unable to parse content]');
      }
    });
  }
  
  // Count by metadata type
  console.log('\n📈 Content type distribution:');
  if (chunks) {
    const types: Record<string, number> = {};
    chunks.forEach(chunk => {
      const type = chunk.metadata?.content_type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    Object.entries(types).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }
}

checkConfigurations().catch(console.error);