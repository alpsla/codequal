#!/usr/bin/env node

// This script runs the researcher directly without TypeScript compilation

// Load environment
require('dotenv').config();

// Set OpenRouter API key
// SECURITY: Never hardcode API keys. Use environment variables only
if (!process.env.OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY environment variable is required');
  process.exit(1);
}

console.log('=== STARTING RESEARCHER EXECUTION ===');
console.log(`Time: ${new Date().toISOString()}`);
console.log('Running as: SYSTEM USER (no authentication required)');
console.log('');

// Create a simple HTTP request to OpenRouter to get models
const https = require('https');

const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/models',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

console.log('[INFO] Fetching models from OpenRouter...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode !== 200) {
        console.error('[ERROR] OpenRouter API error:', response);
        return;
      }

      const models = response.data || [];
      console.log(`[INFO] Fetched ${models.length} models from OpenRouter`);
      
      // Show some example models
      console.log('\nExample models available:');
      const topModels = models
        .filter(m => m.pricing && m.context_length)
        .sort((a, b) => {
          // Sort by a combination of context length and cost
          const scoreA = (a.context_length / 1000) - (parseFloat(a.pricing.prompt) * 1000);
          const scoreB = (b.context_length / 1000) - (parseFloat(b.pricing.prompt) * 1000);
          return scoreB - scoreA;
        })
        .slice(0, 10);
      
      topModels.forEach((model, i) => {
        console.log(`${i + 1}. ${model.id}`);
        console.log(`   Context: ${model.context_length} tokens`);
        console.log(`   Cost: $${model.pricing.prompt}/1K tokens`);
        console.log('');
      });

      console.log('[INFO] Full researcher would now:');
      console.log('  1. Evaluate all models dynamically');
      console.log('  2. Select best models for each role/language/size');
      console.log('  3. Store 800 configurations in Vector DB');
      console.log('  4. Update its own model selection');
      
      console.log('\n✅ Model discovery test completed successfully');
      console.log(`Next scheduled run would be: ${getNextQuarterlyRun()}`);
      
    } catch (error) {
      console.error('[ERROR] Failed to parse response:', error);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('[ERROR] Request failed:', error);
});

req.end();

function getNextQuarterlyRun() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const nextQuarter = (quarter + 1) % 4;
  const year = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
  
  // First day of next quarter at 5 AM UTC (0 AM ET)
  return new Date(Date.UTC(year, nextQuarter * 3, 1, 5, 0, 0, 0)).toISOString();
}