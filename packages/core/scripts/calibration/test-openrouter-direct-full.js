/**
 * Direct test script for OpenRouter with repository analysis
 * Tests the direct integration with OpenRouter without DeepWiki
 */

const axios = require('axios');

// Configuration
// SECURITY: Never hardcode API keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY environment variable is required');
  process.exit(1);
}
const REPO_URL = 'https://github.com/jpadilla/pyjwt';
const MODEL = 'anthropic/claude-3-7-sonnet'; // Known working model

console.log('Direct OpenRouter Repository Analysis Test');
console.log('=========================================');
console.log(`Repository: ${REPO_URL}`);
console.log(`Model: ${MODEL}`);
console.log('------------------------------------------');

async function testOpenRouter() {
  console.log('Testing OpenRouter API directly...');
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert code analyst.'
          },
          { 
            role: 'user', 
            content: `Analyze the GitHub repository at ${REPO_URL} and provide a brief summary (2-3 paragraphs) of what the repository does and its main components.`
          }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/asyncfuncai/codequal',
          'X-Title': 'OpenRouter Repository Analysis Test'
        }
      }
    );
    
    console.log('\n=== Repository Analysis ===\n');
    console.log(response.data.choices[0].message.content);
    console.log('\n=== Analysis Complete ===');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing OpenRouter:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

// Run the test
testOpenRouter().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});