#!/usr/bin/env ts-node

/**
 * Trigger Comprehensive Research
 * 
 * This script triggers the ProductionResearcherService to perform
 * comprehensive research for all roles, including the new location_finder role.
 * 
 * The ResearcherAgent will:
 * 1. Search the web for latest AI model information
 * 2. Fetch available models from OpenRouter
 * 3. Evaluate models dynamically for each role
 * 4. Store optimal configurations in Supabase
 */

/* eslint-disable no-console */
/* cspell:ignore supabase openrouter codequal */
import { ProductionResearcherService } from './production-researcher-service';
import { initSupabase } from '@codequal/database';
import { VectorStorageService } from '@codequal/database';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';
import { AuthenticatedUser } from '@codequal/core/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check required environment variables
const requiredEnvVars = [
  'OPENROUTER_API_KEY',
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

async function main() {
  console.log('🔬 Comprehensive Model Research for All Roles');
  console.log('=' .repeat(80));
  console.log('\nRoles to research:');
  console.log('  - deepwiki');
  console.log('  - researcher');
  console.log('  - security');
  console.log('  - architecture');
  console.log('  - performance');
  console.log('  - code_quality');
  console.log('  - dependencies');
  console.log('  - documentation');
  console.log('  - testing');
  console.log('  - translator');
  console.log('  - location_finder (NEW)');
  console.log('\n' + '=' .repeat(80));
  
  try {
    // Initialize Supabase
    initSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    // Create logger
    const logger = createLogger('TriggerComprehensiveResearch');
    
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
    
    // Create system user for research
    const systemUser: AuthenticatedUser = {
      id: 'system',
      email: 'system@codequal.com',
      isSystemUser: true
    } as any;
    
    console.log('\n🚀 Starting comprehensive research...\n');
    console.log('This will:');
    console.log('  1. Fetch latest models from OpenRouter');
    console.log('  2. Evaluate models dynamically');
    console.log('  3. Use AI to select optimal models for each role');
    console.log('  4. Store configurations in Supabase\n');
    
    // Perform comprehensive research
    const result = await researcherService.performComprehensiveResearch(
      systemUser,
      'manual' // Manual trigger for testing
    );
    
    console.log('\n✅ Research Complete!\n');
    console.log('=' .repeat(80));
    console.log(`Operation ID: ${result.operationId}`);
    console.log(`Models Evaluated: ${result.modelsEvaluated}`);
    console.log(`Configurations Updated: ${result.configurationsUpdated}`);
    console.log(`Next Scheduled Update: ${result.nextScheduledUpdate.toISOString()}`);
    console.log('\n📊 Selected Configurations:\n');
    
    // Display configurations for each role
    for (const config of result.selectedConfigurations) {
      console.log(`\n${config.role.toUpperCase()}:`);
      console.log(`  Primary: ${config.primary.provider}/${config.primary.model}`);
      console.log(`  Fallback: ${config.fallback.provider}/${config.fallback.model}`);
      console.log(`  Reasoning:`);
      config.reasoning.slice(0, 2).forEach(r => {
        console.log(`    - ${r}`);
      });
    }
    
    // Check if location_finder was included
    const locationFinderConfig = result.selectedConfigurations.find(
      c => c.role === 'location_finder'
    );
    
    if (locationFinderConfig) {
      console.log('\n' + '=' .repeat(80));
      console.log('🎯 LOCATION FINDER CONFIGURATION:');
      console.log('=' .repeat(80));
      console.log(`Primary Model: ${locationFinderConfig.primary.provider}/${locationFinderConfig.primary.model}`);
      console.log(`  - Context Window: ${(locationFinderConfig.primary as any).capabilities?.contextWindow || 'Unknown'}`);
      console.log(`  - Pricing: $${locationFinderConfig.primary.pricing?.input || 0}/M input, $${locationFinderConfig.primary.pricing?.output || 0}/M output`);
      console.log(`\nFallback Model: ${locationFinderConfig.fallback.provider}/${locationFinderConfig.fallback.model}`);
      console.log(`  - Context Window: ${(locationFinderConfig.fallback as any).capabilities?.contextWindow || 'Unknown'}`);
      console.log(`  - Pricing: $${locationFinderConfig.fallback.pricing?.input || 0}/M input, $${locationFinderConfig.fallback.pricing?.output || 0}/M output`);
      console.log('\n✨ Location finder models are now configured and ready to use!');
    } else {
      console.log('\n⚠️  Warning: location_finder configuration not found in results');
      console.log('    This might indicate an issue with the role configuration');
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('💡 Next Steps:');
    console.log('  1. Models are stored in Supabase model_configurations table');
    console.log('  2. UnifiedModelSelector will use these for all roles');
    console.log('  3. AI Location Finder will use location_finder models');
    console.log('  4. Test with real DeepWiki issues to validate accuracy');
    
  } catch (error) {
    console.error('\n❌ Research failed:', error);
    
    if (error instanceof Error) {
      console.error('\nError details:');
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
    
    process.exit(1);
  }
}

// Run the research
main()
  .then(() => {
    console.log('\n🎉 Comprehensive research completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });