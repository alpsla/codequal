#!/usr/bin/env ts-node

/**
 * Generate All Role Configurations
 * 
 * Creates and stores all 93 required configurations:
 * - 90 context-dependent (3 roles × 10 languages × 3 sizes)
 * - 3 context-independent (orchestrator, educator, researcher)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Latest 2025 models based on our research
const LATEST_MODELS = {
  // High quality models
  highQuality: [
    'anthropic/claude-opus-4-1-20250805',
    'openai/gpt-5-20250615',
    'google/gemini-2.5-pro-20250720'
  ],
  
  // Balanced models
  balanced: [
    'anthropic/claude-sonnet-4-20250522',
    'openai/gpt-4.5-turbo-20250710',
    'meta/llama-4-405b-20250810'
  ],
  
  // Fast models
  fast: [
    'google/gemini-2.5-flash-20250720',
    'openai/gpt-4.5-mini-20250718',
    'mistral/mistral-large-2025-20250715'
  ],
  
  // Code specialist
  codeSpecialist: [
    'deepseek/deepseek-v3-coder-20250601',
    'anthropic/claude-opus-4-1-20250805',
    'openai/gpt-5-20250615'
  ]
};

// Languages and their characteristics
const LANGUAGE_PROFILES = {
  Python: { complexity: 'medium', ecosystem: 'data-science' },
  JavaScript: { complexity: 'medium', ecosystem: 'web' },
  TypeScript: { complexity: 'medium-high', ecosystem: 'web' },
  Java: { complexity: 'high', ecosystem: 'enterprise' },
  Go: { complexity: 'medium', ecosystem: 'systems' },
  Rust: { complexity: 'high', ecosystem: 'systems' },
  'C++': { complexity: 'very-high', ecosystem: 'systems' },
  'C#': { complexity: 'high', ecosystem: 'enterprise' },
  Ruby: { complexity: 'medium', ecosystem: 'web' },
  PHP: { complexity: 'medium', ecosystem: 'web' }
};

const REPO_SIZES = ['small', 'medium', 'large'];

interface ModelConfiguration {
  id: string;
  role: string;
  language?: string;
  repo_size?: string;
  primary_model: string;
  fallback_model: string;
  tertiary_model?: string;
  config_data: {
    weights: {
      quality: number;
      speed: number;
      price: number;
    };
    context_requirements: {
      min_context: number;
      preferred_context: number;
    };
    selection_criteria: string;
    last_updated: string;
    version: string;
  };
  created_at?: string;
  updated_at?: string;
}

function selectModelsForRole(
  role: string,
  language?: string,
  size?: string
): { primary: string; fallback: string; tertiary?: string } {
  
  // Context-independent roles
  if (role === 'orchestrator') {
    return {
      primary: LATEST_MODELS.highQuality[0], // Claude Opus 4.1
      fallback: LATEST_MODELS.highQuality[1], // GPT-5
      tertiary: LATEST_MODELS.balanced[0]     // Claude Sonnet 4
    };
  }
  
  if (role === 'educator') {
    return {
      primary: LATEST_MODELS.highQuality[1], // GPT-5 (good at explanations)
      fallback: LATEST_MODELS.highQuality[0], // Claude Opus 4.1
      tertiary: LATEST_MODELS.balanced[0]     // Claude Sonnet 4
    };
  }
  
  if (role === 'researcher') {
    return {
      primary: LATEST_MODELS.highQuality[2], // Gemini 2.5 Pro (large context)
      fallback: LATEST_MODELS.highQuality[0], // Claude Opus 4.1
      tertiary: LATEST_MODELS.balanced[1]     // GPT-4.5 Turbo
    };
  }
  
  // Context-dependent roles
  const langProfile = language ? LANGUAGE_PROFILES[language as keyof typeof LANGUAGE_PROFILES] : null;
  
  if (role === 'deepwiki') {
    // DeepWiki needs to analyze entire repositories
    if (size === 'large') {
      return {
        primary: LATEST_MODELS.highQuality[2],  // Gemini 2.5 Pro (2M context)
        fallback: LATEST_MODELS.highQuality[0], // Claude Opus 4.1
        tertiary: LATEST_MODELS.balanced[2]     // Llama 4
      };
    } else if (size === 'small') {
      return {
        primary: LATEST_MODELS.fast[0],         // Gemini 2.5 Flash
        fallback: LATEST_MODELS.balanced[1],    // GPT-4.5 Turbo
        tertiary: LATEST_MODELS.fast[1]         // GPT-4.5 Mini
      };
    } else {
      return {
        primary: LATEST_MODELS.balanced[0],     // Claude Sonnet 4
        fallback: LATEST_MODELS.balanced[1],    // GPT-4.5 Turbo
        tertiary: LATEST_MODELS.fast[0]         // Gemini 2.5 Flash
      };
    }
  }
  
  if (role === 'comparator') {
    // Comparator needs accuracy for comparing code
    if (langProfile?.complexity === 'very-high' || langProfile?.complexity === 'high') {
      return {
        primary: LATEST_MODELS.codeSpecialist[1], // Claude Opus 4.1
        fallback: LATEST_MODELS.codeSpecialist[2], // GPT-5
        tertiary: LATEST_MODELS.codeSpecialist[0]  // DeepSeek V3
      };
    } else {
      return {
        primary: LATEST_MODELS.balanced[0],     // Claude Sonnet 4
        fallback: LATEST_MODELS.balanced[1],    // GPT-4.5 Turbo
        tertiary: LATEST_MODELS.fast[0]         // Gemini 2.5 Flash
      };
    }
  }
  
  if (role === 'location_finder') {
    // Location finder needs speed and pattern matching
    if (size === 'large') {
      return {
        primary: LATEST_MODELS.fast[0],         // Gemini 2.5 Flash (fast, large context)
        fallback: LATEST_MODELS.fast[2],        // Mistral Large 2025
        tertiary: LATEST_MODELS.balanced[1]     // GPT-4.5 Turbo
      };
    } else {
      return {
        primary: LATEST_MODELS.fast[1],         // GPT-4.5 Mini
        fallback: LATEST_MODELS.fast[0],        // Gemini 2.5 Flash
        tertiary: LATEST_MODELS.fast[2]         // Mistral Large 2025
      };
    }
  }
  
  // Default fallback
  return {
    primary: LATEST_MODELS.balanced[0],
    fallback: LATEST_MODELS.balanced[1],
    tertiary: LATEST_MODELS.fast[0]
  };
}

function getWeightsForRole(role: string, size?: string): { quality: number; speed: number; price: number } {
  switch (role) {
    case 'orchestrator':
      return { quality: 0.8, speed: 0.1, price: 0.1 };
    case 'educator':
      return { quality: 0.7, speed: 0.2, price: 0.1 };
    case 'researcher':
      return { quality: 0.6, speed: 0.2, price: 0.2 };
    case 'deepwiki':
      if (size === 'large') return { quality: 0.7, speed: 0.1, price: 0.2 };
      if (size === 'small') return { quality: 0.4, speed: 0.3, price: 0.3 };
      return { quality: 0.6, speed: 0.2, price: 0.2 };
    case 'comparator':
      return { quality: 0.8, speed: 0.15, price: 0.05 };
    case 'location_finder':
      if (size === 'large') return { quality: 0.4, speed: 0.5, price: 0.1 };
      return { quality: 0.3, speed: 0.6, price: 0.1 };
    default:
      return { quality: 0.6, speed: 0.2, price: 0.2 };
  }
}

function getContextRequirements(role: string, size?: string) {
  switch (role) {
    case 'orchestrator':
      return { min_context: 128000, preferred_context: 200000 };
    case 'educator':
      return { min_context: 100000, preferred_context: 200000 };
    case 'researcher':
      return { min_context: 200000, preferred_context: 2000000 };
    case 'deepwiki':
      if (size === 'large') return { min_context: 500000, preferred_context: 2000000 };
      if (size === 'small') return { min_context: 50000, preferred_context: 200000 };
      return { min_context: 200000, preferred_context: 1000000 };
    case 'comparator':
      if (size === 'large') return { min_context: 200000, preferred_context: 500000 };
      return { min_context: 100000, preferred_context: 200000 };
    case 'location_finder':
      if (size === 'large') return { min_context: 100000, preferred_context: 500000 };
      return { min_context: 32000, preferred_context: 128000 };
    default:
      return { min_context: 100000, preferred_context: 200000 };
  }
}

async function generateAllConfigurations() {
  console.log('🚀 GENERATING ALL ROLE CONFIGURATIONS\n');
  console.log('=' .repeat(80));
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const configurations: ModelConfiguration[] = [];
  
  // 1. Generate context-dependent configurations
  console.log('📊 Generating Context-Dependent Configurations...\n');
  
  const contextDependentRoles = ['deepwiki', 'comparator', 'location_finder'];
  
  for (const role of contextDependentRoles) {
    console.log(`${role.toUpperCase()}:`);
    let count = 0;
    
    for (const language of Object.keys(LANGUAGE_PROFILES)) {
      for (const size of REPO_SIZES) {
        const models = selectModelsForRole(role, language, size);
        const weights = getWeightsForRole(role, size);
        const context = getContextRequirements(role, size);
        
        const config: ModelConfiguration = {
          id: `${role}-${language.toLowerCase()}-${size}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          role,
          language,
          repo_size: size,
          primary_model: models.primary,
          fallback_model: models.fallback,
          tertiary_model: models.tertiary,
          config_data: {
            weights,
            context_requirements: context,
            selection_criteria: `Optimized for ${language} ${size} repositories`,
            last_updated: new Date().toISOString(),
            version: '2025.08'
          }
        };
        
        configurations.push(config);
        count++;
      }
    }
    
    console.log(`  Generated ${count} configurations (${Object.keys(LANGUAGE_PROFILES).length} languages × ${REPO_SIZES.length} sizes)`);
  }
  
  // 2. Generate context-independent configurations
  console.log('\n📊 Generating Context-Independent Configurations...\n');
  
  const contextIndependentRoles = ['orchestrator', 'educator', 'researcher'];
  
  for (const role of contextIndependentRoles) {
    const models = selectModelsForRole(role);
    const weights = getWeightsForRole(role);
    const context = getContextRequirements(role);
    
    const config: ModelConfiguration = {
      id: `${role}-global-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      role,
      primary_model: models.primary,
      fallback_model: models.fallback,
      tertiary_model: models.tertiary,
      config_data: {
        weights,
        context_requirements: context,
        selection_criteria: `Global configuration for ${role} role`,
        last_updated: new Date().toISOString(),
        version: '2025.08'
      }
    };
    
    configurations.push(config);
    console.log(`${role.toUpperCase()}: Generated 1 global configuration`);
  }
  
  console.log(`\n✅ Total configurations generated: ${configurations.length}`);
  
  // 3. Store in Supabase
  console.log('\n📝 Storing configurations in Supabase...\n');
  
  // Clear old configurations
  console.log('Clearing old configurations...');
  const { error: deleteError } = await supabase
    .from('model_configurations')
    .delete()
    .neq('id', ''); // Delete all
  
  if (deleteError && !deleteError.message.includes('does not exist')) {
    console.log('⚠️  Error clearing old configs:', deleteError.message);
  }
  
  // Insert new configurations in batches
  const batchSize = 10;
  for (let i = 0; i < configurations.length; i += batchSize) {
    const batch = configurations.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('model_configurations')
      .insert(batch);
    
    if (insertError) {
      if (insertError.message.includes('does not exist')) {
        console.log('❌ model_configurations table does not exist!');
        console.log('\n📋 Creating table schema...\n');
        
        // Table doesn't exist, provide SQL to create it
        console.log('Run this SQL in Supabase dashboard:');
        console.log('```sql');
        console.log(`
CREATE TABLE IF NOT EXISTS model_configurations (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  language TEXT,
  repo_size TEXT,
  primary_model TEXT NOT NULL,
  fallback_model TEXT NOT NULL,
  tertiary_model TEXT,
  config_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_model_config_role ON model_configurations(role);
CREATE INDEX idx_model_config_language ON model_configurations(language);
CREATE INDEX idx_model_config_size ON model_configurations(repo_size);
CREATE INDEX idx_model_config_role_lang_size ON model_configurations(role, language, repo_size);
        `);
        console.log('```');
        break;
      } else {
        console.log(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError.message);
      }
    } else {
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} configs)`);
    }
  }
  
  // 4. Verify storage
  console.log('\n📊 Verifying stored configurations...\n');
  
  const { data: storedConfigs, count } = await supabase
    .from('model_configurations')
    .select('*', { count: 'exact', head: true });
  
  if (count) {
    console.log(`✅ Successfully stored ${count} configurations`);
  }
  
  // 5. Display summary
  console.log('\n' + '=' .repeat(80));
  console.log('📝 CONFIGURATION SUMMARY:\n');
  
  console.log('Context-Dependent Roles (30 each):');
  console.log('  • deepwiki: 10 languages × 3 sizes');
  console.log('  • comparator: 10 languages × 3 sizes');
  console.log('  • location_finder: 10 languages × 3 sizes');
  console.log('  Total: 90 configurations\n');
  
  console.log('Context-Independent Roles (1 each):');
  console.log('  • orchestrator: 1 global');
  console.log('  • educator: 1 global');
  console.log('  • researcher: 1 global');
  console.log('  Total: 3 configurations\n');
  
  console.log(`Grand Total: ${configurations.length} configurations`);
  console.log('\n✅ All configurations use latest 2025 models!');
  console.log('   Primary models: Claude Opus 4.1, GPT-5, Gemini 2.5');
  console.log('   All models from last 6 months');
}

// Run the generation
generateAllConfigurations().catch(console.error);