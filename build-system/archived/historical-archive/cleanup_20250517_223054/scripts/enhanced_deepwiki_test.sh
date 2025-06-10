#!/bin/bash
# Enhanced DeepWiki Repository Analysis Tester
# This script runs a comprehensive DeepWiki analysis using openai/gpt-4.1

# Default parameters
MODEL="openai/gpt-4.1"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="./deepwiki_enhanced_analysis"
TIMEOUT=300  # 5 minutes timeout for curl (increased for larger repos)

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Test a medium repository (NestJS)
REPO_URL="https://github.com/nestjs/nest"
REPO_NAME=$(basename "$REPO_URL" .git)
OUTPUT_FILE="${OUTPUT_DIR}/medium_${REPO_NAME}_enhanced.json"

echo "====================================================="
echo "Running ENHANCED analysis on medium repository: $REPO_NAME"
echo "Model: $MODEL"
echo "Output file: $OUTPUT_FILE"
echo "====================================================="

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Check if we can exec into the pod to see available commands and options
echo "Checking DeepWiki pod capabilities..."
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- ls -la /app || echo "Cannot access /app directory"
kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*.py" | grep -i cli || echo "No CLI files found"

# Set up port forwarding
echo "Setting up port forwarding to DeepWiki API..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 3

# Enhanced prompt that explicitly asks for key areas
PROMPT="Provide a COMPREHENSIVE and DETAILED analysis of this repository with the following specific sections:

1. ARCHITECTURE:
   - Overall architectural patterns and design principles
   - Module organization and code structure
   - Separation of concerns and layering
   - Use of design patterns
   - Code organization and project structure

2. DEPENDENCIES:
   - Complete list of direct dependencies with versions
   - Analysis of dependency management practices
   - Identification of outdated or vulnerable dependencies
   - Dependency injection patterns
   - Third-party library usage and integration patterns

3. CODE QUALITY:
   - Analysis of code style and consistency
   - Adherence to language-specific best practices
   - Test coverage and quality of tests
   - Documentation quality
   - Error handling patterns
   
4. PERFORMANCE:
   - Identification of potential performance bottlenecks
   - Analysis of resource usage patterns
   - Async/concurrency patterns
   - Memory management concerns
   - Caching strategies and implementation

5. SECURITY:
   - Identification of security vulnerabilities
   - Analysis of authentication/authorization mechanisms
   - Input validation practices
   - Security best practices adherence
   - Potential injection vulnerabilities

6. EXAMPLES:
   - Include at least 3 specific code examples from the repository
   - For each example, explain what it does and how it could be improved
   - Highlight both positive patterns and areas for improvement
   
Include specific file paths and code snippets in your analysis to provide concrete examples of your findings.
This analysis will be used for engineering review, so be thorough and comprehensive."

# Execute the enhanced analysis using the chat completions endpoint
echo "Running comprehensive repository analysis with model: $MODEL"
echo "Target repository: $REPO_URL"
echo "Request may take several minutes for a complete analysis..."

START_TIME=$(date +%s)

curl -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$OUTPUT_FILE" \
  --max-time $TIMEOUT \
  -d @- << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert code analyst performing a comprehensive review. Provide extremely detailed analysis with specific examples. Do not skip any of the requested sections. Use the full context of the repository for your analysis."
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
  "max_tokens": 4000,
  "top_p": 0.95,
  "concise": false,
  "full_scan": true
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
    echo "For larger repositories, you may need to increase the timeout value."
  fi
  exit 1
fi

echo "Analysis complete! Took ${DURATION} seconds."
echo "Results saved to $OUTPUT_FILE"

# Try to check the output size and content
OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "Output file size: $OUTPUT_SIZE"

echo "First 500 characters of the response:"
head -c 500 "$OUTPUT_FILE"
echo -e "\n...[truncated]...\n"

echo "====================================================="
echo "Check the response for completeness. If it still lacks detail:"
echo "1. The 'concise' and 'full_scan' parameters might not be supported"
echo "2. We might need to use a different API endpoint"
echo "3. We could try a different model (e.g., anthropic/claude-3-opus for more detail)"
echo "====================================================="
