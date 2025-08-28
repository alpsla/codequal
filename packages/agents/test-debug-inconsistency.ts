#!/usr/bin/env npx ts-node
/**
 * Debug inconsistent DeepWiki results
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';

async function debugInconsistency() {
  console.log('=== Debugging DeepWiki Inconsistency ===\n');
  
  // Force real DeepWiki
  delete process.env.USE_DEEPWIKI_MOCK;
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  const deepwikiClient = new DirectDeepWikiApiWithLocation();
  const categorizer = new PRAnalysisCategorizer();
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  // Run analysis 3 times to check consistency
  for (let i = 1; i <= 3; i++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`RUN ${i}/3`);
    console.log('='.repeat(60));
    
    try {
      // Analyze main branch
      console.log('\nAnalyzing MAIN branch...');
      const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
        branch: 'main',
        useCache: false  // Force fresh analysis
      });
      
      console.log(`Main issues: ${mainResult.issues?.length || 0}`);
      if (mainResult.issues?.length > 0) {
        console.log('First 3 issues:');
        mainResult.issues.slice(0, 3).forEach((issue: any) => {
          console.log(`  - ${issue.title || issue.message} (${issue.severity})`);
        });
      }
      
      // Analyze PR branch
      console.log('\nAnalyzing PR branch...');
      const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
        branch: `pull/${prNumber}/head`,
        useCache: false,
        mainBranchIssues: mainResult.issues
      });
      
      console.log(`PR issues: ${prResult.issues?.length || 0}`);
      if (prResult.issues?.length > 0) {
        console.log('First 3 issues:');
        prResult.issues.slice(0, 3).forEach((issue: any) => {
          console.log(`  - ${issue.title || issue.message} (${issue.severity})`);
        });
      }
      
      // Categorize
      const categorized = categorizer.categorizeIssues(
        mainResult.issues || [],
        prResult.issues || []
      );
      
      console.log('\nCategorization:');
      console.log(`  NEW: ${categorized.newIssues?.length || 0}`);
      console.log(`  FIXED: ${categorized.fixedIssues?.length || 0}`);
      console.log(`  UNCHANGED: ${categorized.unchangedIssues?.length || 0}`);
      
      // Add delay between runs
      if (i < 3) {
        console.log('\nWaiting 5 seconds before next run...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error: any) {
      console.error(`\n❌ Run ${i} failed:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log('\nIf results vary between runs, DeepWiki is non-deterministic.');
  console.log('This is a critical issue for production use!');
}

// Run the debug
debugInconsistency().catch(console.error);