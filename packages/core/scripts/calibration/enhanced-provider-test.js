/**
 * Enhanced Provider Test Script
 * 
 * This script tests each provider's connectivity to DeepWiki with:
 * - Extremely long timeouts (10 minutes)
 * - Simplified test repository
 * - Very small message payload
 * - Detailed error reporting
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../dist/utils/logger');

// Create a logger for the validator
const logger = createLogger('EnhancedProviderTest');

// Get API configuration from environment
const apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const googleKey = process.env.GOOGLE_API_KEY;
const deepseekKey = process.env.DEEPSEEK_API_KEY;

// First, check if all required keys are available
console.log('\nAPI Key Status:');
console.log('--------------------');
if (!openaiKey) console.log('❌ OPENAI_API_KEY not found in environment');
else console.log('✅ OPENAI_API_KEY found');

if (!anthropicKey) console.log('❌ ANTHROPIC_API_KEY not found in environment');
else console.log('✅ ANTHROPIC_API_KEY found');

if (!googleKey) console.log('❌ GOOGLE_API_KEY not found in environment');
else console.log('✅ GOOGLE_API_KEY found');

if (!deepseekKey) console.log('❌ DEEPSEEK_API_KEY not found in environment');
else console.log('✅ DEEPSEEK_API_KEY found');

// Providers to test with their configs
const PROVIDERS = [
  {
    name: 'openai',
    model: 'gpt-4o',
    key: openaiKey
  },
  {
    name: 'anthropic',
    model: 'claude-3-7-sonnet',
    key: anthropicKey
  },
  {
    name: 'google',
    model: 'gemini-2.5-pro-preview-05-06',
    key: googleKey
  },
  {
    name: 'deepseek',
    model: 'deepseek-coder',
    key: deepseekKey
  }
];

// Test basic connectivity to DeepWiki API
async function testBasicConnectivity() {
  try {
    console.log(`\nTesting connectivity to DeepWiki API (${apiUrl})...`);
    
    // Using a larger timeout for the connection test
    const response = await axios.get(apiUrl, {
      timeout: 10000 // 10 seconds
    });
    
    if (response.status === 200) {
      console.log(`✅ Connected to DeepWiki API successfully`);
      
      // Check if the API payload includes the expected endpoints
      if (response.data && response.data.endpoints) {
        console.log('✅ API returned proper endpoint information:');
        console.log(JSON.stringify(response.data.endpoints, null, 2));
        
        // Verify if the chat completion endpoint exists
        if (response.data.endpoints && 
            response.data.endpoints.Chat && 
            response.data.endpoints.Chat.some(e => e.includes('/chat/completions/stream'))) {
          console.log('✅ Chat completion endpoint is available');
        } else {
          console.log('❌ Chat completion endpoint is not in the API response');
        }
      } else {
        console.log('⚠️ API response does not include endpoint information');
        console.log(JSON.stringify(response.data, null, 2));
      }
      
      return true;
    } else {
      console.log(`❌ Connected but received unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to connect to DeepWiki API: ${error.message}`);
    
    // Test general internet connectivity
    try {
      await axios.get('https://www.google.com', { timeout: 5000 });
      console.log('✅ General internet connectivity is working');
    } catch (netError) {
      console.log('❌ General internet connectivity test also failed');
    }
    
    return false;
  }
}

// Test a single provider with a small repository
async function testProvider(provider) {
  console.log(`\n=======================================`);
  console.log(`Testing provider: ${provider.name} / ${provider.model}`);
  console.log(`=======================================`);
  
  if (!provider.key) {
    console.log(`❌ Skipping ${provider.name} - API key not provided`);
    return { success: false, error: 'API key not provided' };
  }
  
  // We're using a very tiny repository to minimize clone time
  const testRepo = 'https://github.com/microsoft/fluentui-emoji';
  
  try {
    console.log(`Sending request to DeepWiki API...`);
    console.log(`- Provider: ${provider.name}`);
    console.log(`- Model: ${provider.model}`);
    console.log(`- Repository: ${testRepo}`);
    console.log(`- Timeout: 10 minutes`);
    
    // Create a minimal payload
    const payload = {
      model: provider.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in ONE word only.' }
      ],
      provider: provider.name,
      repo_url: testRepo,
      max_tokens: 10, // Very small to speed up the processing
      stream: true
    };
    
    console.log('Calling API with payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Call the API with a very long timeout (10 minutes)
    const startTime = Date.now();
    console.log(`Request started at: ${new Date().toISOString()}`);
    
    const response = await axios.post(`${apiUrl}/chat/completions/stream`, payload, {
      timeout: 600000, // 10 minutes
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      }
    });
    
    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    
    if (response.status === 200) {
      console.log(`✅ ${provider.name} test succeeded! (took ${elapsedTime} seconds)`);
      
      // Attempt to parse and show the response
      try {
        const data = response.data;
        console.log(`Response preview:`);
        console.log(typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500));
      } catch (parseError) {
        console.log(`(Could not parse response: ${parseError.message})`);
      }
      
      return { 
        success: true, 
        elapsedTime,
        response: response.data
      };
    } else {
      console.log(`⚠️ ${provider.name} test returned status ${response.status}`);
      return { 
        success: false, 
        error: `Unexpected status: ${response.status}`,
        elapsedTime
      };
    }
  } catch (error) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    };
    
    console.log(`❌ ${provider.name} test failed: ${error.message}`);
    console.log('Error details:');
    console.log(JSON.stringify(errorDetails, null, 2));
    
    // Special handling for common error types
    if (error.code === 'ECONNABORTED') {
      console.log('⚠️ Request timed out after 10 minutes. The repository is likely too large or DeepWiki is under heavy load.');
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.log(`⚠️ Authentication error. Check if the ${provider.name} API key is valid.`);
    } else if (error.response?.status === 404) {
      console.log('⚠️ Endpoint not found. Check if DeepWiki API URL is correct.');
    } else if (error.response?.status >= 500) {
      console.log(`⚠️ Server error (${error.response.status}). DeepWiki server is having issues processing the request.`);
    }
    
    return { 
      success: false, 
      error: error.message,
      errorDetails
    };
  }
}

// Run tests for all providers
async function runTests() {
  console.log('\n=========================================');
  console.log('Enhanced DeepWiki Provider Test');
  console.log('=========================================');
  console.log(`API URL: ${apiUrl}`);
  console.log('');
  
  // First test basic connectivity
  const isConnected = await testBasicConnectivity();
  if (!isConnected) {
    console.log('\n❌ Basic connectivity test failed. Stopping tests.');
    return false;
  }
  
  console.log('\nRunning individual provider tests with 10-minute timeout each...');
  
  const results = {};
  
  // Test each provider sequentially
  for (const provider of PROVIDERS) {
    if (!provider.key) {
      console.log(`\n⚠️ Skipping ${provider.name} (no API key provided)`);
      results[provider.name] = { success: false, error: 'API key not provided' };
      continue;
    }
    
    results[provider.name] = await testProvider(provider);
  }
  
  // Print summary
  console.log('\n=========================================');
  console.log('Test Results Summary');
  console.log('=========================================');
  
  let anyProviderWorking = false;
  
  for (const provider of PROVIDERS) {
    const result = results[provider.name];
    const status = result && result.success ? '✅ WORKING' : '❌ FAILED';
    const additionalInfo = result && result.success ? 
      `(${result.elapsedTime}s)` : 
      result ? `(${result.error})` : '';
    
    console.log(`${provider.name.padEnd(10)}: ${status} ${additionalInfo}`);
    
    if (result && result.success) {
      anyProviderWorking = true;
    }
  }
  
  // Save results to file
  const resultsFile = path.join(__dirname, 'enhanced-test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    apiUrl,
    results
  }, null, 2));
  
  console.log(`\nResults saved to ${resultsFile}`);
  
  // Recommendations
  console.log('\n=========================================');
  console.log('Recommendations');
  console.log('=========================================');
  
  if (anyProviderWorking) {
    console.log('✅ At least one provider is working!');
    
    // Create a list of working providers
    const workingProviders = Object.entries(results)
      .filter(([_, result]) => result.success)
      .map(([name, _]) => name);
    
    console.log(`Working providers: ${workingProviders.join(', ')}`);
    
    // Create a list of non-working providers
    const nonWorkingProviders = Object.entries(results)
      .filter(([_, result]) => !result.success)
      .map(([name, _]) => name);
    
    if (nonWorkingProviders.length > 0) {
      console.log(`\nTo run calibration with only working providers:`);
      console.log(`export SKIP_PROVIDERS=${nonWorkingProviders.join(',')} && ./calibration-modes.sh full`);
    } else {
      console.log(`\nAll providers are working! You can run full calibration:`);
      console.log(`./calibration-modes.sh full`);
    }
  } else {
    console.log('❌ No providers are working.');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check that port forwarding is active:');
    console.log('   kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001');
    console.log('2. Verify API keys are correct in the DeepWiki pod:');
    console.log('   ./check-deepwiki-config.sh');
    console.log('3. Restart the DeepWiki pod:');
    console.log('   kubectl rollout restart deployment/deepwiki-fixed -n codequal-dev');
  }
  
  return anyProviderWorking;
}

// Run the tests
runTests()
  .then(success => {
    console.log(`\nTest completed ${success ? 'with some working providers' : 'with no working providers'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });