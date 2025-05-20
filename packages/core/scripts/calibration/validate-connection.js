/**
 * DeepWiki Connection Validator
 * 
 * This script validates the connection to the DeepWiki API by:
 * 1. Checking if the API is reachable
 * 2. Testing basic functionality with a simple request
 * 3. Testing each provider to see which ones are working
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../dist/utils/logger');

// Create a logger for the validator
const logger = createLogger('ConnectionValidator');

// Providers to test
const PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek'];

// Set default values if not provided in environment
if (!process.env.DEEPSEEK_API_KEY) {
  process.env.DEEPSEEK_API_KEY = 'mock-key-for-testing';
  logger.info('Using default DEEPSEEK_API_KEY for testing');
}

if (!process.env.DEEPWIKI_API_URL) {
  process.env.DEEPWIKI_API_URL = 'http://localhost:8001';
  logger.info('Using default DEEPWIKI_API_URL');
}

const apiKey = process.env.DEEPSEEK_API_KEY;
const apiUrl = process.env.DEEPWIKI_API_URL;

logger.info('DeepWiki API configuration', { apiUrl, keyProvided: !!apiKey });

/**
 * Test basic connectivity to the DeepWiki API
 */
async function testBasicConnectivity() {
  try {
    logger.info('Testing basic connectivity to DeepWiki API...');
    
    // First, check if we can reach the server at all
    console.log(`Testing connection to ${apiUrl}...`);
    
    // Try to connect to the health endpoint
    const response = await axios.get(`${apiUrl}/health`, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.status === 200) {
      logger.info('Successfully connected to DeepWiki API health endpoint', {
        status: response.status,
        data: response.data
      });
      console.log(`✅ Connected to DeepWiki API health endpoint: ${response.status}`);
      return true;
    } else {
      logger.warn('Connected to DeepWiki API but received unexpected status', {
        status: response.status,
        data: response.data
      });
      console.log(`⚠️ Connected to DeepWiki API health endpoint but got unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Could not connect to health endpoint: ${error.message}`);
    
    // Try a fallback endpoint if health endpoint doesn't exist
    try {
      console.log('Trying fallback to base URL...');
      const fallbackResponse = await axios.get(apiUrl, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      logger.info('Connected to DeepWiki API base URL', {
        status: fallbackResponse.status
      });
      console.log(`✅ Connected to DeepWiki API base URL: ${fallbackResponse.status}`);
      return true;
    } catch (fallbackError) {
      logger.error('Failed to connect to DeepWiki API', {
        url: apiUrl,
        error: error.message,
        code: error.code
      });
      console.log(`❌ Failed to connect to DeepWiki API base URL: ${fallbackError.message}`);
      
      // Test network connectivity more generally
      try {
        const networkTestResponse = await axios.get('https://www.google.com', { timeout: 5000 });
        console.log('✅ Network connectivity is working (connected to google.com)');
        console.log('⚠️ This suggests the DeepWiki service may not be running or not be accessible');
      } catch (networkError) {
        console.log('❌ General network connectivity test failed. Check your internet connection');
      }
      
      return false;
    }
  }
}

/**
 * Discover available API endpoints
 */
async function discoverApiEndpoints() {
  const possibleEndpoints = [
    '/',
    '/api',
    '/health',
    '/api/health',
    '/chat',
    '/api/chat',
    '/chat/completions',
    '/api/chat/completions',
    '/chat/completions/stream',
    '/api/chat/completions/stream'
  ];
  
  console.log('\nDiscovering available API endpoints...');
  const results = [];
  
  for (const endpoint of possibleEndpoints) {
    try {
      const url = `${apiUrl}${endpoint}`;
      const response = await axios.get(url, {
        timeout: 3000,
        validateStatus: () => true, // Accept any status code
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      results.push({
        endpoint,
        url,
        status: response.status,
        working: response.status >= 200 && response.status < 500
      });
      
      if (response.status >= 200 && response.status < 500) {
        console.log(`✅ Endpoint ${endpoint}: Status ${response.status}`);
      } else {
        console.log(`❌ Endpoint ${endpoint}: Status ${response.status}`);
      }
    } catch (error) {
      results.push({
        endpoint,
        url: `${apiUrl}${endpoint}`,
        error: error.message,
        working: false
      });
      console.log(`❌ Endpoint ${endpoint}: ${error.message}`);
    }
  }
  
  // Find working chat endpoints
  const workingChatEndpoints = results.filter(
    r => r.working && (r.endpoint.includes('/chat/completions') || r.endpoint.includes('/api/chat/completions'))
  );
  
  if (workingChatEndpoints.length > 0) {
    console.log('\nWorking chat endpoints:');
    workingChatEndpoints.forEach(e => console.log(`- ${e.url}`));
    return workingChatEndpoints[0].url;
  } else {
    console.log('\nNo working chat endpoints found');
    return null;
  }
}

/**
 * Check for environment issues
 */
function checkEnvironmentIssues() {
  console.log('\nChecking for environment issues...');
  
  // Check API keys
  const apiKeys = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, 
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY
  };
  
  const missingKeys = Object.keys(apiKeys).filter(k => !apiKeys[k]);
  
  if (missingKeys.length > 0) {
    console.log(`⚠️ Missing API keys: ${missingKeys.join(', ')}`);
  } else {
    console.log('✅ All required API keys are set');
  }
  
  // Check for common key issues
  Object.entries(apiKeys).forEach(([key, value]) => {
    if (!value) return;
    
    if (key === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
      console.log(`⚠️ ${key} may be invalid - should start with 'sk-'`);
    }
    
    if (key === 'ANTHROPIC_API_KEY' && !value.startsWith('sk-ant-')) {
      console.log(`⚠️ ${key} may be invalid - should start with 'sk-ant-'`);
    }
    
    if (key === 'GOOGLE_API_KEY' && !value.startsWith('AIza')) {
      console.log(`⚠️ ${key} may be invalid - should start with 'AIza'`);
    }
    
    if (key === 'DEEPSEEK_API_KEY' && !value.startsWith('sk-')) {
      console.log(`⚠️ ${key} may be invalid - should start with 'sk-'`);
    }
  });
  
  // Check environment settings
  if (process.env.USE_REAL_DEEPWIKI !== 'true') {
    console.log('⚠️ USE_REAL_DEEPWIKI is not set to true');
  } else {
    console.log('✅ USE_REAL_DEEPWIKI is set to true');
  }
  
  if (process.env.SIMULATE_REAL_DELAY === 'true') {
    console.log('⚠️ SIMULATE_REAL_DELAY is set to true - should be false when using real API');
  } else {
    console.log('✅ SIMULATE_REAL_DELAY is set to false');
  }
}

/**
 * Test provider availability
 */
async function testProvider(provider, chatEndpoint) {
  try {
    logger.info(`Testing provider: ${provider}...`);
    console.log(`\nTesting provider: ${provider}`);
    
    // Show which model we're testing
    const model = provider === 'openai' ? 'gpt-4o' :
                 provider === 'anthropic' ? 'claude-3-7-sonnet' :
                 provider === 'google' ? 'gemini-2.5-pro-preview-05-06' :
                 provider === 'deepseek' ? 'deepseek-coder' : 'unknown';
    
    console.log(`Using model: ${model}`);
    
    // Prepare a simple test payload - DeepWiki requires specific format
    // Use a smaller repository to reduce processing time
    const payload = {
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a repository analyzer. Be concise.'
        },
        {
          role: 'user',
          content: 'Hello! Respond with a simple greeting.'
        }
      ],
      // Add DeepWiki-specific fields
      provider: provider,
      repo_url: 'https://github.com/microsoft/fluentui', // Smaller repo
      max_tokens: 50,
      stream: true
    };
    
    // Set a longer timeout for the actual API request
    // Use the discovered endpoint or fall back to the correct endpoint
    // DeepWiki API only has /chat/completions/stream endpoint
    const apiEndpoint = `${apiUrl}/chat/completions/stream`;
    console.log(`Calling API endpoint: ${apiEndpoint}`);
    
    try {
      const response = await axios.post(apiEndpoint, payload, {
        timeout: 120000, // 2 minute timeout
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        }
      });
      
      if (response.status === 200) {
        logger.info(`Provider ${provider} is working correctly`, {
          status: response.status,
          model: payload.model
        });
        console.log(`✅ Provider ${provider} is working correctly (Status: ${response.status})`);
        
        // Display a snippet of the response if available
        if (response.data && typeof response.data === 'string' && response.data.length > 0) {
          console.log(`Response preview: ${response.data.substring(0, 100)}...`);
        } else if (response.data && response.data.choices && response.data.choices.length > 0) {
          console.log(`Response preview: ${JSON.stringify(response.data.choices[0]).substring(0, 100)}...`);
        }
        
        return true;
      } else {
        logger.warn(`Provider ${provider} returned unexpected status`, {
          status: response.status
        });
        console.log(`⚠️ Provider ${provider} returned unexpected status: ${response.status}`);
        return false;
      }
    } catch (error) {
      // Enhanced error logging
      console.log(`\nDetailed error for ${provider}:`);
      
      if (error.response) {
        // Server responded with non-2xx status
        console.log(`Status: ${error.response.status}`);
        console.log(`Headers:`, JSON.stringify(error.response.headers, null, 2));
        
        // Extract relevant error details
        let errorData = '';
        try {
          errorData = typeof error.response.data === 'object' 
            ? JSON.stringify(error.response.data, null, 2)
            : error.response.data;
        } catch (e) {
          errorData = 'Could not parse error data';
        }
        
        console.log(`Data:`, errorData);
        
        // Check for common error patterns
        if (error.response.status === 401 || error.response.status === 403) {
          console.log(`❌ Authentication error - check API key for ${provider}`);
        } else if (error.response.status === 404) {
          console.log(`❌ Endpoint not found - the DeepWiki API may not support ${provider}`);
        } else if (error.response.status === 500) {
          console.log(`❌ Server error - DeepWiki encountered an internal error with ${provider}`);
          
          // Check for provider configuration issues in error
          if (errorData.includes('provider') && errorData.includes('not found')) {
            console.log(`❌ Provider configuration for ${provider} may not exist in DeepWiki`);
          }
        }
      } else if (error.request) {
        // Request made but no response received
        console.log('❌ No response received from server (timeout or connection closed)');
      } else {
        // Error in setting up the request
        console.log('❌ Error:', error.message);
      }
      
      // Include original message in logs
      logger.warn(`Provider ${provider} not working`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  } catch (error) {
    logger.error(`Provider ${provider} test failed`, {
      error: error.message,
      code: error.code,
      status: error.response?.status
    });
    
    // Output detailed error information
    if (error.response) {
      logger.error(`Provider ${provider} API error details`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    return false;
  }
}

/**
 * Run all validation tests
 */
async function validateConnection() {
  console.log('\nDeepWiki API Connection Validation');
  console.log('================================');
  console.log(`API URL: ${apiUrl}`);
  console.log(`API Key provided: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`USE_REAL_DEEPWIKI: ${process.env.USE_REAL_DEEPWIKI || 'Not set'}`);
  console.log('================================\n');
  
  // Check for environment issues
  checkEnvironmentIssues();
  
  // Test basic connectivity
  const isConnected = await testBasicConnectivity();
  
  if (!isConnected) {
    console.log('\nConnection Test: ❌ FAILED');
    console.log('The DeepWiki API is not reachable. Please check:');
    console.log('1. The API URL is correct');
    console.log('2. The API is running');
    console.log('3. Port forwarding is active (if using Kubernetes)');
    console.log('4. Network connectivity and firewalls');
    console.log('5. Run: kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001');
    console.log('\nCalibration will not work with the real API in this state.');
    console.log('Recommendation: Fix DeepWiki connectivity with ./fix-and-test-deepwiki.sh');
    return { connected: false, workingProviders: [] };
  }
  
  console.log('\nConnection Test: ✅ PASSED');
  
  // Discover available API endpoints
  const chatEndpoint = await discoverApiEndpoints();
  
  // Test each provider
  console.log('\nTesting Providers:');
  console.log('----------------');
  
  const providerResults = {};
  const workingProviders = [];
  
  for (const provider of PROVIDERS) {
    const isWorking = await testProvider(provider, chatEndpoint);
    providerResults[provider] = isWorking;
    
    if (isWorking) {
      workingProviders.push(provider);
    }
  }
  
  // Print summary and recommendations
  console.log('\nValidation Summary:');
  console.log('----------------');
  console.log(`API Connection: ${isConnected ? '✅ WORKING' : '❌ NOT WORKING'}`);
  
  // Display provider results in a table format
  console.log('\nProvider Status:');
  console.log('---------------');
  for (const provider of PROVIDERS) {
    const status = providerResults[provider] ? '✅ WORKING' : '❌ NOT WORKING';
    console.log(`${provider.padEnd(10)}: ${status}`);
  }
  console.log(`\nWorking Providers: ${workingProviders.length}/${PROVIDERS.length}`);
  
  // Save validation results to a file for reference
  const resultsFile = path.join(__dirname, 'validation-results.json');
  const validationResults = {
    timestamp: new Date().toISOString(),
    apiUrl,
    connected: isConnected,
    providerResults,
    workingProviders,
    chatEndpoint
  };
  
  try {
    fs.writeFileSync(resultsFile, JSON.stringify(validationResults, null, 2));
    console.log(`\nValidation results saved to: ${resultsFile}`);
  } catch (error) {
    console.log(`\nFailed to save validation results: ${error.message}`);
  }
  
  if (workingProviders.length === 0) {
    console.log('\n❌ No providers are working. Calibration with real API will not function.');
    console.log('\nRecommendations:');
    console.log('1. Run ./fix-and-test-deepwiki.sh to fix DeepWiki configuration');
    console.log('2. Check provider configurations in the DeepWiki pod');
    console.log('3. Verify API keys are correct for all providers');
  } else if (workingProviders.length < PROVIDERS.length) {
    const nonWorkingProviders = PROVIDERS.filter(p => !workingProviders.includes(p)).join(',');
    console.log(`\n⚠️ Some providers are not working (${nonWorkingProviders}).`);
    console.log('\nRecommendations:');
    console.log(`1. Run calibration with working providers only:`);
    console.log(`   SKIP_PROVIDERS=${nonWorkingProviders} ./calibration-modes.sh full`);
    console.log('2. Or fix the non-working providers with:');
    console.log('   ./fix-and-test-deepwiki.sh');
  } else {
    console.log('\n✅ All providers are working! Full calibration should function correctly.');
    console.log('\nTo run full calibration:');
    console.log('./calibration-modes.sh full');
  }
  
  return { 
    connected: isConnected, 
    workingProviders,
    providerResults,
    chatEndpoint
  };
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateConnection()
    .then(result => {
      process.exit(result.connected ? 0 : 1);
    })
    .catch(error => {
      logger.error('Validation failed with unexpected error', { error });
      process.exit(1);
    });
} else {
  // Export for use in other scripts
  module.exports = {
    validateConnection
  };
}