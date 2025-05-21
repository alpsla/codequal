#!/bin/bash
# Comprehensive test script for DeepWiki OpenRouter integration
# This script tests various repositories with different models to verify the integration

# Configuration
OUTPUT_DIR="./test_results"
NAMESPACE="${1:-codequal-dev}"
POD_SELECTOR="${2:-deepwiki-fixed}"
PORT="${3:-8001}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Define test repositories (varying sizes and complexity)
REPOSITORIES=(
  "https://github.com/pallets/click"          # Small Python library
  "https://github.com/expressjs/express"      # Medium JavaScript framework
)

# Define models to test
MODELS=(
  "anthropic/claude-3-haiku"        # Fast
  "openai/gpt-4o"                   # OpenAI model
)

# For full testing, uncomment these additional repositories and models
# REPOSITORIES+=(
#   "https://github.com/django/django"          # Large Python framework
#   "https://github.com/kubernetes/kubernetes"  # Very large Go project
# )
# MODELS+=(
#   "anthropic/claude-3-opus"         # Comprehensive
#   "anthropic/claude-3.7-sonnet"     # Latest Claude
#   "openai/gpt-4.1"                  # Latest GPT
#   "google/gemini-2.5-pro-preview"   # Google model
#   "deepseek/deepseek-coder"         # Code-specialized
# )

# Summary file
SUMMARY_FILE="$OUTPUT_DIR/test_summary.md"

# Initialize summary file
cat > "$SUMMARY_FILE" << EOF
# DeepWiki OpenRouter Integration Test Results
**Date:** $(date)

## Test Configuration
- Namespace: $NAMESPACE
- Pod Selector: $POD_SELECTOR
- Port: $PORT

## Results Summary

| Repository | Model | Status | Time (s) | Notes |
|------------|-------|--------|----------|-------|
EOF

# Function to test a specific repository with a specific model
function test_combination() {
  local repo="$1"
  local model="$2"
  
  # Get repo name for output file
  local repo_name=$(echo "$repo" | awk -F/ '{print $NF}')
  local model_safe_name=$(echo "$model" | tr '/' '_')
  local output_file="$OUTPUT_DIR/${repo_name}_${model_safe_name}.json"
  
  echo "=== Testing: $repo with $model ==="
  
  # Start timer
  local start_time=$(date +%s)
  
  # Run analysis
  local success=false
  local notes=""
  if ./simple_analysis.sh "$repo" "$model" "" "$NAMESPACE" "$POD_SELECTOR" "$PORT" "$output_file"; then
    success=true
  else
    notes="Failed"
    if [ -f "$output_file" ]; then
      if grep -q "error" "$output_file"; then
        notes=$(grep "error" "$output_file" | head -1 | sed 's/.*"error": "\(.*\)".*/\1/' | tr -d '"')
      fi
    else
      notes="Output file not created"
    fi
  fi
  
  # End timer
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Add to summary
  if [ "$success" = true ]; then
    echo "| $repo_name | $model | ✅ Success | $duration | - |" >> "$SUMMARY_FILE"
    echo "✅ Success - Time: ${duration}s"
  else
    echo "| $repo_name | $model | ❌ Failure | $duration | $notes |" >> "$SUMMARY_FILE"
    echo "❌ Failed - Time: ${duration}s - Notes: $notes"
  fi
  
  echo ""
}

# Function to test fallback functionality
function test_fallback() {
  local repo="$1"
  local primary="$2"
  local fallbacks="$3"
  
  # Get repo name for output file
  local repo_name=$(echo "$repo" | awk -F/ '{print $NF}')
  local output_file="$OUTPUT_DIR/${repo_name}_fallback_test.json"
  
  echo "=== Testing Fallback: $repo with primary=$primary and fallbacks=$fallbacks ==="
  
  # Start timer
  local start_time=$(date +%s)
  
  # Run analysis
  local success=false
  local notes=""
  if ./simple_analysis.sh "$repo" "$primary" "$fallbacks" "$NAMESPACE" "$POD_SELECTOR" "$PORT" "$output_file"; then
    success=true
    
    # Check which model was actually used
    if [ -f "$output_file" ]; then
      local model_used=$(grep "model_used" "$output_file" | head -1 | sed 's/.*"model_used": "\(.*\)".*/\1/' | tr -d '"')
      notes="Used model: $model_used"
    fi
  else
    notes="All models failed"
    if [ -f "$output_file" ]; then
      if grep -q "error" "$output_file"; then
        notes=$(grep "error" "$output_file" | head -1 | sed 's/.*"error": "\(.*\)".*/\1/' | tr -d '"')
      fi
    else
      notes="Output file not created"
    fi
  fi
  
  # End timer
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Add to summary
  if [ "$success" = true ]; then
    echo "| $repo_name | Fallback Test | ✅ Success | $duration | $notes |" >> "$SUMMARY_FILE"
    echo "✅ Success - Time: ${duration}s - $notes"
  else
    echo "| $repo_name | Fallback Test | ❌ Failure | $duration | $notes |" >> "$SUMMARY_FILE"
    echo "❌ Failed - Time: ${duration}s - Notes: $notes"
  fi
  
  echo ""
}

# Run individual model tests
echo "Starting individual model tests..."
for repo in "${REPOSITORIES[@]}"; do
  for model in "${MODELS[@]}"; do
    test_combination "$repo" "$model"
  done
done

# Run fallback tests
echo "Starting fallback tests..."
# Test with invalid primary and valid fallbacks
test_fallback "https://github.com/pallets/click" "invalid/model" "anthropic/claude-3-haiku,openai/gpt-4o"

# Test with valid primary and valid fallbacks (should use primary)
test_fallback "https://github.com/pallets/click" "anthropic/claude-3-haiku" "openai/gpt-4o,anthropic/claude-3-opus"

# Finish summary
cat >> "$SUMMARY_FILE" << EOF

## Conclusion

This test report provides an overview of the DeepWiki OpenRouter integration performance across different repositories and models. Use these results to identify optimal model configurations for your specific use cases.

## Next Steps

1. Review any failures and address their root causes
2. Consider adjusting timeout settings for larger repositories
3. Configure default model selections based on these test results
4. Set up regular testing to monitor integration stability
EOF

echo "Testing complete! Summary available at: $SUMMARY_FILE"
