/**
 * Test DeepWiki with OpenAI GPT-4o for repository analysis
 * This script uses DeepWiki with OpenAI's GPT-4o model
 * Fixed version with improved file saving logic
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
// Use OpenAI's GPT-4o model which is natively supported by DeepWiki
const PROVIDER = 'openai';
const MODEL = 'gpt-4o';
// Using a small repo to avoid disk space issues
const TEST_REPO_URL = 'https://github.com/jpadilla/pyjwt';
const OUTPUT_DIR = path.join(__dirname, 'reports');

// Format a repository URL into a filename
function formatOutputFilename(repoUrl) {
  // Extract repo name from URL
  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(OUTPUT_DIR, `${repoName}-deepwiki-openai-${timestamp}.md`);
}

// Ensure the output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

// Ensure port forwarding is active
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

// Ensure the DeepWiki API is accessible
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

// Check if OpenAI API key is set in DeepWiki
async function checkOpenAIKey() {
  try {
    const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
    
    if (!podName) {
      console.error('DeepWiki pod not found.');
      return false;
    }
    
    // Check if OPENAI_API_KEY environment variable is set in the pod
    const envVars = execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c "env | grep OPENAI_API_KEY"`).toString().trim();
    
    if (!envVars) {
      console.log('OPENAI_API_KEY not set in DeepWiki pod. Setting it now...');
      
      // Get the OPENAI_API_KEY from the environment or .env file
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY environment variable is not set.');
        return false;
      }
      
      // Set the environment variable in the pod
      execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c "export OPENAI_API_KEY=${OPENAI_API_KEY}"`);
      console.log('OPENAI_API_KEY set in DeepWiki pod.');
    } else {
      console.log('OPENAI_API_KEY already set in DeepWiki pod.');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking/setting OpenAI API key:', error.message);
    return false;
  }
}

// Check available disk space in the DeepWiki pod
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

// Clean up any old repositories to free disk space
async function cleanupOldRepositories() {
  try {
    // Get the DeepWiki pod name
    const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
    
    if (!podName) {
      console.error('DeepWiki pod not found.');
      return false;
    }
    
    console.log('Cleaning up old repositories to free disk space...');
    // Remove all repositories to ensure we have space
    execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c "rm -rf /root/.adalflow/repos/*"`);
    
    // Also clean up embeddings directory
    execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c "rm -rf /root/.adalflow/embeddings/*"`);
    
    // Check disk usage after cleanup
    const diskUsage = execSync(`kubectl exec -n codequal-dev ${podName} -- df -h /root/.adalflow`).toString();
    console.log('Disk usage after cleanup:');
    console.log(diskUsage);
    
    return true;
  } catch (error) {
    console.error('Error cleaning up old repositories:', error.message);
    return false;
  }
}

// Process streaming data and save to file
function processStreamData(data, outputFile) {
  let content = '';
  
  if (data.includes('data: ')) {
    const jsonStr = data.replace('data: ', '').trim();
    if (jsonStr !== '[DONE]') {
      try {
        const json = JSON.parse(jsonStr);
        if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
          content = json.choices[0].delta.content;
          
          // Append to file
          fs.appendFileSync(outputFile, content);
          
          // Return the content for console output
          return content;
        }
      } catch (e) {
        // Ignore parse errors in stream
        return '.';
      }
    } else {
      return '[DONE]';
    }
  }
  
  return '.';
}

// Run repository analysis with DeepWiki using OpenAI
async function runAnalysis() {
  console.log('DeepWiki Repository Analysis with OpenAI GPT-4o');
  console.log('===============================================');
  console.log(`Repository: ${TEST_REPO_URL}`);
  console.log(`Provider: ${PROVIDER}`);
  console.log(`Model: ${MODEL}`);
  console.log('-----------------------------------------------');
  
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
  
  // Ensure OpenAI API key is set
  await checkOpenAIKey();
  
  // Clean up old repositories
  await cleanupOldRepositories();
  
  // Check disk space
  await checkDiskSpace();
  
  const outputFile = formatOutputFilename(TEST_REPO_URL);
  
  // Create empty output file
  fs.writeFileSync(outputFile, '');
  
  try {
    console.log('Starting analysis with DeepWiki + OpenAI GPT-4o...');
    console.log('This may take several minutes.');
    
    // Create a simple prompt to test the model
    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert code analyst powered by OpenAI GPT-4o.'
      },
      { 
        role: 'user', 
        content: `Analyze the GitHub repository at ${TEST_REPO_URL} and provide a comprehensive summary of what the repository does, its architecture, main components, and key features. Include information about:
        
1. Purpose and functionality of the repository
2. Main components and architecture
3. Key features and capabilities
4. Notable implementation details
5. Usage patterns and examples

Please provide a detailed, well-structured analysis.`
      }
    ];
    
    // Send the request to DeepWiki
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: MODEL,
      provider: PROVIDER,
      repo_url: TEST_REPO_URL,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.3,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 300000 // 5 minute timeout
    });
    
    console.log('\n=== Beginning Analysis ===\n');
    
    // Process the streaming response
    await new Promise((resolve) => {
      response.data.on('data', (chunk) => {
        const data = chunk.toString();
        const output = processStreamData(data, outputFile);
        process.stdout.write(output);
      });
      
      response.data.on('end', () => {
        console.log('\n\n=== Analysis Complete ===');
        console.log(`Report saved to: ${outputFile}`);
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('\n❌ Stream error:', err.message);
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

// Run the analysis
runAnalysis().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});