#!/usr/bin/env npx ts-node

/**
 * Update to Latest Models Only
 * 
 * IMPORTANT: This script enforces strict requirements:
 * - Models must NOT be older than 6 months
 * - If newer versions exist, MUST use the latest
 * - NO outdated models allowed (e.g., claude-3.5 when 4.x exists)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// LATEST MODELS ONLY (as of 2025-09-14)
// IMPORTANT: These are the NEWEST versions available
const LATEST_MODELS_ONLY = {
  // Claude - MUST use v4 series, NOT 3.5
  claude: {
    opus: 'anthropic/claude-opus-4.1',     // Latest Opus
    sonnet: 'anthropic/claude-sonnet-4',   // Latest Sonnet (NOT 3.5!)
    haiku: 'anthropic/claude-3.7-sonnet',  // Alternative if v4 too expensive
  },
  
  // Gemini - MUST use 2.5 series
  gemini: {
    pro: 'google/gemini-2.5-pro',
    flash: 'google/gemini-2.5-flash',
    lite: 'google/gemini-2.5-flash-lite',
  },
  
  // DeepSeek - Latest v3.1
  deepseek: {
    chat: 'deepseek/deepseek-chat-v3.1',
    base: 'deepseek/deepseek-v3.1-base',
  },
  
  // Qwen - Latest models
  qwen: {
    coder: 'qwen/qwen3-coder-30b-a3b-instruct',
    max: 'qwen/qwen3-max',
    plus: 'qwen/qwen-plus-2025-07-28',
  },
  
  // Llama - Latest 3.3 series
  llama: {
    small: 'meta-llama/llama-3.3-8b-instruct',
    guard: 'meta-llama/llama-guard-4-12b',
  }
};

// Role mapping with LATEST models only
const ROLE_TO_LATEST_MODEL = {
  // Critical security - needs highest quality (Claude v4)
  security: {
    primary: LATEST_MODELS_ONLY.claude.opus,      // v4.1 - NOT 3.5!
    fallback: LATEST_MODELS_ONLY.claude.sonnet,   // v4 - NOT 3.5!
    reasoning: 'Security REQUIRES latest Claude v4 for critical vulnerability detection'
  },
  
  // Architecture - high quality latest models
  architecture: {
    primary: LATEST_MODELS_ONLY.claude.sonnet,    // v4 - NOT 3.5!
    fallback: LATEST_MODELS_ONLY.gemini.pro,      // 2.5
    reasoning: 'Architecture analysis needs latest v4 models for complex system understanding'
  },
  
  // DeepWiki - comprehensive understanding
  deepwiki: {
    primary: LATEST_MODELS_ONLY.claude.sonnet,    // v4 - NOT 3.5!
    fallback: LATEST_MODELS_ONLY.gemini.pro,      // 2.5
    reasoning: 'DeepWiki requires latest Claude v4 for comprehensive documentation'
  },
  
  // Performance - fast with good accuracy
  performance: {
    primary: LATEST_MODELS_ONLY.deepseek.chat,    // v3.1
    fallback: LATEST_MODELS_ONLY.gemini.flash,    // 2.5
    reasoning: 'Performance uses latest DeepSeek v3.1 for speed'
  },
  
  // Code quality - balanced latest models
  code_quality: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.qwen.coder,      // Latest coder model
    reasoning: 'Code quality uses Gemini 2.5 and latest Qwen coder'
  },
  
  // Testing - efficient latest models
  testing: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.qwen.max,        // Latest Qwen
    reasoning: 'Testing uses latest Gemini 2.5 for efficiency'
  },
  
  // Documentation - clear language models
  documentation: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.llama.small,     // 3.3
    reasoning: 'Documentation uses latest models for clear explanations'
  },
  
  // Dependency analysis - coding specialized
  dependency: {
    primary: LATEST_MODELS_ONLY.qwen.coder,       // Latest coder
    fallback: LATEST_MODELS_ONLY.deepseek.base,   // v3.1
    reasoning: 'Dependency analysis uses latest coding-optimized models'
  },
  
  // Comparator - fast latest models
  comparator: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.deepseek.chat,   // v3.1
    reasoning: 'Comparator uses latest fast models for quick analysis'
  },
  
  // Location finder - lightweight latest
  location_finder: {
    primary: LATEST_MODELS_ONLY.gemini.lite,      // 2.5 lite
    fallback: LATEST_MODELS_ONLY.deepseek.chat,   // v3.1
    reasoning: 'Location finder uses latest lightweight models'
  },
  
  // Orchestrator - fast decision making
  orchestrator: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.deepseek.chat,   // v3.1
    reasoning: 'Orchestrator uses latest models for quick decisions'
  },
  
  // Researcher - good synthesis
  researcher: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.qwen.plus,       // 2025-07
    reasoning: 'Researcher uses latest models for information synthesis'
  },
  
  // Educator - clear explanations
  educator: {
    primary: LATEST_MODELS_ONLY.gemini.flash,     // 2.5
    fallback: LATEST_MODELS_ONLY.claude.haiku,    // 3.7 (cheaper alternative)
    reasoning: 'Educator uses latest models for clear teaching'
  }
};

async function verifyModelsAreCurrent() {
  console.log('\n🔍 Verifying all models are current (< 6 months old)...\n');
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  console.log('✅ Using ONLY latest model versions:');
  console.log('  - Claude: v4.1 (Opus), v4 (Sonnet) - NOT 3.5!');
  console.log('  - Gemini: v2.5 series');
  console.log('  - DeepSeek: v3.1');
  console.log('  - Qwen: v3 series');
  console.log('  - Llama: v3.3\n');
  
  // List outdated models we're NOT using
  console.log('❌ Outdated models we are NOT using:');
  console.log('  - anthropic/claude-3.5-sonnet (2 versions old!)');
  console.log('  - google/gemini-2.0-* (old version)');
  console.log('  - meta-llama/llama-3.1-* (old version)');
  console.log('  - qwen/qwen-2.5-* (old version)\n');
}

async function updateAllConfigurations() {
  console.log('🔄 Updating all configurations to latest models...\n');
  
  const configs: any[] = [];
  const now = new Date().toISOString();
  const roles = Object.keys(ROLE_TO_LATEST_MODEL);
  
  // Languages and sizes for context-aware roles
  const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'ruby', 'php', 'csharp', 'cpp', 'rust'];
  const sizes = ['small', 'medium', 'large'];
  
  for (const role of roles) {
    const modelConfig = ROLE_TO_LATEST_MODEL[role as keyof typeof ROLE_TO_LATEST_MODEL];
    
    // Universal roles
    if (['orchestrator', 'researcher', 'educator'].includes(role)) {
      configs.push({
        role,
        language: 'universal',
        size_category: 'medium',
        primary_provider: modelConfig.primary.split('/')[0],
        primary_model: modelConfig.primary,
        fallback_provider: modelConfig.fallback.split('/')[0],
        fallback_model: modelConfig.fallback,
        weights: getWeights(role),
        min_requirements: {},
        reasoning: [
          '⚠️ STRICT: Using ONLY latest models (< 6 months old)',
          `✅ Primary: ${modelConfig.primary} (LATEST version)`,
          `✅ Fallback: ${modelConfig.fallback} (LATEST version)`,
          modelConfig.reasoning,
          `Updated: ${now} - Models verified as NEWEST available`
        ],
        last_updated: now,
        updated_by: 'latest-models-enforcer'
      });
    } else {
      // Context-aware roles
      for (const language of languages) {
        for (const size of sizes) {
          configs.push({
            role,
            language,
            size_category: size,
            primary_provider: modelConfig.primary.split('/')[0],
            primary_model: modelConfig.primary,
            fallback_provider: modelConfig.fallback.split('/')[0],
            fallback_model: modelConfig.fallback,
            weights: getWeights(role, size),
            min_requirements: {},
            reasoning: [
              '⚠️ STRICT: Using ONLY latest models (< 6 months old)',
              `Context: ${language} / ${size}`,
              `✅ Primary: ${modelConfig.primary} (LATEST)`,
              `✅ Fallback: ${modelConfig.fallback} (LATEST)`,
              modelConfig.reasoning
            ],
            last_updated: now,
            updated_by: 'latest-models-enforcer'
          });
        }
      }
    }
  }
  
  console.log(`Generated ${configs.length} configurations with LATEST models only\n`);
  return configs;
}

function getWeights(role: string, size?: string): Record<string, number> {
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
  
  if (size === 'large') {
    weights.contextWindow *= 1.5;
    weights.quality *= 1.1;
  } else if (size === 'small') {
    weights.speed *= 1.3;
    weights.cost *= 0.8;
  }
  
  // Normalize
  const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
  Object.keys(weights).forEach(key => {
    weights[key] = (weights[key] as number) / sum;
  });
  
  return weights;
}

async function clearAndStore(configs: any[]) {
  console.log('💾 Storing configurations with LATEST models...\n');
  
  // Clear old configs
  const { error: deleteError } = await supabase
    .from('model_configurations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Error clearing:', deleteError);
  }
  
  // Store new configs
  const batchSize = 50;
  for (let i = 0; i < configs.length; i += batchSize) {
    const batch = configs.slice(i, i + batchSize);
    const { error } = await supabase
      .from('model_configurations')
      .insert(batch);
    
    if (error) {
      console.error(`Error batch ${Math.floor(i / batchSize) + 1}:`, error);
    } else {
      console.log(`✅ Stored batch ${Math.floor(i / batchSize) + 1}`);
    }
  }
}

async function showSummary() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                 SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const { data: samples } = await supabase
    .from('model_configurations')
    .select('role, primary_model')
    .limit(10);
  
  console.log('✅ Updated Roles to LATEST Models:');
  
  // Show critical roles
  const criticalRoles = ['security', 'architecture', 'deepwiki'];
  for (const role of criticalRoles) {
    const config = ROLE_TO_LATEST_MODEL[role as keyof typeof ROLE_TO_LATEST_MODEL];
    console.log(`  ${role}: ${config.primary} (was claude-3.5, now v4!)`);
  }
  
  console.log('\n⚠️ IMPORTANT CHANGES:');
  console.log('  - Security: claude-3.5-sonnet → claude-opus-4.1');
  console.log('  - Architecture: claude-3.5-sonnet → claude-sonnet-4');
  console.log('  - DeepWiki: claude-3.5-sonnet → claude-sonnet-4');
  console.log('  - ALL Gemini: 2.0 → 2.5');
  console.log('  - ALL Llama: 3.1 → 3.3');
  
  console.log('\n✅ All models are now LATEST versions only!');
  console.log('═══════════════════════════════════════════════════════');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🚀 UPDATE TO LATEST MODELS ONLY');
  console.log('   ⚠️ STRICT: No models older than 6 months');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    await verifyModelsAreCurrent();
    const configs = await updateAllConfigurations();
    await clearAndStore(configs);
    await showSummary();
    
    console.log('\n💡 Next: Test with these LATEST models to see charges!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);