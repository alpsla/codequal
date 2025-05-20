/**
 * Direct test of OpenAI API for repository analysis
 * 
 * This script bypasses DeepWiki and directly uses the OpenAI API
 * to analyze a repository and generate a comprehensive report.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('./load-env')();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o';
const REPO_URL = 'https://github.com/jpadilla/pyjwt';
const OUTPUT_DIR = path.join(__dirname, 'reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `pyjwt-openai-direct-${new Date().toISOString().replace(/[:.]/g, '-')}.md`);

// Function to ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

// Main function
async function analyzeRepository() {
  console.log('OpenAI Direct Repository Analysis');
  console.log('=================================');
  console.log(`Repository: ${REPO_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log('---------------------------------');

  // Ensure we have an API key
  if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Ensure output directory exists
  ensureOutputDir();

  try {
    console.log('Starting OpenAI API request...');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analyst.'
          },
          {
            role: 'user',
            content: `Analyze the GitHub repository at ${REPO_URL} and provide a comprehensive summary of what the repository does, its architecture, main components, and key features. Include information about:
            
1. Purpose and functionality of the repository
2. Main components and architecture
3. Key features and capabilities
4. Notable implementation details
5. Usage patterns and examples
            
Please provide a detailed, well-structured analysis.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    const content = response.data.choices[0].message.content;
    
    console.log('\n=== Repository Analysis ===\n');
    console.log(content);
    console.log('\n=== Analysis Complete ===');
    
    // Save the report to a file
    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`Report saved to: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('Error calling OpenAI API:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the analysis
analyzeRepository().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});