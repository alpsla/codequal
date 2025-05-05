/**
 * Manual integration test for agent implementations
 * 
 * This script tests the Claude, ChatGPT, DeepSeek, and Gemini agents with a realistic PR example.
 * Run with:
 *   ts-node manual-integration-test.ts
 * 
 * Make sure you have these environment variables set:
 *   - ANTHROPIC_API_KEY: For Claude agent
 *   - OPENAI_API_KEY: For ChatGPT agent
 *   - DEEPSEEK_API_KEY: For DeepSeek agent
 *   - GEMINI_API_KEY: For Gemini agent
 * 
 * This file uses the ProviderGroup approach to create agents, allowing for a more
 * intuitive and maintainable way to work with different model providers.
 */

import { AgentFactory, ProviderGroup } from '../src/factory/agent-factory';
import { AgentRole } from '@codequal/core/config/agent-registry';
import * as fs from 'fs';
import * as path from 'path';

// Define our own model constants for testing
const ANTHROPIC_MODELS = {
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  CLAUDE_2: 'claude-2.1'
};

const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o-2024-05-13',
  GPT_4_TURBO: 'gpt-4-turbo-2024-04-09',
  GPT_3_5_TURBO: 'gpt-3.5-turbo-0125'
};

const DEEPSEEK_MODELS = {
  DEEPSEEK_CODER: 'deepseek-coder-33b-instruct',
  DEEPSEEK_CHAT: 'deepseek-chat',
  DEEPSEEK_CODER_LITE: 'deepseek-coder-lite-instruct',
  DEEPSEEK_CODER_PLUS: 'deepseek-coder-plus-instruct'
};

const GEMINI_MODELS = {
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash'
};

// Define pricing information for models
const GEMINI_PRICING = {
  [GEMINI_MODELS.GEMINI_2_5_PRO]: { input: 1.25, output: 10.00 },
  [GEMINI_MODELS.GEMINI_2_5_FLASH]: { input: 0.15, output: 0.60, thinkingOutput: 3.50 }
};

// Define pricing information for DeepSeek models
const DEEPSEEK_PRICING = {
  [DEEPSEEK_MODELS.DEEPSEEK_CODER_LITE]: { input: 0.3, output: 0.3 },
  [DEEPSEEK_MODELS.DEEPSEEK_CODER]: { input: 0.7, output: 1.0 },
  [DEEPSEEK_MODELS.DEEPSEEK_CODER_PLUS]: { input: 1.5, output: 2.0 }
};

// Define pricing information for Claude models
const CLAUDE_PRICING = {
  [ANTHROPIC_MODELS.CLAUDE_3_OPUS]: { input: 15.0, output: 75.0 },
  [ANTHROPIC_MODELS.CLAUDE_3_SONNET]: { input: 3.0, output: 15.0 },
  [ANTHROPIC_MODELS.CLAUDE_3_HAIKU]: { input: 0.25, output: 1.25 }
};

// Define pricing information for OpenAI models
const OPENAI_PRICING = {
  [OPENAI_MODELS.GPT_4O]: { input: 5.0, output: 15.0 },
  [OPENAI_MODELS.GPT_4_TURBO]: { input: 10.0, output: 30.0 },
  [OPENAI_MODELS.GPT_3_5_TURBO]: { input: 0.5, output: 1.5 }
};

// Load test files
const originalCode = fs.readFileSync(
  path.join(__dirname, 'test-cases/shopping-cart.js'),
  'utf-8'
);

const improvedCode = fs.readFileSync(
  path.join(__dirname, 'test-cases/shopping-cart-improved.ts'),
  'utf-8'
);

// Sample PR data with real code
const prData = {
  url: 'https://github.com/example/shopping-cart/pull/42',
  title: 'Refactor Shopping Cart to TypeScript with OOP',
  description: 'This PR refactors the shopping cart implementation from JavaScript to TypeScript, introduces proper OOP principles, adds type safety, and fixes several bugs and issues that were present in the original implementation.',
  files: [
    {
      filename: 'shopping-cart.js',
      content: originalCode,
      status: 'deleted'
    },
    {
      filename: 'shopping-cart.ts',
      content: improvedCode,
      status: 'added'
    }
  ]
};

// Test function
async function testAgents() {
  console.log('Testing agent implementations...\n');
  
  // Configure agents
  const claudeAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY,
    ProviderGroup.CLAUDE,
    { 
      model: ANTHROPIC_MODELS.CLAUDE_3_HAIKU,
      debug: true 
    }
  );
  
  const openaiAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY,
    ProviderGroup.OPENAI,
    {
      model: OPENAI_MODELS.GPT_3_5_TURBO,
      debug: true
    }
  );
  
  const deepseekAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY, 
    ProviderGroup.DEEPSEEK,
    {
      model: DEEPSEEK_MODELS.DEEPSEEK_CODER,
      debug: true
    }
  );
  
  const geminiAgent = AgentFactory.createAgent(
    AgentRole.CODE_QUALITY,
    ProviderGroup.GEMINI,
    {
      model: GEMINI_MODELS.GEMINI_2_5_FLASH,
      debug: true
    }
  );
  
  // Test Claude agent
  console.log('='.repeat(50));
  console.log('TESTING CLAUDE AGENT');
  console.log('='.repeat(50));
  
  try {
    console.log('Analyzing PR with Claude...');
    const claudeResult = await claudeAgent.analyze(prData);
    
    console.log('\n✅ Claude analysis completed.');
    console.log(`\nInsights found: ${claudeResult.insights.length}`);
    console.log(`Suggestions found: ${claudeResult.suggestions.length}`);
    console.log(`Educational items: ${claudeResult.educational?.length || 0}`);
    
    // Print token usage if available
    if (claudeResult.metadata?.tokenUsage) {
      console.log('\nToken usage:');
      console.log(JSON.stringify(claudeResult.metadata.tokenUsage, null, 2));
    }
    
    // Print sample insight
    if (claudeResult.insights.length > 0) {
      console.log('\nSample insight:');
      console.log(JSON.stringify(claudeResult.insights[0], null, 2));
    }
    
    // Print sample suggestion
    if (claudeResult.suggestions.length > 0) {
      console.log('\nSample suggestion:');
      console.log(JSON.stringify(claudeResult.suggestions[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Claude agent test failed:', error);
  }
  
  // Test OpenAI agent
  console.log('\n\n');
  console.log('='.repeat(50));
  console.log('TESTING OPENAI AGENT');
  console.log('='.repeat(50));
  
  try {
    console.log('Analyzing PR with OpenAI...');
    const openaiResult = await openaiAgent.analyze(prData);
    
    console.log('\n✅ OpenAI analysis completed.');
    console.log(`\nInsights found: ${openaiResult.insights.length}`);
    console.log(`Suggestions found: ${openaiResult.suggestions.length}`);
    console.log(`Educational items: ${openaiResult.educational?.length || 0}`);
    
    // Print token usage if available
    if (openaiResult.metadata?.tokenUsage) {
      console.log('\nToken usage:');
      console.log(JSON.stringify(openaiResult.metadata.tokenUsage, null, 2));
    }
    
    // Print sample insight
    if (openaiResult.insights.length > 0) {
      console.log('\nSample insight:');
      console.log(JSON.stringify(openaiResult.insights[0], null, 2));
    }
    
    // Print sample suggestion
    if (openaiResult.suggestions.length > 0) {
      console.log('\nSample suggestion:');
      console.log(JSON.stringify(openaiResult.suggestions[0], null, 2));
    }
  } catch (error) {
    console.error('❌ OpenAI agent test failed:', error);
  }
  
  // Test DeepSeek agent
  console.log('\n\n');
  console.log('='.repeat(50));
  console.log('TESTING DEEPSEEK AGENT');
  console.log('='.repeat(50));
  
  try {
    console.log('Analyzing PR with DeepSeek...');
    const deepseekResult = await deepseekAgent.analyze(prData);
    
    console.log('\n✅ DeepSeek analysis completed.');
    console.log(`\nInsights found: ${deepseekResult.insights.length}`);
    console.log(`Suggestions found: ${deepseekResult.suggestions.length}`);
    console.log(`Educational items: ${deepseekResult.educational?.length || 0}`);
    
    // Print token usage if available
    if (deepseekResult.metadata?.tokenUsage) {
      console.log('\nToken usage:');
      console.log(JSON.stringify(deepseekResult.metadata.tokenUsage, null, 2));
    }
    
    // Print sample insight
    if (deepseekResult.insights.length > 0) {
      console.log('\nSample insight:');
      console.log(JSON.stringify(deepseekResult.insights[0], null, 2));
    }
    
    // Print sample suggestion
    if (deepseekResult.suggestions.length > 0) {
      console.log('\nSample suggestion:');
      console.log(JSON.stringify(deepseekResult.suggestions[0], null, 2));
    }
  } catch (error) {
    console.error('❌ DeepSeek agent test failed:', error);
  }
  
  // Test Gemini agent
  console.log('\n\n');
  console.log('='.repeat(50));
  console.log('TESTING GEMINI AGENT');
  console.log('='.repeat(50));
  
  try {
    console.log('Analyzing PR with Gemini...');
    const geminiResult = await geminiAgent.analyze(prData);
    
    console.log('\n✅ Gemini analysis completed.');
    console.log(`\nInsights found: ${geminiResult.insights.length}`);
    console.log(`Suggestions found: ${geminiResult.suggestions.length}`);
    console.log(`Educational items: ${geminiResult.educational?.length || 0}`);
    
    // Print token usage if available
    if (geminiResult.metadata?.tokenUsage) {
      console.log('\nToken usage:');
      console.log(JSON.stringify(geminiResult.metadata.tokenUsage, null, 2));
    }
    
    // Print sample insight
    if (geminiResult.insights.length > 0) {
      console.log('\nSample insight:');
      console.log(JSON.stringify(geminiResult.insights[0], null, 2));
    }
    
    // Print sample suggestion
    if (geminiResult.suggestions.length > 0) {
      console.log('\nSample suggestion:');
      console.log(JSON.stringify(geminiResult.suggestions[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Gemini agent test failed:', error);
  }
}

// Run the test
testAgents().catch(console.error);
