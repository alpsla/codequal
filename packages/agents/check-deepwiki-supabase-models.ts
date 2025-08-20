#!/usr/bin/env ts-node

/**
 * Check DeepWiki Model Configurations in Supabase
 * 
 * This script checks if there are existing model configurations
 * stored in Supabase for the DeepWiki role, particularly for
 * different languages and repository sizes.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface ModelResearchResult {
  id: string;
  model_id: string;
  provider: string;
  quality_score: number;
  speed_score: number;
  price_score: number;
  context_length: number;
  specializations: string[];
  optimal_for: {
    languages: string[];
    repo_sizes: string[];
    frameworks: string[];
  };
  research_date: Date;
  metadata: any;
}

async function checkDeepWikiModels() {
  console.log('🔍 Checking DeepWiki Model Configurations in Supabase\n');
  console.log('=' .repeat(80));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // 1. Check deepwiki_configurations table
  console.log('\n📊 Checking deepwiki_configurations table...');
  try {
    const { data: deepwikiConfigs, error: deepwikiError } = await supabase
      .from('deepwiki_configurations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (deepwikiError) {
      console.log('   ❌ Table not found or error:', deepwikiError.message);
    } else if (deepwikiConfigs && deepwikiConfigs.length > 0) {
      console.log(`   ✅ Found ${deepwikiConfigs.length} configurations`);
      deepwikiConfigs.forEach((config, i) => {
        console.log(`\n   ${i + 1}. Configuration (${config.config_type}):`);
        console.log(`      Primary: ${config.primary_model}`);
        console.log(`      Fallback: ${config.fallback_model}`);
        if (config.repository_url) {
          console.log(`      Repository: ${config.repository_url}`);
        }
        console.log(`      Created: ${new Date(config.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️  No configurations found in table');
    }
  } catch (error) {
    console.log('   ❌ Error querying deepwiki_configurations:', error);
  }
  
  // 2. Check model_research table for DeepWiki-optimized models
  console.log('\n\n📊 Checking model_research table for DeepWiki-suitable models...');
  try {
    const { data: modelResearch, error: researchError } = await supabase
      .from('model_research')
      .select('*')
      .order('quality_score', { ascending: false })
      .limit(20);
    
    if (researchError) {
      console.log('   ❌ Table not found or error:', researchError.message);
    } else if (modelResearch && modelResearch.length > 0) {
      console.log(`   ✅ Found ${modelResearch.length} researched models\n`);
      
      // Find 5 most useful for DeepWiki across different languages/sizes
      const scenarios = [
        { language: 'Python', size: 'small', name: 'Small Python Project' },
        { language: 'TypeScript', size: 'medium', name: 'Medium TypeScript/React' },
        { language: 'Java', size: 'large', name: 'Large Java Enterprise' },
        { language: 'Go', size: 'large', name: 'Go/Rust Microservices' },
        { language: 'JavaScript', size: 'small', name: 'Small JS/Node Project' }
      ];
      
      console.log('   🎯 Top Models for 5 DeepWiki Scenarios:\n');
      
      scenarios.forEach((scenario, idx) => {
        console.log(`   ${idx + 1}. ${scenario.name} (${scenario.language}, ${scenario.size}):`);
        
        // Filter models suitable for this scenario
        const suitable = modelResearch.filter((model: ModelResearchResult) => {
          const hasLanguage = model.optimal_for?.languages?.includes(scenario.language) ||
                             model.optimal_for?.languages?.includes('General');
          const hasSize = model.optimal_for?.repo_sizes?.includes(scenario.size) ||
                         model.optimal_for?.repo_sizes?.includes('any');
          return hasLanguage || hasSize;
        });
        
        if (suitable.length > 0) {
          const best = suitable[0];
          console.log(`      Model: ${best.model_id}`);
          console.log(`      Quality: ${best.quality_score}/100`);
          console.log(`      Speed: ${best.speed_score}/100`);
          console.log(`      Price: ${best.price_score}/100`);
          console.log(`      Context: ${best.context_length?.toLocaleString() || 'N/A'} tokens`);
          console.log(`      Optimal for: ${best.optimal_for?.languages?.slice(0, 3).join(', ')}`);
        } else {
          console.log(`      ⚠️  No specific model found for this scenario`);
        }
        console.log();
      });
    } else {
      console.log('   ⚠️  No model research data found');
    }
  } catch (error) {
    console.log('   ❌ Error querying model_research:', error);
  }
  
  // 3. Check model_research_metadata for research status
  console.log('\n📊 Checking model research metadata...');
  try {
    const { data: metadata, error: metaError } = await supabase
      .from('model_research_metadata')
      .select('*')
      .single();
    
    if (metaError) {
      console.log('   ❌ Table not found or error:', metaError.message);
    } else if (metadata) {
      console.log('   ✅ Research Metadata:');
      console.log(`      Last Research: ${new Date(metadata.last_research_date).toLocaleString()}`);
      console.log(`      Next Scheduled: ${new Date(metadata.next_scheduled_research).toLocaleString()}`);
      console.log(`      Models Researched: ${metadata.total_models_researched}`);
      console.log(`      Version: ${metadata.research_version}`);
      
      // Check if research is outdated
      const lastResearch = new Date(metadata.last_research_date);
      const daysSince = (Date.now() - lastResearch.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSince > 90) {
        console.log(`      ⚠️  Research is ${Math.floor(daysSince)} days old (quarterly update needed)`);
      } else {
        console.log(`      ✅ Research is ${Math.floor(daysSince)} days old (still fresh)`);
      }
    } else {
      console.log('   ⚠️  No metadata found - research may never have been run');
    }
  } catch (error) {
    console.log('   ❌ Error querying metadata:', error);
  }
  
  // 4. Check if tables exist
  console.log('\n\n📊 Checking table existence...');
  try {
    // Try to get table information
    const tables = ['deepwiki_configurations', 'model_research', 'model_research_metadata', 'model_context_research'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`   ❌ Table '${table}' does not exist`);
      } else if (error) {
        console.log(`   ⚠️  Table '${table}' exists but has error: ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking tables:', error);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📝 RECOMMENDATIONS:\n');
  console.log('If tables are missing, you need to:');
  console.log('1. Run the Supabase migration to create model_research tables');
  console.log('2. Execute ModelResearcherService.conductQuarterlyResearch()');
  console.log('3. Store initial DeepWiki configurations');
  console.log('\nIf research is outdated (>90 days), trigger a new research cycle.');
}

// Run the check
checkDeepWikiModels().catch(console.error);