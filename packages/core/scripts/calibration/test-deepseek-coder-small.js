/**
 * Test DeepSeek Coder with a Very Small Repository
 * 
 * This script tests the DeepWiki + OpenRouter + DeepSeek Coder integration
 * using a very minimal repository to avoid disk space issues.
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const MODEL = 'deepseek/deepseek-coder';
// Using a very small repo to avoid disk space issues
const TEST_REPO_URL = 'https://github.com/jpadilla/pyjwt';
const OUTPUT_DIR = path.join(__dirname, 'reports');

/**
 * Format a repository URL into a filename
 */
function formatOutputFilename(repoUrl) {
  // Extract repo name from URL
  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(OUTPUT_DIR, `${repoName}-deepseek-coder-${timestamp}.md`);
}

/**
 * Ensure the output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Ensure the DeepWiki API is accessible
 */
async function checkDeepWikiConnection() {
  try {
    const response = await axios.get(DEEPWIKI_URL, { timeout: 5000 });
    console.log('API info:', response.data);
    return true;
  } catch (error) {
    console.error('Failed to connect to DeepWiki API:', error.message);
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
 * Check available disk space in the DeepWiki pod
 */
async function checkDiskSpace() {
  try {
    // Get the DeepWiki pod name
    const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
    
    if (!podName) {
      console.error('DeepWiki pod not found.');
      return false;
    }
    
    // Check disk usage
    console.log('Checking disk space in DeepWiki pod...');
    const diskUsage = execSync(`kubectl exec -n codequal-dev ${podName} -- df -h /root/.adalflow`).toString();
    console.log('Disk usage:');
    console.log(diskUsage);
    
    // Get available space
    const availableSpace = diskUsage.split('\n')[1].split(/\s+/)[3];
    console.log(`Available space: ${availableSpace}`);
    
    return true;
  } catch (error) {
    console.error('Error checking disk space:', error.message);
    return false;
  }
}

/**
 * Test analysis with DeepSeek Coder
 */
async function testAnalysis() {
  console.log('DeepSeek Coder Test with Small Repository');
  console.log('=========================================');
  console.log(`Repository: ${TEST_REPO_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log('------------------------------------------');
  
  // Verify OpenRouter API key is set
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    console.error('Please make sure the .env file contains a valid OPENROUTER_API_KEY');
    return;
  }
  
  // Ensure output directory exists
  ensureOutputDir();
  
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
  
  // Check disk space
  await checkDiskSpace();
  
  const outputFile = formatOutputFilename(TEST_REPO_URL);
  
  try {
    console.log('Starting analysis with DeepSeek Coder...');
    console.log('This may take several minutes.');
    
    // Create a simple prompt to test the model
    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert code analyst powered by DeepSeek Coder.'
      },
      { 
        role: 'user', 
        content: `Analyze the GitHub repository at ${TEST_REPO_URL} and provide a brief summary (2-3 paragraphs) of what the repository does and its main components.`
      }
    ];
    
    // Send the request to DeepWiki via OpenRouter
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: MODEL,
      repo_url: TEST_REPO_URL,
      messages: messages,
      max_tokens: 500,
      temperature: 0.3,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 300000 // 5 minute timeout
    });
    
    console.log('\n=== Beginning Analysis ===\n');
    
    let analysisContent = '';
    
    // Create a write stream for saving the report
    const writeStream = fs.createWriteStream(outputFile);
    
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
                const content = json.choices[0].delta.content;
                analysisContent += content;
                process.stdout.write(content);
                
                // Write to file
                writeStream.write(content);
              }
            } catch (e) {
              // Ignore parse errors in stream
              process.stdout.write('.');
            }
          } else {
            process.stdout.write('[DONE]');
          }
        } else {
          process.stdout.write('.');
        }
      });
      
      response.data.on('end', () => {
        writeStream.end();
        console.log('\n\n=== Analysis Complete ===');
        console.log(`Report saved to: ${outputFile}`);
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('\n❌ Stream error:', err.message);
        writeStream.end();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error analyzing repository:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          console.error('Error data:', error.response.data);
        } else {
          console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        }
      }
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the test
testAnalysis().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});