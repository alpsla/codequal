#!/bin/bash
# DeepWiki Repository Analysis - Comprehensive Report Generator
# This script runs a deep analysis of a repository using anthropic/claude-3-opus for maximum detail

# Default parameters
MODEL="anthropic/claude-3-opus"  # Using Claude Opus for more detail
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="./deepwiki_comprehensive_analysis"
TIMEOUT=600  # 10 minutes timeout for curl (increased for larger repos and more detailed analysis)

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Test a medium repository (NestJS)
REPO_URL="https://github.com/nestjs/nest"
REPO_NAME=$(basename "$REPO_URL" .git)
OUTPUT_FILE="${OUTPUT_DIR}/comprehensive_${REPO_NAME}_claude_opus.json"

echo "====================================================="
echo "Running COMPREHENSIVE analysis on repository: $REPO_NAME"
echo "Model: $MODEL (Claude 3 Opus)"
echo "Output file: $OUTPUT_FILE"
echo "Timeout: $TIMEOUT seconds"
echo "====================================================="

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Set up port forwarding
echo "Setting up port forwarding to DeepWiki API..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Specialized prompt with detailed instructions
PROMPT="I need an extremely comprehensive and detailed technical analysis of this repository. This is for a critical engineering review and must be thorough.

Please analyze the following aspects in depth:

1. ARCHITECTURE (detailed):
   - Comprehensive architectural patterns and design principles
   - Full module organization and dependency graph
   - Service/component interaction patterns
   - Control flow and data flow
   - API design and structure
   - Database interactions and data models
   - Overall code organization principles

2. DEPENDENCIES (comprehensive):
   - Complete dependency list with versions and purpose
   - Dependency management approach
   - Critical third-party libraries and their usage patterns
   - Dependency update strategy
   - Dependency injection mechanisms
   - Potential dependency vulnerabilities

3. CODE QUALITY (in-depth):
   - Detailed code style analysis across multiple files
   - Consistency in patterns and practices
   - Error handling patterns and robustness
   - Testing approach, coverage, and quality
   - Documentation completeness and quality
   - Refactoring opportunities with specific examples

4. PERFORMANCE ANALYSIS:
   - Memory usage patterns
   - CPU-intensive operations
   - I/O and network patterns
   - Caching strategies and implementation
   - Async handling and concurrency patterns
   - Resource management
   - Potential bottlenecks with specific examples

5. SECURITY ASSESSMENT:
   - Authentication/authorization mechanisms
   - Input validation and sanitization
   - Injection vulnerabilities
   - Secret management
   - Data protection mechanisms
   - Security best practices adherence

6. CODE EXAMPLES (minimum 5):
   - Include specific, real code examples from the repository
   - For each example, provide the file path
   - Analyze the code's purpose, strengths, and weaknesses
   - Suggest concrete improvements for each example
   - Include a mix of positive patterns and improvement opportunities

7. DEPENDENCY GRAPH:
   - Create a textual representation of key module dependencies
   - Identify core modules and their relationships
   - Highlight cyclical dependencies if any
   - Analyze cohesion and coupling

Please include specific file paths and line numbers whenever possible. Include relevant code snippets to illustrate your findings. This analysis should be highly specific to this particular repository, not general advice.

Your analysis should be thorough and actionable, providing real engineering insights that could be used to improve the codebase."

# Execute the comprehensive analysis
echo "Running in-depth repository analysis with Claude 3 Opus..."
echo "This will take several minutes for a complete analysis."
echo "Target repository: $REPO_URL"

START_TIME=$(date +%s)

curl -X POST "http://localhost:$PORT/chat/completions" \
  -H "Content-Type: application/json" \
  -o "$OUTPUT_FILE" \
  --max-time $TIMEOUT \
  -d @- << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert software architect and code analyst performing a critical technical review. Your analysis must be extremely thorough, detailed, and specific to the repository being analyzed. Include concrete examples with file paths and code snippets. Organize your response with clear sections and subsections. Do not summarize or skip any requested aspects of the analysis."
    },
    {
      "role": "user",
      "content": "$PROMPT"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.1,
  "max_tokens": 6000,
  "top_p": 0.95
}
EOF

RESULT=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

if [ $RESULT -ne 0 ]; then
  echo "ERROR: Analysis request failed (exit code: $RESULT)"
  if [ $RESULT -eq 28 ]; then
    echo "The curl operation timed out after $TIMEOUT seconds."
    echo "Consider increasing the timeout value for very detailed analysis."
  fi
  exit 1
fi

echo "Analysis complete! Took ${DURATION} seconds."
echo "Results saved to $OUTPUT_FILE"

# Try to check the output size
OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "Output file size: $OUTPUT_SIZE"

echo "Converting JSON response to markdown for better readability..."
# Extract the content from the JSON response and save as markdown
# This assumes the response has a 'choices[0].message.content' field in the JSON
MARKDOWN_FILE="${OUTPUT_DIR}/comprehensive_${REPO_NAME}_claude_opus.md"
python3 -c "
import json
import sys

try:
    with open('$OUTPUT_FILE', 'r') as f:
        data = json.load(f)
    
    # Try different JSON structures that might be returned
    content = None
    if isinstance(data, dict):
        if 'choices' in data and len(data['choices']) > 0:
            if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                content = data['choices'][0]['message']['content']
        elif 'content' in data:
            content = data['content']
        elif 'response' in data:
            content = data['response']
    
    if content:
        with open('$MARKDOWN_FILE', 'w') as f:
            f.write(content)
        print(f'Successfully extracted content to {sys.argv[1]}')
    else:
        print('Could not find content in the JSON response')
        
except Exception as e:
    print(f'Error processing JSON: {str(e)}')
" "$MARKDOWN_FILE"

echo ""
echo "====================================================="
echo "If the analysis is still not detailed enough:"
echo "1. Try using Anthropic's Claude 3 Opus which tends to provide more detailed analysis"
echo "2. Increase the max_tokens parameter (currently set to 6000)"
echo "3. You might need to make multiple targeted requests instead of one comprehensive request"
echo "4. Consider analyzing specific subsections of the repository for more detail"
echo "====================================================="
