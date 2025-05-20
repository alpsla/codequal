#!/usr/bin/env node
/**
 * Update API Keys
 * 
 * This script allows updating API keys directly in the .env file.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Path to .env file
const ENV_FILE_PATH = path.join(__dirname, '..', '..', '..', '.env');

// Main function
async function updateApiKeys() {
  console.log('------------------------------------');
  console.log('API Key Update Utility');
  console.log('------------------------------------');
  
  // Read current .env file
  let envContent = '';
  try {
    envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    console.log(`\n✅ Found .env file at ${ENV_FILE_PATH}`);
  } catch (error) {
    console.error(`\n❌ Error reading .env file: ${error.message}`);
    console.log('Creating a new .env file...');
    envContent = '# API Keys\n';
  }
  
  // Display menu
  console.log('\nSelect an API key to update:');
  console.log('1. GitHub Token');
  console.log('2. Anthropic API Key');
  console.log('3. OpenAI API Key');
  console.log('4. Gemini API Key');
  console.log('5. DeepSeek API Key');
  console.log('6. OpenRouter API Key');
  
  const option = await question('\nEnter option (1-6): ');
  
  let keyName = '';
  let keyDescription = '';
  
  // Handle option selection
  switch (option.trim()) {
    case '1':
      keyName = 'GITHUB_TOKEN';
      keyDescription = 'GitHub Personal Access Token';
      break;
    case '2':
      keyName = 'ANTHROPIC_API_KEY';
      keyDescription = 'Anthropic API Key';
      break;
    case '3':
      keyName = 'OPENAI_API_KEY';
      keyDescription = 'OpenAI API Key';
      break;
    case '4':
      keyName = 'GEMINI_API_KEY';
      keyDescription = 'Gemini API Key';
      break;
    case '5':
      keyName = 'DEEPSEEK_API_KEY';
      keyDescription = 'DeepSeek API Key';
      break;
    case '6':
      keyName = 'OPENROUTER_API_KEY';
      keyDescription = 'OpenRouter API Key';
      break;
    default:
      console.log('Invalid option. Exiting.');
      rl.close();
      return;
  }
  
  // Get current value
  const regex = new RegExp(`${keyName}=(.*)`, 'i');
  const match = envContent.match(regex);
  const currentValue = match ? match[1] : 'Not set';
  
  console.log(`\nUpdating ${keyDescription} (${keyName})`);
  console.log(`Current value: ${currentValue}`);
  
  // Get new value
  const newValue = await question(`\nEnter new ${keyDescription}: `);
  
  if (!newValue.trim()) {
    console.log('No value entered. Keeping the current value.');
    rl.close();
    return;
  }
  
  // Update .env file
  if (match) {
    // Replace existing value
    envContent = envContent.replace(regex, `${keyName}=${newValue.trim()}`);
  } else {
    // Add new key
    envContent += `\n${keyName}=${newValue.trim()}`;
  }
  
  // Write updated content
  try {
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    console.log(`\n✅ Successfully updated ${keyDescription} in .env file`);
  } catch (error) {
    console.error(`\n❌ Error writing .env file: ${error.message}`);
  }
  
  console.log('\n⚠️ Remember to restart your terminal or reload environment variables for changes to take effect.');
  
  // Offer to run debug script
  const runDebug = await question('\nWould you like to test the updated key now? (y/n): ');
  
  if (runDebug.toLowerCase() === 'y') {
    console.log('\nRunning debug script...');
    console.log('Note: You may need to restart your terminal first for the changes to take effect.');
    console.log('If the test fails, try closing this terminal and testing in a new terminal session.');
    
    // Execute debug script
    const { exec } = require('child_process');
    exec('node ' + path.join(__dirname, 'debug-api-keys.js'), (error, stdout, stderr) => {
      console.log(stdout);
      if (error) {
        console.error(`\n❌ Error running debug script: ${error.message}`);
      }
      rl.close();
    });
  } else {
    rl.close();
  }
}

// Run the script
updateApiKeys().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});