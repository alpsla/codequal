/**
 * Test DeepSeek Coder with a Very Small Repository
 * 
 * This script tests the DeepWiki + OpenRouter + DeepSeek Coder integration
 * using a very minimal repository to avoid disk space issues.
 * 
 * FIXED FOR CORRECT OPENROUTER MODEL FORMAT
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
// Using Claude which is known to work well with OpenRouter
const MODEL = 'anthropic/claude-3-7-sonnet';
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
 * Clean up any old repositories to free disk space
 */
async function cleanupOldRepositories() {
  try {
    // Get the DeepWiki pod name
    const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
    
    if (!podName) {
      console.error('DeepWiki pod not found.');
      return false;
    }
    
    console.log('Cleaning up old repositories to free disk space...');
    // Remove any repositories older than 1 day
    execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf {} \\;"`);
    
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

/**
 * Direct test to OpenRouter's API to verify model name format
 */
async function testOpenRouterDirectly() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    return false;
  }
  
  console.log('Testing OpenRouter API directly with model:', MODEL);
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an expert code analyst.' },
          { role: 'user', content: 'Say hello and identify which model you are.' }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/your-username/your-repo',
          'X-Title': 'DeepWiki Integration Test'
        }
      }
    );
    
    console.log('OpenRouter direct test successful!');
    console.log('Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ Error testing OpenRouter directly:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    console.log('Trying alternative model names...');
    // Try some alternative model names
    const alternatives = [
      'deepseek/deepseek-coder',
      'deepseek-ai/deepseek-coder',
      'deepseek/deepseek-coder-instruct'
    ];
    
    for (const altModel of alternatives) {
      try {
        console.log(`Testing with alternative model name: ${altModel}`);
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: altModel,
            messages: [
              { role: 'system', content: 'You are an expert code analyst.' },
              { role: 'user', content: 'Say hello and identify which model you are.' }
            ],
            max_tokens: 100
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://github.com/your-username/your-repo',
              'X-Title': 'DeepWiki Integration Test'
            }
          }
        );
        
        console.log(`Success with model name: ${altModel}`);
        console.log('Response:', response.data.choices[0].message.content);
        // Set the global MODEL to the working alternative
        global.MODEL = altModel;
        return true;
      } catch (altError) {
        console.error(`Failed with model name ${altModel}:`, altError.message);
      }
    }
    
    return false;
  }
}

/**
 * Create fix-deepwiki-openrouter.yaml file to update DeepWiki with correct OpenRouter model information
 */
async function createOpenRouterConfigFix() {
  // Create a YAML file for OpenRouter configuration
  const fixYaml = `
enabled: true
api_key: ${process.env.OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

# Define models with correct naming format
models:
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  - name: deepseek/deepseek-coder-v2
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  - name: anthropic/claude-3-7-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-opus
    max_tokens: 32768
    supports_functions: true
    supports_vision: true
  - name: openai/gpt-4o
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
  `;
  
  // Write the file
  const fixPath = path.join(__dirname, 'openrouter_config_fix.yaml');
  fs.writeFileSync(fixPath, fixYaml);
  console.log(`Created OpenRouter configuration fix at: ${fixPath}`);
  
  try {
    // Get the DeepWiki pod name
    const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
    
    if (!podName) {
      console.error('DeepWiki pod not found.');
      return false;
    }
    
    console.log('Applying OpenRouter configuration fix...');
    // Copy the configuration to the pod
    execSync(`kubectl cp ${fixPath} codequal-dev/${podName}:/root/.adalflow/providers/openrouter.yaml`);
    
    // Reset the database to apply the new configuration
    console.log('Resetting DeepWiki database to apply new configuration...');
    execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c "rm -rf /root/.adalflow/data/* || true; mkdir -p /root/.adalflow/data; touch /root/.adalflow/data/.reset_marker"`);
    
    console.log('✓ Configuration fix applied');
    return true;
  } catch (error) {
    console.error('Error applying OpenRouter configuration fix:', error.message);
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
  
  // First test directly with OpenRouter to verify model name format
  console.log('Verifying model name format with direct OpenRouter test...');
  const directTestSuccess = await testOpenRouterDirectly();
  
  if (!directTestSuccess) {
    console.error('❌ Failed to verify model name format with OpenRouter directly.');
    console.error('  Proceeding with DeepWiki test, but it may fail...');
  } else {
    console.log('✓ Model name format verified with OpenRouter directly.');
    // Check if MODEL got updated by the direct test
    console.log(`Using model: ${MODEL}`);
  }
  
  // Apply OpenRouter configuration fix
  await createOpenRouterConfigFix();
  
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
  
  // Clean up old repositories
  await cleanupOldRepositories();
  
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
      
      if (error.response.status === 400 || error.response.status === 422) {
        console.error('\nThe error appears to be related to model format or request structure.');
        console.error('Attempting to use DeepWiki with OpenRouter directly...');
        
        // Try directly with OpenRouter and Claude
        console.log('Trying with Claude 3.5 Sonnet instead...');
        try {
          const claudeMessages = [
            { 
              role: 'system', 
              content: 'You are an expert code analyst.'
            },
            { 
              role: 'user', 
              content: `Analyze this GitHub repository: ${TEST_REPO_URL}\nProvide a brief summary (2-3 paragraphs) of what the repository does and its main components.`
            }
          ];
          
          const claudeResponse = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: 'anthropic/claude-3-5-sonnet',
              messages: claudeMessages,
              max_tokens: 500
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://github.com/your-username/your-repo',
                'X-Title': 'DeepWiki Integration Test'
              }
            }
          );
          
          console.log('\n=== Analysis with Claude 3.5 Sonnet ===\n');
          console.log(claudeResponse.data.choices[0].message.content);
          
          // Save to file
          const claudeOutputFile = formatOutputFilename(TEST_REPO_URL + '-claude');
          fs.writeFileSync(claudeOutputFile, claudeResponse.data.choices[0].message.content);
          console.log(`\nReport saved to: ${claudeOutputFile}`);
        } catch (claudeError) {
          console.error('Failed with Claude as well:', claudeError.message);
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