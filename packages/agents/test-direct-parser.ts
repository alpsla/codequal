/**
 * Test the parser directly with real DeepWiki response
 */

import axios from 'axios';
import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';

loadEnvironment();

async function testParser() {
  console.log('🔍 Testing Parser with Real DeepWiki Response\n');
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  
  const prompt = `Analyze the ky repository for code issues. Find exactly 5 issues.

For each issue provide:
Issue: [description]
Severity: [critical/high/medium/low]
Category: [security/performance/quality]
File: [file path]
Line: [line number]
Code:
\`\`\`javascript
[code snippet]
\`\`\``;

  try {
    console.log('🚀 Calling DeepWiki...');
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
    
    console.log('📝 Raw response type:', typeof response.data);
    console.log('First 500 chars:', String(response.data).substring(0, 500));
    console.log('\n');
    
    const parsed = apiAny.parseDeepWikiResponse(response.data);
    
    console.log('📊 Parsed result:');
    console.log('  Issues found:', parsed.issues.length);
    
    if (parsed.issues.length > 0) {
      console.log('\n✅ Parser working! Issues:');
      parsed.issues.forEach((issue: any, idx: number) => {
        console.log(`${idx + 1}. ${issue.title}`);
        console.log(`   File: ${issue.location?.file || issue.file}`);
        console.log(`   Line: ${issue.location?.line || issue.line}`);
        console.log(`   Severity: ${issue.severity}`);
      });
    } else {
      console.log('\n❌ Parser failed to extract issues');
      console.log('Full response for debugging:');
      console.log(response.data);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testParser().catch(console.error);