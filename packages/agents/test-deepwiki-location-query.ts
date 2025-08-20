#!/usr/bin/env ts-node

/**
 * Test DeepWiki Location Query
 * 
 * Test if we can get real file locations from DeepWiki
 * by using different prompts and formats
 */

import axios from 'axios';

async function testDeepWikiLocations() {
  console.log('🔍 Testing DeepWiki Location Finding Capabilities\n');
  console.log('=' .repeat(80));
  
  const DEEPWIKI_URL = 'http://localhost:8001/chat/completions/stream';
  const TEST_REPO = 'https://github.com/sindresorhus/ky';
  
  // Test 1: Explicit location request in prompt
  console.log('\n📊 Test 1: Requesting exact file locations in prompt\n');
  
  try {
    const response1 = await axios.post(DEEPWIKI_URL, {
      repo_url: TEST_REPO,
      messages: [{
        role: 'user',
        content: `Analyze this repository for security issues. 
CRITICAL REQUIREMENT: For each issue found, provide the EXACT file path and line number where the issue exists.
DO NOT use placeholder locations like "unknown" or generate random locations.
Format each issue as:
- Issue: [description]
- File: [exact file path from repository]
- Line: [exact line number]
- Severity: [critical/high/medium/low]

If you cannot determine the exact location, search the codebase to find it.`
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('Response (truncated):');
    const content = typeof response1.data === 'string' 
      ? response1.data 
      : JSON.stringify(response1.data, null, 2);
    console.log(content.substring(0, 1000));
    
  } catch (error: any) {
    console.error('Test 1 failed:', error.message);
  }
  
  // Test 2: Ask for JSON format with locations
  console.log('\n📊 Test 2: Requesting JSON format with exact locations\n');
  
  try {
    const response2 = await axios.post(DEEPWIKI_URL, {
      repo_url: TEST_REPO,
      messages: [{
        role: 'user',
        content: `Analyze this repository and return issues in JSON format.
IMPORTANT: Each issue MUST include the exact file path and line number from the actual codebase.
Return JSON in this exact format:
{
  "issues": [
    {
      "title": "Issue description",
      "file": "exact/path/to/file.ts",
      "line": <exact line number>,
      "severity": "high|medium|low",
      "category": "security|performance|quality"
    }
  ]
}
DO NOT use "unknown" or placeholder values. Only include issues where you can identify the exact location.`
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0,
      max_tokens: 2000
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('Response (truncated):');
    const content = typeof response2.data === 'string' 
      ? response2.data 
      : JSON.stringify(response2.data, null, 2);
    console.log(content.substring(0, 1000));
    
  } catch (error: any) {
    console.error('Test 2 failed:', error.message);
  }
  
  // Test 3: Interactive location finding
  console.log('\n📊 Test 3: Interactive - find location for specific issue\n');
  
  try {
    const response3 = await axios.post(DEEPWIKI_URL, {
      repo_url: TEST_REPO,
      messages: [
        {
          role: 'user',
          content: 'Find security vulnerabilities in this repository'
        },
        {
          role: 'assistant',
          content: 'I found several security issues including potential XSS vulnerabilities and missing input validation.'
        },
        {
          role: 'user',
          content: `For the XSS vulnerability you mentioned, please provide:
1. The EXACT file path in the repository
2. The EXACT line number where it occurs
3. The actual code snippet from that location
Search the codebase if needed to find the exact location.`
        }
      ],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0,
      max_tokens: 1000
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('Response:');
    const content = typeof response3.data === 'string' 
      ? response3.data 
      : JSON.stringify(response3.data, null, 2);
    console.log(content);
    
  } catch (error: any) {
    console.error('Test 3 failed:', error.message);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n💡 Summary:');
  console.log('- Check if DeepWiki can provide real file locations when explicitly asked');
  console.log('- See if different prompt formats yield better location accuracy');
  console.log('- Determine if we need to build our own location finder or if DeepWiki can do it');
}

// Run the test
testDeepWikiLocations().catch(console.error);