#!/usr/bin/env ts-node

/**
 * Run Contextual Research for All Language/Size Combinations
 * 
 * This script runs the researcher for each combination of:
 * - Languages: TypeScript, JavaScript, Python, Java, Go, Rust, C, C++
 * - Sizes: small, medium, large
 * - Roles: All configured roles
 * 
 * Stores each configuration in Supabase with context metadata
 */

import { createClient } from '@supabase/supabase-js';
import { VectorStorageService } from '@codequal/database';
import { ModelVersionSync } from '@codequal/core';
import { ProductionResearcherService } from './production-researcher-service';
import { AuthenticatedUser } from '@codequal/core/types';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('ContextualResearch');

// Languages to research
const LANGUAGES = [
  'typescript',
  'javascript', 
  'python',
  'java',
  'go',
  'rust',
  'c',
  'cpp'
];

// Repository sizes to research
const SIZES: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];

// Code-related roles that depend on language/size
const CODE_RELATED_ROLES = [
  'deepwiki',
  'code_quality',
  'security',
  'performance',
  'architecture',
  'dependencies',
  'testing',
  'location_finder'
];

// Non-code roles that don't vary by language
const NON_CODE_ROLES = [
  'researcher',
  'educational',
  'documentation',
  'translator',
  'orchestrator',
  'report_generation'
];

async function main() {
  console.log('🔬 Running Contextual Model Research for All Combinations');
  console.log('=' .repeat(80));
  console.log(`Languages: ${LANGUAGES.join(', ')}`);
  console.log(`Sizes: ${SIZES.join(', ')}`);
  console.log(`Code Roles: ${CODE_RELATED_ROLES.join(', ')}`);
  console.log(`Non-Code Roles: ${NON_CODE_ROLES.join(', ')}`);
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
    id: 'system',
    email: 'system@codequal.com',
    role: 'admin',
    isSystemUser: true
  } as any;
  
  const totalCombinations = LANGUAGES.length * SIZES.length;
  let currentCombination = 0;
  
  // Track all results
  const results: Array<{
    language: string;
    size: string;
    success: boolean;
    configurationsUpdated: number;
    error?: string;
  }> = [];
  
  // Research code-related roles for each language/size combination
  for (const language of LANGUAGES) {
    for (const size of SIZES) {
      currentCombination++;
      const progress = Math.round((currentCombination / totalCombinations) * 100);
      
      console.log(`\n[${progress}%] Processing: ${language} (${size} repos)`);
      console.log('-'.repeat(50));
      
      try {
        const result = await researcherService.performComprehensiveResearch(
          systemUser,
          'manual',
          {
            language,
            repositorySize: size,
            specificRoles: CODE_RELATED_ROLES
          }
        );
        
        console.log(`✅ Success: ${result.configurationsUpdated} configurations updated`);
        
        // Log selected models for key roles
        for (const config of result.selectedConfigurations.slice(0, 3)) {
          console.log(`  ${config.role}:`);
          console.log(`    Primary: ${config.primary.provider}/${config.primary.model}`);
          console.log(`    Fallback: ${config.fallback.provider}/${config.fallback.model}`);
        }
        
        results.push({
          language,
          size,
          success: true,
          configurationsUpdated: result.configurationsUpdated
        });
        
      } catch (error) {
        console.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        results.push({
          language,
          size,
          success: false,
          configurationsUpdated: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Research non-code roles once (they don't vary by language)
  console.log(`\n[100%] Processing: Non-code roles (language-agnostic)`);
  console.log('-'.repeat(50));
  
  try {
    const result = await researcherService.performComprehensiveResearch(
      systemUser,
      'manual',
      {
        language: 'default',
        repositorySize: 'medium',
        specificRoles: NON_CODE_ROLES
      }
    );
    
    console.log(`✅ Success: ${result.configurationsUpdated} non-code configurations updated`);
    
  } catch (error) {
    console.error(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESEARCH SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Combinations: ${totalCombinations}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Combinations:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.language} (${r.size}): ${r.error}`);
    });
  }
  
  // Group results by language
  console.log('\n📈 Configurations by Language:');
  for (const language of LANGUAGES) {
    const langResults = results.filter(r => r.language === language);
    const totalConfigs = langResults.reduce((sum, r) => sum + r.configurationsUpdated, 0);
    console.log(`  ${language}: ${totalConfigs} configurations`);
  }
  
  // Store research metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    languages: LANGUAGES,
    sizes: SIZES,
    codeRoles: CODE_RELATED_ROLES,
    nonCodeRoles: NON_CODE_ROLES,
    results: results,
    summary: {
      totalCombinations,
      successful,
      failed
    }
  };
  
  // Save metadata to Supabase
  const { error } = await supabase
    .from('research_metadata')
    .insert({
      id: `contextual-research-${Date.now()}`,
      metadata,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.warn('Failed to save research metadata:', error);
  }
  
  console.log('\n✨ Contextual research completed!');
  console.log('The orchestrator can now retrieve optimal models based on:');
  console.log('  - Programming language');
  console.log('  - Repository size');
  console.log('  - Agent role');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Research failed', { error });
    process.exit(1);
  });
}

export { main as runContextualResearch };