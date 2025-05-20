/**
 * DeepWiki OpenRouter Streaming Test
 * 
 * This script tests the DeepWiki streaming API with OpenRouter integration,
 * using claude-3-7-sonnet model.
 */

const axios = require('axios');

// Load environment variables from .env file
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const TEST_MODEL = 'anthropic/claude-3-7-sonnet';
const TEST_REPO_URL = 'https://github.com/google/material-design-icons'; // Smaller repository
const TEST_PROMPT = 'Identify yourself and confirm which AI model is responding.';

/**
 * Test DeepWiki API connectivity
 */
async function testApiConnectivity() {
  console.log('\n=== Testing DeepWiki API Connectivity ===');
  
  try {
    const response = await axios.get(DEEPWIKI_URL);
    console.log('✅ DeepWiki API is accessible');
    console.log(`API Version: ${response.data.version || 'Unknown'}`);
    console.log('Available endpoints:', JSON.stringify(response.data.endpoints, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Cannot connect to DeepWiki API');
    console.error(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Test streaming API with OpenRouter's Claude 3.7 Sonnet
 */
async function testStreaming() {
  console.log(`\n=== Testing streaming with model: ${TEST_MODEL} ===`);
  console.log(`Repository URL: ${TEST_REPO_URL}`);
  
  try {
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: TEST_MODEL,
      repo_url: TEST_REPO_URL, // Required parameter
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Give a brief 2-3 sentence summary of what this repository is about.' }
      ],
      max_tokens: 100,
      temperature: 0.3,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 180000 // 3 minute timeout
    });
    
    console.log('✅ Stream initiated successfully');
    console.log('--- Streaming Response ---');
    
    let responseContent = '';
    
    return new Promise((resolve) => {
      response.data.on('data', (chunk) => {
        const data = chunk.toString();
        
        if (data.includes('data: ')) {
          const jsonStr = data.replace('data: ', '').trim();
          if (jsonStr !== '[DONE]') {
            try {
              const json = JSON.parse(jsonStr);
              if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                responseContent += json.choices[0].delta.content;
                process.stdout.write(json.choices[0].delta.content);
              }
            } catch (e) {
              // Ignore parse errors in stream
              process.stdout.write('.');
            }
          } else {
            process.stdout.write('[DONE]');
          }
        } else {
          process.stdout.write('.');
        }
      });
      
      response.data.on('end', () => {
        console.log('\n--- Full response ---');
        console.log(responseContent || 'No content received');
        console.log('---------------------');
        resolve(true);
      });
      
      response.data.on('error', (err) => {
        console.error('❌ Stream error:', err.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Error initiating stream');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('DeepWiki OpenRouter Streaming Test (Claude 3.7 Sonnet)');
  console.log('=====================================================');
  console.log(`DeepWiki URL: ${DEEPWIKI_URL}`);
  console.log(`Target Model: ${TEST_MODEL}`);
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    console.error('Please make sure the .env file contains a valid OPENROUTER_API_KEY');
    return;
  }
  
  // Test API connectivity
  const apiAccessible = await testApiConnectivity();
  if (!apiAccessible) {
    console.error('\n❌ Cannot proceed with tests due to connectivity issues');
    return;
  }
  
  // Test streaming
  const streamingSuccess = await testStreaming();
  
  // Print summary
  console.log('\n=== Test Summary ===');
  
  if (streamingSuccess) {
    console.log(`\n✅ SUCCESS: DeepWiki streaming API is working with OpenRouter and ${TEST_MODEL}!`);
    console.log('The orchestrator can now use DeepWiki streaming API with this model for repository analysis.');
  } else {
    console.log(`\n❌ FAILURE: Could not stream responses from ${TEST_MODEL} through OpenRouter.`);
    console.log('Review the logs above for specific error details and troubleshooting steps.');
  }
}

// Run the tests
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});