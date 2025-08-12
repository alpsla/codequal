#!/usr/bin/env ts-node

/**
 * Test Contextual Research with Small Subset
 * 
 * Tests the contextual model research with just:
 * - 2 languages: TypeScript, Python
 * - 2 sizes: small, large  
 * - 2 roles: deepwiki, security
 */

import { createClient } from '@supabase/supabase-js';
import { VectorStorageService } from '@codequal/database';
import { ModelVersionSync } from '@codequal/core';
import { ProductionResearcherService } from './src/researcher/production-researcher-service';
import { AuthenticatedUser } from '@codequal/core/types';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('ContextualTest');

async function testSubset() {
  console.log('🧪 Testing Contextual Model Research with Small Subset');
  console.log('=' .repeat(80));
  
  // Test configuration - just a small subset
  const TEST_LANGUAGES = ['typescript', 'python'];
  const TEST_SIZES: Array<'small' | 'medium' | 'large'> = ['small', 'large'];
  const TEST_ROLES = ['deepwiki', 'security'];
  
  console.log(`Testing with:`);
  console.log(`  Languages: ${TEST_LANGUAGES.join(', ')}`);
  console.log(`  Sizes: ${TEST_SIZES.join(', ')}`);
  console.log(`  Roles: ${TEST_ROLES.join(', ')}`);
  console.log(`  Total combinations: ${TEST_LANGUAGES.length * TEST_SIZES.length} = 4`);
  console.log('=' .repeat(80));
  
  // Initialize services
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const vectorStorage = new VectorStorageService();
  const modelVersionSync = new ModelVersionSync(logger, supabaseUrl, supabaseKey);
  const researcherService = new ProductionResearcherService(vectorStorage, modelVersionSync);
  
  // System user for automated research
  const systemUser: AuthenticatedUser = {
    id: 'system-test',
    email: 'test@codequal.com',
    role: 'admin',
    isSystemUser: true
  } as any;
  
  const results: Array<{
    language: string;
    size: string;
    success: boolean;
    models: { primary?: string; fallback?: string };
    error?: string;
  }> = [];
  
  // Test each combination
  for (const language of TEST_LANGUAGES) {
    for (const size of TEST_SIZES) {
      console.log(`\n📍 Testing: ${language} (${size} repos)`);
      console.log('-'.repeat(50));
      
      try {
        const result = await researcherService.performComprehensiveResearch(
          systemUser,
          'manual',
          {
            language,
            repositorySize: size,
            specificRoles: TEST_ROLES
          }
        );
        
        console.log(`✅ Success: ${result.configurationsUpdated} configurations`);
        
        // Show selected models
        const deepwikiConfig = result.selectedConfigurations.find(c => c.role === 'deepwiki');
        const securityConfig = result.selectedConfigurations.find(c => c.role === 'security');
        
        if (deepwikiConfig) {
          console.log(`  DeepWiki models:`);
          console.log(`    Primary: ${deepwikiConfig.primary.provider}/${deepwikiConfig.primary.model}`);
          console.log(`    Fallback: ${deepwikiConfig.fallback.provider}/${deepwikiConfig.fallback.model}`);
        }
        
        if (securityConfig) {
          console.log(`  Security models:`);
          console.log(`    Primary: ${securityConfig.primary.provider}/${securityConfig.primary.model}`);
          console.log(`    Fallback: ${securityConfig.fallback.provider}/${securityConfig.fallback.model}`);
        }
        
        results.push({
          language,
          size,
          success: true,
          models: {
            primary: deepwikiConfig ? `${deepwikiConfig.primary.provider}/${deepwikiConfig.primary.model}` : undefined,
            fallback: deepwikiConfig ? `${deepwikiConfig.fallback.provider}/${deepwikiConfig.fallback.model}` : undefined
          }
        });
        
      } catch (error) {
        console.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        results.push({
          language,
          size,
          success: false,
          models: {},
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Tested: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  
  // Show comparison across contexts
  console.log('\n📈 Model Selection by Context:');
  console.log('');
  console.log('| Language   | Size  | Primary Model                          | Different? |');
  console.log('|------------|-------|----------------------------------------|------------|');
  
  let lastPrimary = '';
  for (const result of results) {
    if (result.success && result.models.primary) {
      const modelName = result.models.primary.split('/').pop() || '';
      const isDifferent = lastPrimary && lastPrimary !== result.models.primary ? '✓' : '';
      console.log(`| ${result.language.padEnd(10)} | ${result.size.padEnd(5)} | ${modelName.padEnd(38)} | ${isDifferent.padEnd(10)} |`);
      lastPrimary = result.models.primary;
    }
  }
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.language} (${r.size}): ${r.error}`);
    });
  }
  
  // Test orchestrator retrieval
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Testing Orchestrator Retrieval');
  console.log('='.repeat(80));
  
  const { ContextAwareModelRetrieval } = await import('./src/standard/orchestrator/context-aware-model-retrieval');
  const retrieval = new ContextAwareModelRetrieval(vectorStorage);
  
  // Test retrieving for specific contexts
  const testCases = [
    { role: 'deepwiki', language: 'typescript', size: 'small' as const },
    { role: 'deepwiki', language: 'python', size: 'large' as const },
    { role: 'security', language: 'rust', size: 'large' as const }, // Should fallback
  ];
  
  for (const testCase of testCases) {
    console.log(`\nRetrieving ${testCase.role} for ${testCase.language} (${testCase.size}):`);
    
    const config = await retrieval.getOptimalModel(testCase.role, {
      language: testCase.language,
      size: testCase.size
    });
    
    if (config) {
      console.log(`  Primary: ${config.primary.provider}/${config.primary.model}`);
      console.log(`  Fallback: ${config.fallback.provider}/${config.fallback.model}`);
    } else {
      console.log(`  ❌ No configuration found`);
    }
  }
  
  console.log('\n✨ Test completed!');
}

// Run the test
testSubset().catch(error => {
  logger.error('Test failed', { error });
  process.exit(1);
});