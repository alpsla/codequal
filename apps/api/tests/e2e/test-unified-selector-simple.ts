#!/usr/bin/env ts-node

/**
 * Simple test script for Unified Model Selector
 * Tests basic functionality without full E2E setup
 */

import { 
  UnifiedModelSelector,
  ROLE_SCORING_PROFILES,
  RepositoryContext
} from '../../../../packages/agents/src/model-selection/unified-model-selector';
import { ModelVersionSync, ModelVersionInfo } from '@codequal/core';

// Mock data
const mockModels: ModelVersionInfo[] = [
  {
    provider: 'openai',
    model: 'gpt-4o',
    versionId: 'latest',
    pricing: { input: 0.005, output: 0.015 },
    capabilities: {
      codeQuality: 8.8,
      speed: 8.5,
      contextWindow: 128000,
      reasoning: 8.6
    }
  },
  {
    provider: 'google',
    model: 'gemini-2.0-flash-lite',
    versionId: 'latest', 
    pricing: { input: 0.00019, output: 0.00057 },
    capabilities: {
      codeQuality: 8.5,
      speed: 9.0,
      contextWindow: 1000000,
      reasoning: 8.3
    }
  },
  {
    provider: 'anthropic',
    model: 'claude-3.5-sonnet',
    versionId: 'latest',
    pricing: { input: 0.003, output: 0.015 },
    capabilities: {
      codeQuality: 8.9,
      speed: 7.5,
      contextWindow: 200000,
      reasoning: 9.0
    }
  }
];

// Mock ModelVersionSync
const mockModelVersionSync: ModelVersionSync = {
  getModelsForProvider: (provider: string) => {
    return mockModels.filter(m => m.provider === provider);
  },
  getModelVersionInfo: () => mockModels[0],
  getLatestVersion: () => 'latest',
  isVersionSupported: () => true
} as any;

async function testUnifiedSelector() {
  console.log('🧪 Testing Unified Model Selector\n');

  const selector = new UnifiedModelSelector(mockModelVersionSync);

  // Test 1: Basic selection for researcher role
  console.log('Test 1: Researcher role selection');
  try {
    const result = await selector.selectModel('researcher');
    console.log('✅ Primary:', `${result.primary.provider}/${result.primary.model}`);
    console.log('✅ Fallback:', `${result.fallback.provider}/${result.fallback.model}`);
    console.log('✅ Primary Score:', result.scores.primary.compositeScore.toFixed(2));
    console.log('✅ Reasoning:', result.reasoning[0]);
  } catch (error) {
    console.error('❌ Failed:', error);
  }

  // Test 2: DeepWiki with context
  console.log('\nTest 2: DeepWiki role with repository context');
  const context: RepositoryContext = {
    url: 'https://github.com/test/repo',
    size: 'large',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React'],
    fileCount: 1000,
    totalLines: 50000,
    complexity: 7,
    analysisDepth: 'comprehensive'
  };

  try {
    const result = await selector.selectModel('deepwiki', context);
    console.log('✅ Primary:', `${result.primary.provider}/${result.primary.model}`);
    console.log('✅ Context window:', result.scores.primary.contextWindow);
    console.log('✅ Estimated tokens:', result.estimatedTokens);
    console.log('✅ Estimated cost: $', result.estimatedCost?.toFixed(4));
  } catch (error) {
    console.error('❌ Failed:', error);
  }

  // Test 3: All roles
  console.log('\nTest 3: Testing all roles');
  const roles = Object.keys(ROLE_SCORING_PROFILES) as Array<keyof typeof ROLE_SCORING_PROFILES>;
  
  for (const role of roles) {
    try {
      const result = await selector.selectModel(role);
      const weights = ROLE_SCORING_PROFILES[role];
      console.log(`✅ ${role}: ${result.primary.provider}/${result.primary.model} (Q:${weights.quality} C:${weights.cost} S:${weights.speed})`);
    } catch (error) {
      console.error(`❌ ${role}: Failed -`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n✨ Test completed!');
}

// Run test
testUnifiedSelector().catch(console.error);