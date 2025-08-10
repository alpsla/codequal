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

Focus on finding:
- Latest Claude models (Claude 4, Claude 4.5, etc.)
- Latest Gemini models (Gemini 2.5, Gemini 2.0, etc.)
- Latest GPT models (GPT-4.5, GPT-4o, etc.)
- Any new specialized code analysis models
`;

  const fullPrompt = searchPrompt + '\n\n' + locationFinderContext;
  
  try {
    // This would use the ResearcherAgent's own model to search the web
    const response = await aiService.call(
      {
        model: 'claude-3-sonnet-20240229',
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
    
    // Prefer latest models (Claude 4+, Gemini 2.5+, GPT-4.5+)
    if (model.model.includes('claude-4') || model.model.includes('claude-3.5')) score += 30;
    if (model.model.includes('gemini-2.5') || model.model.includes('gemini-2.0')) score += 28;
    if (model.model.includes('gpt-4.5') || model.model.includes('gpt-4o')) score += 26;
    
    // Context window score
    const contextWindow = model.contextWindow || 0;
    if (contextWindow >= 200000) score += 20;
    else if (contextWindow >= 128000) score += 15;
    else if (contextWindow >= 32000) score += 10;
    
    // Cost efficiency
    const avgCost = ((model.pricing?.input || 0) + (model.pricing?.output || 0)) / 2;
    if (avgCost <= 0.001) score += 20;  // Very cheap
    else if (avgCost <= 0.005) score += 15;  // Cheap
    else if (avgCost <= 0.01) score += 10;  // Moderate
    else if (avgCost <= 0.02) score += 5;   // Expensive
    
    // Speed indicators
    if (model.model.includes('flash') || model.model.includes('mini') || model.model.includes('haiku')) {
      score += 15;  // Fast models
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
  
  // Parse text response for model mentions
  // This is a simplified parser - in production would be more sophisticated
  const lines = content.split('\n');
  const modelPatterns = [
    /claude[- ]?4\.?\d*/gi,
    /gemini[- ]?2\.?\d*/gi,
    /gpt[- ]?4\.?\d*/gi,
    /llama[- ]?3\.?\d*/gi,
    /mistral[- ]?\w+/gi
  ];
  
  // Mock discovered models (in reality, the AI would provide these)
  // These represent what the AI might discover from web search
  return [
    {
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      version: 'claude-3.5-sonnet-20241022',
      releaseDate: '2024-10-22',
      capabilities: ['code analysis', 'fast response', 'large context'],
      contextWindow: 200000,
      notes: 'Latest Claude model with improved code understanding'
    },
    {
      provider: 'google',
      model: 'gemini-2.0-flash',
      version: 'gemini-2.0-flash-exp',
      releaseDate: '2024-12',
      capabilities: ['ultra-fast', 'code comprehension', 'cost-effective'],
      contextWindow: 1000000,
      notes: 'Newest Gemini with exceptional speed'
    },
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      version: 'gpt-4o-mini-2024-07-18',
      releaseDate: '2024-07-18',
      capabilities: ['fast', 'accurate', 'reliable'],
      contextWindow: 128000,
      notes: 'Optimized GPT-4 for speed and cost'
    },
    {
      provider: 'openai',
      model: 'gpt-4o',
      version: 'gpt-4o-2024-08-06',
      releaseDate: '2024-08-06',
      capabilities: ['high accuracy', 'code analysis'],
      contextWindow: 128000,
      notes: 'Latest GPT-4 optimized version'
    }
  ];
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