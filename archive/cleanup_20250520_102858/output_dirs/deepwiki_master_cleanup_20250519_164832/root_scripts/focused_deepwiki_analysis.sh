#!/bin/bash
# Focused DeepWiki Analysis Script
# This script tests a simplified analysis with GPT-4.1 focusing on specific aspects

# Default parameters
MODEL="openai/gpt-4.1"  # Using GPT-4.1 as requested
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/deepwiki_focused_analysis"
TIMEOUT=300  # 5 minutes timeout

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Target a medium-sized repository (NestJS)
REPO_URL="https://github.com/nestjs/nest"
REPO_NAME=$(basename "$REPO_URL" .git)
OUTPUT_FILE="${OUTPUT_DIR}/focused_${REPO_NAME}_analysis.json"

echo "====================================================="
echo "Running FOCUSED analysis on repository: $REPO_NAME"
echo "Model: $MODEL"
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

# More focused prompt on dependencies, security, and performance
PROMPT="Analyze this repository and focus SPECIFICALLY on these three critical aspects:

1. DEPENDENCIES:
- List all direct dependencies from package.json with their versions
- Identify any outdated or potentially vulnerable dependencies
- Analyze how dependencies are managed and injected in the codebase
- Provide 2-3 specific examples of dependency usage from the code

2. PERFORMANCE PATTERNS:
- Identify performance-critical areas in the codebase
- Analyze caching strategies and implementations
- Examine async/concurrency patterns
- Highlight potential performance bottlenecks
- Provide 2-3 specific code examples related to performance

3. SECURITY CONSIDERATIONS:
- Review authentication and authorization mechanisms
- Analyze input validation and sanitization practices
- Identify potential security vulnerabilities
- Examine error handling patterns that might leak information
- Provide 2-3 specific examples of security-related code

For each section, provide SPECIFIC FILE PATHS and CODE SNIPPETS from the actual repository. Include detailed analysis of the code examples."

# Execute the focused analysis
echo "Running focused repository analysis with GPT-4.1..."
echo "This analysis focuses on dependencies, performance, and security."
echo "Target repository: $REPO_URL"

START_TIME=$(date +%s)

curl -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -o "$OUTPUT_FILE" \
  --max-time $TIMEOUT \
  -d @- << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert code analyst focusing on dependencies, performance, and security. Provide specific file paths and code examples from the repository in your analysis."
    },
    {
      "role": "user",
      "content": "$PROMPT"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2,
  "max_tokens": 4000
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
    echo "Try increasing the timeout value for larger repositories."
  fi
  exit 1
fi

echo "Analysis complete! Took ${DURATION} seconds."
echo "Results saved to $OUTPUT_FILE"

# Display raw output for diagnostic purposes
echo ""
echo "First 1000 characters of raw output:"
head -c 1000 "$OUTPUT_FILE"
echo -e "\n...[truncated]...\n"

# Try to pretty-print JSON if possible
echo "Attempting to pretty-print the JSON response..."
PRETTY_FILE="${OUTPUT_DIR}/focused_${REPO_NAME}_analysis_pretty.json"

python3 -c "
import json
import sys

try:
    with open('$OUTPUT_FILE', 'r') as f:
        content = f.read()
        # Try to find JSON content by looking for opening brace
        json_start = content.find('{')
        if json_start >= 0:
            json_content = content[json_start:]
            data = json.loads(json_content)
            with open('$PRETTY_FILE', 'w') as out:
                json.dump(data, out, indent=2)
            print('Successfully pretty-printed JSON')
        else:
            print('No JSON object found in the response')
except Exception as e:
    print(f'Error processing content: {str(e)}')
"

# Additionally, try to extract any text regardless of format
echo "Extracting any readable content from the response..."
TEXT_FILE="${OUTPUT_DIR}/focused_${REPO_NAME}_analysis.txt"

python3 -c "
import re
import sys

try:
    with open('$OUTPUT_FILE', 'r') as f:
        content = f.read()
    
    # Try to extract markdown-like content or any readable text
    # Look for common section headers in the prompt
    text_content = ''
    
    # Try different extraction methods
    if '## DEPENDENCIES' in content or '# DEPENDENCIES' in content or 'DEPENDENCIES:' in content:
        text_content = content
    elif 'dependencies' in content.lower() and 'performance' in content.lower() and 'security' in content.lower():
        text_content = content
    else:
        # Try to find content between quotes in JSON
        match = re.search(r'\"content\":\\s*\"(.*?)\"', content, re.DOTALL)
        if match:
            text_content = match.group(1)
        else:
            # Just extract any readable text
            text_content = re.sub(r'[^a-zA-Z0-9\s\.\,\:\;\-\(\)\[\]\{\}\"\'\`\~\!\@\#\$\%\^\&\*\_\+\=]', '', content)
    
    with open('$TEXT_FILE', 'w') as out:
        out.write(text_content)
    print('Extracted content to text file')
    
except Exception as e:
    print(f'Error extracting content: {str(e)}')
"

echo ""
echo "====================================================="
echo "FOCUSED ANALYSIS COMPLETE"
echo "Check the output files for results."
echo "If there are still issues with the response format, we may need to:"
echo "1. Examine the DeepWiki API implementation details"
echo "2. Try an alternative approach with direct API access"
echo "3. Use a smaller repository for testing"
echo "====================================================="
