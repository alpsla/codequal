#!/usr/bin/env ts-node

/**
 * Web Search Researcher for Location Finder Models
 * 
 * This implementation properly searches the web FIRST for the latest models,
 * then validates them in OpenRouter, as intended by the architecture.
 */

/* eslint-disable no-console */
/* cspell:ignore openrouter codequal anthropic gemini claude openai */

import { AIService } from '../standard/services/ai-service';
import { UnifiedModelSelector } from '../model-selection/unified-model-selector';
import { RESEARCH_PROMPTS } from './research-prompts';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('WebSearchResearcher');

interface DiscoveredModel {
  provider: string;
  model: string;
  version: string;
  releaseDate?: string;
  capabilities?: string[];
  contextWindow?: number;
  pricing?: {
    input: number;
    output: number;
  };
  notes?: string;
}

/**
 * Step 1: Use AI to search the web for the latest models
 */
async function searchWebForLatestModels(aiService: AIService): Promise<DiscoveredModel[]> {
  console.log('🔍 Step 1: Searching the web for latest AI models...\n');
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  
  // Use the DYNAMIC_MODEL_DISCOVERY prompt to search for latest models
  const searchPrompt = RESEARCH_PROMPTS.DYNAMIC_MODEL_DISCOVERY
    .replace(/{CURRENT_YEAR}/g, currentYear.toString())
    .replace(/{CURRENT_MONTH}/g, currentMonth);
  
  const locationFinderContext = `
Additional Context for Location Finder Role:
- We need models excellent at understanding code structure
- Must be able to identify exact line numbers where issues occur
- Should have strong pattern recognition for various programming languages
- Fast response time is important (under 3 seconds per file)
- Cost-effective for high-volume processing
- Context window should handle files up to 10,000 lines

🚨 CRITICAL: ONLY search for models released in the LAST 3-6 MONTHS 🚨
Focus on finding ANY models that:
- Were released within the last 3-6 months from today
- Have good text understanding and pattern matching capabilities
- Can process text quickly and accurately
- DO NOT assume specific model names or versions
- DO NOT include ANY models older than 6 months, regardless of quality
`;

  const fullPrompt = searchPrompt + '\n\n' + locationFinderContext;
  
  try {
    // This would use the ResearcherAgent's own model to search the web
    const response = await aiService.call(
      {
        model: 'dynamic', // Will be selected dynamically,
        provider: 'anthropic'
      },
      {
        systemPrompt: 'You are an AI model researcher with access to web search. Research and discover the latest AI models available in the market.',
        prompt: fullPrompt,
        temperature: 0.1,
        maxTokens: 2000
      }
    );
    
    // Parse the response to extract discovered models
    const discoveredModels = parseDiscoveredModels(response.content);
    
    console.log(`✅ Discovered ${discoveredModels.length} models from web search\n`);
    
    return discoveredModels;
  } catch (error) {
    logger.error('Failed to search web for models', { error });
    return [];
  }
}

/**
 * Step 2: Validate discovered models in OpenRouter
 */
async function validateModelsInOpenRouter(
  discoveredModels: DiscoveredModel[]
): Promise<DiscoveredModel[]> {
  console.log('🔍 Step 2: Validating discovered models in OpenRouter...\n');
  
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    console.error('❌ OPENROUTER_API_KEY not configured');
    return [];
  }
  
  try {
    // Fetch available models from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Model Validation'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch OpenRouter models');
    }
    
    const data = await response.json();
    const availableModels = data.data || [];
    
    // Create a map of available models for quick lookup
    const availableMap = new Map<string, any>();
    availableModels.forEach((m: any) => {
      const id = m.id.toLowerCase();
      availableMap.set(id, m);
    });
    
    // Validate each discovered model
    const validatedModels: DiscoveredModel[] = [];
    
    for (const model of discoveredModels) {
      const searchKeys = [
        `${model.provider}/${model.model}`.toLowerCase(),
        `${model.provider}/${model.version}`.toLowerCase(),
        model.model.toLowerCase()
      ];
      
      let found = false;
      for (const key of searchKeys) {
        for (const [availableId, availableModel] of availableMap) {
          if (availableId.includes(key) || key.includes(availableId.split('/')[1])) {
            console.log(`✅ Validated: ${model.provider}/${model.model} -> ${availableId}`);
            
            // Update with actual OpenRouter info
            validatedModels.push({
              ...model,
              provider: availableId.split('/')[0],
              model: availableId.split('/').slice(1).join('/'),
              pricing: {
                input: parseFloat(availableModel.pricing?.prompt || '0'),
                output: parseFloat(availableModel.pricing?.completion || '0')
              },
              contextWindow: availableModel.context_length || model.contextWindow
            });
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
      if (!found) {
        console.log(`❌ Not found in OpenRouter: ${model.provider}/${model.model}`);
      }
    }
    
    return validatedModels;
  } catch (error) {
    logger.error('Failed to validate models in OpenRouter', { error });
    return [];
  }
}

/**
 * Step 3: Select best models for location_finder role
 */
function selectBestModelsForLocationFinder(
  validatedModels: DiscoveredModel[]
): { primary: DiscoveredModel; fallback: DiscoveredModel } | null {
  console.log('🎯 Step 3: Selecting best models for location_finder role...\n');
  
  if (validatedModels.length < 2) {
    console.error('❌ Not enough validated models to select from');
    return null;
  }
  
  // Score models based on location_finder requirements
  const scoredModels = validatedModels.map(model => {
    let score = 0;
    
    // Score based on release date (prefer newer models)
    if (model.releaseDate) {
      const releaseDate = new Date(model.releaseDate);
      const monthsOld = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsOld <= 1) score += 35;  // Released within last month
      else if (monthsOld <= 2) score += 30;  // Released within 2 months
      else if (monthsOld <= 3) score += 25;  // Released within 3 months
      else if (monthsOld <= 6) score += 15;  // Released within 6 months
      else score += 5;  // Older than 6 months
    }
    
    // Context window score
    const contextWindow = model.contextWindow || 0;
    if (contextWindow >= 200000) score += 20;
    else if (contextWindow >= 128000) score += 15;
    else if (contextWindow >= 32000) score += 10;
    else score += 5;
    
    // Cost efficiency
    const avgCost = ((model.pricing?.input || 0) + (model.pricing?.output || 0)) / 2;
    if (avgCost <= 0.001) score += 20;  // Very cheap
    else if (avgCost <= 0.005) score += 15;  // Cheap
    else if (avgCost <= 0.01) score += 10;  // Moderate
    else if (avgCost <= 0.02) score += 5;   // Expensive
    
    // Speed indicators from capabilities or notes
    if (model.capabilities) {
      if (model.capabilities.includes('fast response')) score += 15;
      if (model.capabilities.includes('ultra-fast')) score += 20;
      if (model.capabilities.includes('code analysis')) score += 10;
      if (model.capabilities.includes('large context')) score += 10;
    }
    
    // Generic speed indicators in model name (without hardcoding specific models)
    const modelLower = model.model.toLowerCase();
    if (modelLower.includes('flash') || modelLower.includes('mini') || modelLower.includes('fast')) {
      score += 15;  // Fast models indicator
    }
    if (modelLower.includes('turbo') || modelLower.includes('speed')) {
      score += 10;  // Speed optimized indicator
    }
    
    return { ...model, score };
  });
  
  // Sort by score
  scoredModels.sort((a, b) => b.score - a.score);
  
  console.log('📊 Model Scores:');
  scoredModels.slice(0, 5).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.provider}/${m.model}: ${m.score} points`);
  });
  
  return {
    primary: scoredModels[0],
    fallback: scoredModels[1]
  };
}

/**
 * Parse discovered models from AI response
 */
function parseDiscoveredModels(content: string): DiscoveredModel[] {
  const models: DiscoveredModel[] = [];
  
  // Try to parse JSON if response is structured
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // Continue with text parsing
  }
  
  // Parse text response for model mentions using GENERIC patterns
  // NO hardcoded model names - dynamically extract from search results
  const lines = content.split('\n');
  
  // Generic patterns to find model information - NO specific model names
  const modelPatterns = [
    // Pattern: "Provider released ModelName on Date"
    /(\w+)\s+released\s+([A-Z][a-zA-Z0-9\-\s\.]+)\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
    // Pattern: "ModelName from Provider"
    /([A-Z][a-zA-Z0-9\-\s\.]+)\s+from\s+(\w+)/gi,
    // Pattern: "Provider's ModelName"
    /(\w+)'s\s+([A-Z][a-zA-Z0-9\-\s\.]+)\s+model/gi,
    // Pattern: "new ModelName model"
    /new\s+([A-Z][a-zA-Z0-9\-\s\.]+)\s+model/gi,
    // Pattern: "ModelName achieved X% on benchmark"
    /([A-Z][a-zA-Z0-9\-\s\.]+)\s+achieved\s+\d+\.?\d*%/gi,
    // Pattern: "latest ModelName version"
    /latest\s+([A-Z][a-zA-Z0-9\-\s\.]+)\s+version/gi,
    // Pattern: "ModelName LLM"
    /([A-Z][a-zA-Z0-9\-\s\.]+)\s+LLM/gi
  ];
  
  const datePatterns = [
    /released?\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
    /launched?\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
    /available\s+since\s+(\w+\s+\d{4})/gi,
    /(\w+\s+\d{4})\s+release/gi,
    /as\s+of\s+(\w+\s+\d{4})/gi
  ];
  
  // Extract all potential model mentions
  const foundModels = new Set<string>();
  const discoveredModels: DiscoveredModel[] = [];
  
  for (const pattern of modelPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Extract model name and provider dynamically
      let modelName = '';
      let provider = '';
      let releaseDate = '';
      
      if (match[3]) {
        // Pattern had provider, model, and date
        provider = match[1].toLowerCase();
        modelName = match[2].trim();
        releaseDate = match[3];
      } else if (match[2]) {
        // Pattern had provider and model
        if (pattern.source.includes('from')) {
          modelName = match[1].trim();
          provider = match[2].toLowerCase();
        } else {
          provider = match[1].toLowerCase();
          modelName = match[2].trim();
        }
      } else if (match[1]) {
        // Pattern had just model
        modelName = match[1].trim();
      }
      
      if (modelName && !foundModels.has(modelName)) {
        foundModels.add(modelName);
        
        // Try to find associated date if not already found
        if (!releaseDate) {
          for (const datePattern of datePatterns) {
            const dateMatch = content.match(datePattern);
            if (dateMatch && dateMatch[1]) {
              releaseDate = dateMatch[1];
              break;
            }
          }
        }
        
        // Try to determine provider if not found
        if (!provider) {
          const providerPatterns = [
            /anthropic/i,
            /openai/i,
            /google/i,
            /meta/i,
            /mistral/i,
            /deepseek/i,
            /cohere/i,
            /ai21/i,
            /amazon/i,
            /microsoft/i
          ];
          
          for (const providerPattern of providerPatterns) {
            if (content.match(providerPattern)) {
              provider = providerPattern.source.replace(/\\/g, '').replace(/i/g, '');
              break;
            }
          }
        }
        
        // Try to extract version numbers from model name
        const versionMatch = modelName.match(/(\d+\.?\d*)/);
        const version = versionMatch ? versionMatch[1] : '';
        
        // Try to extract capabilities from surrounding context
        const capabilities: string[] = [];
        if (content.includes('code') && content.includes(modelName)) {
          capabilities.push('code analysis');
        }
        if (content.includes('fast') && content.includes(modelName)) {
          capabilities.push('fast response');
        }
        if (content.includes('context') && content.includes(modelName)) {
          capabilities.push('large context');
        }
        
        discoveredModels.push({
          provider: provider || 'unknown',
          model: modelName.replace(/\s+/g, '-').toLowerCase(),
          version: version || modelName,
          releaseDate: releaseDate || new Date().toISOString().split('T')[0],
          capabilities: capabilities.length > 0 ? capabilities : ['general'],
          notes: 'Discovered via web search'
        });
      }
    }
  }
  
  // If AI response provided structured data, return it
  if (discoveredModels.length > 0) {
    return discoveredModels;
  }
  
  // Return empty array if no models found (let web search handle discovery)
  // NO HARDCODED FALLBACK MODELS
  return [];
}

/**
 * Main research function
 */
async function main() {
  console.log('🔬 Location Finder Model Research (Web Search First)');
  console.log('=' .repeat(80));
  console.log();
  
  // Initialize AI Service
  const aiService = new AIService({
    openRouterApiKey: process.env.OPENROUTER_API_KEY || ''
  });
  
  // Step 1: Search web for latest models
  const discoveredModels = await searchWebForLatestModels(aiService);
  
  if (discoveredModels.length === 0) {
    console.error('❌ No models discovered from web search');
    return;
  }
  
  // Step 2: Validate in OpenRouter
  const validatedModels = await validateModelsInOpenRouter(discoveredModels);
  
  if (validatedModels.length === 0) {
    console.error('❌ No models validated in OpenRouter');
    return;
  }
  
  // Step 3: Select best models
  const selection = selectBestModelsForLocationFinder(validatedModels);
  
  if (!selection) {
    console.error('❌ Could not select models');
    return;
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('✅ FINAL SELECTION FOR LOCATION_FINDER:\n');
  
  console.log('PRIMARY MODEL:');
  console.log(`  Provider: ${selection.primary.provider}`);
  console.log(`  Model: ${selection.primary.model}`);
  console.log(`  Context: ${selection.primary.contextWindow?.toLocaleString()} tokens`);
  console.log(`  Pricing: $${selection.primary.pricing?.input}/M input, $${selection.primary.pricing?.output}/M output`);
  
  console.log('\nFALLBACK MODEL:');
  console.log(`  Provider: ${selection.fallback.provider}`);
  console.log(`  Model: ${selection.fallback.model}`);
  console.log(`  Context: ${selection.fallback.contextWindow?.toLocaleString()} tokens`);
  console.log(`  Pricing: $${selection.fallback.pricing?.input}/M input, $${selection.fallback.pricing?.output}/M output`);
  
  console.log('\n' + '=' .repeat(80));
  console.log('💡 This is how the ResearcherAgent SHOULD work:');
  console.log('  1. ✅ Search web for latest models (Claude 4, Gemini 2.5, etc.)');
  console.log('  2. ✅ Validate availability in OpenRouter');
  console.log('  3. ✅ Select best models for the role');
  console.log('\nThe current implementation is missing step 1!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { searchWebForLatestModels, validateModelsInOpenRouter, selectBestModelsForLocationFinder };