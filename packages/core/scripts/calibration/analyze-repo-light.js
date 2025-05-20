/**
 * Lightweight Repository Analysis with DeepWiki using OpenRouter
 * 
 * This script performs a lightweight analysis of a GitHub repository
 * using DeepWiki with OpenRouter integration.
 */

const axios = require('axios');
const { execSync } = require('child_process');

// Load environment variables from .env file
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const DEFAULT_MODEL = 'anthropic/claude-3-7-sonnet';

/**
 * Parse and validate command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node analyze-repo-light.js <repository-url> [options]');
    console.error('\nOptions:');
    console.error('  --model <model>       OpenRouter model identifier (default: anthropic/claude-3-7-sonnet)');
    console.error('  --max-tokens <n>      Maximum tokens to generate (default: 1000)');
    console.error('  --temperature <n>     Temperature for generation (default: 0.3)');
    process.exit(1);
  }
  
  const repoUrl = args[0];
  
  // Parse options
  const options = {
    model: DEFAULT_MODEL,
    maxTokens: 1000,
    temperature: 0.3
  };
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--model' && i + 1 < args.length) {
      options.model = args[i + 1];
      i++;
    } else if (args[i] === '--max-tokens' && i + 1 < args.length) {
      options.maxTokens = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--temperature' && i + 1 < args.length) {
      options.temperature = parseFloat(args[i + 1]);
      i++;
    }
  }
  
  return { repoUrl, options };
}

/**
 * Ensure the DeepWiki API is accessible
 */
async function checkDeepWikiConnection() {
  try {
    const response = await axios.get(DEEPWIKI_URL, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure port forwarding is active
 */
async function ensurePortForwarding() {
  try {
    // Check if port forwarding is already active
    const portForwardingActive = execSync('ps aux | grep "kubectl port-forward.*8001:8001" | grep -v grep').toString().trim() !== '';
    
    if (!portForwardingActive) {
      console.log('Setting up port forwarding...');
      
      // Get the DeepWiki pod name
      const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
      
      if (!podName) {
        console.error('DeepWiki pod not found.');
        return false;
      }
      
      // Start port forwarding in the background
      execSync('kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 > /dev/null 2>&1 &');
      
      // Wait for port forwarding to be ready
      console.log('Waiting for port forwarding to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return true;
  } catch (error) {
    console.error('Error setting up port forwarding:', error.message);
    return false;
  }
}

/**
 * Analyze a GitHub repository using DeepWiki with OpenRouter
 */
async function analyzeRepository(repoUrl, options) {
  console.log('Lightweight Repository Analysis');
  console.log('==============================');
  console.log(`Repository: ${repoUrl}`);
  console.log(`Model: ${options.model}`);
  console.log(`Max Tokens: ${options.maxTokens}`);
  console.log(`Temperature: ${options.temperature}`);
  console.log('------------------------------');
  
  // Verify OpenRouter API key is set
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    console.error('Please make sure the .env file contains a valid OPENROUTER_API_KEY');
    return;
  }
  
  // Ensure port forwarding is active
  if (!await ensurePortForwarding()) {
    console.error('❌ Failed to set up port forwarding');
    return;
  }
  
  // Check DeepWiki connection
  if (!await checkDeepWikiConnection()) {
    console.error('❌ Cannot connect to DeepWiki API');
    console.error('Make sure DeepWiki is running and port forwarding is active');
    return;
  }
  
  console.log('✅ Connected to DeepWiki API');
  
  try {
    console.log('Analyzing repository...');
    
    // Create the lightweight analysis prompt
    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert code analyst. Provide a concise, high-level analysis of the repository. Focus only on the most important aspects without going into excessive detail.'
      },
      { 
        role: 'user', 
        content: `Analyze the GitHub repository at ${repoUrl}. Please provide a lightweight analysis including:
1. A brief overview of what the repository is for (1-2 sentences)
2. The main technologies used
3. The basic architecture (max 3-4 bullet points)
4. Any immediately obvious strengths
5. Any immediately obvious areas for improvement

Keep the analysis brief and to the point. Do not include detailed code examples. This should be a high-level overview only.`
      }
    ];
    
    // Send the analysis request to DeepWiki via OpenRouter using streaming
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: options.model,
      repo_url: repoUrl, // Required parameter
      messages: messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 120000 // 2 minute timeout
    });
    
    console.log('\n=== Analysis Results ===\n');
    
    let analysisContent = '';
    
    // Process the streaming response
    await new Promise((resolve) => {
      response.data.on('data', (chunk) => {
        const data = chunk.toString();
        
        if (data.includes('data: ')) {
          const jsonStr = data.replace('data: ', '').trim();
          if (jsonStr !== '[DONE]') {
            try {
              const json = JSON.parse(jsonStr);
              if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                analysisContent += json.choices[0].delta.content;
                process.stdout.write(json.choices[0].delta.content);
              }
            } catch (e) {
              // Ignore parse errors in stream
            }
          }
        }
      });
      
      response.data.on('end', () => {
        console.log('\n\n=== Analysis Complete ===');
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('❌ Stream error:', err.message);
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error analyzing repository:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
      
      if (error.response.data?.error?.message) {
        console.error(`Error message: ${error.response.data.error.message}`);
      }
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Parse command line arguments and analyze repository
const { repoUrl, options } = parseArgs();
analyzeRepository(repoUrl, options).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});