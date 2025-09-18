#!/usr/bin/env npx ts-node

/**
 * Populate model_configurations table with OpenRouter model IDs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ModelConfiguration {
  role: string;
  language?: string;
  size_category?: string;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  agent_name?: string;
  weights: {
    quality: number;
    speed: number;
    cost: number;
    freshness: number;
    contextWindow: number;
  };
  reasoning: string[];
  valid_until: string;
}

async function populateModelConfigs() {
  console.log('🔧 Populating model_configurations table with OpenRouter models...\n');

  // V9 Agent configurations with correct OpenRouter model IDs
  const v9AgentConfigs: ModelConfiguration[] = [
    {
      role: 'SecurityAnalyzer',
      agent_name: 'SecurityAnalyzer',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-sonnet',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.9, speed: 0.7, cost: 0.5, freshness: 0.8, contextWindow: 0.9 },
      reasoning: ['Security analysis requires high quality understanding', 'Sonnet provides best balance'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'QualityAnalyzer',
      agent_name: 'QualityAnalyzer',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-haiku',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.7, speed: 0.9, cost: 0.8, freshness: 0.7, contextWindow: 0.6 },
      reasoning: ['Quality checks can use faster model', 'Haiku is cost-effective'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'PerformanceAnalyzer',
      agent_name: 'PerformanceAnalyzer',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-haiku',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.7, speed: 0.9, cost: 0.8, freshness: 0.7, contextWindow: 0.6 },
      reasoning: ['Performance analysis is pattern-based', 'Speed is important'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'ArchitectureAnalyzer',
      agent_name: 'ArchitectureAnalyzer',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-sonnet',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.9, speed: 0.6, cost: 0.5, freshness: 0.8, contextWindow: 0.9 },
      reasoning: ['Architecture analysis needs deep understanding', 'Sonnet excels at complex patterns'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'DependencyAnalyzer',
      agent_name: 'DependencyAnalyzer',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-haiku',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.6, speed: 0.9, cost: 0.9, freshness: 0.8, contextWindow: 0.5 },
      reasoning: ['Dependency checks are mostly lookups', 'Speed and cost are priorities'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'EducatorAgent',
      agent_name: 'EducatorAgent',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-sonnet',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.9, speed: 0.6, cost: 0.5, freshness: 0.9, contextWindow: 0.8 },
      reasoning: ['Educational content needs high quality', 'Sonnet provides best explanations'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Language-specific configurations
  const languageConfigs: ModelConfiguration[] = [
    {
      role: 'analyzer',
      language: 'java',
      size_category: 'large',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-sonnet',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.9, speed: 0.6, cost: 0.5, freshness: 0.8, contextWindow: 0.9 },
      reasoning: ['Java enterprise code needs deep understanding', 'Large codebases need context'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      role: 'analyzer',
      language: 'python',
      size_category: 'medium',
      primary_provider: 'openrouter',
      primary_model: 'anthropic/claude-3.5-haiku',
      fallback_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      weights: { quality: 0.7, speed: 0.8, cost: 0.7, freshness: 0.8, contextWindow: 0.6 },
      reasoning: ['Python is well-understood by most models', 'Balance of speed and quality'],
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const allConfigs = [...v9AgentConfigs, ...languageConfigs];

  for (const config of allConfigs) {
    try {
      // First check if configuration exists
      const { data: existing } = await supabase
        .from('model_configurations')
        .select('id')
        .eq('role', config.role)
        .eq('language', config.language || null)
        .eq('size_category', config.size_category || null)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('model_configurations')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
        console.log(`✅ Updated: ${config.role} ${config.language || ''} ${config.size_category || ''}`);
      } else {
        // Insert new
        const { error } = await supabase
          .from('model_configurations')
          .insert(config);

        if (error) throw error;
        console.log(`✅ Created: ${config.role} ${config.language || ''} ${config.size_category || ''}`);
      }
    } catch (error) {
      console.error(`❌ Failed for ${config.role}:`, error);
    }
  }

  // Verify configurations
  console.log('\n📊 Verifying configurations...');
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .order('role');

  if (error) {
    console.error('Failed to fetch configs:', error);
    return;
  }

  console.log(`\n✅ Total configurations: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\nAgent configurations:');
    data.filter((c: any) => c.agent_name).forEach((config: any) => {
      console.log(`  - ${config.agent_name}: ${config.primary_model}`);
    });
    
    console.log('\nLanguage configurations:');
    data.filter((c: any) => c.language).forEach((config: any) => {
      console.log(`  - ${config.language}/${config.size_category}: ${config.primary_model}`);
    });
  }
}

populateModelConfigs().catch(console.error);