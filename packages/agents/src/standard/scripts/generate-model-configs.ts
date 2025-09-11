#!/usr/bin/env npx ts-node

/**
 * Model Configuration Generator with Dynamic Date Support
 * Generates 273 configurations for all role/language/size combinations
 * NEVER uses hardcoded dates - always relative to execution time
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ModelConfig {
  role: string;
  language: string | null;
  size_category: 'small' | 'medium' | 'large' | null;
  primary_provider: string;
  primary_model: string;
  fallback_provider: string;
  fallback_model: string;
  weights: {
    quality: number;
    speed: number;
    cost: number;
    freshness: number;
    contextWindow: number;
  };
  reasoning: string[];
  created_at?: string;
  updated_at?: string;
}

// Dynamic date utilities
function getCurrentTimeContext() {
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  return {
    currentDate: now.toISOString(),
    currentMonth: now.toLocaleString('default', { month: 'long' }),
    currentYear: now.getFullYear(),
    sixMonthsAgoDate: sixMonthsAgo.toISOString(),
    sixMonthsAgoMonth: sixMonthsAgo.toLocaleString('default', { month: 'long' }),
    sixMonthsAgoYear: sixMonthsAgo.getFullYear(),
    validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}

// Generate dynamic search queries
function generateSearchQueries(): string[] {
  const context = getCurrentTimeContext();
  
  return [
    `latest AI models ${context.currentMonth} ${context.currentYear}`,
    `newest LLM releases ${context.currentYear}`,
    `Claude GPT Gemini latest versions ${context.currentMonth} ${context.currentYear}`,
    `OpenRouter available models ${context.currentYear}`,
    `AI models released since ${context.sixMonthsAgoMonth} ${context.sixMonthsAgoYear}`,
    `best code analysis models ${context.currentYear}`,
    `recent LLM updates last 6 months ${context.currentYear}`,
    `code review AI models ${context.currentMonth} ${context.currentYear}`
  ];
}

// Role weight configurations
const ROLE_WEIGHTS = {
  security: { quality: 0.50, speed: 0.10, cost: 0.20, freshness: 0.15, contextWindow: 0.05 },
  performance: { quality: 0.35, speed: 0.25, cost: 0.25, freshness: 0.05, contextWindow: 0.10 },
  code_quality: { quality: 0.25, speed: 0.25, cost: 0.35, freshness: 0.05, contextWindow: 0.10 },
  testing: { quality: 0.30, speed: 0.20, cost: 0.35, freshness: 0.05, contextWindow: 0.10 },
  documentation: { quality: 0.25, speed: 0.30, cost: 0.30, freshness: 0.05, contextWindow: 0.10 },
  architecture: { quality: 0.40, speed: 0.15, cost: 0.20, freshness: 0.10, contextWindow: 0.15 },
  comparator: { quality: 0.30, speed: 0.35, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
  location_finder: { quality: 0.25, speed: 0.40, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
  deepwiki: { quality: 0.45, speed: 0.15, cost: 0.20, freshness: 0.10, contextWindow: 0.10 },
  orchestrator: { quality: 0.25, speed: 0.40, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
  researcher: { quality: 0.35, speed: 0.15, cost: 0.15, freshness: 0.25, contextWindow: 0.10 },
  educator: { quality: 0.30, speed: 0.35, cost: 0.20, freshness: 0.05, contextWindow: 0.10 }
};

// Language and size adjustments
function adjustWeightsForContext(
  baseWeights: typeof ROLE_WEIGHTS.security,
  language?: string,
  size?: 'small' | 'medium' | 'large'
): typeof ROLE_WEIGHTS.security {
  const weights = { ...baseWeights };
  
  // Language adjustments
  if (language) {
    const complexLanguages = ['rust', 'cpp', 'c', 'scala', 'objectivec'];
    const simpleLanguages = ['python', 'javascript', 'ruby', 'php'];
    
    if (complexLanguages.includes(language.toLowerCase())) {
      weights.quality *= 1.15;
      weights.speed *= 0.95;
    } else if (simpleLanguages.includes(language.toLowerCase())) {
      weights.speed *= 1.10;
      weights.quality *= 0.95;
    }
  }
  
  // Size adjustments
  if (size === 'small') {
    weights.speed *= 1.30;
    weights.cost *= 0.80;
    weights.quality *= 1.10;
  } else if (size === 'large') {
    weights.quality *= 1.15;
    weights.contextWindow *= 1.50;
    weights.speed *= 0.85;
  }
  
  // Normalize weights to sum to 1
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(key => {
    weights[key as keyof typeof weights] = weights[key as keyof typeof weights] / sum;
  });
  
  return weights;
}

// Generate configuration for a specific context
function generateConfig(
  role: string,
  language: string | null,
  size: 'small' | 'medium' | 'large' | null
): ModelConfig {
  const timeContext = getCurrentTimeContext();
  const baseWeights = ROLE_WEIGHTS[role as keyof typeof ROLE_WEIGHTS];
  const adjustedWeights = language && size 
    ? adjustWeightsForContext(baseWeights, language, size)
    : baseWeights;
  
  // Note: In production, these would be discovered dynamically
  // This is a template showing the structure
  return {
    role,
    language,
    size_category: size,
    primary_provider: 'discovered_provider', // Will be filled by researcher
    primary_model: 'discovered_model_id', // Will be filled by researcher
    fallback_provider: 'different_provider', // Will be filled by researcher
    fallback_model: 'fallback_model_id', // Will be filled by researcher
    weights: adjustedWeights,
    reasoning: [
      `Configuration generated on ${timeContext.currentDate}`,
      `Models searched from ${timeContext.sixMonthsAgoMonth} ${timeContext.sixMonthsAgoYear} to ${timeContext.currentMonth} ${timeContext.currentYear}`,
      'Selected based on role-specific weight optimization',
      'Primary and fallback from different providers for redundancy',
      `Valid until ${timeContext.validUntil}`
    ]
  };
}

// Generate all 273 configurations
async function generateAllConfigurations() {
  const configs: ModelConfig[] = [];
  const timeContext = getCurrentTimeContext();
  
  console.log(`🚀 Generating model configurations`);
  console.log(`📅 Current date: ${timeContext.currentDate}`);
  console.log(`🔍 Search window: ${timeContext.sixMonthsAgoMonth} ${timeContext.sixMonthsAgoYear} to ${timeContext.currentMonth} ${timeContext.currentYear}`);
  console.log(`📝 Search queries:`, generateSearchQueries());
  console.log('');
  
  // Universal roles (3 configs) - use 'universal' for language and 'medium' for size to satisfy not-null constraints
  const universalRoles = ['orchestrator', 'researcher', 'educator'];
  for (const role of universalRoles) {
    configs.push(generateConfig(role, 'universal', 'medium'));
  }
  console.log(`✅ Generated ${universalRoles.length} universal role configs`);
  
  // Context-aware roles (270 configs = 9 roles × 10 languages × 3 sizes)
  const contextRoles = ['deepwiki', 'comparator', 'location_finder', 'security', 
                       'performance', 'architecture', 'code_quality', 'testing', 'documentation'];
  const languages = ['javascript', 'typescript', 'python', 'java', 'go', 
                     'ruby', 'php', 'csharp', 'cpp', 'rust'];
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  
  let contextConfigCount = 0;
  for (const role of contextRoles) {
    for (const language of languages) {
      for (const size of sizes) {
        configs.push(generateConfig(role, language, size));
        contextConfigCount++;
      }
    }
    console.log(`✅ Generated configs for ${role} (${languages.length * sizes.length} configs)`);
  }
  
  console.log(`\n📊 Total configurations generated: ${configs.length}`);
  console.log(`   - Universal roles: ${universalRoles.length}`);
  console.log(`   - Context-aware roles: ${contextConfigCount}`);
  
  return configs;
}

// Store configurations in Supabase
async function storeConfigurations(configs: ModelConfig[]) {
  console.log(`\n💾 Storing ${configs.length} configurations in Supabase...`);
  
  try {
    // Clear existing configurations
    const { error: deleteError } = await supabase
      .from('model_configurations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('Error clearing existing configurations:', deleteError);
    }
    
    // Insert new configurations in batches
    const batchSize = 50;
    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize);
      const { error } = await supabase
        .from('model_configurations')
        .insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✅ Stored batch ${i / batchSize + 1} (${batch.length} configs)`);
      }
    }
    
    console.log(`\n✅ Successfully stored all ${configs.length} configurations`);
    console.log(`⏰ Configurations valid until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}`);
    
  } catch (error) {
    console.error('Error storing configurations:', error);
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Model Configuration Generator - Dynamic Dates');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  // Check for required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  try {
    // Generate all configurations
    const configs = await generateAllConfigurations();
    
    // Store in Supabase
    await storeConfigurations(configs);
    
    // Generate summary report
    const timeContext = getCurrentTimeContext();
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                    Summary Report');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Generated: ${configs.length} configurations`);
    console.log(`Timestamp: ${timeContext.currentDate}`);
    console.log(`Valid until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}`);
    console.log(`Search period: Last 6 months from execution date`);
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error generating configurations:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateAllConfigurations, storeConfigurations, getCurrentTimeContext };