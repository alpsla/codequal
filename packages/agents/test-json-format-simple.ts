#!/usr/bin/env npx ts-node

/**
 * Simple test to verify DeepWiki JSON format request
 */

import axios from 'axios';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';

async function testJsonFormat() {
  console.log('🔍 Testing DeepWiki with JSON format request\n');
  
  const prompt = `Analyze this repository and return JSON:
{
  "issues": [
    {"title": "Issue", "severity": "high", "file": "src/file.ts", "line": 10}
  ],
  "testCoverage": {"overall": 75},
  "dependencies": {"outdated": [{"name": "pkg", "current": "1.0", "latest": "2.0"}]}
}`;

  try {
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
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
        max_tokens: 2000,
        response_format: { type: 'json' } // Request JSON format
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    const data = response.data;
    console.log('Response type:', typeof data);
    
    if (typeof data === 'string') {
      console.log('Response is string, length:', data.length);
      console.log('First 200 chars:', data.substring(0, 200));
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(data);
        console.log('\n✅ Successfully parsed as JSON!');
        console.log('Keys:', Object.keys(parsed));
        console.log('Issues:', parsed.issues?.length || 0);
        console.log('Test coverage:', parsed.testCoverage?.overall);
        console.log('Dependencies:', parsed.dependencies?.outdated?.length || 0);
      } catch (e) {
        console.log('\n❌ Failed to parse as JSON');
      }
    } else if (typeof data === 'object') {
      console.log('\n✅ Response is already an object!');
      console.log('Keys:', Object.keys(data));
      
      if (data.choices) {
        console.log('Has choices array');
        const content = data.choices[0]?.message?.content;
        if (content) {
          console.log('Content type:', typeof content);
          if (typeof content === 'string') {
            try {
              const parsed = JSON.parse(content);
              console.log('Content parsed as JSON, keys:', Object.keys(parsed));
            } catch (e) {
              console.log('Content is not valid JSON');
            }
          }
        }
      } else if (data.issues) {
        console.log('Direct JSON response with issues:', data.issues.length);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testJsonFormat().catch(console.error);