#!/bin/bash
# Script for simplified repository analysis with DeepWiki OpenRouter integration
# This script focuses on the three-parameter approach: repo URL, primary model, and fallback models

# Required parameters
REPO_URL="${1}"
PRIMARY_MODEL="${2}"

# Optional parameters
FALLBACK_MODELS="${3:-}"
NAMESPACE="${4:-codequal-dev}"
POD_SELECTOR="${5:-deepwiki-fixed}"
PORT="${6:-8001}"
OUTPUT_PATH="${7:-./results/analysis_result.json}"

# Create output directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_PATH")"

# Get pod name
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$POD_SELECTOR" -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo "Error: No pod found with selector app=$POD_SELECTOR in namespace $NAMESPACE"
  exit 1
fi

echo "=== Repository Analysis Parameters ==="
echo "Repository URL: $REPO_URL"
echo "Primary Model: $PRIMARY_MODEL"
echo "Fallback Models: ${FALLBACK_MODELS:-None}"
echo "Pod: $POD_NAME (namespace: $NAMESPACE)"
echo "Output Path: $OUTPUT_PATH"
echo ""

# Function to run analysis with a specific model
function run_analysis() {
  local model="$1"
  local temp_output="$(dirname "$OUTPUT_PATH")/$(basename "$OUTPUT_PATH" .json)_${model//\//_}_temp.json"
  
  echo "Running analysis with model: $model"
  
  # Construct the API request body
  cat <<EOF > /tmp/request_body.json
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this repository and provide a comprehensive overview of its architecture, code quality, and organization."
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$model"
}
EOF

  # Execute the API request
  kubectl exec -n "$NAMESPACE" "$POD_NAME" -- curl -s "http://localhost:$PORT/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer \$OPENROUTER_API_KEY" \
    -H "X-OpenRouter-API-Key: \$OPENROUTER_API_KEY" \
    -d @/tmp/request_body.json > "$temp_output"
  
  # Check response for validity
  if grep -q "error" "$temp_output"; then
    echo "Error in response from model $model:"
    cat "$temp_output"
    return 1
  fi
  
  if [ ! -s "$temp_output" ]; then
    echo "Empty response from model $model"
    return 1
  fi
  
  # Add model attribution to output
  local final_output
  if jq . "$temp_output" > /dev/null 2>&1; then
    # Valid JSON response
    final_output=$(jq --arg model "$model" '. + {model_used: $model}' "$temp_output")
    echo "$final_output" > "$OUTPUT_PATH"
  else
    # Not valid JSON, create a simple JSON wrapper
    echo "{\"content\": \"$(cat "$temp_output" | sed 's/"/\\"/g')\", \"model_used\": \"$model\"}" > "$OUTPUT_PATH"
  fi
  
  echo "Analysis with model $model completed successfully"
  return 0
}

# Try primary model first
if run_analysis "$PRIMARY_MODEL"; then
  echo "Analysis completed successfully with primary model: $PRIMARY_MODEL"
  exit 0
fi

# If fallback models are provided and primary model failed, try each fallback model
if [ -n "$FALLBACK_MODELS" ]; then
  echo "Primary model failed, trying fallback models..."
  
  # Convert fallback models to array
  IFS=',' read -ra FALLBACK_ARRAY <<< "$FALLBACK_MODELS"
  
  for model in "${FALLBACK_ARRAY[@]}"; do
    if run_analysis "$model"; then
      echo "Analysis completed successfully with fallback model: $model"
      exit 0
    fi
  done
fi

# If we get here, all models failed
echo "All models failed. Writing error output."
echo "{\"error\": \"All models failed to complete analysis\", \"repository\": \"$REPO_URL\", \"models_attempted\": [\"$PRIMARY_MODEL\"${FALLBACK_MODELS:+, }${FALLBACK_MODELS/,/\", \"}]}" > "$OUTPUT_PATH"
exit 1
