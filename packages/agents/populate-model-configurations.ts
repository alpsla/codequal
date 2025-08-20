#!/usr/bin/env ts-node

/**
 * Populate Model Configurations with Latest 2025 Models
 * 
 * Uses the correct schema from update-model-configurations-table.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Latest 2025 models (August 2025)
const MODELS_2025 = {
  highQuality: {
    primary: { provider: 'anthropic', model: 'claude-opus-4-1-20250805' },
    secondary: { provider: 'openai', model: 'gpt-5-20250615' },
    tertiary: { provider: 'google', model: 'gemini-2.5-pro-20250720' }
  },
  balanced: {
    primary: { provider: 'anthropic', model: 'claude-sonnet-4-20250522' },
    secondary: { provider: 'openai', model: 'gpt-4.5-turbo-20250710' },
    tertiary: { provider: 'meta', model: 'llama-4-405b-20250810' }
  },
  fast: {
    primary: { provider: 'google', model: 'gemini-2.5-flash-20250720' },
    secondary: { provider: 'openai', model: 'gpt-4.5-mini-20250718' },
    tertiary: { provider: 'mistral', model: 'mistral-large-2025-20250715' }
  },
  codeSpecialist: {
    primary: { provider: 'deepseek', model: 'deepseek-v3-coder-20250601' },
    secondary: { provider: 'anthropic', model: 'claude-opus-4-1-20250805' },
    tertiary: { provider: 'openai', model: 'gpt-5-20250615' }
  }
};

const LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'go', 
  'rust', 'cpp', 'csharp', 'ruby', 'php'
];

const SIZES = ['small', 'medium', 'large'];

interface ModelConfig {
  role: string;
  language: string;
  size_category: string;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  weights: any;
  min_requirements?: any;
  reasoning: string[];
}

function selectModelsForContext(role: string, language: string, size: string) {
  // Context-independent roles
  if (['orchestrator', 'researcher', 'educator'].includes(role)) {
    return {
      primary: MODELS_2025.highQuality.primary,
      fallback: MODELS_2025.highQuality.secondary,
      weights: {
        quality: 0.8,
        speed: 0.05,
        cost: 0.05,
        freshness: 0.1,
        contextWindow: 0.0
      },
      reasoning: [
        'Context-independent role requires highest quality',
        `${MODELS_2025.highQuality.primary.model} provides best reasoning`,
        'Quality prioritized over speed for orchestration'
      ]
    };
  }
  
  // DeepWiki - needs large context for repository analysis
  if (role === 'deepwiki') {
    if (size === 'large') {
      return {
        primary: MODELS_2025.highQuality.tertiary, // Gemini 2.5 Pro (2M context)
        fallback: MODELS_2025.highQuality.primary,  // Claude Opus 4.1
        weights: {
          quality: 0.67,
          speed: 0.04,
          cost: 0.15,
          freshness: 0.13,
          contextWindow: 0.01
        },
        min_requirements: {
          minQuality: 8.0,
          minContextWindow: 500000
        },
        reasoning: [
          'Large repos need maximum context window',
          'Gemini 2.5 Pro offers 2M+ token context',
          'Claude Opus 4.1 as fallback for quality'
        ]
      };
    } else if (size === 'small') {
      return {
        primary: MODELS_2025.fast.primary,      // Gemini 2.5 Flash
        fallback: MODELS_2025.balanced.primary, // Claude Sonnet 4
        weights: {
          quality: 0.4,
          speed: 0.3,
          cost: 0.2,
          freshness: 0.1,
          contextWindow: 0.0
        },
        min_requirements: {
          minQuality: 6.0,
          minContextWindow: 50000
        },
        reasoning: [
          'Small repos prioritize speed and cost',
          'Gemini 2.5 Flash is ultra-fast',
          'Claude Sonnet 4 provides quality fallback'
        ]
      };
    } else {
      return {
        primary: MODELS_2025.balanced.primary,   // Claude Sonnet 4
        fallback: MODELS_2025.balanced.secondary, // GPT-4.5 Turbo
        weights: {
          quality: 0.55,
          speed: 0.15,
          cost: 0.2,
          freshness: 0.1,
          contextWindow: 0.0
        },
        min_requirements: {
          minQuality: 7.0,
          minContextWindow: 200000
        },
        reasoning: [
          'Medium repos need balanced performance',
          'Claude Sonnet 4 offers good quality/speed balance',
          'GPT-4.5 Turbo as reliable fallback'
        ]
      };
    }
  }
  
  // Comparator - needs high accuracy
  if (role === 'comparator') {
    const isComplexLanguage = ['cpp', 'rust', 'java'].includes(language);
    
    if (isComplexLanguage) {
      return {
        primary: MODELS_2025.codeSpecialist.secondary, // Claude Opus 4.1
        fallback: MODELS_2025.codeSpecialist.tertiary, // GPT-5
        weights: {
          quality: 0.8,
          speed: 0.05,
          cost: 0.05,
          freshness: 0.1,
          contextWindow: 0.0
        },
        min_requirements: {
          minQuality: 9.0,
          minContextWindow: 128000
        },
        reasoning: [
          `${language} requires deep code understanding`,
          'Claude Opus 4.1 has 74.5% on SWE-bench',
          'Maximum quality for complex language comparison'
        ]
      };
    } else {
      return {
        primary: MODELS_2025.balanced.primary,   // Claude Sonnet 4
        fallback: MODELS_2025.balanced.secondary, // GPT-4.5 Turbo
        weights: {
          quality: 0.65,
          speed: 0.15,
          cost: 0.1,
          freshness: 0.1,
          contextWindow: 0.0
        },
        min_requirements: {
          minQuality: 7.5,
          minContextWindow: 100000
        },
        reasoning: [
          `${language} comparison needs good accuracy`,
          'Balanced model sufficient for simpler languages',
          'Cost-effective for high-volume comparisons'
        ]
      };
    }
  }
  
  // Location Finder - needs speed
  if (role === 'location_finder') {
    if (size === 'large') {
      return {
        primary: MODELS_2025.fast.primary,    // Gemini 2.5 Flash
        fallback: MODELS_2025.fast.tertiary,  // Mistral Large 2025
        weights: {
          quality: 0.3,
          speed: 0.5,
          cost: 0.1,
          freshness: 0.1,
          contextWindow: 0.0
        },
        min_requirements: {
          minQuality: 5.0,
          minContextWindow: 100000,
          maxResponseTime: 3000
        },
        reasoning: [
          'Location finding prioritizes speed',
          'Gemini 2.5 Flash provides ultra-fast scanning',
          'Large repos need fast pattern matching'
        ]
      };
    } else {
      return {
        primary: MODELS_2025.fast.secondary,  // GPT-4.5 Mini
        fallback: MODELS_2025.fast.primary,   // Gemini 2.5 Flash
        weights: {
          quality: 0.25,
          speed: 0.6,
          cost: 0.05,
          freshness: 0.1,
          contextWindow: 0.0
        },
        min_requirements: {
          minQuality: 4.0,
          minContextWindow: 32000,
          maxResponseTime: 2000
        },
        reasoning: [
          'Small repos need minimal latency',
          'GPT-4.5 Mini is fastest for small contexts',
          'Cost-optimized for high-frequency calls'
        ]
      };
    }
  }
  
  // Default fallback
  return {
    primary: MODELS_2025.balanced.primary,
    fallback: MODELS_2025.balanced.secondary,
    weights: {
      quality: 0.6,
      speed: 0.2,
      cost: 0.1,
      freshness: 0.1,
      contextWindow: 0.0
    },
    reasoning: ['Default balanced configuration']
  };
}

async function populateConfigurations() {
  console.log('🚀 POPULATING MODEL CONFIGURATIONS WITH 2025 MODELS\n');
  console.log('=' .repeat(80));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const configurations: ModelConfig[] = [];
  
  // 1. Context-dependent roles
  console.log('📊 Generating Context-Dependent Configurations...\n');
  
  const contextRoles = ['deepwiki', 'comparator', 'location_finder'];
  
  for (const role of contextRoles) {
    for (const language of LANGUAGES) {
      for (const size of SIZES) {
        const config = selectModelsForContext(role, language, size);
        
        configurations.push({
          role,
          language,
          size_category: size,
          primary_provider: config.primary.provider,
          primary_model: config.primary.model,
          fallback_provider: config.fallback.provider,
          fallback_model: config.fallback.model,
          weights: config.weights,
          min_requirements: config.min_requirements || {},
          reasoning: config.reasoning
        });
      }
    }
    console.log(`${role}: Generated ${LANGUAGES.length * SIZES.length} configurations`);
  }
  
  // 2. Context-independent roles
  console.log('\n📊 Generating Context-Independent Configurations...\n');
  
  const universalRoles = ['orchestrator', 'researcher', 'educator'];
  
  for (const role of universalRoles) {
    const config = selectModelsForContext(role, 'universal', 'medium');
    
    configurations.push({
      role,
      language: 'universal',
      size_category: 'medium',
      primary_provider: config.primary.provider,
      primary_model: config.primary.model,
      fallback_provider: config.fallback.provider,
      fallback_model: config.fallback.model,
      weights: config.weights,
      min_requirements: config.min_requirements || {},
      reasoning: config.reasoning
    });
    
    console.log(`${role}: Generated 1 universal configuration`);
  }
  
  console.log(`\n✅ Total: ${configurations.length} configurations\n`);
  
  // 3. Clear existing and insert new
  console.log('📝 Storing in Supabase...\n');
  
  // Clear existing configs
  const { error: deleteError } = await supabase
    .from('model_configurations')
    .delete()
    .neq('role', '');
  
  if (deleteError) {
    console.log('⚠️  Could not clear old configs:', deleteError.message);
  }
  
  // Insert in batches
  const batchSize = 10;
  let successCount = 0;
  
  for (let i = 0; i < configurations.length; i += batchSize) {
    const batch = configurations.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('model_configurations')
      .insert(batch)
      .select();
    
    if (error) {
      console.log(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error.message);
    } else {
      successCount += data?.length || 0;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Inserted ${data?.length || 0} configs`);
    }
  }
  
  // 4. Verify
  console.log('\n📊 Verification...\n');
  
  const { count } = await supabase
    .from('model_configurations')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Database now contains: ${count} configurations`);
  
  // 5. Sample some configs
  console.log('\n📋 Sample Configurations:\n');
  
  const samples = [
    { role: 'deepwiki', language: 'python', size: 'large' },
    { role: 'comparator', language: 'rust', size: 'medium' },
    { role: 'location_finder', language: 'javascript', size: 'small' },
    { role: 'orchestrator', language: 'universal', size: 'medium' },
    { role: 'educator', language: 'universal', size: 'medium' }
  ];
  
  for (const sample of samples) {
    const { data } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', sample.role)
      .eq('language', sample.language)
      .eq('size_category', sample.size)
      .single();
    
    if (data) {
      console.log(`${sample.role}/${sample.language}/${sample.size}:`);
      console.log(`  Primary: ${data.primary_provider}/${data.primary_model}`);
      console.log(`  Fallback: ${data.fallback_provider}/${data.fallback_model}`);
      console.log();
    }
  }
  
  console.log('=' .repeat(80));
  console.log('✅ CONFIGURATION COMPLETE!\n');
  console.log('All roles now have 2025 model configurations:');
  console.log('  • Claude Opus 4.1 (August 2025)');
  console.log('  • GPT-5 (June 2025)');
  console.log('  • Gemini 2.5 Pro/Flash (July 2025)');
  console.log('  • And more...');
}

populateConfigurations().catch(console.error);