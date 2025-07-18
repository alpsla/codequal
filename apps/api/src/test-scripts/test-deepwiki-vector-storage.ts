#!/usr/bin/env ts-node

/**
 * Test DeepWiki Vector DB Storage Integration
 * This script verifies that DeepWiki can properly store and retrieve configurations
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiVectorStorageTest');

async function createTableIfNeeded() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check if table exists
  const { data: tables, error: checkError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'deepwiki_configurations')
    .single();
  
  if (checkError || !tables) {
    console.log('📋 Table does not exist, creating it...');
    
    // Execute the SQL to create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.deepwiki_configurations (
          id TEXT PRIMARY KEY,
          config_type TEXT NOT NULL CHECK (config_type IN ('global', 'repository')),
          repository_url TEXT,
          primary_model TEXT NOT NULL,
          fallback_model TEXT NOT NULL,
          config_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        );
        
        ALTER TABLE public.deepwiki_configurations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "deepwiki_configurations_all_access" ON public.deepwiki_configurations
          FOR ALL USING (true) WITH CHECK (true);
      `
    });
    
    if (createError) {
      console.error('❌ Failed to create table:', createError);
      return false;
    }
    
    console.log('✅ Table created successfully');
  } else {
    console.log('✅ Table already exists');
  }
  
  return true;
}

async function testVectorStorage() {
  console.log('🧪 Testing DeepWiki Vector Storage\n');
  
  // Skip table creation check since it's already created in Supabase
  console.log('✅ Using existing deepwiki_configurations table');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test 1: Store and retrieve a test configuration
  console.log('\n📝 Test 1: Store and Retrieve Configuration');
  try {
    const testConfig = {
      id: `test-${Date.now()}`,
      config_type: 'global',
      primary_model: 'openai/gpt-4-turbo',
      fallback_model: 'anthropic/claude-3-opus',
      config_data: {
        primary: {
          provider: 'openai',
          model: 'gpt-4-turbo',
          contextWindow: 128000
        },
        fallback: {
          provider: 'anthropic',
          model: 'claude-3-opus',
          contextWindow: 200000
        },
        timestamp: new Date().toISOString()
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Insert
    const { error: insertError } = await supabase
      .from('deepwiki_configurations')
      .insert(testConfig);
    
    if (insertError) {
      console.error('❌ Failed to insert:', insertError);
      return;
    }
    
    console.log('✅ Configuration stored successfully');
    
    // Retrieve
    const { data, error: selectError } = await supabase
      .from('deepwiki_configurations')
      .select('*')
      .eq('id', testConfig.id)
      .single();
    
    if (selectError) {
      console.error('❌ Failed to retrieve:', selectError);
      return;
    }
    
    console.log('✅ Configuration retrieved successfully');
    console.log(`   Primary Model: ${data.primary_model}`);
    console.log(`   Fallback Model: ${data.fallback_model}`);
    
    // Cleanup
    await supabase
      .from('deepwiki_configurations')
      .delete()
      .eq('id', testConfig.id);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  // Test 2: Test repository-specific configuration
  console.log('\n📝 Test 2: Repository-Specific Configuration');
  try {
    const repoConfig = {
      id: `repo-test-${Date.now()}`,
      config_type: 'repository',
      repository_url: 'https://github.com/test/repo',
      primary_model: 'openai/gpt-4-turbo',
      fallback_model: 'anthropic/claude-3-sonnet',
      config_data: {
        context: {
          primaryLanguage: 'typescript',
          size: 'large',
          complexity: 'high'
        },
        scores: {
          primary: { quality: 9.5, cost: 7.0, speed: 8.0 },
          fallback: { quality: 8.5, cost: 8.5, speed: 9.0 }
        }
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Insert
    const { error: insertError } = await supabase
      .from('deepwiki_configurations')
      .insert(repoConfig);
    
    if (insertError) {
      console.error('❌ Failed to insert repository config:', insertError);
      return;
    }
    
    console.log('✅ Repository configuration stored');
    
    // Query by repository URL
    const { data, error: selectError } = await supabase
      .from('deepwiki_configurations')
      .select('*')
      .eq('config_type', 'repository')
      .eq('repository_url', repoConfig.repository_url)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (selectError || !data || data.length === 0) {
      console.error('❌ Failed to retrieve repository config:', selectError);
      return;
    }
    
    console.log('✅ Repository configuration retrieved');
    console.log(`   Repository: ${data[0].repository_url}`);
    console.log(`   Language: ${data[0].config_data.context.primaryLanguage}`);
    
    // Cleanup
    await supabase
      .from('deepwiki_configurations')
      .delete()
      .eq('id', repoConfig.id);
    
  } catch (error) {
    console.error('❌ Repository test failed:', error);
  }
  
  console.log('\n✅ All tests completed');
}

// Run the tests
testVectorStorage().catch(console.error);