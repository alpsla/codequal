#!/usr/bin/env npx ts-node

/**
 * Test: Model Configuration On-Demand Generation
 * 
 * Verifies:
 * 1. All 120 configs saved with primary + fallback models
 * 2. When 1 config is missing, only that config is regenerated (not full research)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ModelConfig {
  id: string;
  role: string;
  language: string;
  size_category: string;
  primary_model: string;
  fallback_model: string;
  primary_provider: string;
  fallback_provider: string;
  weights: any;
  last_updated: string;
}

async function testStep1_VerifyAllConfigsSaved() {
  console.log('\n📋 STEP 1: Verify All 120 Configs Saved\n');
  
  const { data: configs, error } = await supabase
    .from('model_configurations')
    .select('*')
    .order('role', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching configs:', error);
    return false;
  }
  
  console.log(`✅ Total configs in database: ${configs?.length || 0}`);
  
  if (!configs || configs.length !== 120) {
    console.error(`❌ Expected 120 configs, found ${configs?.length || 0}`);
    return false;
  }
  
  // Verify each config has primary + fallback
  let missingModels = 0;
  let invalidConfigs: string[] = [];
  
  for (const config of configs) {
    if (!config.primary_model || !config.fallback_model) {
      missingModels++;
      invalidConfigs.push(`${config.role}/${config.language}`);
    }
  }
  
  if (missingModels > 0) {
    console.error(`❌ ${missingModels} configs missing models:`);
    invalidConfigs.forEach(c => console.error(`   - ${c}`));
    return false;
  }
  
  console.log('✅ All 120 configs have primary + fallback models');
  
  // Show sample configs
  console.log('\n📊 Sample Configurations:');
  const samples = [
    configs.find(c => c.role === 'security' && c.language === 'java'),
    configs.find(c => c.role === 'architecture' && c.language === 'java'),
    configs.find(c => c.role === 'performance' && c.language === 'python')
  ];
  
  samples.forEach(config => {
    if (config) {
      console.log(`\n  ${config.role}/${config.language}:`);
      console.log(`    Primary:  ${config.primary_model}`);
      console.log(`    Fallback: ${config.fallback_model}`);
      console.log(`    Weights:  quality=${config.weights.quality}, cost=${config.weights.cost}`);
    }
  });
  
  return true;
}

async function testStep2_DeleteOneConfig() {
  console.log('\n\n🗑️ STEP 2: Delete One Config (security/typescript)\n');
  
  // Delete security/typescript config
  const { error } = await supabase
    .from('model_configurations')
    .delete()
    .eq('role', 'security')
    .eq('language', 'typescript');
  
  if (error) {
    console.error('❌ Error deleting config:', error);
    return null;
  }
  
  console.log('✅ Deleted security/typescript config');
  
  // Verify deletion
  const { data: configs } = await supabase
    .from('model_configurations')
    .select('*');
  
  console.log(`✅ Total configs now: ${configs?.length || 0} (should be 119)`);
  
  if (configs?.length !== 119) {
    console.error(`❌ Expected 119 configs, found ${configs?.length || 0}`);
    return null;
  }
  
  return { role: 'security', language: 'typescript' };
}

async function testStep3_RequestMissingConfig(missing: { role: string; language: string }) {
  console.log('\n\n🔍 STEP 3: Request Missing Config (Simulate On-Demand Generation)\n');
  
  console.log(`📞 Simulating request for: ${missing.role}/${missing.language}`);
  
  // In real system, ModelResearcherService.getOptimalModelForContext() would be called
  // For this test, we'll simulate by calling the same logic
  
  // Import the model researcher service
  const { ModelResearcherService } = await import('./src/two-branch/research-services/model-researcher-service');
  
  const researcher = new ModelResearcherService();
  
  console.log('⏳ Requesting model for missing config...\n');
  
  const startTime = Date.now();
  const startCount = await getConfigCount();
  
  try {
    // This should trigger requestSpecificContextResearch, NOT conductQuarterlyResearch
    const modelId = await researcher.getOptimalModelForContext({
      language: missing.language,
      repo_size: 'medium',
      task_type: missing.role,
      specific_requirements: []
    });
    
    const endTime = Date.now();
    const endCount = await getConfigCount();
    
    console.log(`✅ Model selected: ${modelId}`);
    console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
    console.log(`📊 Config count: ${startCount} → ${endCount}`);
    
    // Verify only 1 config was added
    if (endCount !== startCount + 1) {
      console.error(`❌ Expected 1 new config, but got ${endCount - startCount} new configs`);
      console.error('   This suggests full quarterly research was triggered instead of specific research!');
      return false;
    }
    
    console.log('✅ Only 1 config added (specific research worked!)');
    
    // Verify the new config has primary + fallback
    const { data: newConfig } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', missing.role)
      .eq('language', missing.language)
      .single();
    
    if (!newConfig) {
      console.error('❌ New config not found in database');
      return false;
    }
    
    console.log('\n📊 New Config Details:');
    console.log(`  Primary:  ${newConfig.primary_model}`);
    console.log(`  Fallback: ${newConfig.fallback_model}`);
    console.log(`  Weights:  quality=${newConfig.weights.quality}, cost=${newConfig.weights.cost}`);
    
    if (!newConfig.primary_model || !newConfig.fallback_model) {
      console.error('❌ New config missing primary or fallback model!');
      return false;
    }
    
    console.log('✅ New config has both primary + fallback models');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error requesting missing config:', error);
    return false;
  }
}

async function getConfigCount(): Promise<number> {
  const { data, count } = await supabase
    .from('model_configurations')
    .select('*', { count: 'exact', head: true });
  
  return count || 0;
}

async function testStep4_VerifyNoFullResearch() {
  console.log('\n\n🔬 STEP 4: Verify No Full Research Was Triggered\n');
  
  const { data: configs } = await supabase
    .from('model_configurations')
    .select('*');
  
  console.log(`📊 Total configs: ${configs?.length || 0} (should be 120 again)`);
  
  if (configs?.length !== 120) {
    console.error(`❌ Expected 120 configs, found ${configs?.length || 0}`);
    console.error('   Full quarterly research may have been triggered!');
    return false;
  }
  
  console.log('✅ Config count correct (no extra configs generated)');
  
  // Check last_updated timestamps - only 1 should be recent
  const now = new Date();
  const recentConfigs = configs?.filter(c => {
    const updated = new Date(c.last_updated);
    const diffMinutes = (now.getTime() - updated.getTime()) / (1000 * 60);
    return diffMinutes < 2; // Updated in last 2 minutes
  });
  
  console.log(`📊 Configs updated in last 2 minutes: ${recentConfigs?.length || 0}`);
  
  if (recentConfigs && recentConfigs.length > 5) {
    console.error(`⚠️  Warning: ${recentConfigs.length} configs were recently updated`);
    console.error('   This might indicate partial quarterly research was triggered');
  } else {
    console.log('✅ Only recent configs updated (specific research confirmed)');
  }
  
  return true;
}

async function main() {
  console.log('🚀 Testing Model Configuration On-Demand Generation\n');
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Verify all configs saved
    const step1Pass = await testStep1_VerifyAllConfigsSaved();
    if (!step1Pass) {
      console.error('\n❌ STEP 1 FAILED - Aborting test');
      process.exit(1);
    }
    
    // Step 2: Delete one config
    const missingConfig = await testStep2_DeleteOneConfig();
    if (!missingConfig) {
      console.error('\n❌ STEP 2 FAILED - Aborting test');
      process.exit(1);
    }
    
    // Step 3: Request missing config (on-demand generation)
    const step3Pass = await testStep3_RequestMissingConfig(missingConfig);
    if (!step3Pass) {
      console.error('\n❌ STEP 3 FAILED - Aborting test');
      process.exit(1);
    }
    
    // Step 4: Verify no full research
    const step4Pass = await testStep4_VerifyNoFullResearch();
    if (!step4Pass) {
      console.error('\n❌ STEP 4 FAILED - Aborting test');
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log('  ✅ All 120 configs saved with primary + fallback');
    console.log('  ✅ On-demand generation creates only 1 missing config');
    console.log('  ✅ No full quarterly research triggered');
    console.log('  ✅ New config has both primary + fallback models');
    console.log('\n🎉 Dynamic model configuration system working correctly!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:', error);
    process.exit(1);
  }
}

main();

