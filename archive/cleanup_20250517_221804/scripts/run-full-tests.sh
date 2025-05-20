#!/bin/bash

# Multi-Repository DeepWiki Model Comparison Test
# This script tests the performance of different models across repositories of various sizes and languages

echo "DeepWiki Multi-Repository Comparison"
echo "===================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f "/Users/alpinro/Code Prjects/codequal/.env" ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' "/Users/alpinro/Code Prjects/codequal/.env" | xargs)
fi

# Configuration
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/multi-repo-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Log file setup
LOG_FILE="$OUTPUT_DIR/multi-repo-test-$TIMESTAMP.log"
echo "DeepWiki Multi-Repository Comparison - $(date)" > "$LOG_FILE"
echo "API URL: $API_URL" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Check available API keys
echo "Checking available API keys..."
AVAILABLE_PROVIDERS=()

if [ -n "$OPENAI_API_KEY" ]; then
  echo "✓ OpenAI API key detected"
  AVAILABLE_PROVIDERS+=("openai")
else
  echo "✗ OpenAI API key not found"
fi

if [ -n "$GOOGLE_API_KEY" ]; then
  echo "✓ Google API key detected"
  AVAILABLE_PROVIDERS+=("google")
else
  echo "✗ Google API key not found"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "✓ Anthropic API key detected"
  AVAILABLE_PROVIDERS+=("anthropic")
else
  echo "✗ Anthropic API key not found"
fi

if [ -n "$OPENROUTER_API_KEY" ]; then
  echo "✓ OpenRouter API key detected"
  AVAILABLE_PROVIDERS+=("openrouter")
else
  echo "✗ OpenRouter API key not found"
fi

if [ ${#AVAILABLE_PROVIDERS[@]} -eq 0 ]; then
  echo "Error: No API keys found. Please set at least one API key before running this script."
  exit 1
fi

echo "Available providers: ${AVAILABLE_PROVIDERS[*]}"
echo ""

# Define test repositories with different sizes and languages
REPOSITORIES=(
  # Small repositories
  "small,python,pallets/flask-debugtoolbar,Flask Debug Toolbar extension"
  "small,javascript,expressjs/express-session,Express Session middleware"
  "small,typescript,microsoft/tsconfig-paths,TypeScript config paths"
  
  # Medium repositories
  "medium,python,pallets/flask,Flask web framework"
  "medium,javascript,expressjs/express,Express web framework"
  "medium,typescript,typeorm/typeorm,TypeORM database ORM"
  
  # Large repositories
  "large,python,django/django,Django web framework"
  "large,javascript,nodejs/node,Node.js"
  "large,typescript,microsoft/TypeScript,TypeScript language"
)

# Define test models based on available providers
MODELS=()

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " openai " ]]; then
  MODELS+=("openai,gpt-4o")
fi

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " google " ]]; then
  MODELS+=("google,gemini-2.5-pro-preview-05-06")
fi

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " anthropic " ]]; then
  MODELS+=("anthropic,claude-3-7-sonnet")
fi

if [[ " ${AVAILABLE_PROVIDERS[*]} " =~ " openrouter " ]]; then
  MODELS+=("openrouter,anthropic/claude-3.7-sonnet")
fi

# Define test queries for architecture analysis
ARCHITECTURE_QUERY="What is the overall architecture of this repository? Please explain the main components, their relationships, and how they work together."

# Function to run a test and record results
run_repository_test() {
  local size=$1
  local language=$2
  local repo=$3
  local description=$4
  local provider=$5
  local model=$6
  
  # Extract owner and name from repo
  IFS='/' read -r owner name <<< "$repo"
  
  echo ""
  echo "Testing $provider/$model on $size $language repository: $repo"
  echo "Repository: $owner/$name ($description)"
  echo "Size category: $size"
  echo "Language: $language"
  echo ""
  
  echo "Testing $provider/$model on $repo ($size, $language)" >> "$LOG_FILE"
  
  local output_file="$OUTPUT_DIR/${provider}-${model//\//-}-${owner}-${name}-$TIMESTAMP.json"
  local repo_url="https://github.com/$repo"
  
  echo "Repository URL: $repo_url" >> "$LOG_FILE"
  echo "Output file: $output_file" >> "$LOG_FILE"
  
  START_TIME=$(date +%s.%N)
  
  # Create a temporary file for the request body
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOL
{
  "repo_url": "$repo_url",
  "messages": [
    {
      "role": "user",
      "content": "$ARCHITECTURE_QUERY"
    }
  ],
  "provider": "$provider",
  "model": "$model"
}
EOL
  
  # Use stream endpoint for chat completions
  # Add the appropriate API key based on provider
  API_KEY=""
  if [ "$provider" == "openai" ]; then
    API_KEY="$OPENAI_API_KEY"
  elif [ "$provider" == "google" ]; then
    API_KEY="$GOOGLE_API_KEY"
  elif [ "$provider" == "anthropic" ]; then
    API_KEY="$ANTHROPIC_API_KEY"
  elif [ "$provider" == "openrouter" ]; then
    API_KEY="$OPENROUTER_API_KEY"
  fi
  
  curl -s -X POST "$API_URL/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d @"$TEMP_FILE" > "$output_file"
  
  # Remove temporary file
  rm "$TEMP_FILE"
  
  END_TIME=$(date +%s.%N)
  DURATION=$(echo "$END_TIME - $START_TIME" | bc)
  SIZE=$(wc -c < "$output_file" | xargs)
  
  echo "Completed in $DURATION seconds"
  echo "Response size: $SIZE bytes"
  echo ""
  
  echo "Completed in $DURATION seconds" >> "$LOG_FILE"
  echo "Response size: $SIZE bytes" >> "$LOG_FILE"
  echo "----------------------------------------" >> "$LOG_FILE"
  
  # Add to summary file
  echo "$provider,$model,$size,$language,$repo,$DURATION,$SIZE,$output_file" >> "$OUTPUT_DIR/multi-repo-summary-$TIMESTAMP.csv"
}

# Create summary CSV header
echo "provider,model,size_category,language,repository,duration_seconds,size_bytes,output_file" > "$OUTPUT_DIR/multi-repo-summary-$TIMESTAMP.csv"

# Run tests for each repository and model combination
echo "Starting multi-repository tests across all models..."
echo "This will take some time to complete."

TOTAL_TESTS=$((${#REPOSITORIES[@]} * ${#MODELS[@]}))
COMPLETED=0

for repo_info in "${REPOSITORIES[@]}"; do
  IFS=',' read -r size language repo description <<< "$repo_info"
  
  for model_info in "${MODELS[@]}"; do
    IFS=',' read -r provider model <<< "$model_info"
    
    COMPLETED=$((COMPLETED + 1))
    echo "Test $COMPLETED of $TOTAL_TESTS ($(echo "scale=1; ($COMPLETED/$TOTAL_TESTS)*100" | bc)%)"
    
    run_repository_test "$size" "$language" "$repo" "$description" "$provider" "$model"
  done
done

echo "All tests completed! Generating summary report..."

# Run the analysis script on the results
echo "Running analysis script on the test results..."
bash "/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/analyze-results.sh"

echo ""
echo "Testing and analysis completed!"
echo "Summary CSV: $OUTPUT_DIR/multi-repo-summary-$TIMESTAMP.csv"
echo "Log file: $LOG_FILE"
echo ""
echo "Please check the analysis report in the analysis-results directory."
