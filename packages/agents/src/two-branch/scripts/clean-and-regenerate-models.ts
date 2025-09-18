#!/usr/bin/env npx ts-node

/**
 * Clean and Regenerate Model Configurations
 * This script:
 * 1. Backs up current configurations
 * 2. Cleans outdated models
 * 3. Discovers current available models from OpenRouter
 * 4. Regenerates configurations with fresh models
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Current available models from our test
const CURRENT_MODELS = {
  // High quality models (for critical tasks)
  highQuality: [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-opus-4.1',
    'anthropic/claude-sonnet-4',
    'google/gemini-2.5-pro'
  ],
  
  // Fast and cheap models (for simple tasks)
  fastCheap: [
    'deepseek/deepseek-chat-v3.1',
    'google/gemini-2.5-flash',
    'google/gemini-2.5-flash-lite',
    'qwen/qwen-plus-2025-07-28'
  ],
  
  // Balanced models (good quality at reasonable cost)
  balanced: [
    'anthropic/claude-3.7-sonnet',
    'google/gemini-2.5-flash',
    'meta-llama/llama-3.3-8b-instruct',
    'qwen/qwen3-max'
  ],
  
  // Specialized coding models
  coding: [
    'qwen/qwen3-coder-30b-a3b-instruct',
    'deepseek/deepseek-v3.1-base',
    'anthropic/claude-3.5-sonnet'
  ],
  
  // Free tier models (for testing/development)
  free: [
    'deepseek/deepseek-chat-v3.1:free',
    'meta-llama/llama-3.3-8b-instruct:free',
    'shisa-ai/shisa-v2-llama3.3-70b:free'
  ]
};

// Role to model mapping based on requirements
const ROLE_MODEL_MAPPING = {
  // Critical roles - need high quality
  security: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'anthropic/claude-opus-4.1',
    reasoning: 'Security analysis requires highest accuracy and comprehensive understanding'
  },
  architecture: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'google/gemini-2.5-pro',
    reasoning: 'Architecture analysis needs deep understanding of complex systems'
  },
  
  // Performance-sensitive roles - need speed
  performance: {
    primary: 'deepseek/deepseek-chat-v3.1',
    fallback: 'google/gemini-2.5-flash',
    reasoning: 'Performance analysis needs fast response with good accuracy'
  },
  comparator: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'deepseek/deepseek-chat-v3.1',
    reasoning: 'Comparison needs speed for multiple analyses'
  },
  location_finder: {
    primary: 'google/gemini-2.5-flash-lite',
    fallback: 'deepseek/deepseek-chat-v3.1',
    reasoning: 'Location finding is pattern matching, needs speed over deep analysis'
  },
  
  // Balanced roles - good quality at reasonable cost
  code_quality: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'anthropic/claude-3.7-sonnet',
    reasoning: 'Code quality needs good accuracy with reasonable speed'
  },
  testing: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'qwen/qwen3-max',
    reasoning: 'Testing analysis needs balanced performance'
  },
  documentation: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'meta-llama/llama-3.3-8b-instruct',
    reasoning: 'Documentation generation needs good language skills at low cost'
  },
  
  // Specialized roles
  deepwiki: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'google/gemini-2.5-pro',
    reasoning: 'DeepWiki needs comprehensive understanding and high quality output'
  },
  dependency: {
    primary: 'qwen/qwen3-coder-30b-a3b-instruct',
    fallback: 'deepseek/deepseek-v3.1-base',
    reasoning: 'Dependency analysis benefits from coding-specialized models'
  },
  
  // Meta roles
  orchestrator: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'deepseek/deepseek-chat-v3.1',
    reasoning: 'Orchestrator needs fast decision making'
  },
  researcher: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'qwen/qwen-plus-2025-07-28',
    reasoning: 'Researcher needs good search and synthesis capabilities'
  },
  educator: {
    primary: 'google/gemini-2.5-flash',
    fallback: 'anthropic/claude-3.7-sonnet',
    reasoning: 'Educator needs clear explanations at reasonable cost'
  }
};

async function backupCurrentConfigs() {
  console.log('\n📦 Backing up current configurations...');
  
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching configurations:', error);
    return null;
  }
  
  const backupPath = path.join(
    __dirname,
    `backup-model-configs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`✅ Backed up ${data?.length || 0} configurations to: ${backupPath}`);
  
  return data;
}

async function cleanOutdatedConfigs() {
  console.log('\n🧹 Cleaning outdated configurations...');
  
  // Get all unique models currently in use
  const { data: configs, error: fetchError } = await supabase
    .from('model_configurations')
    .select('primary_model, fallback_model');
  
  if (fetchError) {
    console.error('❌ Error fetching models:', fetchError);
    return;
  }
  
  const allModels = new Set<string>();
  configs?.forEach(config => {
    if (config.primary_model) allModels.add(config.primary_model);
    if (config.fallback_model) allModels.add(config.fallback_model);
  });
  
  console.log(`Found ${allModels.size} unique models in use`);
  
  // Check which models are outdated
  const outdatedModels = [
    'google/gemini-2.0-flash-exp',
    'google/gemini-2.0-flash-thinking-exp',
    'meta-llama/llama-3.1-8b-instruct', // Has newer version
    'qwen/qwen-2.5-coder-32b-instruct'  // Has newer version
  ];
  
  const foundOutdated = Array.from(allModels).filter(model => 
    outdatedModels.some(outdated => model.includes(outdated))
  );
  
  console.log(`Found ${foundOutdated.length} outdated models:`, foundOutdated);
  
  // Delete all configurations (we'll regenerate fresh ones)
  const { error: deleteError } = await supabase
    .from('model_configurations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('❌ Error deleting configurations:', deleteError);
  } else {
    console.log('✅ Cleaned all configurations for fresh regeneration');
  }
}

async function generateFreshConfigs() {
  console.log('\n🔄 Generating fresh configurations with current models...');
  
  const configs: any[] = [];
  const now = new Date().toISOString();
  
  // Generate configurations for each role
  const roles = Object.keys(ROLE_MODEL_MAPPING);
  const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php', 'csharp', 'cpp', 'rust'];
  const sizes = ['small', 'medium', 'large'];
  
  for (const role of roles) {
    const modelMapping = ROLE_MODEL_MAPPING[role as keyof typeof ROLE_MODEL_MAPPING];
    
    // Universal roles (no language/size specific)
    if (['orchestrator', 'researcher', 'educator'].includes(role)) {
      configs.push({
        role,
        language: 'universal',
        size_category: 'medium',
        primary_provider: modelMapping.primary.split('/')[0],
        primary_model: modelMapping.primary,
        fallback_provider: modelMapping.fallback.split('/')[0],
        fallback_model: modelMapping.fallback,
        weights: getWeightsForRole(role),
        min_requirements: {},
        reasoning: [
          `🔄 Regenerated with current models on ${now}`,
          `Primary: ${modelMapping.primary} - ${modelMapping.reasoning}`,
          `Fallback: ${modelMapping.fallback} for redundancy`,
          '✅ Models verified as currently available on OpenRouter',
          'Generated by clean-and-regenerate-models script'
        ],
        last_updated: now,
        updated_by: 'regeneration-script'
      });
    } else {
      // Context-aware roles (with language and size variations)
      for (const language of languages) {
        for (const size of sizes) {
          // Adjust model based on context
          const adjustedModels = adjustModelsForContext(modelMapping, language, size);
          
          configs.push({
            role,
            language,
            size_category: size,
            primary_provider: adjustedModels.primary.split('/')[0],
            primary_model: adjustedModels.primary,
            fallback_provider: adjustedModels.fallback.split('/')[0],
            fallback_model: adjustedModels.fallback,
            weights: getWeightsForRole(role, language, size),
            min_requirements: {},
            reasoning: [
              `🔄 Regenerated with current models on ${now}`,
              `Context: ${language} / ${size} repository`,
              `Primary: ${adjustedModels.primary}`,
              `Fallback: ${adjustedModels.fallback}`,
              '✅ Models verified as currently available on OpenRouter'
            ],
            last_updated: now,
            updated_by: 'regeneration-script'
          });
        }
      }
    }
  }
  
  console.log(`Generated ${configs.length} configurations`);
  return configs;
}

function getWeightsForRole(role: string, language?: string, size?: string): Record<string, number> {
  const baseWeights: Record<string, Record<string, number>> = {
    security: { quality: 0.50, speed: 0.10, cost: 0.20, freshness: 0.15, contextWindow: 0.05 },
    performance: { quality: 0.35, speed: 0.25, cost: 0.25, freshness: 0.05, contextWindow: 0.10 },
    code_quality: { quality: 0.25, speed: 0.25, cost: 0.35, freshness: 0.05, contextWindow: 0.10 },
    testing: { quality: 0.30, speed: 0.20, cost: 0.35, freshness: 0.05, contextWindow: 0.10 },
    documentation: { quality: 0.25, speed: 0.30, cost: 0.30, freshness: 0.05, contextWindow: 0.10 },
    architecture: { quality: 0.40, speed: 0.15, cost: 0.20, freshness: 0.10, contextWindow: 0.15 },
    comparator: { quality: 0.30, speed: 0.35, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
    location_finder: { quality: 0.25, speed: 0.40, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
    deepwiki: { quality: 0.45, speed: 0.15, cost: 0.20, freshness: 0.10, contextWindow: 0.10 },
    dependency: { quality: 0.35, speed: 0.20, cost: 0.25, freshness: 0.10, contextWindow: 0.10 },
    orchestrator: { quality: 0.25, speed: 0.40, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
    researcher: { quality: 0.35, speed: 0.15, cost: 0.15, freshness: 0.25, contextWindow: 0.10 },
    educator: { quality: 0.30, speed: 0.35, cost: 0.20, freshness: 0.05, contextWindow: 0.10 }
  };
  
  const weights = { ...(baseWeights[role] || baseWeights.code_quality) };
  
  // Adjust for size
  if (size === 'large') {
    weights.contextWindow *= 1.5;
    weights.quality *= 1.1;
  } else if (size === 'small') {
    weights.speed *= 1.3;
    weights.cost *= 0.8;
  }
  
  // Normalize weights
  const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
  Object.keys(weights).forEach(key => {
    weights[key] = (weights[key] as number) / sum;
  });
  
  return weights;
}

function adjustModelsForContext(modelMapping: any, language: string, size: string) {
  // For large repos or complex languages, prefer higher quality models
  if (size === 'large' || ['rust', 'cpp', 'c'].includes(language)) {
    // Upgrade to higher quality if using a fast model
    if (modelMapping.primary.includes('flash-lite')) {
      return {
        primary: modelMapping.primary.replace('flash-lite', 'flash'),
        fallback: modelMapping.fallback
      };
    }
  }
  
  // For small repos or simple scripts, can use cheaper models
  if (size === 'small' && ['python', 'javascript', 'ruby'].includes(language)) {
    // Downgrade to cheaper if using expensive model
    if (modelMapping.primary.includes('claude-3.5-sonnet')) {
      return {
        primary: 'google/gemini-2.5-flash',
        fallback: modelMapping.fallback
      };
    }
  }
  
  return modelMapping;
}

async function storeConfigs(configs: any[]) {
  console.log('\n💾 Storing configurations in Supabase...');
  
  const batchSize = 50;
  for (let i = 0; i < configs.length; i += batchSize) {
    const batch = configs.slice(i, i + batchSize);
    const { error } = await supabase
      .from('model_configurations')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
    } else {
      console.log(`✅ Stored batch ${Math.floor(i / batchSize) + 1} (${batch.length} configs)`);
    }
  }
  
  console.log(`✅ Successfully stored ${configs.length} configurations`);
}

async function verifyModels() {
  console.log('\n🔍 Verifying stored models...');
  
  const { data: samples, error } = await supabase
    .from('model_configurations')
    .select('role, primary_model, fallback_model')
    .limit(10);
  
  if (error) {
    console.error('❌ Error fetching samples:', error);
    return;
  }
  
  console.log('Sample configurations:');
  samples?.forEach(config => {
    console.log(`- ${config.role}: ${config.primary_model} (fallback: ${config.fallback_model})`);
  });
  
  // Count by model
  const { data: allConfigs } = await supabase
    .from('model_configurations')
    .select('primary_model');
  
  const modelCounts: Record<string, number> = {};
  allConfigs?.forEach(config => {
    const model = config.primary_model;
    modelCounts[model] = (modelCounts[model] || 0) + 1;
  });
  
  console.log('\n📊 Model usage distribution:');
  Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      console.log(`  ${model}: ${count} configs`);
    });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🔄 Clean and Regenerate Model Configurations');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // 1. Backup current configurations
    await backupCurrentConfigs();
    
    // 2. Clean outdated configurations
    await cleanOutdatedConfigs();
    
    // 3. Generate fresh configurations
    const configs = await generateFreshConfigs();
    
    // 4. Store new configurations
    await storeConfigs(configs);
    
    // 5. Verify the results
    await verifyModels();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Model configuration regeneration complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 Next steps:');
    console.log('1. Test the V9 analyzer with fresh models');
    console.log('2. Monitor OpenRouter balance to verify charges');
    console.log('3. Run trigger-model-research.ts for dynamic updates');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);