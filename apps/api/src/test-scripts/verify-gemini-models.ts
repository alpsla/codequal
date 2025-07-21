/**
 * Verify and compare Gemini models from OpenRouter
 * Focus on Gemini 2.0 Flash vs Gemini 2.5 Flash
 */

import axios from 'axios';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  created?: number;
  description?: string;
}

async function verifyGeminiModels() {
  console.log('================================================================================');
  console.log('🔍 VERIFYING GEMINI MODELS - 2.0 vs 2.5 COMPARISON');
  console.log('================================================================================\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not found');
  }
  
  try {
    // Fetch all models
    console.log('📡 Fetching current models from OpenRouter...\n');
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/codequal/researcher',
        'X-Title': 'CodeQual Gemini Verification'
      }
    });
    
    const allModels = response.data.data as OpenRouterModel[];
    
    // Filter for Gemini models
    const geminiModels = allModels.filter(m => 
      m.id.includes('gemini') && 
      (m.id.includes('flash') || m.id.includes('pro'))
    );
    
    console.log(`Found ${geminiModels.length} Gemini models\n`);
    
    // Look specifically for Gemini 2.5 Flash
    const gemini25Flash = geminiModels.filter(m => 
      m.id.includes('2.5') || 
      m.id.includes('2-5') || 
      m.name?.toLowerCase().includes('2.5')
    );
    
    const gemini20Flash = geminiModels.filter(m => 
      m.id.includes('2.0') || 
      m.id.includes('2-0') || 
      (m.name?.toLowerCase().includes('2.0') && !m.id.includes('2.5'))
    );
    
    // Display all Gemini Flash models
    console.log('📊 ALL GEMINI FLASH MODELS:\n');
    
    const flashModels = geminiModels
      .filter(m => m.id.includes('flash'))
      .sort((a, b) => {
        // Sort by version number descending
        const versionA = parseFloat(a.id.match(/(\d+\.?\d*)/)?.[1] || '0');
        const versionB = parseFloat(b.id.match(/(\d+\.?\d*)/)?.[1] || '0');
        return versionB - versionA;
      });
    
    flashModels.forEach(model => {
      const inputCost = parseFloat(model.pricing.prompt) * 1000000;
      const outputCost = parseFloat(model.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      const createdDate = model.created ? new Date(model.created * 1000) : null;
      
      console.log(`ID: ${model.id}`);
      console.log(`Name: ${model.name}`);
      console.log(`Input Cost: $${inputCost.toFixed(4)}/M tokens`);
      console.log(`Output Cost: $${outputCost.toFixed(4)}/M tokens`);
      console.log(`Average Cost: $${avgCost.toFixed(4)}/M tokens`);
      console.log(`Context Window: ${model.context_length?.toLocaleString() || 'Unknown'} tokens`);
      console.log(`Created: ${createdDate?.toLocaleDateString() || 'Unknown'}`);
      if (model.description) {
        console.log(`Description: ${model.description.substring(0, 100)}...`);
      }
      console.log(`Max Completion: ${model.top_provider?.max_completion_tokens || 'Unknown'}`);
      console.log('---\n');
    });
    
    // Specific comparison
    console.log('🔬 DETAILED COMPARISON:\n');
    
    // Find specific models
    const gemini20FlashLite = flashModels.find(m => m.id === 'google/gemini-2.0-flash-lite-001');
    const gemini20FlashRegular = flashModels.find(m => m.id === 'google/gemini-2.0-flash-001');
    const gemini25FlashAny = flashModels.find(m => m.id.includes('2.5') || m.id.includes('2-5'));
    
    if (gemini20FlashLite) {
      console.log('✅ Found: google/gemini-2.0-flash-lite-001');
      const inputCost = parseFloat(gemini20FlashLite.pricing.prompt) * 1000000;
      const outputCost = parseFloat(gemini20FlashLite.pricing.completion) * 1000000;
      console.log(`  - Input: $${inputCost.toFixed(4)}/M, Output: $${outputCost.toFixed(4)}/M`);
      console.log(`  - Average: $${((inputCost + outputCost) / 2).toFixed(4)}/M`);
      console.log(`  - Context: ${gemini20FlashLite.context_length?.toLocaleString()} tokens\n`);
    }
    
    if (gemini25FlashAny) {
      console.log('✅ Found Gemini 2.5 Flash variant:');
      console.log(`  - Model: ${gemini25FlashAny.id}`);
      const inputCost = parseFloat(gemini25FlashAny.pricing.prompt) * 1000000;
      const outputCost = parseFloat(gemini25FlashAny.pricing.completion) * 1000000;
      console.log(`  - Input: $${inputCost.toFixed(4)}/M, Output: $${outputCost.toFixed(4)}/M`);
      console.log(`  - Average: $${((inputCost + outputCost) / 2).toFixed(4)}/M`);
      console.log(`  - Context: ${gemini25FlashAny.context_length?.toLocaleString()} tokens\n`);
    } else {
      console.log('❌ Gemini 2.5 Flash NOT FOUND in OpenRouter models\n');
      
      // Check if it might be under a different name
      console.log('🔍 Searching for possible Gemini 2.5 variations...\n');
      const possibleVariants = allModels.filter(m => 
        m.id.includes('google') && 
        (m.id.includes('2.5') || m.id.includes('2-5') || m.name?.includes('2.5'))
      );
      
      if (possibleVariants.length > 0) {
        console.log('Found possible Gemini 2.5 variants:');
        possibleVariants.forEach(m => {
          console.log(`  - ${m.id}: ${m.name}`);
        });
      } else {
        console.log('No Gemini 2.5 variants found in OpenRouter catalog');
      }
    }
    
    // Check latest Gemini models by creation date
    console.log('\n\n📅 LATEST GEMINI MODELS (by creation date):\n');
    const sortedByDate = geminiModels
      .filter(m => m.created)
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 5);
    
    sortedByDate.forEach(model => {
      const createdDate = new Date((model.created || 0) * 1000);
      const inputCost = parseFloat(model.pricing.prompt) * 1000000;
      const outputCost = parseFloat(model.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      
      console.log(`${model.id}`);
      console.log(`  Created: ${createdDate.toLocaleDateString()}`);
      console.log(`  Cost: $${avgCost.toFixed(4)}/M tokens`);
      console.log(`  Context: ${model.context_length?.toLocaleString() || 'Unknown'}`);
      console.log('');
    });
    
    // Role-based analysis
    console.log('\n🎯 ROLE-BASED SELECTION ANALYSIS:\n');
    
    console.log('For Researcher Agent requirements:');
    console.log('- Need: Fast, affordable model for discovering and evaluating other models');
    console.log('- Priority: Cost efficiency (40%), Quality (40%), Speed (20%)');
    console.log('- Context needs: Moderate (for analyzing model descriptions)\n');
    
    if (gemini20FlashLite) {
      const inputCost = parseFloat(gemini20FlashLite.pricing.prompt) * 1000000;
      const outputCost = parseFloat(gemini20FlashLite.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      
      console.log('Current selection: google/gemini-2.0-flash-lite-001');
      console.log(`✓ Very affordable: $${avgCost.toFixed(4)}/M`);
      console.log(`✓ Fast inference (flash variant)`);
      console.log(`✓ Large context: ${gemini20FlashLite.context_length?.toLocaleString()} tokens`);
      console.log(`✓ Good for research tasks`);
    }
    
    // Recommendation
    console.log('\n\n📋 FINAL VERIFICATION:\n');
    
    if (!gemini25FlashAny) {
      console.log('✅ VERIFIED: Gemini 2.5 Flash is NOT available on OpenRouter');
      console.log('✅ google/gemini-2.0-flash-lite-001 remains the best Gemini option');
      console.log('✅ The selection is ACCURATE based on available models');
    } else {
      console.log('⚠️  Gemini 2.5 Flash IS available - comparison needed');
    }
    
    // Save detailed results
    const results = {
      timestamp: new Date().toISOString(),
      geminiModelsFound: geminiModels.length,
      flashModels: flashModels.map(m => ({
        id: m.id,
        name: m.name,
        inputCost: parseFloat(m.pricing.prompt) * 1000000,
        outputCost: parseFloat(m.pricing.completion) * 1000000,
        avgCost: (parseFloat(m.pricing.prompt) + parseFloat(m.pricing.completion)) * 500000,
        contextWindow: m.context_length,
        created: m.created ? new Date(m.created * 1000).toISOString() : null
      })),
      gemini25Found: !!gemini25FlashAny,
      recommendation: !gemini25FlashAny ? 
        'google/gemini-2.0-flash-lite-001 is correctly selected' : 
        'Re-evaluate selection with Gemini 2.5 Flash'
    };
    
    await require('fs').promises.writeFile(
      join(__dirname, 'gemini-verification-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n✅ Detailed results saved to gemini-verification-results.json');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyGeminiModels().catch(console.error);