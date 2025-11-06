const OpenAI = require('openai');
require('dotenv').config();

const apiKey = process.env.OPENROUTER_API_KEY;

console.log('API Key present:', !!apiKey);
// Security: Removed API key logging to prevent information leakage

const openRouter = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://codequal.com',
    'X-Title': 'CodeQual Test'
  }
});

async function testAuth() {
  try {
    console.log('\nTesting OpenRouter authentication...');
    const response = await openRouter.chat.completions.create({
      model: 'google/gemini-2.5-pro',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10
    });
    console.log('✅ Authentication successful!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error('Status:', error.status);
    console.error('Error details:', error.error);
  }
}

testAuth();
