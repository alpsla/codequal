#!/usr/bin/env ts-node

/**
 * Script to run researcher for embedding models
 * Finds the best embedding models available through unified API providers
 */

import { ResearcherAgent } from './researcher-agent';
import { EMBEDDING_MODEL_RESEARCH } from './embedding-model-research';
import { createLogger } from '@codequal/core/utils';
import * as fs from 'fs';
import * as path from 'path';

async function runEmbeddingModelResearch() {
  const logger = createLogger('EmbeddingModelResearch');
  
  logger.info('🚀 Starting embedding model research process');
  logger.info('=' .repeat(60));
  
  try {
    // Initialize researcher agent with authenticated user
    const authenticatedUser = {
      id: 'embedding-research-bot',
      email: 'research@codequal.ai',
      user_metadata: {
        role: 'researcher',
        task: 'embedding-model-research'
      }
    };
    
    const researcher = new ResearcherAgent(authenticatedUser, {
      researchDepth: 'comprehensive',
      prioritizeCost: false,
      minPerformanceThreshold: 7.0
    });
    
    logger.info('\n📋 Research Objectives:');
    logger.info('- Find embedding models available through unified API providers');
    logger.info('- Focus on models released in the last 3-6 months');
    logger.info('- Evaluate quality, performance, and cost');
    logger.info('- Avoid separate API keys for each provider');
    
    logger.info('\n🔍 Starting comprehensive embedding model research...');
    logger.info('This may take a few minutes as we evaluate available options.\n');
    
    const startTime = Date.now();
    
    // Run the research
    const result = await researcher.research();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    logger.info(`\n✅ Research completed in ${duration} seconds`);
    logger.info('\n📊 Research Results:\n');
    logger.info('Provider: ' + result.provider);
    logger.info('Model: ' + result.model);
    logger.info('Reasoning: ' + result.reasoning);
    logger.info('Performance Score: ' + result.performanceScore);
    logger.info('Cost per Million: $' + result.costPerMillion);
    
    // Parse and display key findings
    try {
      const findings = result;
      
      // Research result is already structured, no need to check for nested properties
      
    } catch (parseError) {
      logger.error('Error processing research results:', { error: parseError instanceof Error ? parseError.message : String(parseError) });
    }
    
    // Save research results
    const outputPath = path.join(__dirname, 'embedding-research-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    logger.info(`\n💾 Full research results saved to: ${outputPath}`);
    
    logger.info('\n' + '=' .repeat(60));
    logger.info('✅ Embedding model research completed successfully!');
    logger.info('\nNext steps:');
    logger.info('1. Review the research results');
    logger.info('2. Update embedding configuration based on findings');
    logger.info('3. Test recommended models with sample data');
    logger.info('4. Schedule quarterly research for continuous optimization');
    
  } catch (error) {
    logger.error('❌ Research process failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runEmbeddingModelResearch()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runEmbeddingModelResearch };