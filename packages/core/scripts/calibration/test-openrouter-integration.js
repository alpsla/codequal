/**
 * DeepWiki OpenRouter Integration Test
 * 
 * This script tests the DeepWiki API with OpenRouter integration.
 * It validates that DeepWiki is properly configured to use OpenRouter
 * and can access multiple models through the unified interface.
 */

const axios = require('axios');

// Load environment variables from .env file
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const TEST_MODEL = 'anthropic/claude-3-7-sonnet'; // Focus on testing this model specifically
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
    return true;
  } catch (error) {
    console.error('❌ Cannot connect to DeepWiki API');
    console.error(`Error: ${error.message}`);
    
    console.log('\nTroubleshooting steps:');
    console.log('1. Check if port forwarding is active:');
    console.log('   ps aux | grep "kubectl port-forward.*8001:8001"');
    console.log('2. Restart port forwarding if needed:');
    console.log('   kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001');
    console.log('3. Verify DeepWiki pod is running:');
    console.log('   kubectl get pods -n codequal-dev -l app=deepwiki-fixed');
    
    return false;
  }
}

/**
 * Test OpenRouter configuration with Claude 3.7 Sonnet
 */
async function testModel() {
  console.log(`\n=== Testing model: ${TEST_MODEL} ===`);
  
  try {
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions`, {
      model: TEST_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: TEST_PROMPT }
      ],
      max_tokens: 100,
      temperature: 0.3
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Successfully received response');
    
    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      console.log('--- Response Content ---');
      console.log(response.data.choices[0].message.content.trim());
      console.log('------------------------');
    } else {
      console.log('Response structure:', JSON.stringify(response.data, null, 2));
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error testing model ${TEST_MODEL}`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
      
      if (error.response.data?.error?.message) {
        console.error(`Error message: ${error.response.data.error.message}`);
      }
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    console.log('\nPossible solutions:');
    console.log('1. Verify OPENROUTER_API_KEY is valid and has access to this model');
    console.log('2. Check if the model name format is correct (provider/model-name)');
    console.log('3. Verify the model is available in your OpenRouter subscription');
    
    return false;
  }
}

/**
 * Test streaming API with OpenRouter
 */
async function testStreaming() {
  console.log(`\n=== Testing streaming with model: ${TEST_MODEL} ===`);
  
  try {
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: TEST_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in exactly five words.' }
      ],
      max_tokens: 20,
      temperature: 0.3,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Stream initiated successfully');
    console.log('--- Streaming Response ---');
    
    let responseContent = '';
    
    return new Promise((resolve) => {
      response.data.on('data', (chunk) => {
        const data = chunk.toString();
        process.stdout.write('.');
        
        if (data.includes('data: ')) {
          const jsonStr = data.replace('data: ', '').trim();
          if (jsonStr !== '[DONE]') {
            try {
              const json = JSON.parse(jsonStr);
              if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                responseContent += json.choices[0].delta.content;
              }
            } catch (e) {
              // Ignore parse errors in stream
            }
          }
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
  console.log('DeepWiki OpenRouter Integration Test (Claude 3.7 Sonnet)');
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
  
  // Test the model
  const modelSuccess = await testModel();
  
  // Test streaming if regular test was successful
  if (modelSuccess) {
    await testStreaming();
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  
  if (modelSuccess) {
    console.log(`\n✅ SUCCESS: DeepWiki is properly configured to use OpenRouter with ${TEST_MODEL}!`);
    console.log('The orchestrator can now use DeepWiki with this model for repository analysis.');
  } else {
    console.log(`\n❌ FAILURE: Could not connect to ${TEST_MODEL} through OpenRouter.`);
    console.log('Review the logs above for specific error details and troubleshooting steps.');
  }
}

// Run the tests
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});