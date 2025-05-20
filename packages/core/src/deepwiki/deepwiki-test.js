#!/usr/bin/env node

/**
 * DeepWiki API Manual Test Script
 * 
 * This script allows manual testing of the DeepWiki API with different
 * providers and models. It supports both wiki generation and targeted queries.
 * 
 * Usage:
 *   node deepwiki-test.js --mode=[wiki|chat] --repo=owner/repo --provider=provider --model=model
 * 
 * Examples:
 *   node deepwiki-test.js --mode=chat --repo=pallets/click --provider=openai --model=gpt-4o
 *   node deepwiki-test.js --mode=wiki --repo=pallets/click --provider=google --model=gemini-2.5-pro-preview-05-06
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  if (key.startsWith('--')) {
    acc[key.substring(2)] = value;
  }
  return acc;
}, {});

// Default values
const config = {
  mode: args.mode || 'chat',
  repo: args.repo || 'pallets/click',
  provider: args.provider || '',
  model: args.model || '',
  query: args.query || 'What is the overall architecture of this repository?',
  apiUrl: args.apiUrl || 'http://localhost:8001',
  format: args.format || 'json',
  outputDir: args.outputDir || path.join(__dirname, 'test-results')
};

// Validate repository format
if (!config.repo.includes('/')) {
  console.error('Invalid repository format. Please use owner/repo format.');
  process.exit(1);
}

const [owner, repo] = config.repo.split('/');

// Create output directory if it doesn't exist
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

/**
 * Generate a wiki for a repository
 */
async function generateWiki() {
  console.log(`Generating wiki for ${config.repo}...`);
  
  const startTime = Date.now();
  
  // Build payload
  const payload = {
    owner,
    repo,
    repo_type: 'github',
    format: config.format,
    language: 'en'
  };
  
  // Add provider and model if specified
  if (config.provider) {
    payload.provider = config.provider;
  }
  
  if (config.model) {
    payload.model = config.model;
  }
  
  try {
    // Call DeepWiki API
    const response = await axios.post(`${config.apiUrl}/export/wiki`, payload);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate filename
    const providerStr = config.provider ? `-${config.provider}` : '';
    const modelStr = config.model ? `-${config.model}` : '';
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `wiki-${config.repo.replace('/', '-')}${providerStr}${modelStr}-${timestamp}.json`;
    
    // Save response
    const outputPath = path.join(config.outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    
    // Log results
    console.log(`Wiki generated in ${duration.toFixed(2)} seconds.`);
    console.log(`Response size: ${JSON.stringify(response.data).length} bytes`);
    console.log(`Results saved to: ${outputPath}`);
    
    // Print summary
    if (response.data.wiki) {
      console.log('\nWiki summary:');
      console.log('=============');
      console.log(`Title: ${response.data.wiki.title || 'Unknown'}`);
      console.log(`Sections: ${response.data.wiki.sections?.length || 0}`);
      
      // Print section titles if available
      if (response.data.wiki.sections && response.data.wiki.sections.length > 0) {
        console.log('\nSections:');
        response.data.wiki.sections.forEach((section, index) => {
          console.log(`  ${index + 1}. ${section.title || 'Untitled'}`);
        });
      }
    } else {
      console.log('\nResponse structure:');
      console.log(util.inspect(response.data, { depth: 2, colors: true }));
    }
  } catch (error) {
    console.error('Error generating wiki:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

/**
 * Get a chat completion for a repository
 */
async function getChatCompletion() {
  console.log(`Getting chat completion for ${config.repo}...`);
  
  const startTime = Date.now();
  
  // Build payload
  const payload = {
    repo_url: `https://github.com/${config.repo}`,
    messages: [
      {
        role: 'user',
        content: config.query
      }
    ]
  };
  
  // Add provider and model if specified
  if (config.provider) {
    payload.provider = config.provider;
  }
  
  if (config.model) {
    payload.model = config.model;
  }
  
  try {
    // Call DeepWiki API
    const response = await axios.post(`${config.apiUrl}/chat/completions`, payload);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Generate filename
    const providerStr = config.provider ? `-${config.provider}` : '';
    const modelStr = config.model ? `-${config.model}` : '';
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `chat-${config.repo.replace('/', '-')}${providerStr}${modelStr}-${timestamp}.json`;
    
    // Save response
    const outputPath = path.join(config.outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    
    // Log results
    console.log(`Chat completion generated in ${duration.toFixed(2)} seconds.`);
    console.log(`Response size: ${JSON.stringify(response.data).length} bytes`);
    console.log(`Results saved to: ${outputPath}`);
    
    // Print content
    console.log('\nChat completion:');
    console.log('================');
    
    if (response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content;
      if (content) {
        console.log(content);
      } else {
        console.log(util.inspect(response.data.choices[0], { depth: 2, colors: true }));
      }
    } else {
      console.log(util.inspect(response.data, { depth: 2, colors: true }));
    }
  } catch (error) {
    console.error('Error getting chat completion:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

/**
 * Run the appropriate test based on mode
 */
async function runTest() {
  console.log('DeepWiki API Test');
  console.log('================');
  console.log(`Mode: ${config.mode}`);
  console.log(`Repository: ${config.repo}`);
  console.log(`Provider: ${config.provider || 'default'}`);
  console.log(`Model: ${config.model || 'default'}`);
  
  if (config.mode === 'chat') {
    console.log(`Query: ${config.query}`);
    await getChatCompletion();
  } else if (config.mode === 'wiki') {
    await generateWiki();
  } else {
    console.error(`Invalid mode: ${config.mode}. Must be "wiki" or "chat".`);
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
