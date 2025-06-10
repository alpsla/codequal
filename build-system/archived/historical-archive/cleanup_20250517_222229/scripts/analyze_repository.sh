#!/bin/bash
# CodeQual Repository Analysis Script
# Usage: ./analyze_repository.sh <repository_url> [model_name]

# Default parameters
REPO_URL="${1:-https://github.com/expressjs/express}"
MODEL="${2:-anthropic/claude-3-opus}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
OUTPUT_DIR="$BASE_DIR/reports/report_$TIMESTAMP"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Validate inputs
if [ -z "$REPO_URL" ]; then
  echo "ERROR: Repository URL is required"
  echo "Usage: ./analyze_repository.sh <repository_url> [model_name]"
  exit 1
fi

# Extract repository name from URL
REPO_NAME=$(basename "$REPO_URL" .git)

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Function to run an analysis with fallback
run_analysis() {
    local analysis_type="$1"
    local prompt="$2"
    local output_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    local model="$MODEL"
    local fallback_models=("openai/gpt-4.1" "anthropic/claude-3.7-sonnet" "openai/gpt-4")
    local success=false
    
    echo ""
    echo "====================================================="
    echo "Running $analysis_type analysis on repository: $REPO_NAME"
    echo "Using model: $model"
    echo "====================================================="
    
    # Create request JSON
    local request_file="${OUTPUT_DIR}/${analysis_type}_request.json"
    
    cat > "$request_file" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$prompt"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$model",
  "temperature": 0.2
}
