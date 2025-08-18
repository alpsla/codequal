#!/usr/bin/env npx ts-node

/**
 * Test Fixed Selection
 * 
 * Verifies that openrouter/auto and outdated models are avoided
 */

import { selectBestModels } from './src/researcher/fixed-characteristic-selection';
import axios from 'axios';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const logger = createLogger('Fixed-Selection-Test');

async function testFixedSelection() {
  logger.info('🚀 Testing Fixed Selection (No auto, no outdated)');
  logger.info('=================================================\n');
  
  try {
    // Fetch OpenRouter models
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual Model Research'
      }
    });
    
    const allModels = response.data.data || [];
    logger.info(`📊 Total models available: ${allModels.length}\n`);
    
    // Test all roles
    const roles = [
      { name: 'ai-parser', context: null },
      { name: 'educator', context: null },
      { name: 'researcher', context: null },
      { name: 'orchestrator', context: null },
      { name: 'deepwiki', context: { language: 'typescript', size: 'large' } },
      { name: 'comparison', context: { language: 'python', size: 'medium' } },
      { name: 'location-finder', context: { language: 'javascript', size: 'small' } }
    ];
    
    const results: any[] = [];
    
    for (const role of roles) {
      logger.info(`\n📌 Testing ${role.name.toUpperCase()}`);
      if (role.context) {
        logger.info(`   Context: ${role.context.language}/${role.context.size}`);
      }
      
      const selection = selectBestModels(allModels, role.name, role.context);
      
      if (selection) {
        const primary = selection.primary as any;
        const fallback = selection.fallback as any;
        
        // Check for problematic models
        const primaryId = primary.id.toLowerCase();
        const fallbackId = fallback.id.toLowerCase();
        
        const primaryProblems: string[] = [];
        const fallbackProblems: string[] = [];
        
        // Check for openrouter/auto
        if (primaryId === 'openrouter/auto') {
          primaryProblems.push('Uses openrouter/auto (not a real selection)');
        }
        if (fallbackId === 'openrouter/auto') {
          fallbackProblems.push('Uses openrouter/auto');
        }
        
        // Check for outdated models
        const outdatedPatterns = [
          { pattern: 'gpt-4', exclude: ['turbo', 'o'], name: 'GPT-4 (old)' },
          { pattern: 'o1', exclude: ['preview', 'mini'], name: 'o1 (old)' },
          { pattern: 'claude-3.5', exclude: [], name: 'Claude 3.5' },
          { pattern: 'claude-3-', exclude: ['3.7'], name: 'Claude 3' },
          { pattern: 'gpt-3.5', exclude: [], name: 'GPT 3.5' }
        ];
        
        for (const check of outdatedPatterns) {
          const hasPattern = primaryId.includes(check.pattern);
          const hasExclude = check.exclude.some(e => primaryId.includes(e));
          
          if (hasPattern && !hasExclude) {
            primaryProblems.push(`Outdated: ${check.name}`);
          }
          
          const fallbackHasPattern = fallbackId.includes(check.pattern);
          const fallbackHasExclude = check.exclude.some(e => fallbackId.includes(e));
          
          if (fallbackHasPattern && !fallbackHasExclude) {
            fallbackProblems.push(`Outdated: ${check.name}`);
          }
        }
        
        // Display results
        logger.info(`\n   Primary: ${primary.id}`);
        logger.info(`   Price: $${(parseFloat(primary.pricing?.prompt || 0) * 1000000).toFixed(2)}/M`);
        
        if (primaryProblems.length > 0) {
          logger.error(`   ❌ Issues: ${primaryProblems.join(', ')}`);
        } else {
          logger.info(`   ✅ No issues detected`);
        }
        
        logger.info(`\n   Fallback: ${fallback.id}`);
        logger.info(`   Price: $${(parseFloat(fallback.pricing?.prompt || 0) * 1000000).toFixed(2)}/M`);
        
        if (fallbackProblems.length > 0) {
          logger.warn(`   ⚠️ Issues: ${fallbackProblems.join(', ')}`);
        } else {
          logger.info(`   ✅ No issues detected`);
        }
        
        results.push({
          role: role.name,
          primary: primary.id,
          fallback: fallback.id,
          primaryIssues: primaryProblems,
          fallbackIssues: fallbackProblems
        });
        
      } else {
        logger.error(`   ❌ Could not select models`);
        results.push({
          role: role.name,
          error: 'Selection failed'
        });
      }
    }
    
    // Summary
    logger.info('\n\n📊 SUMMARY');
    logger.info('==========');
    
    const problemCount = results.filter(r => 
      r.primaryIssues?.length > 0 || r.fallbackIssues?.length > 0 || r.error
    ).length;
    
    if (problemCount === 0) {
      logger.info('✅ All roles have valid selections');
      logger.info('✅ No openrouter/auto used');
      logger.info('✅ No obviously outdated models');
    } else {
      logger.warn(`⚠️ ${problemCount} roles have issues`);
      
      results.forEach(r => {
        if (r.primaryIssues?.length > 0 || r.error) {
          logger.error(`   ${r.role}: ${r.error || r.primaryIssues.join(', ')}`);
        }
      });
    }
    
    // Check for latest generation models
    logger.info('\n🔍 Latest Generation Check:');
    const latestPatterns = ['gpt-5', 'o3', 'o4', '2024', '2025', 'preview', 'exp'];
    
    results.forEach(r => {
      if (r.primary) {
        const hasLatest = latestPatterns.some(p => r.primary.toLowerCase().includes(p));
        if (hasLatest) {
          logger.info(`   ${r.role}: ✅ Uses latest generation`);
        } else {
          logger.info(`   ${r.role}: ℹ️ May not be absolute latest`);
        }
      }
    });
    
    return results;
    
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run test
testFixedSelection()
  .then(results => {
    const hasProblems = results.some(r => 
      r.primaryIssues?.length > 0 || r.error
    );
    
    if (!hasProblems) {
      logger.info('\n✅ Test passed! No openrouter/auto or outdated models.');
      process.exit(0);
    } else {
      logger.error('\n❌ Test found issues. Review selections.');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });