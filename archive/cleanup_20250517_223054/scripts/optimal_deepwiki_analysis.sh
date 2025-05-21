#!/bin/bash
# DeepWiki Repository Analysis - Optimized Script Based on Pod Analysis
# This script uses findings from the DeepWiki CLI exploration to generate comprehensive reports

# Default parameters
MODEL="anthropic/claude-3-opus"  # Using Claude Opus for maximum detail
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="./deepwiki_optimal_analysis"
TIMEOUT=900  # 15 minutes timeout - Claude Opus may take longer but provide much more detail

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Target a medium-sized repository (NestJS)
REPO_URL="https://github.com/nestjs/nest"
REPO_NAME=$(basename "$REPO_URL" .git)
OUTPUT_FILE="${OUTPUT_DIR}/optimal_${REPO_NAME}_analysis.json"
MARKDOWN_FILE="${OUTPUT_DIR}/optimal_${REPO_NAME}_analysis.md"

echo "====================================================="
echo "Running OPTIMAL analysis on repository: $REPO_NAME"
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

# Specialized system message to guide the model
SYSTEM_MESSAGE="You are a senior software architect and expert code analyst performing a thorough code review. Your mission is to provide an extremely detailed and comprehensive analysis that includes:

1. Architecture overview with specific patterns and design principles identified
2. Complete dependency analysis with versions
3. In-depth code quality assessment
4. Performance analysis with potential bottlenecks 
5. Security vulnerability assessment
6. At least 5 specific code examples with file paths

Your analysis MUST include specific file paths and code snippets from the actual repository. For each section, provide concrete evidence from the code rather than general observations. Your goal is to create a report that a senior developer could use to immediately understand and improve the codebase. Include all sections specified in the prompt and do not skip any requested information."

# Detailed prompt based on insights from CLI exploration
PROMPT="I need a complete, thorough analysis of this repository that MUST include these specific sections. Each section should be detailed and include specific file paths and code examples from the repository:

## 1. ARCHITECTURE
- Detailed description of the overall architectural pattern (MVC, Hexagonal, etc.)
- Complete breakdown of the module structure and organization
- Analysis of the application layers and how they interact
- Identification of specific design patterns used (with file examples)
- Evaluation of separation of concerns
- Assessment of code organization principles
- Diagrams or descriptions of key component relationships

## 2. DEPENDENCIES
- Complete list of direct dependencies with versions from package.json
- Analysis of how dependencies are managed and injected
- Identification of any outdated or vulnerable dependencies
- Evaluation of dependency coupling and potential issues
- Analysis of third-party library integration patterns
- Assessment of dependency management practices

## 3. CODE QUALITY
- Detailed analysis of code style and consistency across files
- Assessment of adherence to language-specific best practices
- Evaluation of code complexity and readability
- Analysis of naming conventions and consistency
- Examination of comment quality and documentation
- Review of test coverage and quality
- Identification of potential code smells and anti-patterns (with examples)

## 4. PERFORMANCE CONSIDERATIONS
- Identification of potential performance bottlenecks
- Analysis of memory usage patterns
- Examination of CPU-intensive operations
- Review of I/O and network operations
- Assessment of caching strategies
- Evaluation of resource management
- Analysis of async/concurrency patterns
- Recommendations for performance improvements

## 5. SECURITY ASSESSMENT
- Identification of potential security vulnerabilities
- Analysis of authentication and authorization mechanisms
- Review of input validation and sanitization practices
- Assessment of data protection measures
- Examination of error handling and information leakage
- Evaluation of secure coding practices
- Recommendations for security improvements

## 6. CODE EXAMPLES
- Include AT LEAST 5 specific code examples from the repository
- For each example, provide the EXACT file path
- Include the code snippet itself
- Explain what the code does
- Analyze its strengths and weaknesses
- Suggest specific improvements

## 7. RECOMMENDATIONS
- Prioritized list of technical improvements
- Specific refactoring suggestions with code examples
- Architectural enhancement recommendations
- Performance optimization strategies
- Security hardening measures

Remember to be extremely specific with file paths and code examples. General observations without specific evidence from the code are not acceptable. This analysis will be used for actual engineering decisions."

# Execute the optimal analysis with parameters based on CLI exploration
echo "Running optimal repository analysis with Claude 3 Opus..."
echo "This will take several minutes to complete. Please be patient."
echo "Target repository: $REPO_URL"

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
      "content": "$SYSTEM_MESSAGE"
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
  "max_tokens": 8000,
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
    echo "For larger repositories or more detailed analysis, try increasing the timeout."
  fi
  exit 1
fi

echo "Analysis complete! Took ${DURATION} seconds."
echo "Results saved to $OUTPUT_FILE"

# Extract the content from the JSON response and save as markdown
echo "Converting JSON response to markdown for better readability..."
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

# Get file size information
OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "Output file size: $OUTPUT_SIZE"

if [ -f "$MARKDOWN_FILE" ]; then
    MARKDOWN_SIZE=$(du -h "$MARKDOWN_FILE" | cut -f1)
    echo "Markdown file size: $MARKDOWN_SIZE"
    echo "Markdown file saved to: $MARKDOWN_FILE"
    
    # Show the first 500 characters of the markdown file
    echo ""
    echo "First 500 characters of the analysis:"
    head -c 500 "$MARKDOWN_FILE"
    echo -e "\n...[truncated]...\n"
fi

echo ""
echo "====================================================="
echo "OPTIMAL ANALYSIS COMPLETE"
echo "If you're satisfied with the results, you can use this same approach"
echo "for other repositories. If not, you may want to try:"
echo "1. Using a different model (openai/gpt-4.1 or deepseek/deepseek-coder)"
echo "2. Adjusting the max_tokens parameter (currently 8000)"
echo "3. Focusing on specific aspects of the codebase in separate analyses"
echo "====================================================="
