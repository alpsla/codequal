/**
 * Force fresh DeepWiki analysis bypassing cache
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';

loadEnvironment();

async function forceFreshAnalysis() {
  console.log('🔍 Forcing Fresh DeepWiki Analysis\n');
  
  const api = new DirectDeepWikiApiWithLocationV2();
  
  try {
    // Analyze main branch with cache bypass
    console.log('📍 Analyzing main branch (bypassing cache)...');
    const mainResult = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      useCache: false,  // Bypass cache
      maxIterations: 1, // Just one iteration for testing
      branch: 'main'
    });
    
    console.log('\n📊 Main branch results:');
    console.log(`  Total issues: ${mainResult.issues.length}`);
    if (mainResult.issues.length > 0) {
      console.log('  Sample issues:');
      mainResult.issues.slice(0, 3).forEach((issue: any, idx: number) => {
        console.log(`  ${idx + 1}. ${issue.title}`);
        console.log(`     File: ${issue.location?.file || issue.file}`);
        console.log(`     Line: ${issue.location?.line || issue.line}`);
        console.log(`     Severity: ${issue.severity}`);
      });
    }
    
    // If we got main branch issues, test PR analysis
    if (mainResult.issues.length > 0) {
      console.log('\n📍 Analyzing PR branch with main context...');
      const prResult = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
        useCache: false,
        maxIterations: 1,
        branch: 'pull/700/head',
        prNumber: 700,
        mainBranchIssues: mainResult.issues
      });
      
      console.log('\n📊 PR branch results:');
      console.log(`  Total issues: ${prResult.issues.length}`);
      
      const unchanged = prResult.issues.filter((i: any) => i.status === 'unchanged');
      const fixed = prResult.issues.filter((i: any) => i.status === 'fixed');
      const newIssues = prResult.issues.filter((i: any) => i.status === 'new');
      
      console.log(`  Issues by status:`);
      console.log(`    - Unchanged: ${unchanged.length}`);
      console.log(`    - Fixed: ${fixed.length}`);
      console.log(`    - New: ${newIssues.length}`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

forceFreshAnalysis().catch(console.error);