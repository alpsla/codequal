/**
 * Debug script for OpenRouter integration with DeepWiki
 * This script tests the OpenRouter integration with detailed debugging
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
try {
  const envPath = '/Users/alpinro/Code Prjects/codequal/.env';
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from:', envPath);
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.trim());
    
    for (const line of envVars) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      
      if (key && value) {
        const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
        process.env[key.trim()] = cleanValue;
      }
    }
  } else {
    console.warn('Warning: .env file not found at', envPath);
  }
} catch (error) {
  console.error('Error loading .env file:', error.message);
}

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'anthropic/claude-3-7-sonnet'; // Using Claude which is very reliable
const OUTPUT_DIR = path.join(__dirname, 'debug-reports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

/**
 * Test OpenRouter directly to verify API key and model access
 */
async function testOpenRouterDirect() {
  console.log('=== Testing OpenRouter API Directly ===');
  console.log('API Key:', OPENROUTER_API_KEY ? '✓ Set' : '✗ Not set');
  
  if (!OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY is not set. Cannot proceed with testing.');
    return false;
  }
  
  try {
    console.log(`Testing model: ${MODEL}`);
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello and identify which AI model you are.' }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/your-username/your-repo',
          'X-Title': 'DeepWiki Debug Test'
        }
      }
    );
    
    console.log('✅ OpenRouter direct test successful!');
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
    return false;
  }
}

/**
 * Check DeepWiki API connection
 */
async function checkDeepWikiConnection() {
  console.log('=== Checking DeepWiki API Connection ===');
  
  try {
    // Check if port forwarding is active
    try {
      const portForwardingActive = execSync('ps aux | grep "kubectl port-forward.*8001:8001" | grep -v grep').toString().trim() !== '';
      
      if (!portForwardingActive) {
        console.log('Port forwarding is not active. Setting it up...');
        
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
      } else {
        console.log('Port forwarding is active.');
      }
    } catch (error) {
      console.error('Error checking/setting up port forwarding:', error.message);
    }
    
    // Try to connect to DeepWiki API
    console.log('Connecting to DeepWiki API...');
    const response = await axios.get(DEEPWIKI_URL, { timeout: 5000 });
    
    console.log('✅ Successfully connected to DeepWiki API');
    console.log('API info:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to DeepWiki API:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Test DeepWiki with OpenRouter simple message (no repository analysis)
 */
async function testDeepWikiSimpleMessage() {
  console.log('=== Testing DeepWiki with Simple Message ===');
  
  try {
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and identify which AI model you are.' }
      ],
      max_tokens: 100,
      temperature: 0.7,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Response received. Processing stream...');
    
    const debugOutputFile = path.join(OUTPUT_DIR, `simple-message-${Date.now()}.txt`);
    const writeStream = fs.createWriteStream(debugOutputFile);
    
    let fullResponse = '';
    let debugInfo = '';
    
    await new Promise((resolve) => {
      response.data.on('data', (chunk) => {
        const data = chunk.toString();
        debugInfo += `CHUNK: ${data}\n`;
        writeStream.write(`CHUNK: ${data}\n`);
        
        if (data.includes('data: ')) {
          const jsonStr = data.replace('data: ', '').trim();
          if (jsonStr !== '[DONE]') {
            try {
              const json = JSON.parse(jsonStr);
              if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                const content = json.choices[0].delta.content;
                fullResponse += content;
                process.stdout.write(content);
              }
            } catch (e) {
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
        console.log('\nStream ended');
        writeStream.end();
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('\nStream error:', err.message);
        writeStream.end();
        resolve();
      });
    });
    
    console.log(`\nFull response received: ${fullResponse}`);
    console.log(`Debug information saved to: ${debugOutputFile}`);
    return true;
  } catch (error) {
    console.error('❌ Error testing DeepWiki with simple message:');
    
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

/**
 * Check pod environment variables
 */
async function checkPodEnvironment() {
  console.log('=== Checking Pod Environment ===');
  
  try {
    // Get the DeepWiki pod name
    const podName = execSync('kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath=\'{.items[0].metadata.name}\'').toString().trim();
    
    if (!podName) {
      console.error('DeepWiki pod not found.');
      return false;
    }
    
    console.log('Pod name:', podName);
    
    // Check environment variables in the pod
    console.log('Checking environment variables in the pod...');
    const envVars = execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c 'env | grep -E "OPENROUTER|API_KEY"'`).toString();
    console.log('Environment variables:\n', envVars);
    
    // Check OpenRouter configuration
    console.log('Checking OpenRouter configuration...');
    try {
      const openrouterConfig = execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c 'cat /root/.adalflow/providers/openrouter.yaml || echo "Not found"'`).toString();
      console.log('OpenRouter configuration:\n', openrouterConfig);
    } catch (error) {
      console.error('Error checking OpenRouter configuration:', error.message);
    }
    
    // Check generator configuration
    console.log('Checking generator configuration...');
    try {
      const generatorConfig = execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c 'cat /app/config/generator.json || echo "Not found"'`).toString();
      console.log('Generator configuration:\n', generatorConfig);
    } catch (error) {
      console.error('Error checking generator configuration:', error.message);
    }
    
    // Check OpenRouter client patch
    console.log('Checking OpenRouter client code...');
    try {
      const clientCode = execSync(`kubectl exec -n codequal-dev ${podName} -- bash -c 'cat /app/api/openrouter_client.py | grep -A 10 "ensure_model_prefix" || echo "Patch not found"'`).toString();
      console.log('OpenRouter client code (ensure_model_prefix function):\n', clientCode);
    } catch (error) {
      console.error('Error checking OpenRouter client code:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking pod environment:', error.message);
    return false;
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  console.log('=== DeepWiki OpenRouter Integration Debug ===');
  console.log('Date:', new Date().toISOString());
  console.log('-------------------------------------------');
  
  // Test OpenRouter directly
  const openRouterTest = await testOpenRouterDirect();
  if (!openRouterTest) {
    console.error('ERROR: Direct OpenRouter test failed. Cannot proceed.');
    return;
  }
  
  // Check DeepWiki connection
  const deepWikiConnection = await checkDeepWikiConnection();
  if (!deepWikiConnection) {
    console.error('ERROR: DeepWiki connection test failed. Cannot proceed.');
    return;
  }
  
  // Check pod environment
  await checkPodEnvironment();
  
  // Test DeepWiki with simple message
  await testDeepWikiSimpleMessage();
  
  console.log('=== Debug Complete ===');
}

// Run the main function
main().catch(error => {
  console.error('Unexpected error during debugging:', error);
  process.exit(1);
});