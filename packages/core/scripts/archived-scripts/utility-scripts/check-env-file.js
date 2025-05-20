#!/usr/bin/env node
/**
 * Script to check the .env file and the API keys it contains
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Function to safely display key fragments
function safeDisplayKey(key) {
  if (!key) return "[NOT SET]";
  if (typeof key !== 'string') return `[INVALID TYPE: ${typeof key}]`;
  if (key.length < 10) return "[TOO SHORT]";
  
  return `${key.substring(0, 6)}...${key.substring(key.length - 4)}`;
}

// Find and load the .env file
function loadEnvFile(filePath) {
  console.log(`Looking for .env file at: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`File exists! Size: ${fs.statSync(filePath).size} bytes`);
    
    try {
      // Read raw file to check format
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const lines = rawContent.split('\n');
      
      console.log(`\nFile contains ${lines.length} lines`);
      console.log("Checking for common issues:");
      
      // Look for format issues
      let hasFormatIssues = false;
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return; // Skip empty lines and comments
        
        if (!trimmed.includes('=')) {
          console.log(`- Line ${index + 1}: Missing equals sign`);
          hasFormatIssues = true;
        }
        
        // Check for quotes around values
        const parts = trimmed.split('=');
        if (parts.length > 1) {
          const value = parts[1].trim();
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            console.log(`- Line ${index + 1}: Value wrapped in quotes - may cause issues`);
            hasFormatIssues = true;
          }
        }
      });
      
      if (!hasFormatIssues) {
        console.log("✅ No format issues detected");
      }
      
      // Load with dotenv
      console.log("\nLoading .env file with dotenv:");
      const result = dotenv.config({ path: filePath });
      
      if (result.error) {
        console.error(`❌ Error loading .env file: ${result.error.message}`);
        return false;
      }
      
      console.log("✅ Successfully loaded .env file with dotenv");
      return true;
    } catch (error) {
      console.error(`❌ Error reading/parsing .env file: ${error.message}`);
      return false;
    }
  } else {
    console.error(`❌ File does not exist at ${filePath}`);
    return false;
  }
}

// Print relevant environment variables
function checkEnvVars() {
  console.log("\n=== API Keys Found ===");
  
  // Check Anthropic API key
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  console.log(`ANTHROPIC_API_KEY: ${safeDisplayKey(anthropicKey)}`);
  if (anthropicKey) {
    // Additional checks
    if (!anthropicKey.startsWith('sk-ant-')) {
      console.log(`⚠️ Warning: ANTHROPIC_API_KEY does not start with 'sk-ant-' which is unexpected`);
    }
    console.log(`  - Length: ${anthropicKey.length} characters`);
  }
  
  // Check GitHub token
  const githubToken = process.env.GITHUB_TOKEN;
  console.log(`GITHUB_TOKEN: ${safeDisplayKey(githubToken)}`);
  if (githubToken) {
    console.log(`  - Length: ${githubToken.length} characters`);
  }
  
  // Check for alternative keys that might be used
  const alternativeKeys = [
    'ANTHROPIC_KEY',
    'CLAUDE_API_KEY',
    'CLAUDE_KEY',
    'GH_TOKEN',
    'GITHUB_API_TOKEN'
  ];
  
  console.log("\n=== Alternative Keys ===");
  alternativeKeys.forEach(key => {
    const value = process.env[key];
    console.log(`${key}: ${value ? `[SET, Length: ${value.length}]` : '[NOT SET]'}`);
  });
  
  console.log("\n=== All Environment Variables ===");
  console.log(`Total environment variables: ${Object.keys(process.env).length}`);
}

// Main function
function main() {
  console.log("=== .env File Checker ===\n");
  
  // Try multiple possible locations for .env file
  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const coreDir = path.resolve(__dirname, '..');
  
  const possibleLocations = [
    path.join(rootDir, '.env'),
    path.join(coreDir, '.env')
  ];
  
  let loaded = false;
  for (const location of possibleLocations) {
    if (loadEnvFile(location)) {
      loaded = true;
      break;
    }
  }
  
  if (loaded) {
    checkEnvVars();
  } else {
    console.error("❌ Failed to load any .env file");
  }
}

main();