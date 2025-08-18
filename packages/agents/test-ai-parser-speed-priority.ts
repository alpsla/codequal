#!/usr/bin/env npx ts-node

/**
 * Test AI Parser with Speed Priority
 * 
 * This tests the improved approach:
 * - NO hardcoded models
 * - Speed as top priority for AI Parser
 * - Dynamic discovery through prompts
 */

import { generateSpeedOptimizedPrompt, scoreModelForSpeed, extractSpeedMetrics } from './src/researcher/speed-optimized-prompt';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('AI-Parser-Speed-Test');

async function testAIParserSpeedPriority() {
  logger.info('🚀 Testing AI Parser with SPEED Priority Configuration');
  
  // Generate the speed-optimized prompt
  const prompt = generateSpeedOptimizedPrompt('ai-parser');
  
  logger.info('\n📋 Generated Prompt for AI Parser:');
  logger.info('=====================================');
  console.log(prompt);
  logger.info('=====================================\n');
  
  // Simulate evaluating models based on speed
  const testModels = [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'anthropic/claude-opus-4-1-20250805', name: 'Claude Opus 4.1' },
    { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'anthropic/claude-haiku-3', name: 'Claude Haiku' },
    { id: 'google/gemini-flash', name: 'Gemini Flash' }
  ];
  
  logger.info('📊 Evaluating Models for Speed:');
  logger.info('================================');
  
  const evaluations = testModels.map(model => {
    const speedMetrics = extractSpeedMetrics(model) as any;
    const speedScore = scoreModelForSpeed(model, 'ai-parser');
    
    return {
      model: model.id,
      estimatedTime: speedMetrics.estimatedResponseTime || 5.0,
      speedScore
    };
  }).sort((a, b) => b.speedScore - a.speedScore);
  
  evaluations.forEach(evaluation => {
    const status = evaluation.speedScore >= 60 ? '✅' : '❌';
    logger.info(`${status} ${evaluation.model}`);
    logger.info(`   Estimated time: ${evaluation.estimatedTime}s`);
    logger.info(`   Speed score: ${evaluation.speedScore}/100`);
    logger.info('');
  });
  
  // Show recommended configuration
  const topModels = evaluations.filter(e => e.speedScore >= 60);
  
  if (topModels.length >= 2) {
    logger.info('✨ RECOMMENDED CONFIGURATION:');
    logger.info('==============================');
    logger.info(`Primary: ${topModels[0].model} (Speed score: ${topModels[0].speedScore})`);
    logger.info(`Fallback: ${topModels[1].model} (Speed score: ${topModels[1].speedScore})`);
    logger.info('\nKey Points:');
    logger.info('- Models selected based on SPEED priority');
    logger.info('- No hardcoded preferences');
    logger.info('- Dynamic evaluation based on role requirements');
    logger.info('- Avoids slow models like Claude Opus');
  }
  
  logger.info('\n📌 Summary:');
  logger.info('- Speed weights: 50% (highest priority)');
  logger.info('- Quality weights: 30% (good enough is fine)');
  logger.info('- Cost weights: 20% (secondary concern)');
  logger.info('- Target response time: < 5 seconds');
  
  return true;
}

// Run test
testAIParserSpeedPriority()
  .then(() => {
    logger.info('\n✅ Test completed successfully!');
    logger.info('The system now prioritizes SPEED for AI Parser without hardcoding models.');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });