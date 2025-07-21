/**
 * Check existing research data in Vector DB
 * This will show us if real research was conducted previously
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

// Special repository UUID for storing researcher configurations
const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

async function checkExistingResearchData() {
  console.log('================================================================================');
  console.log('🔍 CHECKING EXISTING RESEARCH DATA IN VECTOR DB');
  console.log('================================================================================\n');
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Check if repository exists
    console.log('📂 Checking Researcher repository...');
    const { data: repo, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', RESEARCHER_CONFIG_REPO_ID)
      .single();
    
    if (repo) {
      console.log('✅ Repository found:', {
        name: repo.name,
        created_at: repo.created_at,
        metadata: repo.metadata
      });
    } else {
      console.log('❌ Repository not found');
      return;
    }
    
    // Step 2: Count total chunks
    console.log('\n📊 Counting analysis chunks...');
    const { count: totalCount, error: countError } = await supabase
      .from('analysis_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID);
    
    console.log(`Total chunks in repository: ${totalCount || 0}`);
    
    // Step 3: Get a sample of chunks to analyze
    console.log('\n🔍 Analyzing chunk types and content...');
    const { data: chunks, error: chunksError } = await supabase
      .from('analysis_chunks')
      .select('id, created_at, metadata, content')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (chunks && chunks.length > 0) {
      // Analyze chunk types
      const chunkTypes: Record<string, number> = {};
      const providers: Record<string, number> = {};
      const languages: Record<string, number> = {};
      const roles: Record<string, number> = {};
      const models: Record<string, number> = {};
      
      chunks.forEach(chunk => {
        // Count content types
        const contentType = chunk.metadata?.content_type || 'unknown';
        chunkTypes[contentType] = (chunkTypes[contentType] || 0) + 1;
        
        // For model configurations, extract details
        if (contentType === 'model_configuration' && chunk.metadata?.findings?.[0]) {
          const finding = chunk.metadata.findings[0];
          
          // Extract context (language/size/role)
          if (finding.type) {
            const parts = finding.type.split('/');
            if (parts.length === 3) {
              const [lang, size, role] = parts;
              languages[lang] = (languages[lang] || 0) + 1;
              roles[role] = (roles[role] || 0) + 1;
            }
          }
          
          // Extract provider and model from description
          try {
            const config = JSON.parse(finding.description || '{}');
            if (config.provider) {
              providers[config.provider] = (providers[config.provider] || 0) + 1;
            }
            if (config.modelName) {
              models[config.modelName] = (models[config.modelName] || 0) + 1;
            }
          } catch (e) {
            // Try parsing content directly
            try {
              const config = JSON.parse(chunk.content || '{}');
              if (config.provider) {
                providers[config.provider] = (providers[config.provider] || 0) + 1;
              }
              if (config.modelName) {
                models[config.modelName] = (models[config.modelName] || 0) + 1;
              }
            } catch (e2) {
              // Skip invalid entries
            }
          }
        }
      });
      
      console.log('\nContent type distribution:');
      Object.entries(chunkTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
      console.log('\nProvider distribution:');
      Object.entries(providers).sort((a, b) => b[1] - a[1]).forEach(([provider, count]) => {
        console.log(`  ${provider}: ${count}`);
      });
      
      console.log('\nLanguage distribution:');
      Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([lang, count]) => {
        console.log(`  ${lang}: ${count}`);
      });
      
      console.log('\nRole distribution:');
      Object.entries(roles).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });
      
      console.log('\nTop models:');
      Object.entries(models).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([model, count]) => {
        console.log(`  ${model}: ${count}`);
      });
      
      // Show sample configurations
      console.log('\n📋 Sample configurations:');
      const modelConfigs = chunks.filter(chunk => 
        chunk.metadata?.content_type === 'model_configuration'
      ).slice(0, 5);
      
      modelConfigs.forEach((chunk, index) => {
        console.log(`\n${index + 1}. Configuration:`);
        console.log(`   Created: ${new Date(chunk.created_at).toLocaleString()}`);
        
        const finding = chunk.metadata?.findings?.[0];
        if (finding) {
          console.log(`   Context: ${finding.type}`);
          try {
            const config = JSON.parse(finding.description || chunk.content || '{}');
            console.log(`   Provider: ${config.provider}`);
            console.log(`   Model: ${config.modelName}`);
            console.log(`   Cost: $${config.costPerMillion}/M tokens`);
            console.log(`   Performance: ${config.performanceScore}/10`);
            console.log(`   Context Length: ${config.contextLength || 'N/A'}`);
            console.log(`   Is Primary: ${config.isPrimary ? 'Yes' : 'No'}`);
          } catch (e) {
            console.log('   [Unable to parse configuration]');
          }
        }
      });
      
      // Check when the data was created
      const dates = chunks.map(c => new Date(c.created_at).getTime());
      const oldestDate = new Date(Math.min(...dates));
      const newestDate = new Date(Math.max(...dates));
      
      console.log('\n📅 Data timeline:');
      console.log(`   Oldest entry: ${oldestDate.toLocaleString()}`);
      console.log(`   Newest entry: ${newestDate.toLocaleString()}`);
      
    } else {
      console.log('❌ No chunks found in the repository');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n================================================================================');
  console.log('✅ ANALYSIS COMPLETE');
  console.log('================================================================================\n');
}

// Run the check
checkExistingResearchData().catch(console.error);