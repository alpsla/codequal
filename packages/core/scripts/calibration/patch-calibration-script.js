/**
 * Patch Calibration Script
 * 
 * This script updates the run-calibration.js file to use our enhanced DeepWikiClientWrapper
 * which properly handles the DeepWiki API connection and provides better error handling.
 */

const fs = require('fs');
const path = require('path');

// Path to the original file
const filePath = path.join(__dirname, 'run-calibration.js');

// Read the original file
let content = fs.readFileSync(filePath, 'utf8');

// Replace the import section
content = content.replace(
  "const { DeepWikiClient } = require('../../dist/deepwiki/DeepWikiClient');",
  "// Use our custom wrapper instead of the standard DeepWikiClient\n" +
  "const { createDeepWikiClient } = require('./deepwiki-client-wrapper');"
);

// Replace the initDeepWikiClient function
const originalInitFunction = /function initDeepWikiClient\(\) \{[\s\S]+?return new MockDeepWikiClient\(apiUrl, logger\);\n\}/;
const newInitFunction = `function initDeepWikiClient() {
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
  
  // Check if we should use the real DeepWiki client
  const useRealClient = process.env.USE_REAL_DEEPWIKI === 'true';
  
  if (useRealClient) {
    try {
      logger.info('Using enhanced DeepWikiClientWrapper...');
      
      // Create our enhanced client wrapper
      const client = createDeepWikiClient({
        apiUrl,
        apiKey,
        logger,
        maxRetries: 3,
        timeout: 120000, // 2 minutes for general requests
        chatTimeout: 600000 // 10 minutes for chat completions
      });
      
      logger.info('Successfully initialized enhanced DeepWikiClientWrapper');
      return client;
    } catch (error) {
      logger.error('Failed to initialize DeepWikiClientWrapper', { error: error.message });
      logger.info('Falling back to mock implementation');
    }
  } else {
    logger.info('Using mock DeepWikiClient as requested');
  }
  
  // Create and return mock client
  return new MockDeepWikiClient(apiUrl, logger);
}`;

content = content.replace(originalInitFunction, newInitFunction);

// Write the updated file
const backupPath = filePath + '.bak';
fs.writeFileSync(backupPath, fs.readFileSync(filePath)); // Create backup
fs.writeFileSync(filePath, content);

console.log(`Updated ${filePath}`);
console.log(`Backup saved to ${backupPath}`);
console.log('\nThe run-calibration.js script has been updated to use the enhanced DeepWikiClientWrapper.');
console.log('This wrapper provides:');
console.log('1. Better error handling and diagnostics');
console.log('2. Correct endpoint handling for the DeepWiki API');
console.log('3. Automatic fallback to mock data when API calls fail');
console.log('4. Comprehensive logging for troubleshooting');
console.log('\nYou can now run calibration with:');
console.log('./calibration-modes.sh full [skip_providers]');