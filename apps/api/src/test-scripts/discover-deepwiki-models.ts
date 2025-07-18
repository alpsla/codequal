#!/usr/bin/env ts-node

/**
 * Script to discover and store optimal DeepWiki models using ResearcherDiscoveryService
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { ResearcherDiscoveryService } from '@codequal/agents/researcher/final/researcher-discovery-service';
import { storeResearcherConfigInVectorDB } from '@codequal/agents/researcher/load-researcher-config';
import { initSupabase, getSupabase } from '@codequal/database';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { scoreModelsForDeepWiki, DEEPWIKI_SCORING_WEIGHTS } from '@codequal/agents/deepwiki/deepwiki-model-selector';
import { AuthenticatedUser, UserRole, UserStatus } from '@codequal/agents/multi-agent/types/auth';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiModelDiscovery');

// Test user for discovery operations
const testUser = {
  id: 'deepwiki-discovery-user',
  email: 'deepwiki@codequal.dev',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  session: {
    token: 'discovery-token',
    fingerprint: 'discovery-fingerprint',
    ipAddress: '127.0.0.1',
    userAgent: 'DeepWiki-Discovery',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  permissions: {
    repositories: { '*': { read: true, write: true, admin: true } },
    organizations: [],
    globalPermissions: ['manageUsers', 'manageBilling', 'viewAnalytics'],
    quotas: {
      requestsPerHour: 10000,
      maxConcurrentExecutions: 10,
      storageQuotaMB: 10000
    }
  },
  metadata: {
    lastLogin: new Date(),
    loginCount: 1,
    preferredLanguage: 'en',
    timezone: 'UTC'
  }
};

async function main() {
  try {
    logger.info('Starting DeepWiki model discovery...');
    
    // Initialize dependencies
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    const discoveryService = new ResearcherDiscoveryService(supabase as any, testUser.id);
    const vectorContextService = new VectorContextService(testUser);
    
    // Fetch available models from OpenRouter
    logger.info('Fetching available models from OpenRouter...');
    const availableModels = await discoveryService.fetchAvailableModels();
    logger.info(`Found ${availableModels.length} models from OpenRouter`);
    
    // Score models for DeepWiki use case
    const scoredModels = scoreModelsForDeepWiki(availableModels);
    logger.info(`Scored ${scoredModels.length} models for DeepWiki`);
    
    // Display top 10 models
    console.log('\n=== Top 10 Models for DeepWiki ===\n');
    scoredModels.slice(0, 10).forEach((model, i) => {
      console.log(`${i + 1}. ${model.id}`);
      console.log(`   Score: ${model.compositeScore.toFixed(2)} (Quality: ${model.quality.toFixed(1)}, Cost: ${model.priceScore.toFixed(1)}, Speed: ${model.speed.toFixed(1)})`);
      console.log(`   Cost: $${model.avgCost.toFixed(2)}/1M tokens (Input: $${model.inputCost.toFixed(2)}, Output: $${model.outputCost.toFixed(2)})`);
      console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
      console.log('');
    });
    
    // Select primary and fallback models
    const primaryModel = scoredModels[0];
    const fallbackModel = scoredModels.find(m => m.provider !== primaryModel.provider) || scoredModels[1];
    
    console.log('=== Selected Models ===\n');
    console.log('Primary Model:');
    console.log(`  ${primaryModel.id}`);
    console.log(`  Score: ${primaryModel.compositeScore.toFixed(2)}`);
    console.log(`  Cost: $${primaryModel.avgCost.toFixed(2)}/1M tokens`);
    console.log(`  Reason: Highest composite score with ${primaryModel.quality.toFixed(1)} quality rating`);
    
    console.log('\nFallback Model:');
    console.log(`  ${fallbackModel.id}`);
    console.log(`  Score: ${fallbackModel.compositeScore.toFixed(2)}`);
    console.log(`  Cost: $${fallbackModel.avgCost.toFixed(2)}/1M tokens`);
    console.log(`  Reason: Different provider for redundancy with strong performance`);
    
    // Store configuration in Vector DB
    const modelConfig = {
      primary: {
        provider: primaryModel.provider,
        model: primaryModel.model,
        versionId: 'latest',
        capabilities: {
          contextWindow: primaryModel.contextWindow
        },
        pricing: {
          input: primaryModel.inputCost / 1000000, // Convert to per-token
          output: primaryModel.outputCost / 1000000
        },
        tier: 'high-performance',
        preferredFor: ['repository_analysis', 'architecture_review', 'security_scanning'],
        reason: `Selected for DeepWiki: Highest score (${primaryModel.compositeScore.toFixed(2)}) with excellent quality (${primaryModel.quality.toFixed(1)}) and ${primaryModel.contextWindow.toLocaleString()} token context`
      },
      fallback: {
        provider: fallbackModel.provider,
        model: fallbackModel.model,
        versionId: 'latest',
        capabilities: {
          contextWindow: fallbackModel.contextWindow
        },
        pricing: {
          input: fallbackModel.inputCost / 1000000,
          output: fallbackModel.outputCost / 1000000
        },
        tier: 'balanced',
        preferredFor: ['repository_analysis', 'fallback'],
        reason: `Fallback for DeepWiki: Strong performance (${fallbackModel.compositeScore.toFixed(2)}) with different provider`
      }
    };
    
    // Store in Vector DB
    logger.info('Storing DeepWiki model configuration in Vector DB...');
    
    // Convert to StoredResearcherConfig format
    const storedConfig: any = {
      provider: primaryModel.provider,
      model: primaryModel.model,
      versionId: 'latest',
      capabilities: modelConfig.primary.capabilities,
      pricing: modelConfig.primary.pricing,
      tier: modelConfig.primary.tier,
      preferredFor: modelConfig.primary.preferredFor,
      reason: modelConfig.primary.reason,
      metadata: {
        language: 'multi-language', // DeepWiki analyzes all languages
        sizeCategory: 'large', // DeepWiki handles large repos
        agentRole: AgentRole.ORCHESTRATOR, // DeepWiki orchestrates analysis
        fallback: modelConfig.fallback
      }
    };
    
    await storeResearcherConfigInVectorDB(
      testUser,
      storedConfig,
      'deepwiki-model-discovery'
    );
    
    console.log('\n✅ DeepWiki model configuration stored in Vector DB');
    console.log('\nWeights used:');
    console.log(`  Quality: ${DEEPWIKI_SCORING_WEIGHTS.quality * 100}%`);
    console.log(`  Cost: ${DEEPWIKI_SCORING_WEIGHTS.cost * 100}%`);
    console.log(`  Speed: ${DEEPWIKI_SCORING_WEIGHTS.speed * 100}%`);
    
    // Save results to file
    const fs = require('fs').promises;
    const results = {
      discoveryTimestamp: new Date().toISOString(),
      modelsEvaluated: scoredModels.length,
      scoringWeights: DEEPWIKI_SCORING_WEIGHTS,
      selectedModels: {
        primary: primaryModel,
        fallback: fallbackModel
      },
      topModels: scoredModels.slice(0, 10),
      configuration: modelConfig
    };
    
    const resultsPath = resolve(__dirname, '../../deepwiki-discovery-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nDetailed results saved to: ${resultsPath}`);
    
  } catch (error) {
    logger.error('DeepWiki model discovery failed', { error });
    console.error('\n❌ Discovery failed:', error);
    process.exit(1);
  }
}

// Run the discovery
main().catch(console.error);