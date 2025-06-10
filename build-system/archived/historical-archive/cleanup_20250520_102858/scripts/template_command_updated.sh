#!/bin/bash
# DeepWiki OpenRouter Repository Analysis Template
# This script executes repository analysis using parameters provided by the orchestrator

# Input parameters (to be passed by orchestrator)
REPO_URL="${1:-https://github.com/example/repo}"          # Repository URL
PRIMARY_MODEL="${2:-anthropic/claude-3-opus}"             # Primary model identifier with provider prefix
PROMPT_TEMPLATE="${3:-standard}"                         # Prompt template name
OUTPUT_PATH="${4:-./analysis_results.json}"               # Output file path
NAMESPACE="${5:-codequal-dev}"                            # Kubernetes namespace
POD_SELECTOR="${6:-deepwiki-fixed}"                       # Pod selector
PORT="${7:-8001}"                                         # Port for DeepWiki API
FALLBACK_MODELS="${8:-openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4}"  # Comma-separated fallback models

# Create output directory if it doesn't exist
OUTPUT_DIR="$(dirname "$OUTPUT_PATH")"
mkdir -p "$OUTPUT_DIR"

# Load the appropriate prompt template
# These templates would be predefined and selected by the orchestrator
case "$PROMPT_TEMPLATE" in
  "architecture")
    PROMPT=$(cat /path/to/prompts/architecture_prompt.txt)
    ;;
  "code-quality")
    PROMPT=$(cat /path/to/prompts/code_quality_prompt.txt)
    ;;
  "security")
    PROMPT=$(cat /path/to/prompts/security_prompt.txt)
    ;;
  *)
    # Default comprehensive prompt
    PROMPT=$(cat /path/to/prompts/standard_prompt.txt)
    ;;
esac

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"
echo "Primary model: $PRIMARY_MODEL"
echo "Fallback models: $FALLBACK_MODELS"

# Convert comma-separated fallback models to array
IFS=',' read -r -a FALLBACK_MODELS_ARRAY <<< "$FALLBACK_MODELS"

# Function to run a single analysis with specific model
run_single_analysis() {
    local model="$1"
    local raw_response_file="${OUTPUT_DIR}/$(basename "$OUTPUT_PATH" .json)_${model//\//_}_raw.json"
    local success=false
    
    # Set up port forwarding
    echo "Setting up port forwarding to DeepWiki API..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 3
    
    # Execute the analysis
    echo "Running repository analysis with model: $model"
    echo "Using prompt template: $PROMPT_TEMPLATE"
    echo "Target repository: $REPO_URL"
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -o "$raw_response_file" \
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
      "model": "$model",
      "temperature": 0.2
    }
EOF
    
    RESULT=$?
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ]; then
        echo "ERROR: Analysis request failed with model $model (exit code: $RESULT)"
        return 1
    fi
    
    # Validate response
    if [ -f "$raw_response_file" ]; then
        # Check for error messages - only consider it an error if it ONLY contains an error message
        if grep -q "error\|Error\|API_KEY\|cannot access\|free variable" "$raw_response_file" && ! grep -q "content\|analysis\|score\|Score" "$raw_response_file"; then
            echo "ERROR: Analysis with model $model returned an error:"
            grep -i "error\|API_KEY\|cannot access\|free variable" "$raw_response_file"
            return 1
        fi
        
        # Check if response has meaningful content
        if grep -q "content\|analysis\|score\|Score" "$raw_response_file" || [ "$(wc -l < "$raw_response_file")" -gt 10 ]; then
            # Response looks valid
            echo "Analysis successful with model: $model"
            
            # Extract model info for result metadata
            jq --arg model "$model" '. + {"model_used": $model}' "$raw_response_file" > "${raw_response_file}.tmp"
            mv "${raw_response_file}.tmp" "$OUTPUT_PATH"
            
            return 0
        else
            echo "Response from $model does not contain valid analysis content"
            return 1
        fi
    else
        echo "ERROR: No response file created for analysis with model $model"
        return 1
    fi
}

# Try with primary model first
echo "Attempting analysis with primary model: $PRIMARY_MODEL"
if run_single_analysis "$PRIMARY_MODEL"; then
    echo "✓ Analysis successful with primary model!"
else
    echo "✗ Analysis failed with primary model, trying fallback models..."
    
    success=false
    for fallback_model in "${FALLBACK_MODELS_ARRAY[@]}"; do
        echo ""
        echo "Attempting fallback with model: $fallback_model"
        if run_single_analysis "$fallback_model"; then
            echo "✓ Analysis successful with fallback model $fallback_model!"
            success=true
            break
        else
            echo "✗ Analysis failed with fallback model $fallback_model"
        fi
    done
    
    if [ "$success" = false ]; then
        # Create error output if all models failed
        echo "ERROR: All models failed for analysis"
        
        # Generate error JSON
        cat > "$OUTPUT_PATH" << EOF
{
  "error": "All models failed for analysis",
  "models_attempted": ["$PRIMARY_MODEL", "${FALLBACK_MODELS_ARRAY[@]}"],
  "repository": "$REPO_URL",
  "prompt_template": "$PROMPT_TEMPLATE",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
        
        echo "Error output saved to: $OUTPUT_PATH"
        exit 1
    fi
fi

echo "Analysis complete. Results saved to $OUTPUT_PATH"
