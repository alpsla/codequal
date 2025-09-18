#!/usr/bin/env npx ts-node

/**
 * Update Supabase with latest V9 model configurations
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateV9Models() {
  console.log('🚀 Updating V9 Model Configurations with Latest Models\n');
  console.log('=' .repeat(60));
  
  // Latest models from OpenRouter (as of Sept 2025)
  const v9Configs = [
    {
      role: 'SecurityAnalyzer',
      primary_model: 'anthropic/claude-opus-4.1',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3.7-sonnet',
      fallback_provider: 'openrouter',
      weights: {
        quality: 0.95,
        speed: 0.6,
        cost: 0.4,
        freshness: 1.0,
        contextWindow: 0.95
      },
      reasoning: [
        'Claude Opus 4.1 is the most advanced model for security analysis',
        'Excellent at detecting vulnerabilities and security patterns',
        'Claude 3.7 Sonnet as fallback provides good balance'
      ],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'QualityAnalyzer',
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      weights: {
        quality: 0.75,
        speed: 0.9,
        cost: 0.9,
        freshness: 0.9,
        contextWindow: 0.7
      },
      reasoning: [
        'Claude 3.5 Haiku is fast and cost-effective for quality checks',
        'Good at detecting code smells and style issues',
        'Excellent speed for rapid feedback'
      ],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'PerformanceAnalyzer',
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      weights: {
        quality: 0.75,
        speed: 0.9,
        cost: 0.9,
        freshness: 0.9,
        contextWindow: 0.7
      },
      reasoning: [
        'Claude 3.5 Haiku efficiently identifies performance patterns',
        'Fast processing for O(n) complexity detection',
        'Cost-effective for routine performance checks'
      ],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'ArchitectureAnalyzer',
      primary_model: 'anthropic/claude-opus-4.1',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3.7-sonnet',
      fallback_provider: 'openrouter',
      weights: {
        quality: 0.95,
        speed: 0.6,
        cost: 0.4,
        freshness: 1.0,
        contextWindow: 0.95
      },
      reasoning: [
        'Claude Opus 4.1 excels at understanding system architecture',
        'Best for detecting design patterns and anti-patterns',
        'Superior context understanding for large codebases'
      ],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'DependencyAnalyzer',
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      weights: {
        quality: 0.7,
        speed: 0.95,
        cost: 0.95,
        freshness: 0.9,
        contextWindow: 0.6
      },
      reasoning: [
        'Claude 3.5 Haiku is efficient for dependency scanning',
        'Quick CVE lookups and version checking',
        'Most cost-effective for this task type'
      ],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'EducatorAgent',
      primary_model: 'anthropic/claude-3.7-sonnet',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3.5-sonnet',
      fallback_provider: 'openrouter',
      weights: {
        quality: 0.9,
        speed: 0.7,
        cost: 0.6,
        freshness: 0.95,
        contextWindow: 0.85
      },
      reasoning: [
        'Claude 3.7 Sonnet provides excellent educational content',
        'Great at generating learning paths and explanations',
        'Balanced cost and quality for educational insights'
      ],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  // First, clear old configurations
  console.log('🗑️  Clearing old configurations...');
  
  for (const config of v9Configs) {
    try {
      // Delete existing configs for this role
      const { error: deleteError } = await supabase
        .from('model_configurations')
        .delete()
        .eq('role', config.role);
      
      if (deleteError && deleteError.code !== 'PGRST116') {
        console.log(`   Warning: ${deleteError.message}`);
      }
      
      // Insert new configuration
      const { error: insertError } = await supabase
        .from('model_configurations')
        .insert(config);
      
      if (insertError) {
        console.error(`❌ Failed to insert ${config.role}:`, insertError.message);
      } else {
        console.log(`✅ Updated ${config.role}:`);
        console.log(`   Primary: ${config.primary_model}`);
        console.log(`   Fallback: ${config.fallback_model}`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${config.role}:`, error);
    }
  }
  
  // Verify the updates
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Verifying Updated Configurations:\n');
  
  const { data: updated, error: fetchError } = await supabase
    .from('model_configurations')
    .select('*')
    .in('role', v9Configs.map(c => c.role))
    .order('role');
  
  if (fetchError) {
    console.error('Failed to verify:', fetchError);
  } else if (updated) {
    console.log(`Successfully updated ${updated.length} configurations:`);
    updated.forEach((config: any) => {
      console.log(`  - ${config.role}: ${config.primary_model}`);
    });
  }
  
  console.log('\n✅ V9 models updated to latest versions!');
}

updateV9Models().catch(console.error);