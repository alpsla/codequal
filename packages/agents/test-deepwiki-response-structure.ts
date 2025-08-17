import axios from 'axios';

async function testResponseStructure() {
  console.log('🔍 Testing DeepWiki response structure...\n');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/chat/completions/stream',
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: 'Find 3 code issues in PR #700. Return title, severity, file path.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );
    
    console.log('Response type:', typeof response.data);
    console.log('Response is string?', typeof response.data === 'string');
    console.log('Response has choices?', response.data?.choices !== undefined);
    
    if (typeof response.data === 'string') {
      console.log('\n📝 String response (first 500 chars):');
      console.log(response.data.substring(0, 500));
    } else if (response.data?.choices) {
      console.log('\n📦 JSON response with choices:');
      console.log('Number of choices:', response.data.choices.length);
      if (response.data.choices[0]?.message?.content) {
        console.log('Content type:', typeof response.data.choices[0].message.content);
        console.log('Content (first 500 chars):');
        console.log(response.data.choices[0].message.content.substring(0, 500));
      }
    } else {
      console.log('\n❓ Unexpected response structure:');
      console.log(JSON.stringify(response.data, null, 2).substring(0, 500));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testResponseStructure();