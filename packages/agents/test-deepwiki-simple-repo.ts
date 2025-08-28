/**
 * Test DeepWiki with a simple, known-good repository
 */

import axios from 'axios';

async function testSimpleRepo() {
  console.log('🔍 Testing DeepWiki with simple repository\n');
  
  const DEEPWIKI_URL = 'http://localhost:8001';
  const DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  // Test with a valid simple repository
  const request = {
    repo_url: 'https://github.com/sindresorhus/ky', // Valid repository
    messages: [{
      role: 'user',
      content: `Find the most critical code quality issue in this repository.
Return the result in this exact format:
Issue: [issue title]
Severity: critical
File: [exact file path]
Line: [line number]
Description: [brief description]`
    }],
    stream: false,
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 500
  };
  
  try {
    console.log('📤 Sending analysis request...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 90000 // 90 seconds
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Response received in ${duration}s\n`);
    
    // Show the response
    const responseText = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data, null, 2);
    
    console.log('📝 Full Response:');
    console.log('='.repeat(60));
    console.log(responseText);
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.log('❌ Request failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSimpleRepo().catch(console.error);
