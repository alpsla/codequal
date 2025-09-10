#!/usr/bin/env npx ts-node
/**
 * Test REAL OpenRouter API Call
 * This will actually charge your OpenRouter account!
 */

import { AIService } from './src/standard/services/ai-service';

async function testRealOpenRouterCall() {
  console.log('🚨 WARNING: This will make a REAL OpenRouter API call and charge your account!\n');
  
  // Check if we have an API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not set in environment');
    console.log('Please set: export OPENROUTER_API_KEY=your-key-here');
    process.exit(1);
  }
  
  console.log('✅ OpenRouter API key found');
  console.log('📡 Making real API call to OpenRouter...\n');
  
  const aiService = new AIService({
    openRouterApiKey: process.env.OPENROUTER_API_KEY
  });
  
  // Create a simple model info (using a cheap model)
  const model = {
    model: 'openai/gpt-3.5-turbo',
    provider: 'openai',
    contextLength: 4096,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015
  };
  
  try {
    console.log('🔄 Calling OpenRouter API with model:', model.model);
    console.log('📝 Prompt: "What is 2+2?"\n');
    
    const startTime = Date.now();
    
    const response = await aiService.call(model as any, {
      prompt: 'What is 2+2? Reply with just the number.',
      temperature: 0.1,
      maxTokens: 10
    });
    
    const endTime = Date.now();
    
    console.log('✅ OpenRouter API call successful!\n');
    console.log('Response:', response.content);
    console.log('Model used:', response.model);
    console.log('Provider:', response.provider);
    console.log('Latency:', `${endTime - startTime}ms`);
    
    if (response.usage) {
      console.log('\n📊 Token Usage:');
      console.log('  Prompt tokens:', response.usage.promptTokens);
      console.log('  Completion tokens:', response.usage.completionTokens);
      console.log('  Total tokens:', response.usage.totalTokens);
    }
    
    if (response.cost) {
      console.log('\n💰 Cost:', `$${response.cost.toFixed(6)}`);
    }
    
    console.log('\n🎉 Check your OpenRouter dashboard - you should see this request!');
    console.log('   https://openrouter.ai/activity');
    
  } catch (error) {
    console.error('❌ OpenRouter API call failed:', error);
    console.log('\nPossible reasons:');
    console.log('1. Invalid API key');
    console.log('2. No credits in OpenRouter account');
    console.log('3. Network issues');
    console.log('4. Model not available');
  }
}

// Run the test
testRealOpenRouterCall().catch(console.error);