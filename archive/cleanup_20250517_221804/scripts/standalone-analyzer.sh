#!/bin/bash

# Standalone Repository Analyzer with OpenRouter
# This script provides a standalone solution for repository analysis using OpenRouter
# It doesn't rely on DeepWiki integration

# Function to show usage
function show_usage {
  echo "Standalone Repository Analyzer with OpenRouter"
  echo "---------------------------------------------"
  echo "Usage: $0 <repo_url> [model]"
  echo ""
  echo "Arguments:"
  echo "  repo_url - URL of the GitHub repository to analyze"
  echo "  model    - Optional OpenRouter model (default: anthropic/claude-3-7-sonnet)"
  echo ""
  echo "Available models:"
  echo "  - anthropic/claude-3-7-sonnet"
  echo "  - anthropic/claude-3-opus"
  echo "  - openai/gpt-4o"
  echo "  - deepseek/deepseek-coder"
  echo ""
  echo "Example: $0 https://github.com/jpadilla/pyjwt deepseek/deepseek-coder"
  exit 1
}

# Process arguments
if [ $# -lt 1 ]; then
  show_usage
fi

REPO_URL=$1
MODEL=${2:-"anthropic/claude-3-7-sonnet"}
OUTPUT_DIR="$(pwd)/reports"

# Ensure API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    if [ -f ".env" ]; then
        source .env
    fi
    
    if [ -z "$OPENROUTER_API_KEY" ]; then
        echo "Error: OPENROUTER_API_KEY environment variable is not set"
        echo "Set it with: export OPENROUTER_API_KEY=your-api-key"
        echo "Or add it to a .env file in this directory"
        exit 1
    fi
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Format output filename
REPO_NAME=$(basename "$REPO_URL" .git)
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_FILE="$OUTPUT_DIR/${REPO_NAME}-${MODEL//\//-}-${TIMESTAMP}.md"

echo "Standalone Repository Analyzer"
echo "========================================="
echo "Repository URL: $REPO_URL"
echo "Model: $MODEL"
echo "Output file: $OUTPUT_FILE"
echo "-----------------------------------------"

# Create Node.js script for repository analysis
cat > /tmp/analyze-repo.js << 'EOF'
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration from environment
const REPO_URL = process.env.REPO_URL;
const MODEL = process.env.MODEL;
const OUTPUT_FILE = process.env.OUTPUT_FILE;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!REPO_URL || !MODEL || !OUTPUT_FILE || !OPENROUTER_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

console.log(`Analyzing repository ${REPO_URL} with model ${MODEL}`);

// Create analysis prompt
const prompt = `
Please analyze this GitHub repository: ${REPO_URL}

Please provide a comprehensive analysis with the following sections:

1. Executive Summary: High-level overview of what this repository does.
2. Architecture Overview: Key components and their relationships.
3. Main Features: Key functionalities implemented.
4. Code Quality Assessment: Evaluation of code organization, patterns, and quality.
5. Dependencies: External libraries and frameworks used.
6. Recommendations: Suggested improvements or best practices to consider.

Note: You have the ability to browse the repository and understand its content. Focus on the actual code in the repository, not just what you know generally about projects with this name.
`;

async function analyzeRepository() {
  try {
    console.log('Sending analysis request to OpenRouter...');
    
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
          'HTTP-Referer': 'https://github.com',
          'X-Title': 'Repository Analysis'
        }
      }
    );
    
    const analysisContent = response.data.choices[0].message.content;
    console.log('Analysis completed successfully');
    
    // Create header content
    const headerContent = `# Repository Analysis: ${REPO_URL}\n\n` +
      `Generated with: ${MODEL}\n` +
      `Date: ${new Date().toISOString()}\n\n` +
      `---\n\n`;
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, headerContent + analysisContent);
    console.log(`Analysis saved to: ${OUTPUT_FILE}`);
    
    return true;
  } catch (error) {
    console.error('Error analyzing repository:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

// Run the analysis
analyzeRepository()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
EOF

# Run the Node.js script
echo "Starting repository analysis..."
REPO_URL="$REPO_URL" MODEL="$MODEL" OUTPUT_FILE="$OUTPUT_FILE" OPENROUTER_API_KEY="$OPENROUTER_API_KEY" node /tmp/analyze-repo.js

if [ $? -eq 0 ]; then
  echo ""
  echo "Analysis completed successfully!"
  echo "Report saved to: $OUTPUT_FILE"
  
  # Display beginning of file
  echo ""
  echo "Report Preview:"
  echo "-----------------------------------"
  head -n 15 "$OUTPUT_FILE"
  echo "-----------------------------------"
  echo "..."
else
  echo ""
  echo "Error: Analysis failed"
  exit 1
fi