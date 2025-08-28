/**
 * Verify Code Snippets and Fix Suggestions Quality
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';
import axios from 'axios';

async function verifySnippetsAndFixes() {
  console.log('🔍 Verifying Code Snippets and Fix Suggestions Quality\n');
  console.log('=' .repeat(60) + '\n');
  
  loadEnvironment();
  
  // Test with a real repository
  const repoUrl = 'https://github.com/sindresorhus/ky';
  
  try {
    const api = new DirectDeepWikiApiWithLocationV2();
    
    console.log('📌 Step 1: Getting raw DeepWiki response to check what we receive...\n');
    
    // First, let's see what DeepWiki actually returns
    const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: `Analyze this repository for code issues. Find exactly 3 issues.

For each issue provide:
Issue: [description]
Severity: [critical/high/medium/low]
Category: [security/performance/quality]
File: [exact file path]
Line: [exact line number]
Code:
\`\`\`javascript
[ACTUAL CODE FROM THE FILE - 2-3 LINES]
\`\`\`

IMPORTANT: The code snippet MUST be the ACTUAL code from the repository, not placeholder text.`
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
    
    console.log('📝 Raw DeepWiki Response (first 1000 chars):');
    console.log('-'.repeat(60));
    const rawResponse = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    console.log(rawResponse.substring(0, 1000));
    console.log('-'.repeat(60) + '\n');
    
    // Parse the response
    const apiAny = api as any;
    const parsed = apiAny.parseDeepWikiResponse(response.data);
    
    console.log('📊 Parsed Issues Analysis:');
    console.log('=' .repeat(60));
    
    let issuesWithSnippets = 0;
    let issuesWithLocation = 0;
    let issuesMissingData = [];
    
    parsed.issues.forEach((issue: any, idx: number) => {
      console.log(`\n🔸 Issue ${idx + 1}: ${issue.title}`);
      console.log('-'.repeat(50));
      
      // Check location
      const hasValidLocation = issue.location?.file && 
                              issue.location?.file !== 'unknown' && 
                              issue.location?.line && 
                              issue.location?.line > 0;
      
      if (hasValidLocation) {
        issuesWithLocation++;
        console.log(`✅ Location: ${issue.location.file}:${issue.location.line}`);
      } else {
        console.log(`❌ Location: ${issue.location?.file || 'MISSING'}:${issue.location?.line || 'MISSING'}`);
        issuesMissingData.push({ issue: issue.title, missing: 'location' });
      }
      
      // Check code snippet
      const hasCodeSnippet = issue.codeSnippet && 
                            issue.codeSnippet.length > 0 && 
                            !issue.codeSnippet.includes('[exact code not provided]') &&
                            !issue.codeSnippet.includes('// code here');
      
      if (hasCodeSnippet) {
        issuesWithSnippets++;
        console.log(`✅ Code Snippet: YES (${issue.codeSnippet.split('\n').length} lines)`);
        console.log(`   Preview: "${issue.codeSnippet.substring(0, 50)}..."`);
      } else {
        console.log(`❌ Code Snippet: ${issue.codeSnippet ? 'PLACEHOLDER/INVALID' : 'MISSING'}`);
        if (issue.codeSnippet) {
          console.log(`   Found: "${issue.codeSnippet.substring(0, 50)}"`);
        }
        issuesMissingData.push({ issue: issue.title, missing: 'code snippet' });
      }
      
      // Check severity and category
      console.log(`📊 Severity: ${issue.severity || 'MISSING'}`);
      console.log(`📁 Category: ${issue.category || 'MISSING'}`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('📈 Summary Statistics:');
    console.log(`  Total Issues: ${parsed.issues.length}`);
    console.log(`  ✅ With Valid Location: ${issuesWithLocation}/${parsed.issues.length}`);
    console.log(`  ✅ With Code Snippets: ${issuesWithSnippets}/${parsed.issues.length}`);
    
    if (issuesMissingData.length > 0) {
      console.log(`\n⚠️  Issues Missing Data:`);
      issuesMissingData.forEach(item => {
        console.log(`  - "${item.issue}" missing: ${item.missing}`);
      });
    }
    
    // Now test fix suggestions
    console.log('\n' + '=' .repeat(60));
    console.log('📌 Step 2: Testing Fix Suggestions Quality...\n');
    
    const { FixSuggestionAgentV2 } = await import('./src/standard/services/fix-suggestion-agent-v2');
    const fixAgent = new FixSuggestionAgentV2();
    
    // Test with a couple of the parsed issues
    const testIssues = parsed.issues.slice(0, 2);
    
    for (const issue of testIssues) {
      console.log(`\n🔧 Generating fix for: ${issue.title}`);
      console.log('-'.repeat(50));
      
      try {
        const fixes = await fixAgent.generateFixes([issue]);
        
        if (fixes && fixes.length > 0) {
          const fix = fixes[0];
          
          // Check if fix is relevant to the issue
          const fixDescription = (fix as any).description || (fix as any).suggestion || (fix as any).fixDescription || '';
          const fixCode = (fix as any).fixedCode || '';
          
          console.log(`📝 Fix Description: ${fixDescription.substring(0, 100)}...`);
          
          // Check relevance
          const isRelevant = fixDescription.toLowerCase().includes(issue.title.toLowerCase().split(' ')[0]) ||
                            fixDescription.toLowerCase().includes(issue.category) ||
                            (issue.codeSnippet && fixCode.includes(issue.codeSnippet.substring(0, 20)));
          
          if (isRelevant) {
            console.log(`✅ Fix appears RELEVANT to the issue`);
          } else {
            console.log(`⚠️  Fix may be GENERIC/UNRELATED`);
            console.log(`   Issue was about: ${issue.title}`);
            console.log(`   Fix talks about: ${fixDescription.substring(0, 50)}`);
          }
          
          // Check if fix has actual code
          if (fixCode && fixCode.length > 10 && !fixCode.includes('// TODO')) {
            console.log(`✅ Fix includes actual code (${fixCode.split('\n').length} lines)`);
          } else {
            console.log(`❌ Fix has no real code or just placeholders`);
          }
        } else {
          console.log(`❌ No fix generated for this issue`);
        }
      } catch (error: any) {
        console.log(`❌ Error generating fix: ${error.message}`);
      }
    }
    
    // Final assessment
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 FINAL ASSESSMENT:');
    console.log('-'.repeat(60));
    
    const snippetScore = (issuesWithSnippets / parsed.issues.length) * 100;
    const locationScore = (issuesWithLocation / parsed.issues.length) * 100;
    
    console.log(`\n📊 Code Snippet Quality: ${snippetScore.toFixed(0)}%`);
    if (snippetScore < 50) {
      console.log(`   ❌ CRITICAL: Most issues missing code snippets!`);
      console.log(`   → DeepWiki may not be extracting actual code from repos`);
    } else if (snippetScore < 80) {
      console.log(`   ⚠️  WARNING: Some issues missing code snippets`);
    } else {
      console.log(`   ✅ GOOD: Most issues have code snippets`);
    }
    
    console.log(`\n📍 Location Accuracy: ${locationScore.toFixed(0)}%`);
    if (locationScore < 50) {
      console.log(`   ❌ CRITICAL: Most issues missing file/line info!`);
      console.log(`   → DeepWiki may not be analyzing actual repository structure`);
    } else if (locationScore < 80) {
      console.log(`   ⚠️  WARNING: Some issues missing precise locations`);
    } else {
      console.log(`   ✅ GOOD: Most issues have precise locations`);
    }
    
    console.log(`\n🔧 Fix Suggestion Quality:`);
    console.log(`   Check the fixes above - are they relevant to the actual issues?`);
    console.log(`   If fixes are generic, the fix suggestion system needs improvement.`);
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

verifySnippetsAndFixes().catch(console.error);