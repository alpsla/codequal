#!/usr/bin/env node
/**
 * Very simple API key test with careful input handling
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { stdin, stdout } = process;

// Function to read API key more carefully
function readApiKey() {
  return new Promise((resolve) => {
    console.log('Please paste your Anthropic API key (should start with sk-ant):');
    console.log('After pasting, press Enter twice to confirm the input.');
    
    let data = '';
    let lastWasNewline = false;
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    const onData = (chunk) => {
      // If Enter is pressed
      if (chunk === '\r' || chunk === '\n') {
        stdout.write('\n');
        if (lastWasNewline) {
          // Second Enter press - we're done
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          resolve(data.trim());
          return;
        }
        lastWasNewline = true;
      } else {
        lastWasNewline = false;
        // Mask input with * for security
        if (chunk === '\u007F') {
          // Backspace
          if (data.length > 0) {
            data = data.substr(0, data.length - 1);
            stdout.write('\b \b'); // Erase character
          }
        } else {
          data += chunk;
          stdout.write('*');
        }
      }
    };
    
    process.stdin.on('data', onData);
  });
}

// Function to test API key
async function testApiKey(apiKey) {
  console.log(`\nTesting API key (length: ${apiKey.length} characters)`);
  console.log(`Key prefix: ${apiKey.substring(0, 7)}...`);
  
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      }
    });
    
    console.log('\n✅ API key is valid!');
    console.log(`Response: "${response.data.content[0].text}"`);
    
    // Save key to a temporary file
    const keyFile = path.join(__dirname, 'valid-key.txt');
    fs.writeFileSync(keyFile, apiKey);
    console.log(`\nValid key saved to: ${keyFile}`);
    console.log('You can use this key in your calibration scripts.');
    
    return true;
  } catch (error) {
    console.error('\n❌ API key validation failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data.error || error.response.data)}`);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Anthropic API Key Tester ===');
  console.log('This script carefully handles API key input to avoid truncation.\n');
  
  const apiKey = await readApiKey();
  await testApiKey(apiKey);
  
  // Exit process
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});