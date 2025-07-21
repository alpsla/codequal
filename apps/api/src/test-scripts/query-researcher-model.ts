#!/usr/bin/env ts-node

/**
 * Script to query Vector DB for current Researcher agent model configuration
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('QueryResearcherModel');

async function main() {
  try {
    logger.info('Querying Vector DB for Researcher model configuration...');
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query for researcher model configurations
    console.log('\n=== Querying Model Configurations ===\n');
    
    // 1. Check model_configurations table
    const { data: modelConfigs, error: modelError } = await supabase
      .from('model_configurations')
      .select('*')
      .or('agent_role.eq.researcher,agent_role.eq.RESEARCHER')
      .order('created_at', { ascending: false });
    
    if (modelError) {
      console.error('Error querying model_configurations:', modelError);
    } else if (modelConfigs && modelConfigs.length > 0) {
      console.log('Found model configurations for Researcher role:');
      modelConfigs.forEach((config, index) => {
        console.log(`\nConfiguration ${index + 1}:`);
        console.log(`  Language: ${config.language}`);
        console.log(`  Size Category: ${config.size_category}`);
        console.log(`  Agent Role: ${config.agent_role}`);
        if (config.primary_model) {
          console.log(`  Primary Model: ${config.primary_model.provider}/${config.primary_model.model}`);
        }
        if (config.fallback_model) {
          console.log(`  Fallback Model: ${config.fallback_model.provider}/${config.fallback_model.model}`);
        }
        console.log(`  Created: ${config.created_at}`);
        console.log(`  Updated: ${config.updated_at}`);
      });
    } else {
      console.log('No model configurations found for Researcher role in model_configurations table.');
    }
    
    // 2. Check vector_chunks for stored configurations
    const SPECIAL_REPO_UUID = '00000000-0000-0000-0000-000000000001';
    
    const { data: vectorChunks, error: vectorError } = await supabase
      .from('vector_chunks')
      .select('*')
      .eq('repository_id', SPECIAL_REPO_UUID)
      .or('metadata->>type.eq.model-configuration,metadata->>role.eq.researcher')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (vectorError) {
      console.error('\nError querying vector_chunks:', vectorError);
    } else if (vectorChunks && vectorChunks.length > 0) {
      console.log('\n\nFound stored configurations in vector_chunks:');
      vectorChunks.forEach((chunk, index) => {
        console.log(`\nVector Chunk ${index + 1}:`);
        console.log(`  Repository ID: ${chunk.repository_id}`);
        console.log(`  Content Preview: ${chunk.content.substring(0, 200)}...`);
        if (chunk.metadata) {
          console.log(`  Metadata:`, JSON.stringify(chunk.metadata, null, 2));
        }
        console.log(`  Created: ${chunk.created_at}`);
      });
    } else {
      console.log('\n\nNo stored configurations found in vector_chunks.');
    }
    
    // 3. Check for any researcher-related embeddings
    const { data: embeddings, error: embError } = await supabase
      .from('vector_embeddings')
      .select('id, repository_id, metadata, created_at')
      .eq('repository_id', SPECIAL_REPO_UUID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (embError) {
      console.error('\nError querying vector_embeddings:', embError);
    } else if (embeddings && embeddings.length > 0) {
      console.log('\n\nFound researcher-related embeddings:');
      embeddings.forEach((emb, index) => {
        console.log(`\nEmbedding ${index + 1}:`);
        console.log(`  ID: ${emb.id}`);
        console.log(`  Repository ID: ${emb.repository_id}`);
        if (emb.metadata) {
          console.log(`  Metadata:`, JSON.stringify(emb.metadata, null, 2));
        }
        console.log(`  Created: ${emb.created_at}`);
      });
    } else {
      console.log('\n\nNo researcher-related embeddings found.');
    }
    
    // Summary
    console.log('\n\n=== Summary ===');
    if (!modelConfigs || modelConfigs.length === 0) {
      console.log('\n❌ No Researcher model configuration found in Vector DB.');
      console.log('The Researcher agent has not been configured yet.');
      console.log('\nTo configure the Researcher agent model:');
      console.log('1. Run: npm run script:research-models');
      console.log('2. Or manually insert a configuration into the model_configurations table');
    } else {
      console.log('\n✅ Researcher model configuration found!');
      const latestConfig = modelConfigs[0];
      console.log(`\nCurrent Configuration:`);
      console.log(`  Primary: ${latestConfig.primary_model?.provider}/${latestConfig.primary_model?.model}`);
      console.log(`  Fallback: ${latestConfig.fallback_model?.provider}/${latestConfig.fallback_model?.model}`);
    }
    
  } catch (error) {
    logger.error('Failed to query researcher model configuration', { error });
    console.error('\n❌ Query failed:', error);
    process.exit(1);
  }
}

// Run the query
main().catch(console.error);