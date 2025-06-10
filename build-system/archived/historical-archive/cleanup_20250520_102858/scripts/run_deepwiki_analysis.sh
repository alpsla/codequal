#!/bin/bash
# DeepWiki Repository Analysis Tester Script
# This script runs DeepWiki analysis on repositories of different sizes
# using openai/gpt-4.1 model

# Default parameters
MODEL="openai/gpt-4.1"
PROMPT_TEMPLATE="standard"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
BASE_OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/testing/results/deepwiki_analysis"
DATE_SUFFIX=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="${BASE_OUTPUT_DIR}/${DATE_SUFFIX}"
TEMPLATE_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/prompts"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Function to run analysis on a single repository
run_analysis() {
    local repo_url="$1"
    local repo_name=$(basename "$repo_url" .git)
    local size_category="$2"
    local output_file="${OUTPUT_DIR}/${size_category}_${repo_name}.json"
    
    echo "====================================================="
    echo "Analyzing repository: $repo_name"
    echo "Size category: $size_category"
    echo "Model: $MODEL"
    echo "Output file: $output_file"
    echo "====================================================="
    
    # Get the active pod
    ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')
    
    if [ -z "$ACTIVE_POD" ]; then
      echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
      return 1
    fi
    
    echo "Using pod: $ACTIVE_POD"
    
    # Set up port forwarding
    echo "Setting up port forwarding to DeepWiki API..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 3
    
    # Set prompt based on template
    PROMPT="Analyze this repository and provide a comprehensive report on its architecture, code quality, and potential issues. Focus on patterns, best practices, and areas for improvement."
    
    # Execute the analysis
    echo "Running repository analysis with model: $MODEL"
    echo "Target repository: $repo_url"
    
    START_TIME=$(date +%s)
    
    curl -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -o "$output_file" \
      -d @- << EOF
    {
      "repo_url": "$repo_url",
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
    
    RESULT=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ]; then
      echo "ERROR: Analysis request failed for $repo_name"
      return 1
    fi
    
    echo "Analysis complete for $repo_name (took ${DURATION}s). Results saved to $output_file"
    echo ""
    
    # Wait a bit between repositories to avoid rate limiting
    sleep 5
}

# Generate summary info file with metadata
cat > "${OUTPUT_DIR}/analysis_summary.md" << EOF
# DeepWiki Analysis Summary

- **Date:** $(date "+%Y-%m-%d %H:%M:%S")
- **Model:** $MODEL
- **Prompt Template:** $PROMPT_TEMPLATE

## Repositories Analyzed

EOF

# Run analysis on small repositories
echo "## Testing Small Repositories (< 10,000 LOC)"
cat >> "${OUTPUT_DIR}/analysis_summary.md" << EOF

## Small Repositories (< 10,000 LOC)

EOF

run_analysis "https://github.com/fastify/fastify-cli" "small"
echo "- fastify/fastify-cli (JavaScript, ~5,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

run_analysis "https://github.com/sveltejs/svelte-hmr" "small"
echo "- sveltejs/svelte-hmr (JavaScript/TypeScript, ~3,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

run_analysis "https://github.com/pallets/flask" "small"
echo "- pallets/flask (Python, ~7,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

# Run analysis on medium repositories
echo "## Testing Medium Repositories (10,000 - 50,000 LOC)"
cat >> "${OUTPUT_DIR}/analysis_summary.md" << EOF

## Medium Repositories (10,000 - 50,000 LOC)

EOF

run_analysis "https://github.com/nestjs/nest" "medium"
echo "- nestjs/nest (TypeScript, ~30,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

run_analysis "https://github.com/django/django" "medium"
echo "- django/django (Python, ~40,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

run_analysis "https://github.com/gin-gonic/gin" "medium"
echo "- gin-gonic/gin (Golang, ~15,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

# Run analysis on large repositories (with warning about potential limitations)
echo "## Testing Large Repositories (> 50,000 LOC)"
echo "NOTE: Large repositories may hit token limits. Analysis may be incomplete."
cat >> "${OUTPUT_DIR}/analysis_summary.md" << EOF

## Large Repositories (> 50,000 LOC)
Note: Large repositories may encounter token limitations, resulting in partial analysis.

EOF

run_analysis "https://github.com/microsoft/TypeScript" "large"
echo "- microsoft/TypeScript (TypeScript, ~300,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

run_analysis "https://github.com/facebook/react" "large"
echo "- facebook/react (JavaScript, ~150,000 LOC)" >> "${OUTPUT_DIR}/analysis_summary.md"

# Generate completion summary
echo "All analyses completed!"
echo "Results saved to: $OUTPUT_DIR"
echo "Summary file: ${OUTPUT_DIR}/analysis_summary.md"

cat >> "${OUTPUT_DIR}/analysis_summary.md" << EOF

## Next Steps

1. Review the analysis results for each repository
2. Compare the quality of analysis across different repository sizes
3. Evaluate the performance of the openai/gpt-4.1 model
4. Consider testing with other models for comparison
EOF
