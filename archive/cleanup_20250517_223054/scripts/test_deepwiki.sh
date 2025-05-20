#!/bin/bash
# Simple DeepWiki Repository Analysis Tester
# This script runs DeepWiki analysis on repositories of different sizes
# using openai/gpt-4.1 model

# Default parameters
MODEL="openai/gpt-4.1"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="./deepwiki_analysis_results"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Test a small repository (flask)
REPO_URL="https://github.com/pallets/flask"
REPO_NAME=$(basename "$REPO_URL" .git)
OUTPUT_FILE="${OUTPUT_DIR}/small_${REPO_NAME}.json"

echo "====================================================="
echo "Analyzing small repository: $REPO_NAME"
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

# Set up port forwarding
echo "Setting up port forwarding to DeepWiki API..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 3

# Set prompt
PROMPT="Analyze this repository and provide a comprehensive report on its architecture, code quality, and potential issues. Focus on patterns, best practices, and areas for improvement."

# Execute the analysis
echo "Running repository analysis with model: $MODEL"
echo "Target repository: $REPO_URL"

curl -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$OUTPUT_FILE" \
  -d @- << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$PROMPT"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL"
}
EOF

# Check if curl succeeded
if [ $? -ne 0 ]; then
  echo "ERROR: Analysis request failed"
  kill $PF_PID 2>/dev/null || true
  exit 1
fi

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

echo "Analysis complete. Results saved to $OUTPUT_FILE"
