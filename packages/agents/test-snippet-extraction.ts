/**
 * Test code snippet extraction - BUG-072/083 verification
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';
import axios from 'axios';

async function testSnippetExtraction() {
  console.log('🔍 Testing Code Snippet Extraction (BUG-072/083 Fix Verification)\n');
  
  // Load environment
  loadEnvironment();
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  
  // Prompt that explicitly requests code snippets
  const prompt = `Analyze the ky repository for code issues. Find exactly 3 issues.

For each issue provide EXACTLY in this format:

Issue: [description]
Severity: [critical/high/medium/low]
Category: [security/performance/quality]
File: [file path]
Line: [line number]
Code:
\`\`\`javascript
[ACTUAL CODE SNIPPET FROM THE FILE - 2-3 LINES]
\`\`\`

CRITICAL: Extract REAL code snippets, not placeholders!`;

  try {
    console.log('🚀 Calling DeepWiki with enhanced prompt...');
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
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
    
    console.log('✅ Response received\n');
    
    const api = new DirectDeepWikiApiWithLocationV2();
    const apiAny = api as any;
    
    // Parse the response
    const parsed = apiAny.parseDeepWikiResponse(response.data);
    
    console.log('📊 Parsing Results:');
    console.log('  Total issues found:', parsed.issues.length);
    console.log('');
    
    let snippetsFound = 0;
    let locationsFound = 0;
    
    parsed.issues.forEach((issue: any, idx: number) => {
      console.log(`Issue ${idx + 1}: ${issue.title}`);
      console.log(`  File: ${issue.location?.file || issue.file || 'MISSING'}`);
      console.log(`  Line: ${issue.location?.line || issue.line || 'MISSING'}`);
      console.log(`  Severity: ${issue.severity}`);
      console.log(`  Category: ${issue.category}`);
      
      if (issue.codeSnippet) {
        snippetsFound++;
        console.log(`  Code Snippet: YES (${issue.codeSnippet.split('\n').length} lines)`);
        console.log(`  Preview: ${issue.codeSnippet.substring(0, 60)}...`);
      } else {
        console.log(`  Code Snippet: NO ❌`);
      }
      
      if (issue.location?.file && issue.location?.file !== 'unknown') {
        locationsFound++;
      }
      
      console.log('');
    });
    
    console.log('📈 Summary:');
    console.log(`  ✅ Issues with code snippets: ${snippetsFound}/${parsed.issues.length}`);
    console.log(`  ✅ Issues with valid locations: ${locationsFound}/${parsed.issues.length}`);
    
    if (snippetsFound === parsed.issues.length) {
      console.log('\n🎉 BUG-072/083 FIXED! All issues have code snippets!');
    } else {
      console.log('\n⚠️  BUG-072/083 partially fixed. Some issues still missing snippets.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testSnippetExtraction().catch(console.error);