/**
 * Test DeepSeek Coder with OpenRouter Integration
 * This script specifically tests the fixed integration between DeepWiki,
 * OpenRouter, and DeepSeek Coder.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const MODEL = 'deepseek/deepseek-coder';
const TEST_REPO_URL = 'https://github.com/jpadilla/pyjwt'; // Small repo to avoid disk issues
const OUTPUT_DIR = path.join(__dirname, 'reports');

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// Format output filename
function formatOutputFilename(repoUrl) {
  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(OUTPUT_DIR, `${repoName}-deepseek-fixed-${timestamp}.md`);
}

// Check DeepWiki connection
async function checkDeepWikiConnection() {
  try {
    const response = await axios.get(DEEPWIKI_URL, { timeout: 5000 });
    console.log('✅ Connected to DeepWiki API');
    console.log('API info:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to DeepWiki API:', error.message);
    return false;
  }
}

// Test DeepSeek Coder directly through OpenRouter
async function testDeepSeekCoder() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is not set');
    return false;
  }
  
  console.log('Testing DeepSeek Coder through OpenRouter API...');
  
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
    
    console.log('✅ DeepSeek Coder direct test successful!');
    console.log('Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('❌ Error testing DeepSeek Coder directly:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    return false;
  }
}

// Test repository analysis with DeepSeek Coder
async function analyzeRepository() {
  console.log('DeepSeek Coder Repository Analysis Test');
  console.log('======================================');
  console.log(`Repository: ${TEST_REPO_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log('--------------------------------------');
  
  // Ensure output directory exists
  ensureOutputDir();
  
  // Check connection first
  if (!await checkDeepWikiConnection()) {
    console.error('❌ Cannot proceed: Unable to connect to DeepWiki API');
    console.error('Make sure DeepWiki is running and port forwarding is active');
    return false;
  }
  
  // Test DeepSeek Coder directly first
  if (!await testDeepSeekCoder()) {
    console.error('❌ Direct test with DeepSeek Coder failed');
    console.error('Proceeding anyway, but this may indicate an issue with the model or API key');
  }
  
  const outputFile = formatOutputFilename(TEST_REPO_URL);
  
  try {
    console.log('Starting repository analysis with DeepSeek Coder...');
    
    // Create a simple analysis prompt
    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert code analyst powered by DeepSeek Coder.'
      },
      { 
        role: 'user', 
        content: `Analyze the GitHub repository at ${TEST_REPO_URL} and provide:
1. A brief overview of what this repository does
2. Key components and their purposes
3. Coding patterns used and quality assessment
4. Areas that could be improved

Keep your response clear and concise.`
      }
    ];
    
    // Send request to DeepWiki
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: MODEL,
      repo_url: TEST_REPO_URL,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.3,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 300000 // 5 minute timeout
    });
    
    console.log('\n=== Beginning Analysis ===\n');
    
    let analysisContent = '';
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
    
    return true;
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
    
    return false;
  }
}

// Main function
async function main() {
  // Ensure port forwarding is active
  try {
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
  } catch (error) {
    console.error('Error setting up port forwarding:', error.message);
    return false;
  }
  
  // Analyze repository
  return await analyzeRepository();
}

// Run the test
main()
  .then(success => {
    if (success) {
      console.log('✅ Test completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Test failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });