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
  return path.join(OUTPUT_DIR, `${repoName}-full-report-${timestamp}.md`);
}

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

async function generateFullReport() {
  console.log('Generating Full Repository Analysis Report');
  console.log('==========================================');
  console.log(`Repository: ${REPO_URL}`);
  console.log(`Model: ${MODEL}`);
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
        content: `Analyze the GitHub repository at ${REPO_URL} and provide a comprehensive report with the following sections:
        
1. Executive Summary: High-level overview of the repository, its purpose, and main components.
2. Architecture Overview: Key components and how they interact.
3. Code Quality Assessment: Strengths and areas for improvement in code organization, style, and patterns.
4. Key Features: Main functionality implemented in the repository.
5. Dependencies: External libraries and frameworks used.
6. Recommendations: Suggested improvements for code quality, architecture, and performance.

Provide specific code examples where appropriate to illustrate important points.`
      }
    ];
    
    // Send the request to DeepWiki via OpenRouter
    const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
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
    
    console.log('\n=== Beginning Analysis ===\n');
    
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
        console.log('\n\n=== Analysis Complete ===');
        console.log(`Full report saved to: ${outputFile}`);
        resolve();
      });
      
      response.data.on('error', (err) => {
        console.error('\n❌ Stream error:', err.message);
        writeStream.end();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error generating full report:');
    
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

// Run the report generation
generateFullReport().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
