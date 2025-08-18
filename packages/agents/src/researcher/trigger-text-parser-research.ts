#!/usr/bin/env ts-node

/**
 * Trigger Text Parser Role Research
 * 
 * This script triggers research specifically for the text-parser role
 * to find optimal models for fast text extraction from DeepWiki responses.
 * 
 * The text-parser role requirements:
 * - High speed (50% weight) to avoid timeouts
 * - Low quality needs (20% weight) - just pattern matching
 * - Moderate cost (20% weight) - cheap but reliable
 * - No language/repository size requirements
 */

import { ProductionResearcherService } from './production-researcher-service';
import { initSupabase } from '@codequal/database';
import { VectorStorageService } from '@codequal/database';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Check required environment variables
const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.log('Please ensure your .env file contains all required variables');
    process.exit(1);
  }
}

async function main() {
  console.log('🔬 Text Parser Role Model Research');
  console.log('=' .repeat(80));
  console.log('\nRole: text-parser');
  console.log('Purpose: Fast extraction of JSON and patterns from analysis text');
  console.log('\nWeight Configuration:');
  console.log('  - Speed: 50% (CRITICAL - avoid timeouts)');
  console.log('  - Quality: 20% (LOW - just pattern extraction)');
  console.log('  - Cost: 20% (MODERATE - cheap but reliable)');
  console.log('  - Freshness: 5% (VERY LOW - version doesn\'t matter)');
  console.log('  - Context: 5% (SMALL - parsing text not code)');
  console.log('\n' + '=' .repeat(80));
  
  try {
    // Initialize Supabase
    initSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    // Create logger
    const logger = createLogger('TextParserResearch');
    
    // Create vector storage service
    const vectorStorage = new VectorStorageService();
    
    // Create model version sync
    const modelVersionSync = new ModelVersionSync(
      logger,
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Create researcher service
    const researcherService = new ProductionResearcherService(
      vectorStorage,
      modelVersionSync
    );
    
    console.log('\n🚀 Starting text-parser role research...\n');
    
    // Create system user for research
    const systemUser = {
      id: 'system',
      email: 'system@codequal.com',
      isSystemUser: true
    } as any;
    
    // Perform research specifically for text-parser role
    const result = await researcherService.performComprehensiveResearch(
      systemUser,
      'manual',
      {
        specificRoles: ['text-parser'] // Only research text-parser role
      }
    );
    
    console.log('\n✅ Research completed!');
    console.log('\nResearch Summary:');
    console.log(`  - Operation ID: ${result.operationId}`);
    console.log(`  - Models Evaluated: ${result.modelsEvaluated}`);
    console.log(`  - Configurations Updated: ${result.configurationsUpdated}`);
    
    if (result.selectedConfigurations && result.selectedConfigurations.length > 0) {
      console.log('\nSelected Models:');
      const config = result.selectedConfigurations[0];
      console.log(`\n  Role: ${config.role}`);
      console.log(`  Primary Model: ${config.primary.provider}/${config.primary.model}`);
      console.log(`  Fallback Model: ${config.fallback.provider}/${config.fallback.model}`);
      console.log(`  Last Updated: ${config.lastUpdated}`);
      
      if (config.reasoning && config.reasoning.length > 0) {
        console.log('\n  Selection Reasoning:');
        config.reasoning.slice(0, 3).forEach(r => console.log(`    - ${r}`));
      }
      
      console.log('\n📊 Configuration stored in Supabase');
      console.log('The UnifiedAIParser will now use these optimized models');
    } else {
      console.log('⚠️  No configurations generated. Check logs for details.');
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('Next steps:');
    console.log('1. The text-parser models are now available in Supabase');
    console.log('2. UnifiedAIParser will automatically use them');
    console.log('3. Test with: npm run test:pr-analysis');
    
  } catch (error) {
    console.error('\n❌ Research failed:', error);
    process.exit(1);
  }
}


main().catch(console.error);