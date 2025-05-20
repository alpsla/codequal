/**
 * Load environment variables from .env file
 * This script loads environment variables from .env file in the project root
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  try {
    // Explicitly use the project root .env file
    const rootDir = '/Users/alpinro/Code Prjects/codequal';
    const envPath = path.join(rootDir, '.env');
    
    if (!fs.existsSync(envPath)) {
      console.error('.env file not found at:', envPath);
      return false;
    }
    
    console.log('Loading environment variables from:', envPath);
    
    // Read the .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.trim());
    
    // Set environment variables
    for (const line of envVars) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Handle values that might contain = signs
      
      if (key && value) {
        // Remove quotes if present
        const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
        process.env[key.trim()] = cleanValue;
      }
    }
    
    console.log('Environment variables loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    return false;
  }
}

// Export the function for use in other scripts
module.exports = loadEnvFile;

// If running this script directly, load the env file
if (require.main === module) {
  const success = loadEnvFile();
  
  if (success) {
    console.log('Environment variables that will be used:');
    console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✓ Set' : '✗ Not set');
    console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✓ Set' : '✗ Not set');
  }
}