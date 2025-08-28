const axios = require('axios');

async function testDeepWiki() {
  console.log('🔍 Testing DeepWiki API directly...');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: 'Find one security issue in this repository. Provide: Title, Severity (critical/high/medium/low), File path, Line number.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('✅ Response received');
    console.log('Type:', typeof response.data);
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWiki();
