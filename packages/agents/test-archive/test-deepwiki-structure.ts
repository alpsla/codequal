#!/usr/bin/env ts-node
/**
 * Debug test to examine real DeepWiki response structure
 */

import { config } from 'dotenv';
import * as path from 'path';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

async function examineDeepWikiStructure() {
  console.log('🔍 Examining DeepWiki Response Structure\n');
  
  try {
    // Import services
    const { DeepWikiApiManager } = require('../../apps/api/src/services/deepwiki-api-manager');
    const { analyzeWithStandardFramework } = require('../../apps/api/src/services/standard-orchestrator-service');
    
    const repositoryUrl = 'https://github.com/sindresorhus/is-odd';
    const prNumber = 10;
    
    console.log('📋 Testing with:', { repositoryUrl, prNumber });
    console.log('🔧 USE_DEEPWIKI_MOCK:', process.env.USE_DEEPWIKI_MOCK || 'false');
    console.log('');
    
    // Get DeepWiki responses for both branches
    const deepWikiApiManager = new DeepWikiApiManager();
    
    console.log('🌿 Fetching main branch analysis...');
    const mainAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch: 'main',
      skipCache: true
    });
    
    console.log('\n📊 Main Branch Structure:');
    console.log('  - Has issues array:', Array.isArray(mainAnalysis.issues));
    console.log('  - Issue count:', mainAnalysis.issues?.length || 0);
    
    if (mainAnalysis.issues?.length > 0) {
      console.log('\n  First issue structure:');
      const firstIssue = mainAnalysis.issues[0];
      console.log('    - id:', firstIssue.id);
      console.log('    - severity:', firstIssue.severity);
      console.log('    - category:', firstIssue.category);
      console.log('    - title:', firstIssue.title);
      console.log('    - description:', !!firstIssue.description);
      console.log('    - location:', JSON.stringify(firstIssue.location));
      console.log('    - metadata:', JSON.stringify(firstIssue.metadata));
      console.log('    - codeSnippet:', !!firstIssue.codeSnippet);
      console.log('    - suggestedFix:', !!firstIssue.suggestedFix);
    }
    
    console.log('\n🔀 Fetching PR branch analysis...');
    const prAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
      branch: `pr/${prNumber}`,
      skipCache: true
    });
    
    console.log('\n📊 PR Branch Structure:');
    console.log('  - Has issues array:', Array.isArray(prAnalysis.issues));
    console.log('  - Issue count:', prAnalysis.issues?.length || 0);
    
    if (prAnalysis.issues?.length > 0) {
      console.log('\n  First issue structure:');
      const firstIssue = prAnalysis.issues[0];
      console.log('    - id:', firstIssue.id);
      console.log('    - severity:', firstIssue.severity);
      console.log('    - category:', firstIssue.category);
      console.log('    - title:', firstIssue.title);
      console.log('    - description:', !!firstIssue.description);
      console.log('    - location:', JSON.stringify(firstIssue.location));
      console.log('    - metadata:', JSON.stringify(firstIssue.metadata));
      console.log('    - codeSnippet:', !!firstIssue.codeSnippet);
      console.log('    - suggestedFix:', !!firstIssue.suggestedFix);
    }
    
    // Now test the Standard framework analysis
    console.log('\n🔧 Running Standard Framework Analysis...');
    const result = await analyzeWithStandardFramework(
      repositoryUrl,
      prNumber,
      'main'
    );
    
    console.log('\n📊 Standard Framework Result:');
    console.log('  - Success:', result.success);
    console.log('  - Has report:', !!result.report);
    console.log('  - Has comparison:', !!result.comparison);
    
    if (result.comparison) {
      console.log('\n  Issue Matching Results:');
      console.log('    - New issues:', result.comparison.newIssues?.length || 0);
      console.log('    - Fixed issues:', result.comparison.fixedIssues?.length || 0);
      console.log('    - Unchanged issues:', result.comparison.unchangedIssues?.length || 0);
      console.log('    - Modified issues:', result.comparison.modifiedIssues?.length || 0);
      
      // Check issue IDs
      console.log('\n  Issue ID Analysis:');
      const mainIds = mainAnalysis.issues?.map((i: any) => i.id) || [];
      const prIds = prAnalysis.issues?.map((i: any) => i.id) || [];
      
      console.log('    - Main branch IDs:', mainIds.slice(0, 3).join(', '), '...');
      console.log('    - PR branch IDs:', prIds.slice(0, 3).join(', '), '...');
      console.log('    - IDs are consistent:', mainIds.some((id: string) => prIds.includes(id)));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
examineDeepWikiStructure();