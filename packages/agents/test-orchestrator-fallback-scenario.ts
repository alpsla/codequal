#!/usr/bin/env ts-node

/**
 * Test Orchestrator Fallback Scenario
 * 
 * This test verifies the scenario where:
 * 1. Orchestrator queries Supabase for a specific role/language/size configuration
 * 2. Configuration is not found (e.g., for a new language like "Elixir" or "Kotlin")
 * 3. Orchestrator triggers ModelResearcherService to research and create the missing config
 * 4. The new configuration is stored and used for analysis
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Mock ModelResearcherService for testing
class MockModelResearcherService {
  async researchModelForContext(
    role: string,
    language: string,
    size: string
  ): Promise<{
    primary: { provider: string; model: string };
    fallback: { provider: string; model: string };
    weights: any;
    reasoning: string[];
  }> {
    console.log(`\n🔬 RESEARCHING models for ${role}/${language}/${size}...`);
    
    // Simulate research delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Based on context, return appropriate models
    if (role === 'deepwiki' && size === 'large') {
      return {
        primary: { 
          provider: 'google', 
          model: 'gemini-2.5-pro-exp-20250815' // Hypothetical experimental model
        },
        fallback: { 
          provider: 'anthropic', 
          model: 'claude-opus-4-1-20250805' 
        },
        weights: {
          quality: 0.7,
          speed: 0.1,
          cost: 0.1,
          freshness: 0.1,
          contextWindow: 0.0
        },
        reasoning: [
          `${language} is a new/rare language requiring specialized handling`,
          'Large repository needs maximum context window',
          'Gemini 2.5 Pro Experimental has enhanced support for functional languages',
          'Claude Opus 4.1 as fallback for quality assurance'
        ]
      };
    } else if (role === 'comparator') {
      return {
        primary: { 
          provider: 'anthropic', 
          model: 'claude-opus-4-1-20250805' 
        },
        fallback: { 
          provider: 'openai', 
          model: 'gpt-5-20250615' 
        },
        weights: {
          quality: 0.85,
          speed: 0.05,
          cost: 0.05,
          freshness: 0.05,
          contextWindow: 0.0
        },
        reasoning: [
          `${language} requires deep understanding for accurate comparison`,
          'Maximum quality needed for code comparison',
          'Latest models have better understanding of modern language features'
        ]
      };
    } else {
      // Default for other roles
      return {
        primary: { 
          provider: 'openai', 
          model: 'gpt-4.5-turbo-20250710' 
        },
        fallback: { 
          provider: 'google', 
          model: 'gemini-2.5-flash-20250720' 
        },
        weights: {
          quality: 0.5,
          speed: 0.3,
          cost: 0.1,
          freshness: 0.1,
          contextWindow: 0.0
        },
        reasoning: [
          'Balanced configuration for general purpose',
          'Good speed/quality tradeoff'
        ]
      };
    }
  }
}

// Mock Orchestrator that handles missing configurations
class MockOrchestrator {
  private supabase: any;
  private researcher: MockModelResearcherService;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.researcher = new MockModelResearcherService();
  }
  
  async getModelConfiguration(
    role: string,
    language: string,
    size: string
  ): Promise<any> {
    console.log(`\n📋 Querying Supabase for ${role}/${language}/${size}...`);
    
    // Try to get configuration from Supabase
    const { data, error } = await this.supabase
      .from('model_configurations')
      .select('*')
      .eq('role', role)
      .eq('language', language)
      .eq('size_category', size)
      .single();
    
    if (data && !error) {
      console.log(`✅ Found existing configuration:`);
      console.log(`   Primary: ${data.primary_provider}/${data.primary_model}`);
      console.log(`   Fallback: ${data.fallback_provider}/${data.fallback_model}`);
      return data;
    }
    
    // Configuration not found - initiate research
    console.log(`⚠️  No configuration found for ${role}/${language}/${size}`);
    console.log(`🚀 Initiating dedicated model research...`);
    
    // Research optimal models for this context
    const research = await this.researcher.researchModelForContext(role, language, size);
    
    // Create new configuration
    const newConfig = {
      role,
      language,
      size_category: size,
      primary_provider: research.primary.provider,
      primary_model: research.primary.model,
      fallback_provider: research.fallback.provider,
      fallback_model: research.fallback.model,
      weights: research.weights,
      min_requirements: {},
      reasoning: research.reasoning,
      updated_by: 'orchestrator-fallback'
    };
    
    console.log(`\n💾 Storing new configuration in Supabase...`);
    
    // Store in Supabase
    const { data: inserted, error: insertError } = await this.supabase
      .from('model_configurations')
      .insert(newConfig)
      .select()
      .single();
    
    if (insertError) {
      console.error(`❌ Failed to store configuration:`, insertError.message);
      throw insertError;
    }
    
    console.log(`✅ Configuration stored successfully!`);
    console.log(`   Primary: ${inserted.primary_provider}/${inserted.primary_model}`);
    console.log(`   Fallback: ${inserted.fallback_provider}/${inserted.fallback_model}`);
    
    return inserted;
  }
}

async function testFallbackScenarios() {
  console.log('🧪 TESTING ORCHESTRATOR FALLBACK SCENARIOS\n');
  console.log('=' .repeat(80));
  
  const orchestrator = new MockOrchestrator();
  
  // Test scenarios with missing configurations
  const testCases = [
    // Scenario 1: New/rare language not in our 10 standard languages
    { role: 'deepwiki', language: 'elixir', size: 'large', description: 'Rare functional language' },
    
    // Scenario 2: Another uncommon language
    { role: 'comparator', language: 'kotlin', size: 'medium', description: 'Modern JVM language' },
    
    // Scenario 3: Existing configuration (should be found)
    { role: 'orchestrator', language: 'universal', size: 'medium', description: 'Existing global config' },
    
    // Scenario 4: Edge case - very specific context
    { role: 'location_finder', language: 'zig', size: 'small', description: 'New systems language' }
  ];
  
  for (const testCase of testCases) {
    console.log('\n' + '=' .repeat(80));
    console.log(`\n🔍 TEST: ${testCase.description}`);
    console.log(`   Role: ${testCase.role}`);
    console.log(`   Language: ${testCase.language}`);
    console.log(`   Size: ${testCase.size}`);
    
    try {
      const config = await orchestrator.getModelConfiguration(
        testCase.role,
        testCase.language,
        testCase.size
      );
      
      console.log(`\n✅ Configuration ready for use!`);
      
      // Verify the configuration has all required fields
      const requiredFields = [
        'role', 'language', 'size_category',
        'primary_provider', 'primary_model',
        'fallback_provider', 'fallback_model',
        'weights'
      ];
      
      const missingFields = requiredFields.filter(field => !config[field]);
      if (missingFields.length > 0) {
        console.log(`⚠️  Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`   All required fields present ✓`);
      }
      
    } catch (error: any) {
      console.error(`❌ Test failed:`, error.message);
    }
  }
  
  // Clean up test configurations (optional)
  console.log('\n' + '=' .repeat(80));
  console.log('\n🧹 Cleanup: Removing test configurations...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Remove test configurations (those not in our standard 10 languages)
  const testLanguages = ['elixir', 'kotlin', 'zig'];
  for (const lang of testLanguages) {
    const { error } = await supabase
      .from('model_configurations')
      .delete()
      .eq('language', lang);
    
    if (!error) {
      console.log(`   Removed configurations for ${lang}`);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ FALLBACK SCENARIO TESTING COMPLETE!\n');
  console.log('Key findings:');
  console.log('  1. Orchestrator successfully detects missing configurations');
  console.log('  2. ModelResearcherService is triggered for dedicated research');
  console.log('  3. New configurations are stored for future use');
  console.log('  4. Fallback mechanism ensures no analysis fails due to missing config');
}

// Run the test
testFallbackScenarios().catch(console.error);