/**
 * Full Repository Analysis with DeepWiki using deepseek/deepseek-coder
 * 
 * This script performs a comprehensive analysis of a GitHub repository
 * using DeepWiki with OpenRouter integration and deepseek/deepseek-coder model.
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
const DEFAULT_REPO_URL = 'https://github.com/mitsuhiko/flask-sqlalchemy'; // Small repository
const OUTPUT_DIR = path.join(__dirname, 'reports');

/**
 * Parse and validate command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('No repository URL provided, using default:', DEFAULT_REPO_URL);
    return { 
      repoUrl: DEFAULT_REPO_URL,
      options: {
        maxTokens: 2000,
        temperature: 0.3,
        outputFile: formatOutputFilename(DEFAULT_REPO_URL)
      }
    };
  }
  
  const repoUrl = args[0];
  
  // Parse options
  const options = {
    maxTokens: 2000,
    temperature: 0.3,
    outputFile: formatOutputFilename(repoUrl)
  };
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--max-tokens' && i + 1 < args.length) {
      options.maxTokens = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--temperature' && i + 1 < args.length) {
      options.temperature = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      options.outputFile = args[i + 1];
      i++;
    }
  }
  
  return { repoUrl, options };
}

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
 * Analyze a GitHub repository using DeepWiki with deepseek/deepseek-coder
 */
async function analyzeRepository(repoUrl, options) {
  console.log('Full Repository Analysis with DeepSeek Coder');
  console.log('==========================================');
  console.log(`Repository: ${repoUrl}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Max Tokens: ${options.maxTokens}`);
  console.log(`Temperature: ${options.temperature}`);
  console.log(`Output File: ${options.outputFile}`);
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
  
  try {
    console.log('Analyzing repository with DeepSeek Coder...');
    console.log('This may take several minutes for a full analysis.');
    
    // Create the comprehensive analysis prompt
    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert code analysis system powered by deepseek/deepseek-coder. Provide a comprehensive and structured analysis of the repository.'
      },
      { 
        role: 'user', 
        content: `Analyze the GitHub repository at ${repoUrl}. Please provide a full, detailed report including:

# Repository Analysis Report

## Overview
- Repository purpose and main functionality
- Primary technologies and languages used
- Overall architecture and organization

## Code Structure
- Directory structure and organization
- Key modules and their relationships
- Main entry points and control flow

## Code Quality Assessment
- Code style and consistency
- Documentation quality
- Test coverage and testing approach
- Error handling practices

## Architecture Patterns
- Design patterns used
- Architecture principles followed
- Component interactions

## Dependencies
- External libraries and frameworks
- How dependencies are managed

## Security Considerations
- Potential security issues
- Authentication and authorization approaches
- Data validation and sanitization

## Performance Considerations
- Performance optimization techniques
- Potential bottlenecks
- Scalability considerations

## Recommendations
- Improvement opportunities
- Refactoring suggestions
- Best practices to implement

Make this analysis thorough but focused on the most important aspects of the codebase.`
      }
    ];
    
    // Send the analysis request to DeepWiki via OpenRouter using streaming
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
      model: MODEL,
      repo_url: repoUrl,
      messages: messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      stream: true
    }, {
      responseType: 'stream',
      timeout: 600000 // 10 minute timeout
    });
    
    console.log('\n=== Beginning Analysis ===\n');
    
    let analysisContent = '';
    let reportStarted = false;
    
    // Create a write stream for saving the report
    const writeStream = fs.createWriteStream(options.outputFile);
    
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
                
                // Check if report has started (for progress tracking)
                if (!reportStarted && content.includes('Repository Analysis Report')) {
                  reportStarted = true;
                }
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
        console.log(`Full report saved to: ${options.outputFile}`);
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