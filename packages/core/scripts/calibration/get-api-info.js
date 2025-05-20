/**
 * Get DeepWiki API Information
 * 
 * This script fetches and displays information about the DeepWiki API,
 * including available endpoints and supported providers.
 */

require('dotenv').config();
const axios = require('axios');
const { createLogger } = require('../../dist/utils/logger');

// Create a logger
const logger = createLogger('ApiInfo');

// Set default API URL if not provided
if (!process.env.DEEPWIKI_API_URL) {
  process.env.DEEPWIKI_API_URL = 'http://localhost:8001';
  logger.info('Using default DEEPWIKI_API_URL');
}

const apiUrl = process.env.DEEPWIKI_API_URL;

/**
 * Get API information
 */
async function getApiInfo() {
  console.log('\nDeepWiki API Information');
  console.log('=======================');
  console.log(`API URL: ${apiUrl}`);
  
  try {
    // Fetch API root to get available endpoints
    console.log('\nFetching API information...');
    const response = await axios.get(apiUrl, { timeout: 5000 });
    
    if (response.status === 200) {
      console.log('\nAPI Response:');
      console.log('------------');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Extract endpoints
      const endpoints = response.data.endpoints || {};
      
      console.log('\nAvailable Endpoints:');
      console.log('------------------');
      Object.entries(endpoints).forEach(([category, categoryEndpoints]) => {
        console.log(`\n${category}:`);
        categoryEndpoints.forEach(endpoint => {
          console.log(`  - ${endpoint}`);
        });
      });
      
      // Provide suggestions
      console.log('\nSuggested Configuration:');
      console.log('----------------------');
      
      if (endpoints.Chat && endpoints.Chat.some(e => e.includes('/chat/completions/stream'))) {
        console.log('- Use endpoint: /chat/completions/stream for chat completions');
      }
      
      if (endpoints.Wiki && endpoints.Wiki.some(e => e.includes('/export/wiki'))) {
        console.log('- Use endpoint: /export/wiki for wiki generation');
      }
      
      console.log('\nStatus: CONNECTED');
      return true;
    } else {
      console.log('\nUnexpected API response:', response.status, response.statusText);
      console.log('\nStatus: UNEXPECTED RESPONSE');
      return false;
    }
  } catch (error) {
    console.log('\nError connecting to API:', error.message);
    if (error.code) {
      console.log('Error code:', error.code);
    }
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    
    console.log('\nStatus: CONNECTION FAILED');
    
    // Troubleshooting suggestions
    console.log('\nTroubleshooting Suggestions:');
    console.log('1. Check if the API URL is correct');
    console.log('2. Verify the API server is running');
    console.log('3. Check network connectivity');
    console.log('4. If using port forwarding, ensure it is active:');
    console.log('   kubectl port-forward -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath=\'{.items[0].metadata.name}\') 8001:8001');
    
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  getApiInfo()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

// Export for use in other modules
module.exports = {
  getApiInfo
};