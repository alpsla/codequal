#!/usr/bin/env npx ts-node

/**
 * Discover and Store OpenRouter Models
 * Directly fetches available models from OpenRouter and stores them
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
  created?: number;
}

async function discoverAndStoreModels() {
  console.log('🔍 Discovering OpenRouter Models');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Fetch models directly from OpenRouter
    console.log('📡 Fetching available models from OpenRouter...\n');
    
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Model Discovery'
      }
    });
    
    const models: OpenRouterModel[] = response.data.data || [];
    console.log(`✅ Found ${models.length} models in OpenRouter\n`);
    
    // Filter recent and high-quality models
    const currentDate = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
    
    const recentModels = models.filter(model => {
      // Skip deprecated models
      if (model.id.includes('deprecated')) return false;
      
      // Skip instruct-less chat models for code analysis
      if (model.id.includes('chat') && !model.id.includes('instruct')) return false;
      
      // Keep models with good context length
      if (model.context_length < 8000) return false;
      
      return true;
    });
    
    console.log(`📊 Filtered to ${recentModels.length} suitable models\n`);
    
    // Calculate scores and store research results
    const researchResults = recentModels.map(model => {
      const qualityScore = calculateQualityScore(model);
      const speedScore = calculateSpeedScore(model);
      const priceScore = calculatePriceScore(model);
      const optimalFor = determineOptimalUseCases(model, qualityScore);
      
      return {
        id: `research_${model.id.replace(/\//g, '_')}_${Date.now()}`,
        model_id: model.id,
        provider: model.id.split('/')[0],
        quality_score: qualityScore,
        speed_score: speedScore,
        price_score: priceScore,
        context_length: model.context_length,
        specializations: detectSpecializations(model),
        optimal_for: optimalFor,
        research_date: new Date().toISOString(),
        next_research_date: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString(),
        metadata: {
          pricing: model.pricing,
          name: model.name,
          description: model.description
        }
      };
    });
    
    // Sort by quality score
    researchResults.sort((a, b) => b.quality_score - a.quality_score);
    
    // Display top models
    console.log('🏆 TOP 10 MODELS BY QUALITY:\n');
    researchResults.slice(0, 10).forEach((model, idx) => {
      console.log(`${idx + 1}. ${model.model_id}`);
      console.log(`   Quality: ${model.quality_score}/100 | Speed: ${model.speed_score}/100 | Price: ${model.price_score}/100`);
      console.log(`   Context: ${model.context_length.toLocaleString()} tokens`);
      console.log(`   Provider: ${model.provider}`);
      console.log('');
    });
    
    // Store in Supabase
    console.log('💾 Storing research results in Supabase...\n');
    
    // Clear old research
    await supabase.from('model_research').delete().neq('id', null);
    
    // Insert new research
    const { error } = await supabase
      .from('model_research')
      .insert(researchResults);
    
    if (error) {
      console.error('Error storing research:', error);
    } else {
      console.log(`✅ Stored ${researchResults.length} model research results\n`);
    }
    
    // Update metadata
    await supabase
      .from('model_research_metadata')
      .upsert({
        id: 'singleton',
        last_research_date: new Date().toISOString(),
        next_scheduled_research: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString(),
        total_models_researched: researchResults.length,
        research_version: '2.0.0'
      });
    
    // Now update configurations with best models for each role
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎯 ASSIGNING MODELS TO ROLES');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const roles = [
      'orchestrator', 'researcher', 'security', 'performance', 
      'code_quality', 'architecture', 'documentation', 'testing',
      'dependencies', 'accessibility', 'comparator', 'educator',
      'location_finder', 'deepwiki'
    ];
    
    for (const role of roles) {
      // Get configuration for this role
      const { data: config } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('role', role)
        .limit(1)
        .single();
      
      if (!config) {
        console.log(`⚠️  No configuration found for role: ${role}`);
        continue;
      }
      
      // Select best model based on role requirements
      const bestModel = selectBestModelForRole(role, researchResults);
      const fallbackModel = selectFallbackModel(role, researchResults, bestModel.model_id);
      
      console.log(`📌 ${role.toUpperCase()}`);
      console.log(`   Primary: ${bestModel.model_id}`);
      console.log(`   Fallback: ${fallbackModel.model_id}`);
      
      // Update configuration
      const { error: updateError } = await supabase
        .from('model_configurations')
        .update({
          primary_model: bestModel.model_id,
          fallback_model: fallbackModel.model_id,
          primary_provider: bestModel.provider,
          fallback_provider: fallbackModel.provider,
          reasoning: [
            `Primary model selected: ${bestModel.model_id} (Q:${bestModel.quality_score} S:${bestModel.speed_score} P:${bestModel.price_score})`,
            `Fallback model selected: ${fallbackModel.model_id}`,
            `Updated via OpenRouter discovery on ${new Date().toISOString()}`,
            `Optimal for: ${JSON.stringify(bestModel.optimal_for)}`
          ],
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);
      
      if (updateError) {
        console.error(`   ❌ Error updating: ${updateError.message}`);
      } else {
        console.log(`   ✅ Configuration updated`);
      }
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Model discovery and configuration complete!');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error discovering models:', error);
  }
}

function calculateQualityScore(model: OpenRouterModel): number {
  let score = 40;
  const modelLower = model.id.toLowerCase();
  
  // Context length scoring
  if (model.context_length >= 200000) score += 25;
  else if (model.context_length >= 128000) score += 20;
  else if (model.context_length >= 64000) score += 15;
  else if (model.context_length >= 32000) score += 10;
  else if (model.context_length >= 16000) score += 5;
  
  // Model tier scoring (based on common patterns)
  if (modelLower.includes('opus') || modelLower.includes('o1')) score += 25;
  else if (modelLower.includes('sonnet') || modelLower.includes('gpt-4')) score += 20;
  else if (modelLower.includes('gemini-pro') || modelLower.includes('claude-3')) score += 18;
  else if (modelLower.includes('mixtral') || modelLower.includes('yi-')) score += 15;
  else if (modelLower.includes('llama') && modelLower.includes('70b')) score += 15;
  else if (modelLower.includes('haiku') || modelLower.includes('mini')) score += 10;
  
  // Instruct models get bonus
  if (modelLower.includes('instruct')) score += 5;
  
  return Math.min(100, score);
}

function calculateSpeedScore(model: OpenRouterModel): number {
  const modelLower = model.id.toLowerCase();
  let score = 50;
  
  if (modelLower.includes('mini') || modelLower.includes('haiku') || modelLower.includes('flash')) score += 30;
  else if (modelLower.includes('3.5') || modelLower.includes('7b')) score += 25;
  else if (modelLower.includes('mixtral') || modelLower.includes('13b')) score += 15;
  else if (modelLower.includes('sonnet') || modelLower.includes('70b')) score += 10;
  else if (modelLower.includes('opus') || modelLower.includes('o1') || modelLower.includes('405b')) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

function calculatePriceScore(model: OpenRouterModel): number {
  if (!model.pricing) return 50;
  
  const promptPrice = parseFloat(model.pricing.prompt || '0');
  const completionPrice = parseFloat(model.pricing.completion || '0');
  const avgPrice = (promptPrice + completionPrice) / 2;
  
  // Price in dollars per million tokens
  if (avgPrice < 0.5) return 95;
  if (avgPrice < 1) return 90;
  if (avgPrice < 2) return 80;
  if (avgPrice < 5) return 70;
  if (avgPrice < 10) return 60;
  if (avgPrice < 20) return 40;
  if (avgPrice < 50) return 20;
  return 10;
}

function determineOptimalUseCases(model: OpenRouterModel, qualityScore: number): any {
  const modelLower = model.id.toLowerCase();
  const languages = [];
  const repo_sizes = [];
  const frameworks = [];
  
  // High quality models for all languages
  if (qualityScore >= 80) {
    languages.push('Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++');
  } else if (qualityScore >= 60) {
    languages.push('Python', 'JavaScript', 'TypeScript', 'Java');
  } else {
    languages.push('JavaScript', 'TypeScript', 'Python');
  }
  
  // Repo size based on context length
  if (model.context_length >= 128000) {
    repo_sizes.push('large', 'enterprise');
  }
  if (model.context_length >= 32000) {
    repo_sizes.push('medium');
  }
  repo_sizes.push('small');
  
  // Framework specializations
  if (modelLower.includes('code') || modelLower.includes('codestral')) {
    frameworks.push('Code Analysis', 'Code Generation');
  }
  if (qualityScore >= 75) {
    frameworks.push('Machine Learning', 'Security Analysis', 'Architecture Review');
  } else {
    frameworks.push('General', 'Web Development');
  }
  
  return { languages, repo_sizes, frameworks };
}

function detectSpecializations(model: OpenRouterModel): string[] {
  const specializations = [];
  const modelLower = model.id.toLowerCase();
  
  if (modelLower.includes('code') || modelLower.includes('codestral')) specializations.push('code-generation');
  if (modelLower.includes('instruct')) specializations.push('instruction-following');
  if (model.context_length >= 128000) specializations.push('large-context');
  if (modelLower.includes('vision')) specializations.push('multimodal');
  if (modelLower.includes('mini') || modelLower.includes('haiku')) specializations.push('fast-inference');
  
  return specializations.length > 0 ? specializations : ['general'];
}

function selectBestModelForRole(role: string, models: any[]): any {
  // Define role priorities
  const rolePriorities: Record<string, { quality: number; speed: number; price: number }> = {
    orchestrator: { quality: 0.3, speed: 0.5, price: 0.2 },
    researcher: { quality: 0.6, speed: 0.2, price: 0.2 },
    security: { quality: 0.8, speed: 0.1, price: 0.1 },
    performance: { quality: 0.5, speed: 0.3, price: 0.2 },
    code_quality: { quality: 0.4, speed: 0.3, price: 0.3 },
    architecture: { quality: 0.7, speed: 0.2, price: 0.1 },
    documentation: { quality: 0.4, speed: 0.4, price: 0.2 },
    testing: { quality: 0.5, speed: 0.3, price: 0.2 },
    dependencies: { quality: 0.3, speed: 0.4, price: 0.3 },
    accessibility: { quality: 0.5, speed: 0.3, price: 0.2 },
    comparator: { quality: 0.6, speed: 0.2, price: 0.2 },
    educator: { quality: 0.5, speed: 0.3, price: 0.2 },
    location_finder: { quality: 0.4, speed: 0.5, price: 0.1 },
    deepwiki: { quality: 0.7, speed: 0.2, price: 0.1 }
  };
  
  const priorities = rolePriorities[role] || { quality: 0.5, speed: 0.3, price: 0.2 };
  
  // Score each model for this role
  const scoredModels = models.map(model => ({
    ...model,
    roleScore: (
      model.quality_score * priorities.quality +
      model.speed_score * priorities.speed +
      model.price_score * priorities.price
    )
  }));
  
  // Sort by role score
  scoredModels.sort((a, b) => b.roleScore - a.roleScore);
  
  return scoredModels[0];
}

function selectFallbackModel(role: string, models: any[], primaryModelId: string): any {
  // Filter out the primary model and get next best
  const alternatives = models.filter(m => m.model_id !== primaryModelId);
  return selectBestModelForRole(role, alternatives);
}

// Run the discovery
discoverAndStoreModels().catch(console.error);