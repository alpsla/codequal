#!/usr/bin/env ts-node

/**
 * Script to initialize and search for optimal DeepWiki models
 * Run with: npx ts-node src/test-scripts/initialize-deepwiki-models.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createModelVersionSync } from '@codequal/core';
import { createSupabaseClient } from '@codequal/database';
import { initializeDeepWikiModels } from '@codequal/agents/deepwiki/deepwiki-model-initializer';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiModelInit');

async function main() {
  try {
    logger.info('Starting DeepWiki model initialization...');
    
    // Initialize dependencies
    const supabase = createSupabaseClient();
    const modelVersionSync = createModelVersionSync(supabase);
    
    // Initialize vector storage (optional, but recommended)
    const vectorStorage = undefined; // You can add vector storage here if available
    
    // Search and select optimal models for DeepWiki
    const config = await initializeDeepWikiModels(modelVersionSync, vectorStorage);
    
    // Display results
    console.log('\n=== DeepWiki Model Configuration ===\n');
    console.log('Primary Model:');
    console.log(`  Provider: ${config.primary.provider}`);
    console.log(`  Model: ${config.primary.model}`);
    console.log(`  Cost: $${config.primary.pricing.input}/$${config.primary.pricing.output} per 1M tokens`);
    console.log(`  Context: ${config.primary.capabilities.contextWindow.toLocaleString()} tokens`);
    
    console.log('\nFallback Model:');
    console.log(`  Provider: ${config.fallback.provider}`);
    console.log(`  Model: ${config.fallback.model}`);
    console.log(`  Cost: $${config.fallback.pricing.input}/$${config.fallback.pricing.output} per 1M tokens`);
    console.log(`  Context: ${config.fallback.capabilities.contextWindow.toLocaleString()} tokens`);
    
    console.log('\nScoring Weights:');
    console.log(`  Quality: ${config.scoringWeights.quality * 100}%`);
    console.log(`  Cost: ${config.scoringWeights.cost * 100}%`);
    console.log(`  Speed: ${config.scoringWeights.speed * 100}%`);
    
    if (config.searchResults.topModels.length > 0) {
      console.log('\nTop 5 Models Evaluated:');
      config.searchResults.topModels.slice(0, 5).forEach((model, i) => {
        console.log(`${i + 1}. ${model.id}`);
        console.log(`   Score: ${model.compositeScore.toFixed(2)} (Q:${model.quality.toFixed(1)} C:${model.priceScore.toFixed(1)} S:${model.speed.toFixed(1)})`);
        console.log(`   Cost: $${model.avgCost.toFixed(2)}/1M tokens`);
      });
    }
    
    console.log(`\nTotal models evaluated: ${config.searchResults.totalEvaluated}`);
    console.log(`Configuration timestamp: ${config.timestamp}`);
    
    // Save configuration to file for reference
    const fs = require('fs').promises;
    const configPath = resolve(__dirname, '../../deepwiki-model-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`\nConfiguration saved to: ${configPath}`);
    
  } catch (error) {
    logger.error('Failed to initialize DeepWiki models', { error });
    process.exit(1);
  }
}

// Run the initialization
main().catch(console.error);