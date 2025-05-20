/**
 * Standalone Repository Analyzer using OpenRouter
 * This script allows direct repository analysis using OpenRouter models
 * without going through the DeepWiki service
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Load environment variables
require('./load-env')();

// Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL || 'anthropic/claude-3-7-sonnet';
const OUTPUT_DIR = path.join(__dirname, 'reports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

/**
 * Clone a repository to a temporary directory
 */
async function cloneRepository(repoUrl) {
  const tempDir = path.join(__dirname, 'temp', `repo-${Date.now()}`);
  
  // Ensure temp directory exists
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
  }
  
  console.log(`Cloning repository ${repoUrl} to ${tempDir}...`);
  
  try {
    await execAsync(`git clone --depth 1 ${repoUrl} ${tempDir}`);
    console.log('Repository cloned successfully.');
    return tempDir;
  } catch (error) {
    console.error(`Error cloning repository: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze the repository
 */
async function analyzeRepository(repoDir, repoUrl) {
  console.log(`Analyzing repository in ${repoDir}...`);
  
  // Get the repository structure
  const { stdout: lsOutput } = await execAsync(`find ${repoDir} -type f -not -path "*/\\.*" | sort`);
  const files = lsOutput.split('\n').filter(Boolean);
  
  // Get a sample of files to analyze
  const sampleFiles = files.slice(0, 20); // Limit to 20 files to avoid overwhelming the model
  
  // Read file contents for the sample
  const fileContents = await Promise.all(
    sampleFiles.map(async (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
          path: filePath.replace(repoDir, ''),
          content: content.length > 1000 ? content.substring(0, 1000) + '...' : content
        };
      } catch (error) {
        return {
          path: filePath.replace(repoDir, ''),
          content: `Error reading file: ${error.message}`
        };
      }
    })
  );
  
  // Format the repository analysis prompt
  const prompt = `
Please analyze this GitHub repository: ${repoUrl}

Repository Structure:
${files.map(f => f.replace(repoDir, '')).join('\n')}

Sample File Contents:
${fileContents.map(file => `--- ${file.path} ---\n${file.content}\n`).join('\n\n')}

Please provide a comprehensive analysis with the following sections:

1. Executive Summary: High-level overview of what this repository does.
2. Architecture Overview: Key components and their relationships.
3. Main Features: Key functionalities implemented.
4. Code Quality Assessment: Evaluation of code organization, patterns, and quality.
5. Dependencies: External libraries and frameworks used.
6. Recommendations: Suggested improvements or best practices to consider.
`;

  // Send the analysis request to OpenRouter
  console.log('Sending analysis request to OpenRouter...');
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an expert code analyzer with deep knowledge of software engineering.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/your-username/your-repo',
          'X-Title': 'Repository Analysis'
        }
      }
    );
    
    const analysisContent = response.data.choices[0].message.content;
    console.log('Analysis completed successfully.');
    
    return analysisContent;
  } catch (error) {
    console.error('Error analyzing repository with OpenRouter:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Main function to run the repository analysis
 */
async function main() {
  const repoUrl = process.argv[2];
  
  if (!repoUrl) {
    console.error('Please provide a repository URL as an argument');
    console.error('Example: node repo-analyzer.js https://github.com/username/repo');
    process.exit(1);
  }
  
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY environment variable is not set');
    console.error('Set it by running: export OPENROUTER_API_KEY=your-api-key');
    process.exit(1);
  }
  
  console.log(`Repository Analyzer with OpenRouter`);
  console.log(`Model: ${MODEL}`);
  console.log(`Repository: ${repoUrl}`);
  console.log('---------------------------------------');
  
  // Format output filename
  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(OUTPUT_DIR, `${repoName}-analysis-${timestamp}.md`);
  
  try {
    // Clone the repository
    const repoDir = await cloneRepository(repoUrl);
    
    // Analyze the repository
    const analysis = await analyzeRepository(repoDir, repoUrl);
    
    // Save the analysis to file
    fs.writeFileSync(outputFile, analysis);
    console.log(`Analysis saved to: ${outputFile}`);
    
    // Clean up
    console.log('Cleaning up temporary files...');
    fs.rmSync(repoDir, { recursive: true, force: true });
    
    console.log('Repository analysis completed successfully!');
  } catch (error) {
    console.error(`Error analyzing repository: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();