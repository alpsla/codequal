/**
 * Test to see what DeepWiki actually returns for real repositories
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';

loadEnvironment();

async function testDeepWikiRawResponse() {
  console.log('🔍 Testing DeepWiki Raw Response\n');
  
  const apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const apiKey = process.env.DEEPWIKI_API_KEY || 'test-key';
  
  try {
    console.log('📡 Calling DeepWiki API directly...\n');
    
    const response = await axios.post(
      `${apiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze this repository and find exactly 3 issues. For each issue, provide:
1. The issue description
2. The severity (critical/high/medium/low)
3. The exact file path
4. The exact line number
5. THE ACTUAL CODE from that line (not a description, the REAL CODE)

Format:
1. Issue: [description]
   Severity: [level]
   File path: [path]
   Line number: [number]
   Code snippet: [THE ACTUAL CODE LINE]`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );
    
    console.log('📦 Raw Response Type:', typeof response.data);
    console.log('=' .repeat(80));
    
    if (typeof response.data === 'string') {
      console.log('📝 Text Response:');
      console.log(response.data);
      console.log('=' .repeat(80));
      
      // Try to parse for code snippets
      const snippetMatches = response.data.match(/Code snippet:\s*(.+)/gi);
      if (snippetMatches) {
        console.log('\n✅ Found code snippets:');
        snippetMatches.forEach((match, i) => {
          console.log(`  ${i + 1}. ${match}`);
        });
      } else {
        console.log('\n❌ No code snippets found in response');
      }
      
      // Check what DeepWiki is actually returning for "code"
      const lines = response.data.split('\n');
      console.log('\n🔍 Lines containing "code" or "snippet":');
      lines.forEach(line => {
        if (line.toLowerCase().includes('code') || line.toLowerCase().includes('snippet')) {
          console.log(`  > ${line.trim()}`);
        }
      });
      
    } else {
      console.log('📦 JSON Response:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    console.log('\n🎯 Key Observations:');
    console.log('1. Is DeepWiki actually reading the repository files?');
    console.log('2. Is DeepWiki returning real code or just descriptions?');
    console.log('3. What format is DeepWiki using for code snippets?');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testDeepWikiRawResponse().catch(console.error);