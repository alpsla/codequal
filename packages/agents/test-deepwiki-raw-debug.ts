import axios from 'axios';

async function testDeepWikiRaw() {
  console.log('🔍 Testing raw DeepWiki API response...\n');
  
  const requestPayload = {
    repo_url: 'https://github.com/sindresorhus/ky',
    messages: [{
      role: 'user',
      content: `Analyze PR #700 for code quality issues, bugs, and improvements. 
Find at least 5 issues with the following format:
- Issue title/description
- Severity (critical/high/medium/low)
- File path and line number
- Specific code problem
Return as structured analysis.`
    }],
    stream: false,
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 4000
  };
  
  console.log('📤 Request payload:', JSON.stringify(requestPayload, null, 2));
  console.log('\n' + '='.repeat(80) + '\n');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      requestPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', response.headers);
    console.log('\n' + '='.repeat(80) + '\n');
    
    if (typeof response.data === 'string') {
      console.log('📝 Response (string):\n', response.data);
    } else {
      console.log('📝 Response (JSON):\n', JSON.stringify(response.data, null, 2));
    }
    
    // Try to extract content if it's in OpenAI format
    if (response.data?.choices?.[0]?.message?.content) {
      console.log('\n' + '='.repeat(80) + '\n');
      console.log('💬 Extracted content:\n', response.data.choices[0].message.content);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testDeepWikiRaw().catch(console.error);