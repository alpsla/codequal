#!/usr/bin/env node
/**
 * Debug script to locate and load .env files
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log('===== ENV DEBUG TOOL =====');
console.log('Current working directory:', process.cwd());
console.log('Script directory:', __dirname);

// Try multiple possible locations for .env file
const possibleLocations = [
  // Current directory
  path.resolve(process.cwd(), '.env'),
  // Script directory
  path.resolve(__dirname, '.env'),
  // Parent directory (packages/core)
  path.resolve(__dirname, '..', '.env'),
  // Root directory
  path.resolve(__dirname, '..', '..', '..', '.env'),
];

console.log('\nChecking possible .env file locations:');
possibleLocations.forEach((location, index) => {
  const exists = fs.existsSync(location);
  console.log(`[${index + 1}] ${location} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  
  if (exists) {
    try {
      // Try to read the file (without revealing sensitive contents)
      const stats = fs.statSync(location);
      console.log(`   - File size: ${stats.size} bytes`);
      console.log(`   - Last modified: ${stats.mtime}`);
      
      // Check if it contains expected variables
      const content = fs.readFileSync(location, 'utf8');
      console.log(`   - Contains ANTHROPIC_API_KEY: ${content.includes('ANTHROPIC_API_KEY')}`);
      console.log(`   - Contains GITHUB_TOKEN: ${content.includes('GITHUB_TOKEN')}`);
      
      // Try loading with dotenv
      const result = dotenv.config({ path: location });
      if (result.error) {
        console.log(`   - ERROR loading with dotenv: ${result.error.message}`);
      } else {
        console.log('   - Successfully loaded with dotenv');
        console.log('   - Loaded env keys:', Object.keys(result.parsed).join(', '));
      }
    } catch (error) {
      console.log(`   - Error examining file: ${error.message}`);
    }
  }
});

console.log('\nCurrent environment variables (API/KEY/TOKEN only):');
const relevantKeys = Object.keys(process.env).filter(key => 
  key.includes('API') || key.includes('KEY') || key.includes('TOKEN'));

if (relevantKeys.length > 0) {
  relevantKeys.forEach(key => {
    // Don't show the actual value for security reasons
    const value = process.env[key];
    console.log(`${key}: ${value ? '[SET]' : '[NOT SET]'} (length: ${value ? value.length : 0})`);
  });
} else {
  console.log('No API/KEY/TOKEN environment variables found');
}

console.log('\n===== END OF DEBUG =====');