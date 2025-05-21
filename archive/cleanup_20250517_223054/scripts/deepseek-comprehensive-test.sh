#!/bin/bash
# DeepSeek Comprehensive Testing Script
# 
# This script tests DeepSeek models against a variety of repositories
# and collects metrics for comparison with other models.
#
# Usage: ./deepseek-comprehensive-test.sh [output_dir]

set -e

# Default output directory
OUTPUT_DIR=${1:-"deepseek-test-results"}
mkdir -p "$OUTPUT_DIR"

# Load environment variables
if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(cat .env | grep -v '#' | xargs)
fi

# Check if DeepSeek API key is available
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "Error: DEEPSEEK_API_KEY environment variable not set"
  exit 1
fi

# Set DeepWiki API base URL
DEEPWIKI_API_URL=${DEEPWIKI_API_URL:-"http://localhost:8001"}

# Initialize log file
LOG_FILE="$OUTPUT_DIR/comprehensive-test.log"
echo "Starting DeepSeek comprehensive test at $(date)" > "$LOG_FILE"
echo "DeepWiki API URL: $DEEPWIKI_API_URL" >> "$LOG_FILE"

# Models to test
MODELS=(
  "deepseek/deepseek-coder"
  "deepseek/deepseek-coder-plus"
  "deepseek/deepseek-coder-lite"
)

# Comparison models
COMPARISON_MODELS=(
  "openai/gpt-4o"
  "anthropic/claude-3-7-sonnet"
  "google/gemini-2.5-pro-preview-05-06"
)

# Define test repositories by language and size
declare -A SMALL_REPOS
SMALL_REPOS=(
  ["python"]="pallets/flask-minimal"
  ["javascript"]="expressjs/express-starter"
  ["typescript"]="microsoft/typescript-starter"
  ["go"]="gin-gonic/examples"
  ["rust"]="rustls/rustls-ffi"
  ["java"]="spring-guides/gs-rest-service"
  ["csharp"]="dotnet/samples"
  ["cpp"]="protocolbuffers/protocolbuffers-examples"
  ["php"]="laravel/laravel"
  ["ruby"]="rails/rails-examples"
)

declare -A MEDIUM_REPOS
MEDIUM_REPOS=(
  ["python"]="pallets/flask"
  ["javascript"]="expressjs/express"
  ["typescript"]="nestjs/nest"
  ["go"]="gin-gonic/gin"
  ["rust"]="rustls/rustls"
  ["java"]="google/guava"
  ["csharp"]="dotnet/aspnetcore"
  ["cpp"]="protocolbuffers/protobuf-lite"
  ["php"]="laravel/framework"
  ["ruby"]="sinatra/sinatra"
)

declare -A LARGE_REPOS
LARGE_REPOS=(
  ["python"]="pytorch/pytorch"
  ["javascript"]="facebook/react"
  ["typescript"]="microsoft/TypeScript"
  ["go"]="golang/go"
  ["rust"]="rust-lang/rust"
  ["java"]="spring-projects/spring-boot"
  ["csharp"]="dotnet/runtime"
  ["cpp"]="protocolbuffers/protobuf"
  ["php"]="wordpress/wordpress"
  ["ruby"]="rails/rails"
)

# Test prompt for repository analysis
REPO_ANALYSIS_PROMPT='Analyze this repository in detail. Describe the architecture, main components, and code organization. Identify patterns, strengths, and potential areas for improvement.'

# Function to test a single repository with a model
test_repository() {
  local repo=$1
  local model=$2
  local size=$3
  local language=$4
  
  # Extract owner and repo name
  IFS='/' read -r owner repo_name <<< "$repo"
  
  echo "Testing $repo with $model ($size $language repository)..."
  
  # Create results directory
  local result_dir="$OUTPUT_DIR/$language/$size/$repo_name/$model"
  mkdir -p "$result_dir"
  
  # Log test parameters
  echo "----------------------------------------------" >> "$LOG_FILE"
  echo "Testing $repo with $model" >> "$LOG_FILE"
  echo "Size: $size, Language: $language" >> "$LOG_FILE"
  echo "Start time: $(date)" >> "$LOG_FILE"
  
  # Prepare model provider and name
  IFS='/' read -r provider model_name <<< "$model"
  
  # Run the test with DeepWiki API
  start_time=$(date +%s.%N)
  
  # Call DeepWiki API
  response=$(curl -s -X POST "$DEEPWIKI_API_URL/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{
      \"repo_url\": \"https://github.com/$repo\",
      \"messages\": [
        {\"role\": \"system\", \"content\": \"You are a repository analyzer. Provide detailed and accurate analysis.\"},
        {\"role\": \"user\", \"content\": \"$REPO_ANALYSIS_PROMPT\"}
      ],
      \"provider\": \"$provider\",
      \"model\": \"$model_name\"
    }")
  
  end_time=$(date +%s.%N)
  duration=$(echo "$end_time - $start_time" | bc)
  
  # Save response
  echo "$response" > "$result_dir/response.json"
  
  # Extract content from response
  content=$(echo "$response" | jq -r '.choices[0].message.content // "Error: No content returned"')
  echo "$content" > "$result_dir/content.txt"
  
  # Calculate content size
  content_size=$(echo -n "$content" | wc -c)
  
  # Save metrics
  echo "{
    \"repository\": \"$repo\",
    \"model\": \"$model\",
    \"language\": \"$language\",
    \"size\": \"$size\",
    \"response_time\": $duration,
    \"content_size\": $content_size,
    \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
  }" > "$result_dir/metrics.json"
  
  # Log metrics
  echo "Response time: $duration seconds" >> "$LOG_FILE"
  echo "Content size: $content_size bytes" >> "$LOG_FILE"
  echo "End time: $(date)" >> "$LOG_FILE"
  echo "----------------------------------------------" >> "$LOG_FILE"
  
  # Return success
  return 0
}

# Function to run tests for a specific size category
run_size_tests() {
  local size=$1
  local repos=$2
  
  echo "Running tests for $size repositories..."
  
  # Iterate through languages and repositories
  for language in "${!repos[@]}"; do
    repo="${repos[$language]}"
    
    # Test with DeepSeek models
    for model in "${MODELS[@]}"; do
      test_repository "$repo" "$model" "$size" "$language"
    done
    
    # Test with comparison models
    for model in "${COMPARISON_MODELS[@]}"; do
      test_repository "$repo" "$model" "$size" "$language"
    done
  done
}

# Run tests for all repository sizes
run_size_tests "small" "SMALL_REPOS[@]"
run_size_tests "medium" "MEDIUM_REPOS[@]"
run_size_tests "large" "LARGE_REPOS[@]"

# Generate summary report
echo "Generating summary report..."
node generate-test-report.js "$OUTPUT_DIR"

echo "Comprehensive testing complete. Results saved to $OUTPUT_DIR"
echo "See $LOG_FILE for detailed logs"
