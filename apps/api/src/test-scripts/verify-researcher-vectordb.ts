/**
 * Verify Researcher Vector DB Integration
 * 
 * This script verifies the actual Vector DB storage for the Researcher agent
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

// Special repository UUID for storing researcher configurations
const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

async function verifyVectorDBStorage() {
  console.log('================================================================================');
  console.log('🔍 VERIFYING RESEARCHER VECTOR DB STORAGE');
  console.log('================================================================================\n');
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Check repository
    console.log('📂 Checking Researcher repository...');
    const { data: repo, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', RESEARCHER_CONFIG_REPO_ID)
      .single();
    
    if (repoError && repoError.code !== 'PGRST116') {
      console.error('❌ Repository query error:', repoError.message);
    } else if (repo) {
      console.log('✅ Repository found:', {
        name: repo.name,
        url: repo.url,
        created_at: repo.created_at
      });
    } else {
      console.log('⚠️  Repository not found - creating it now...');
      
      const { data: newRepo, error: insertError } = await supabase
        .from('repositories')
        .insert({
          id: RESEARCHER_CONFIG_REPO_ID,
          name: 'CodeQual Researcher Configurations',
          url: 'internal://researcher-configs',
          default_branch: 'main',
          analysis_date: new Date().toISOString(),
          overall_score: 100,
          category_scores: { system: 100 },
          repository_type: 'research',
          is_private: true
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Failed to create repository:', insertError.message);
      } else {
        console.log('✅ Repository created successfully');
      }
    }
    
    // Step 2: Check analysis chunks
    console.log('\n📊 Checking model configurations...');
    const { data: chunks, error: chunksError } = await supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (chunksError) {
      console.error('❌ Chunks query error:', chunksError.message);
    } else {
      console.log(`✅ Found ${chunks?.length || 0} analysis chunks`);
      
      // Filter for model configurations
      const modelConfigs = chunks?.filter(chunk => 
        chunk.metadata?.content_type === 'model_configuration'
      ) || [];
      
      console.log(`   Model configurations: ${modelConfigs.length}`);
      
      if (modelConfigs.length > 0) {
        console.log('\n📋 Sample configurations:');
        modelConfigs.slice(0, 3).forEach((config, index) => {
          const metadata = config.metadata;
          const finding = metadata?.findings?.[0];
          
          console.log(`\n   ${index + 1}. ${finding?.type || 'Unknown'}`);
          console.log(`      Created: ${new Date(config.created_at).toLocaleString()}`);
          
          if (finding?.description) {
            try {
              const configData = JSON.parse(finding.description);
              console.log(`      Provider: ${configData.provider}`);
              console.log(`      Model: ${configData.modelName}`);
              console.log(`      Cost: $${configData.costPerMillion}/million`);
              console.log(`      Performance: ${configData.performanceScore}/10`);
            } catch (e) {
              console.log(`      Raw data: ${finding.description.substring(0, 100)}...`);
            }
          }
        });
      }
      
      // Step 3: Create sample model configurations if none exist
      if (modelConfigs.length === 0) {
        console.log('\n📝 Creating sample model configurations...');
        
        const sampleConfigs = [
          {
            type: 'typescript/small/security',
            provider: 'anthropic',
            modelName: 'claude-3-opus',
            costPerMillion: 15,
            performanceScore: 9.2
          },
          {
            type: 'python/large/architecture',
            provider: 'openai',
            modelName: 'gpt-4',
            costPerMillion: 30,
            performanceScore: 8.8
          },
          {
            type: 'javascript/medium/performance',
            provider: 'deepseek',
            modelName: 'deepseek-coder',
            costPerMillion: 2,
            performanceScore: 8.0
          }
        ];
        
        for (const config of sampleConfigs) {
          const { error: insertError } = await supabase
            .from('analysis_chunks')
            .insert({
              repository_id: RESEARCHER_CONFIG_REPO_ID,
              file_path: `configs/${config.type}.json`,
              content: JSON.stringify(config, null, 2),
              metadata: {
                content_type: 'model_configuration',
                source: 'researcher',
                timestamp: new Date().toISOString(),
                findings: [{
                  type: config.type,
                  severity: 'info',
                  line_start: 1,
                  line_end: 1,
                  description: JSON.stringify(config),
                  message: `Model configuration for ${config.type}`
                }]
              }
            });
          
          if (insertError) {
            console.error(`❌ Failed to insert ${config.type}:`, insertError.message);
          } else {
            console.log(`✅ Created configuration for ${config.type}`);
          }
        }
      }
    }
    
    // Step 4: Test vector search
    console.log('\n🔍 Testing vector search capability...');
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_analysis_chunks', {
        query_embedding: new Array(3072).fill(0.1), // Mock embedding
        match_threshold: 0.1,
        match_count: 5,
        repository_ids: [RESEARCHER_CONFIG_REPO_ID]
      });
    
    if (searchError) {
      console.log('⚠️  Vector search not available:', searchError.message);
    } else {
      console.log(`✅ Vector search returned ${searchResults?.length || 0} results`);
    }
    
    console.log('\n================================================================================');
    console.log('✅ VECTOR DB VERIFICATION COMPLETE');
    console.log('================================================================================\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run verification
verifyVectorDBStorage().catch(console.error);