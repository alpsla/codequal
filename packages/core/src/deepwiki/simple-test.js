#!/usr/bin/env node

/**
 * Simple DeepWiki API Test
 * 
 * This is a simplified version that runs a targeted query against the DeepWiki API
 * with minimal dependencies - just needs Node.js
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  repo: 'pallets/click',
  query: 'What is the overall architecture of this repository and what are the main components?',
  provider: 'openai',
  model: 'gpt-4o',
  apiUrl: 'http://localhost:8001',
  outputDir: path.join(__dirname, 'test-results')
};

// Create output directory if it doesn't exist
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Generate timestamp for filenames
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const outputFile = path.join(config.outputDir, `simple-test-${timestamp}.json`);

console.log(`Simple DeepWiki API Test`);
console.log(`=====================`);
console.log(`Repository: ${config.repo}`);
console.log(`Query: ${config.query}`);
console.log(`Provider: ${config.provider}`);
console.log(`Model: ${config.model}`);
console.log(`API URL: ${config.apiUrl}`);
console.log(`Output File: ${outputFile}`);
console.log();

// Prepare the request data
const postData = JSON.stringify({
  repo_url: `https://github.com/${config.repo}`,
  messages: [
    {
      role: 'user',
      content: config.query
    }
  ],
  provider: config.provider,
  model: config.model
});

// Parse the API URL
const apiUrl = new URL(config.apiUrl);
const httpModule = apiUrl.protocol === 'https:' ? https : http;

// Prepare the request options
const options = {
  hostname: apiUrl.hostname,
  port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
  path: '/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`Sending request to ${config.apiUrl}${options.path}...`);
console.log();

// Record start time
const startTime = Date.now();

// Make the request
const req = httpModule.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Response received in ${duration.toFixed(2)} seconds`);
    
    // Try to parse the response as JSON
    let jsonData;
    try {
      jsonData = JSON.parse(data);
      console.log(`Response parsed successfully`);
      
      // Save to file
      fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2));
      console.log(`Response saved to ${outputFile}`);
      
      // Extract and display content
      const content = jsonData.choices?.[0]?.message?.content;
      if (content) {
        console.log('\nResponse Content:');
        console.log('----------------');
        console.log(content);
      } else {
        console.log('No content found in response');
        console.log('Raw response:');
        console.log(data);
      }
      
    } catch (err) {
      console.error('Error parsing JSON response:', err.message);
      console.log('Raw response:');
      console.log(data);
      
      // Save raw response to file
      fs.writeFileSync(outputFile, data);
      console.log(`Raw response saved to ${outputFile}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();

console.log('Request sent, waiting for response...');
