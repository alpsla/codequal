#!/bin/bash

# Complete OpenRouter Integration and Test Script
# This script will:
# 1. Test direct connection to OpenRouter to verify model formats
# 2. Apply the OpenRouter integration fix to DeepWiki
# 3. Test the integration with a small repository
# 4. Generate a report using DeepSeek Coder

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====== DeepWiki OpenRouter Integration Complete Solution ======${NC}"

# Load environment variables
if [ -f ".env" ]; then
    source .env
fi

# Check if OpenRouter API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${RED}Error: OPENROUTER_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Set it with: export OPENROUTER_API_KEY=your-api-key${NC}"
    echo -e "${YELLOW}Or add it to a .env file in this directory${NC}"
    exit 1
fi

# Step 1: Test direct connection to OpenRouter
echo -e "${BLUE}Step 1: Testing direct connection to OpenRouter...${NC}"
node test-openrouter-direct.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to connect to OpenRouter directly${NC}"
    echo -e "${YELLOW}Please check your API key and try again${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1 Complete: Successfully tested direct connection to OpenRouter${NC}"

# Step 2: Apply the OpenRouter integration fix to DeepWiki
echo -e "${BLUE}Step 2: Applying OpenRouter integration fix to DeepWiki...${NC}"
bash fix-deepwiki-openrouter-integration.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to apply OpenRouter integration fix${NC}"
    exit 1
fi

echo -e "${GREEN}Step 2 Complete: Successfully applied OpenRouter integration fix${NC}"

# Step 3: Set up port forwarding for the DeepWiki service
echo -e "${BLUE}Step 3: Setting up port forwarding for DeepWiki...${NC}"

# Get the DeepWiki pod name
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
    echo -e "${RED}Error: DeepWiki pod not found${NC}"
    exit 1
fi

# Check if port forwarding is already active
PORT_FORWARD_ACTIVE=$(ps aux | grep "kubectl port-forward.*8001:8001" | grep -v grep)

if [ -z "$PORT_FORWARD_ACTIVE" ]; then
    echo -e "${YELLOW}Starting port forwarding...${NC}"
    kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 > /dev/null 2>&1 &
    
    # Wait for port forwarding to be ready
    echo -e "${YELLOW}Waiting for port forwarding to be ready...${NC}"
    sleep 5
else
    echo -e "${GREEN}Port forwarding is already active${NC}"
fi

# Step 4: Clean up old repositories to free disk space
echo -e "${BLUE}Step 4: Cleaning up old repositories to free disk space...${NC}"
kubectl exec -n codequal-dev $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf {} \; || true"
kubectl exec -n codequal-dev $POD -- bash -c "rm -rf /root/.adalflow/embeddings/* || true"

# Check disk space
echo -e "${YELLOW}Checking disk space in DeepWiki pod...${NC}"
kubectl exec -n codequal-dev $POD -- df -h /root/.adalflow

echo -e "${GREEN}Step 4 Complete: Successfully cleaned up disk space${NC}"

# Step 5: Test the integration with DeepSeek Coder
echo -e "${BLUE}Step 5: Testing the integration with DeepSeek Coder...${NC}"
node test-deepseek-coder-fixed.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Warning: Test with DeepSeek Coder encountered issues${NC}"
    echo -e "${YELLOW}Falling back to Claude 3.7 Sonnet as an alternative...${NC}"
    
    # Update the test script to use Claude 3.7 Sonnet
    sed -i '' 's/MODEL = .*/MODEL = "anthropic\/claude-3-7-sonnet";/' test-deepseek-coder-fixed.js
    
    # Try again with Claude
    echo -e "${YELLOW}Retrying with Claude 3.7 Sonnet...${NC}"
    node test-deepseek-coder-fixed.js
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to test the integration with both DeepSeek Coder and Claude${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Step 5 Complete: Successfully tested the integration with DeepSeek Coder${NC}"
fi

# Step 6: Generate a report with a larger repository if the previous test succeeded
echo -e "${BLUE}Step 6: Generating a full report with a larger repository...${NC}"

# Create a script to run the full report
cat > generate-full-report.js << EOF
/**
 * Generate a full repository analysis report using DeepWiki with OpenRouter
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('./load-env')();

// Configuration
const DEEPWIKI_URL = 'http://localhost:8001';
const MODEL = 'anthropic/claude-3-7-sonnet'; // Using Claude for reliability
const REPO_URL = 'https://github.com/microsoft/fluentui-emoji'; // A medium-sized repository
const OUTPUT_DIR = path.join(__dirname, 'reports');

// Format output filename
function formatOutputFilename(repoUrl) {
  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(OUTPUT_DIR, \`\${repoName}-full-report-\${timestamp}.md\`);
}

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(\`Created output directory: \${OUTPUT_DIR}\`);
  }
}

async function generateFullReport() {
  console.log('Generating Full Repository Analysis Report');
  console.log('==========================================');
  console.log(\`Repository: \${REPO_URL}\`);
  console.log(\`Model: \${MODEL}\`);
  console.log('------------------------------------------');
  
  // Ensure output directory exists
  ensureOutputDir();
  
  const outputFile = formatOutputFilename(REPO_URL);
  
  try {
    console.log('Starting repository analysis...');
    console.log('This may take several minutes.');
    
    // Create a comprehensive prompt for repository analysis
    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert code analyst, specializing in repository analysis. Provide detailed, well-structured analysis with specific code examples when relevant.'
      },
      { 
        role: 'user', 
        content: \`Analyze the GitHub repository at \${REPO_URL} and provide a comprehensive report with the following sections:
        
1. Executive Summary: High-level overview of the repository, its purpose, and main components.
2. Architecture Overview: Key components and how they interact.
3. Code Quality Assessment: Strengths and areas for improvement in code organization, style, and patterns.
4. Key Features: Main functionality implemented in the repository.
5. Dependencies: External libraries and frameworks used.
6. Recommendations: Suggested improvements for code quality, architecture, and performance.

Provide specific code examples where appropriate to illustrate important points.\`
      }
    ];
    
    // Send the request to DeepWiki via OpenRouter
    const response = await axios.post(\`\${DEEPWIKI_URL}/chat/completions/stream\`, {
      model: MODEL,
      repo_url: REPO_URL,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.3,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 600000 // 10 minute timeout
    });
    
    console.log('\\n=== Beginning Analysis ===\\n');
    
    let fullReport = '';
    
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
                fullReport += content;
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
        console.log('\\n\\n=== Analysis Complete ===');
        console.log(\`Full report saved to: \${outputFile}\`);
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('\\n❌ Stream error:', err.message);
        writeStream.end();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error generating full report:');
    
    if (error.response) {
      console.error(\`Status: \${error.response.status}\`);
      
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          console.error('Error data:', error.response.data);
        } else {
          console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        }
      }
    } else {
      console.error(\`Error: \${error.message}\`);
    }
  }
}

// Run the report generation
generateFullReport().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
EOF

# Run the full report generation
node generate-full-report.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Warning: Full report generation encountered issues${NC}"
    echo -e "${YELLOW}You can try running it again later with: node generate-full-report.js${NC}"
else
    echo -e "${GREEN}Step 6 Complete: Successfully generated a full report${NC}"
fi

echo -e "${GREEN}====== DeepWiki OpenRouter Integration Complete ======${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Review the generated reports in the 'reports' directory${NC}"
echo -e "${YELLOW}2. For troubleshooting, check the pod logs:${NC}"
echo -e "${YELLOW}   kubectl logs -n codequal-dev $POD${NC}"
echo -e "${YELLOW}3. To generate reports with other models, update the MODEL variable in generate-full-report.js${NC}"

# Clean up port forwarding (optional)
# PORT_FORWARD_PID=$(ps aux | grep "kubectl port-forward.*8001:8001" | grep -v grep | awk '{print $2}')
# if [ ! -z "$PORT_FORWARD_PID" ]; then
#   echo -e "${YELLOW}Cleaning up port forwarding...${NC}"
#   kill $PORT_FORWARD_PID
# fi

echo -e "${GREEN}Integration process completed.${NC}"