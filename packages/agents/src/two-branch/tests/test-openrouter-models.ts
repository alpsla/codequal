/**
 * Test OpenRouter Models - Check what's actually available
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOpenRouterModels() {
  console.log('🔍 Checking OpenRouter Models');
  console.log('=' .repeat(60));
  
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    console.error('❌ OPENROUTER_API_KEY not set!');
    return;
  }
  
  try {
    // Fetch available models
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch models:', response.status, response.statusText);
      return;
    }
    
    const data: any = await response.json();
    console.log(`✅ Found ${data.data?.length || 0} total models\n`);
    
    // Models we're trying to use (outdated)
    const outdatedModels = [
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'google/gemini-2.0-flash-exp',
      'google/gemini-2.0-flash-thinking-exp',
      'meta-llama/llama-3.1-8b-instruct',
      'qwen/qwen-2.5-coder-32b-instruct'
    ];
    
    console.log('📋 Checking our outdated models:');
    outdatedModels.forEach(modelId => {
      const found = data.data?.find((m: any) => m.id === modelId);
      console.log(`${modelId}: ${found ? '✅ Still available' : '❌ NOT FOUND'}`);
    });
    
    // Find current Claude models
    console.log('\n🤖 Current Claude models:');
    const claudeModels = data.data?.filter((m: any) => m.id.includes('claude')) || [];
    claudeModels.slice(0, 5).forEach((m: any) => {
      console.log(`- ${m.id} ($${m.pricing?.prompt || 0}/1K tokens)`);
    });
    
    // Find current DeepSeek models
    console.log('\n🤖 Current DeepSeek models:');
    const deepseekModels = data.data?.filter((m: any) => m.id.includes('deepseek')) || [];
    deepseekModels.slice(0, 5).forEach((m: any) => {
      console.log(`- ${m.id} ($${m.pricing?.prompt || 0}/1K tokens)`);
    });
    
    // Find current Gemini models
    console.log('\n🤖 Current Gemini models:');
    const geminiModels = data.data?.filter((m: any) => m.id.includes('gemini')) || [];
    geminiModels.slice(0, 5).forEach((m: any) => {
      console.log(`- ${m.id} ($${m.pricing?.prompt || 0}/1K tokens)`);
    });
    
    // Find current Llama models
    console.log('\n🤖 Current Llama models:');
    const llamaModels = data.data?.filter((m: any) => m.id.includes('llama')) || [];
    llamaModels.slice(0, 5).forEach((m: any) => {
      console.log(`- ${m.id} ($${m.pricing?.prompt || 0}/1K tokens)`);
    });
    
    // Find current Qwen models
    console.log('\n🤖 Current Qwen models:');
    const qwenModels = data.data?.filter((m: any) => m.id.includes('qwen')) || [];
    qwenModels.slice(0, 5).forEach((m: any) => {
      console.log(`- ${m.id} ($${m.pricing?.prompt || 0}/1K tokens)`);
    });
    
    // Suggest replacements
    console.log('\n💡 Suggested Model Replacements:');
    console.log('Old Model → New Model');
    console.log('-'.repeat(60));
    
    // Map old to new
    const replacements: Record<string, string> = {};
    
    // Find best Claude replacement
    const bestClaude = claudeModels.find((m: any) => m.id.includes('3-5-sonnet') || m.id.includes('3.5-sonnet'));
    if (bestClaude) {
      replacements['anthropic/claude-3.5-sonnet'] = bestClaude.id;
    }
    
    // Find best DeepSeek replacement
    const bestDeepSeek = deepseekModels.find((m: any) => m.id.includes('chat') && !m.id.includes('free'));
    if (bestDeepSeek) {
      replacements['deepseek/deepseek-chat'] = bestDeepSeek.id;
    }
    
    // Find best Gemini replacement
    const bestGemini = geminiModels.find((m: any) => m.id.includes('flash'));
    if (bestGemini) {
      replacements['google/gemini-2.0-flash-exp'] = bestGemini.id;
    }
    
    // Find best Llama replacement
    const bestLlama = llamaModels[0];
    if (bestLlama) {
      replacements['meta-llama/llama-3.1-8b-instruct'] = bestLlama.id;
    }
    
    // Find best Qwen replacement
    const bestQwen = qwenModels.find((m: any) => m.id.includes('coder') || m.id.includes('32b'));
    if (bestQwen) {
      replacements['qwen/qwen-2.5-coder-32b-instruct'] = bestQwen.id;
    }
    
    Object.entries(replacements).forEach(([old, newModel]) => {
      console.log(`${old} → ${newModel}`);
    });
    
    // Save recommended models to file
    const recommendedModels = {
      SecurityAnalyzer: replacements['anthropic/claude-3.5-sonnet'] || 'anthropic/claude-3-5-sonnet-20241022',
      PerformanceAnalyzer: replacements['deepseek/deepseek-chat'] || 'deepseek/deepseek-chat',
      QualityAnalyzer: replacements['google/gemini-2.0-flash-exp'] || 'google/gemini-flash-1.5',
      DependencyAnalyzer: replacements['qwen/qwen-2.5-coder-32b-instruct'] || 'qwen/qwen-2-72b-instruct',
      ArchitectureAnalyzer: replacements['google/gemini-2.0-flash-exp'] || 'google/gemini-flash-1.5'
    };
    
    console.log('\n✅ Recommended Model Configuration:');
    console.log(JSON.stringify(recommendedModels, null, 2));
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Run the test
testOpenRouterModels().catch(console.error);