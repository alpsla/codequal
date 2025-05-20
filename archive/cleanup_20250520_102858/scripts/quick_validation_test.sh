#!/bin/bash
# This script runs a quick validation of the DeepWiki OpenRouter scoring integration

# Base directory - this ensures all paths are properly resolved
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Default parameters
MODEL="anthropic/claude-3-opus"  # Using a model known to work well with complex analysis
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_quick_validation"
TIMEOUT=180  # 3 minutes timeout for quick test

# Target repository - using a small test repo for quick validation
REPO_URL="https://github.com/expressjs/express"
REPO_NAME=$(basename "$REPO_URL" .git)

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Simple, structured prompt that is less likely to cause JSON formatting issues
PROMPT="Analyze this repository and provide a scoring assessment.

## Analysis
- Identify the main purpose and features
- Review the code organization
- Assess the quality of documentation
- Evaluate the testing approach

## Scoring
- Rate the repository on a scale of 1-10
- Identify key strengths
- Identify key areas for improvement

Please keep your response concise and focused."

# System message
SYSTEM_MSG="You are an expert code analyst. Provide a concise analysis of the repository."

# Create a request file
REQUEST_JSON_FILE="${OUTPUT_DIR}/quick_test_request.json"
cat > "$REQUEST_JSON_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "system",
      "content": "$SYSTEM_MSG"
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
  "max_tokens": 2000
}
EOF

# Set up port forwarding
echo "Setting up port forwarding to DeepWiki API..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Execute the analysis
echo "Running quick validation test with $MODEL..."
echo "This will take 1-3 minutes. Please be patient."

OUTPUT_FILE="${OUTPUT_DIR}/quick_validation_${REPO_NAME}.md"
RAW_RESPONSE="${OUTPUT_DIR}/quick_validation_raw.json"

# Run with the request file
curl -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -o "$RAW_RESPONSE" \
  --max-time $TIMEOUT \
  -d @"$REQUEST_JSON_FILE"

RESULT=$?

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

if [ $RESULT -ne 0 ]; then
  echo "ERROR: Validation test failed (exit code: $RESULT)"
  if [ $RESULT -eq 28 ]; then
    echo "The curl operation timed out after $TIMEOUT seconds."
  fi
  
  # Show error response if available
  if [ -f "$RAW_RESPONSE" ]; then
    echo "Error response:"
    cat "$RAW_RESPONSE"
  fi
  
  exit 1
fi

# Extract and save the content
python3 -c "
import json
import sys

try:
    with open('$RAW_RESPONSE', 'r') as f:
        content = f.read()
    
    # Try to parse as JSON
    try:
        data = json.loads(content)
        
        # Check various JSON structures
        extracted = None
        if 'choices' in data and len(data['choices']) > 0:
            if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                extracted = data['choices'][0]['message']['content']
        elif 'content' in data:
            extracted = data['content']
        elif 'response' in data:
            extracted = data['response']
            
        if extracted:
            with open('$OUTPUT_FILE', 'w') as out:
                out.write(extracted)
            print('Successfully extracted content from JSON response')
        else:
            with open('$OUTPUT_FILE', 'w') as out:
                out.write('Could not extract content from JSON response:\n\n```json\n')
                out.write(json.dumps(data, indent=2))
                out.write('\n```')
            print('Could not extract content from JSON, saved raw response')
    except:
        # If not JSON, save as is
        with open('$OUTPUT_FILE', 'w') as out:
            out.write(content)
        print('Saved raw response (not valid JSON)')
except Exception as e:
    print(f'Error processing content: {str(e)}')
    with open('$OUTPUT_FILE', 'w') as out:
        out.write(f'Error: {str(e)}')
"

# Show results
if [ -f "$OUTPUT_FILE" ]; then
    SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "Validation test result saved to: $OUTPUT_FILE (Size: $SIZE)"
    
    # Show a preview
    echo ""
    echo "Preview of validation result:"
    head -n 20 "$OUTPUT_FILE"
    echo "..."
    
    echo ""
    echo "✓ Quick validation test completed successfully!"
    echo "If this looks good, you can now run the full validation script:"
    echo "./fixed_score_validation.sh"
else
    echo "ERROR: Failed to save validation output"
    exit 1
fi
