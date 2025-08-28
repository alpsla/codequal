/**
 * Debug why DeepWiki returns 0 issues for PR branch
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { getDeepWikiCache } from './src/standard/services/deepwiki-data-cache';
import { loadEnvironment } from './src/standard/utils/env-loader';
import axios from 'axios';

loadEnvironment();

async function debugDeepWikiPR() {
  console.log('🔍 Debugging DeepWiki PR Analysis\n');
  
  // First, let's call DeepWiki directly to see the raw response
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const cache = getDeepWikiCache();
  
  // Get main branch issues from cache
  const mainAnalysis = await cache.getAnalysis('https://github.com/sindresorhus/ky', 'main');
  if (!mainAnalysis) {
    console.error('❌ No main branch analysis in cache');
    return;
  }
  
  console.log(`📊 Main branch has ${mainAnalysis.issues.length} issues\n`);
  console.log('Sample main issues:');
  mainAnalysis.issues.slice(0, 3).forEach((issue, idx) => {
    console.log(`${idx + 1}. ${issue.title}`);
    console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
  });
  
  // Build the PR analysis prompt with main branch issues
  const prompt = `You are analyzing a Pull Request branch. The main branch has the following issues:

${mainAnalysis.issues.slice(0, 5).map((issue: any, idx: number) => 
  `${idx + 1}. ${issue.title}
   File: ${issue.location.file}
   Line: ${issue.location.line}
   Severity: ${issue.severity}
   Category: ${issue.category}`
).join('\n\n')}

For EACH issue above, check if it still exists in the PR branch.
Return the analysis in this format:

UNCHANGED ISSUES (still exist in PR):
[List each issue that still exists with its number from above]

FIXED ISSUES (resolved in PR):
[List each issue that was fixed with its number from above]

NEW ISSUES (introduced in PR):
[List any new issues found only in the PR branch]

Be specific and check each issue.`;

  console.log('\n📝 Prompt being sent to DeepWiki:');
  console.log('----------------------------------------');
  console.log(prompt.substring(0, 500) + '...');
  console.log('----------------------------------------\n');
  
  try {
    console.log('🚀 Calling DeepWiki API for PR branch...');
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        branch: 'pull/700/head',
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('✅ Response received from DeepWiki\n');
    console.log('Response type:', typeof response.data);
    
    if (typeof response.data === 'string') {
      console.log('\n📄 Raw text response:');
      console.log('----------------------------------------');
      console.log(response.data.substring(0, 1000));
      console.log('----------------------------------------\n');
      
      // Check for key sections
      const hasUnchanged = response.data.includes('UNCHANGED');
      const hasFixed = response.data.includes('FIXED');
      const hasNew = response.data.includes('NEW');
      
      console.log('Response sections found:');
      console.log('  UNCHANGED section:', hasUnchanged ? '✅' : '❌');
      console.log('  FIXED section:', hasFixed ? '✅' : '❌');
      console.log('  NEW section:', hasNew ? '✅' : '❌');
      
    } else {
      console.log('\n📦 JSON response:');
      console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
    }
    
    // Now test the parser
    console.log('\n🔧 Testing DirectDeepWikiApi parser...');
    const api = new DirectDeepWikiApiWithLocationV2();
    const parsed = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'pull/700/head',
      mainBranchIssues: mainAnalysis.issues,
      maxIterations: 1, // Just one iteration for testing
      prNumber: 700
    });
    
    console.log('\n📊 Parsed result:');
    console.log(`  Total issues: ${parsed.issues.length}`);
    console.log(`  Issues by status:`);
    const unchanged = parsed.issues.filter((i: any) => i.status === 'unchanged').length;
    const fixed = parsed.issues.filter((i: any) => i.status === 'fixed').length;
    const newIssues = parsed.issues.filter((i: any) => i.status === 'new').length;
    console.log(`    - Unchanged: ${unchanged}`);
    console.log(`    - Fixed: ${fixed}`);
    console.log(`    - New: ${newIssues}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugDeepWikiPR().catch(console.error);